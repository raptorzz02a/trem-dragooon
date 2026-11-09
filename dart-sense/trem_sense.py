"""Dart Sense -> TREM-DRAGOOON.

Lit la camera, repere chaque flechette plantee avec le modele de Dart Sense (weights.pt)
et la met a disposition de l'appli sur ce PC : http://127.0.0.1:55445.
L'appli (onglet ouvert sur la borne) interroge ce serveur et saisit la flechette
comme si on avait tape sur le pave. Quand les flechettes sont retirees de la cible,
un evenement « retrait » termine la volee.

A copier dans le dossier de Dart Sense (a cote de get_scores.py et weights.pt), puis :
    python trem_sense.py --camera auto
Avec deux cameras (par exemple a gauche et a droite de la cible), les flechettes vues par les deux
sont placees a la moyenne des deux positions, et une flechette cachee pour l'une reste vue par l'autre.
Dans la fenetre : q pour quitter, s pour enregistrer l'image de la camera (dossier captures).
"""

import argparse
import json
import os
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import numpy as np

PORT = 55445
ORIGINS = ['https://trem-dragooon.julien-charrier01.workers.dev']
SAME_DART = 0.01  # deux detections plus proches que ca (cible normalisee 0-1) = la meme flechette
BOARD_MM = 451.0  # diametre de la cible qui sert a normaliser les coordonnees (get_scores.py)


def position_of(pred):
    """Coordonnees normalisees (0-1, centre 0.5) -> mm depuis le centre : x vers la droite, y vers le bas."""
    return {'x': round(float(pred[0] - 0.5) * BOARD_MM, 1), 'y': round(float(pred[1] - 0.5) * BOARD_MM, 1)}


def dart_of(code):
    """'T20' -> {'segment': 20, 'multiplier': 3}. 'SB' = Bull 25, 'DB' = Bull 50, 'miss' = hors cible."""
    if code == 'DB':
        return {'segment': 25, 'multiplier': 2}
    if code == 'SB':
        return {'segment': 25, 'multiplier': 1}
    if code == 'miss' or not code:
        return {'segment': 0, 'multiplier': 1}
    return {'segment': int(code[1:]), 'multiplier': {'S': 1, 'D': 2, 'T': 3}[code[0]]}


class Events:
    """Journal des evenements, lu par l'appli en attente longue (« donne-moi ce qui suit le n° X »)."""

    def __init__(self):
        self.items = []
        self.next_id = 1
        self.cond = threading.Condition()
        self.status = {'camera': 'demarrage', 'fps': 0.0, 'volee': []}

    def add(self, kind, **data):
        with self.cond:
            event = {'id': self.next_id, 'type': kind, **data}
            self.next_id += 1
            self.items.append(event)
            del self.items[:-200]
            self.cond.notify_all()
        print(time.strftime('%H:%M:%S'), json.dumps(event))
        return event

    def last_id(self):
        with self.cond:
            return self.next_id - 1

    def since(self, after, timeout):
        with self.cond:
            self.cond.wait_for(lambda: self.next_id - 1 > after, timeout)
            return [e for e in self.items if e['id'] > after]

    def set_status(self, **data):
        with self.cond:
            self.status.update(data)


class VisitTracker:
    """Suit une volee a partir des flechettes vues a chaque image (coordonnees sur la cible, 0-1).

    Meme regle que Dart Sense : une flechette compte quand on la voit au meme endroit
    sur `repeat` des `window` dernieres images. Le retrait : au moins une flechette dans la volee,
    puis aucune flechette sur `repeat` des `window` dernieres images.
    """

    def __init__(self, score, events, repeat=3, window=5, same=SAME_DART):
        self.score = score  # coordonnees (N, 2) -> liste de codes ('T20', 'SB', 'miss'...)
        self.events = events
        # Distance sous laquelle deux positions sont la meme flechette (plus large a deux cameras :
        # la position fusionnee bouge un peu quand une camera perd la flechette de vue).
        self.same = same
        self.repeat = repeat
        self.window = window
        self.visit = 1
        self.reset()

    def reset(self):
        self.frames = deque(maxlen=self.window)
        self.darts = []  # coordonnees des flechettes de la volee
        self.codes = []

    def feed(self, coords):
        coords = np.asarray(coords, dtype=float).reshape(-1, 2)
        self.frames.append(coords)
        empty = sum(1 for f in self.frames if len(f) == 0)
        if self.darts and empty >= self.repeat:
            self.events.add('retrait', volee=self.visit, flechettes=len(self.darts))
            self.visit += 1
            self.reset()
            return
        if len(self.darts) >= 3:
            return
        for pred in self._stable():
            if len(self.darts) >= 3:
                break
            if all(np.linalg.norm(pred - d) > self.same for d in self.darts):
                code = self.score(np.array([pred]))[0]
                self.darts.append(pred)
                self.codes.append(code)
                self.events.add('flechette', volee=self.visit, rang=len(self.darts), code=code, flechette=dart_of(code),
                                position=position_of(pred))

    def _stable(self):
        """Positions vues sur au moins `repeat` images recentes, de la plus vue a la moins vue."""
        groups = []
        for frame in self.frames:
            for pred in frame:
                for g in groups:
                    if np.linalg.norm(pred - g[0]) < self.same:
                        g.append(pred)
                        break
                else:
                    groups.append([pred])
        groups = [g for g in groups if len(g) >= self.repeat]
        groups.sort(key=len, reverse=True)
        return [np.mean(g, axis=0) for g in groups]


def serve(events, port, origins):
    def allowed(origin):
        if not origin or origin in origins:
            return True
        host = urlparse(origin).hostname
        return urlparse(origin).scheme == 'http' and host in ('localhost', '127.0.0.1')

    class Handler(BaseHTTPRequestHandler):
        def _headers(self, code, body=None):
            origin = self.headers.get('Origin')
            self.send_response(code)
            self.send_header('Access-Control-Allow-Origin', origin or '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            # Chrome / Edge : autorise la page en ligne a joindre ce PC.
            self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.send_header('Vary', 'Origin')
            if body is not None:
                data = json.dumps(body).encode()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)
            else:
                self.end_headers()

        def do_OPTIONS(self):
            if not allowed(self.headers.get('Origin')):
                return self._headers(403)
            self._headers(204)

        def do_GET(self):
            if not allowed(self.headers.get('Origin')):
                return self._headers(403)
            url = urlparse(self.path)
            query = parse_qs(url.query)
            if url.path == '/etat':
                with events.cond:
                    status = dict(events.status)
                return self._headers(200, {'ok': True, 'dernier': events.last_id(), **status})
            if url.path == '/flechettes':
                after = int(query.get('apres', ['0'])[0])
                wait = min(float(query.get('attente', ['15'])[0]), 25)
                return self._headers(200, {'evenements': events.since(after, wait), 'dernier': events.last_id()})
            self._headers(404)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


FUSE_DIST = 0.03  # deux cameras voient la meme flechette si leurs positions sur la cible sont a moins de ca (~13 mm)


def fuse(views):
    """Regroupe les flechettes vues par plusieurs cameras (coordonnees sur la cible, 0-1).

    Une flechette vue par les deux cameras est placee a la moyenne des deux positions (plus precis),
    une flechette cachee pour l'une mais vue par l'autre est gardee.
    """
    groups = []  # [positions, cameras deja dans le groupe]
    for cam, coords in enumerate(views):
        for pred in np.asarray(coords, dtype=float).reshape(-1, 2):
            # Deux flechettes vues par la meme camera ne sont jamais fusionnees, meme serrees dans un triple.
            near = [g for g in groups if cam not in g[1] and np.linalg.norm(np.mean(g[0], axis=0) - pred) < FUSE_DIST]
            if near:
                g = min(near, key=lambda g: np.linalg.norm(np.mean(g[0], axis=0) - pred))
                g[0].append(pred)
                g[1].add(cam)
            else:
                groups.append([[pred], {cam}])
    return np.array([np.mean(g[0], axis=0) for g in groups]).reshape(-1, 2)


def open_capture(source, size=None):
    import cv2

    if source.isdigit():
        cap = cv2.VideoCapture(int(source), cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)
    elif os.path.isfile(source):  # video enregistree (essai)
        cap = cv2.VideoCapture(source)
    else:
        cap = cv2.VideoCapture(source if '://' in source else 'http://' + source + '/video')
    if cap.isOpened() and size:
        # Demande une definition plus fine a la webcam (elle donne la plus proche qu'elle sait faire).
        w, h = (int(v) for v in size.lower().split('x'))
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    return cap


class Camera:
    """Une camera lue dans son propre thread : on analyse toujours l'image la plus recente (pas de retard qui s'accumule)."""

    def __init__(self, source, size=None):
        import cv2

        self.name = source
        self.cap = open_capture(source, size)
        if not self.cap.isOpened():
            raise ConnectionError(f'Impossible d ouvrir la camera : {source}')
        print(f'Camera {source} : {int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}')
        self.frame, self.id, self.time, self.running = None, 0, time.time(), True
        # Video enregistree : lue a sa vitesse normale, comme une camera.
        self.pace = 1 / (self.cap.get(cv2.CAP_PROP_FPS) or 25) if os.path.isfile(source) else 0
        threading.Thread(target=self._read, daemon=True).start()

    def _read(self):
        while self.running:
            ok, frame = self.cap.read()
            if not ok:
                time.sleep(0.01)
                continue
            self.frame, self.time = frame, time.time()
            self.id += 1
            time.sleep(self.pace)

    def close(self):
        self.running = False
        self.cap.release()


def frames_from(sources, size=None):
    """Rend a chaque tour la liste des images les plus recentes, une par camera.

    Une source peut aussi etre un dossier d'images (essai sans camera) : chaque image est repetee
    comme si elle restait devant l'objectif.
    """
    import cv2

    if len(sources) == 1 and os.path.isdir(sources[0]):
        files = sorted(f for f in os.listdir(sources[0]) if f.lower().endswith(('.png', '.jpg', '.jpeg')))
        for name in files:
            frame = cv2.imread(os.path.join(sources[0], name))
            print('Image', name)
            for _ in range(6):
                yield [frame]
        return

    cameras = [Camera(s, size) for s in sources]
    seen = [0] * len(cameras)
    try:
        while True:
            # On attend une image neuve de chaque camera (au plus 10 s).
            for i, cam in enumerate(cameras):
                while cam.id == seen[i]:
                    if time.time() - cam.time > 10:
                        print(f'Plus d image de la camera {cam.name} depuis 10 s, arret.')
                        return
                    time.sleep(0.005)
                seen[i] = cam.id
            yield [cam.frame for cam in cameras]
    finally:
        for cam in cameras:
            cam.close()


class Calibration:
    """Memoire des 6 points de repere de la cible pour une camera fixe.

    Le modele les repere a chaque image, mais une flechette, une ailette ou un reflet en cache ou en decale
    souvent un : la cible est alors mal placee et la flechette mal comptee, pour de bon. On garde donc, pour
    chaque point, la mediane de ses dernieres positions vues avec assez de confiance. Si la camera bouge,
    la memoire suit en quelques secondes.
    """

    CONF = 0.5  # confiance minimale d'un point de repere (0,85 dans Dart Sense d'origine)

    def __init__(self, keep=15):
        self.points = [deque(maxlen=keep) for _ in range(6)]

    MOVED = 0.03  # un point a plus de ca de sa position memorisee (~13 mm) a bouge

    def update(self, result):
        """Ajoute les points vus sur cette image ; rend combien la cible en montre en ce moment."""
        seen = {}
        for k, c, box in zip(result.boxes.cls.tolist(), result.boxes.conf.tolist(), result.boxes.xywhn.tolist()):
            k = int(k)
            if k == 4 or c < self.CONF:
                continue
            i = k - 1 if k > 4 else k  # classes du modele : 0-3 et 5-6 pour les 6 points, 4 pour les flechettes
            seen.setdefault(i, box[:2])
        # La plupart des points vus ont bouge : camera ou cible deplacee, on repart de zero.
        known = self.coords()
        moved = [i for i, p in seen.items() if known[i][0] >= 0 and np.linalg.norm(known[i] - p) > self.MOVED]
        if len(seen) >= 3 and len(moved) > len(seen) / 2:
            for pts in self.points:
                pts.clear()
        for i, p in seen.items():
            self.points[i].append(p)
        return len(seen)

    def coords(self):
        """Points de repere a utiliser (-1 pour un point jamais vu)."""
        out = -np.ones((6, 2))
        for i, pts in enumerate(self.points):
            if pts:
                out[i] = np.median(np.array(pts), axis=0)
        return out


def analyse(model, scorer, frame, conf, calibration=None):
    """Carre central, resultat du modele et flechettes sur la cible (None si la cible n'est pas reperee)."""
    h, w = frame.shape[:2]
    size = min(h, w)
    x0, y0 = (w - size) // 2, (h - size) // 2
    # Le modele a ete entraine sur des images carrees ou la cible remplit le cadre.
    square = frame[y0:y0 + size, x0:x0 + size]
    result = model(square, conf=conf, verbose=False)[0]
    points, darts = scorer.process_yolo_output(result)
    if calibration is not None:
        # Au moins 3 points visibles maintenant (personne devant la cible), le reste vient de la memoire.
        if calibration.update(result) < 3:
            return square, result, None
        points = calibration.coords()
    if np.count_nonzero(np.all(points != -1, axis=1)) < 4:
        return square, result, None
    H = scorer.find_homography(points, size)
    darts = darts[np.all((darts >= 0) & (darts <= 1), axis=1)] if len(darts) else darts
    coords = scorer.transform_to_boardplane(H[0], darts, size) if len(darts) else np.zeros((0, 2))
    return square, result, coords


def detect_cameras(model, scorer, size, conf, count=6):
    """Cherche les webcams 0 a count-1 qui voient la cible (la webcam integree du PC, qui ne la voit pas, est ecartee)."""
    found = []
    for i in range(count):
        cap = open_capture(str(i), size)
        if not cap.isOpened():
            continue
        frame = None
        for _ in range(15):  # les premieres images d'une webcam sont souvent noires
            ok, img = cap.read()
            if ok:
                frame = img
        cap.release()
        if frame is None:
            continue
        coords = analyse(model, scorer, frame, conf)[2]
        print(f'Webcam {i} : ' + ('voit la cible' if coords is not None else 'ne voit pas la cible, ecartee'))
        if coords is not None:
            found.append(str(i))
    return found


def run(args):
    import cv2
    from ultralytics import YOLO
    from get_scores import GetScores

    model = YOLO(args.modele)
    scorer = GetScores(args.modele)
    if args.camera == 'auto':
        sources = detect_cameras(model, scorer, args.definition, args.confiance)
        if not sources:
            print('Aucune camera ne voit la cible : verifie le cadrage, ou donne le numero avec --camera 1')
            return
    else:
        sources = [c.strip() for c in args.camera.split(',') if c.strip()]
    print(f'{len(sources)} camera(s) utilisee(s) : {", ".join(sources)}')

    events = Events()
    tracker = VisitTracker(lambda coords: scorer.score(coords.copy())[0], events, same=SAME_DART if len(sources) == 1 else 1.5 * SAME_DART)
    serve(events, args.port, ORIGINS + ([args.origine] if args.origine else []))
    print(f'Dart Sense pret pour TREM-DRAGOOON : http://127.0.0.1:{args.port} (q dans la fenetre pour quitter)')

    calibrations = [Calibration() for _ in sources]
    last_time = time.time()
    for frames in frames_from(sources, args.definition):
        analysed = [analyse(model, scorer, f, args.confiance, cal) for f, cal in zip(frames, calibrations)]
        now = time.time()
        fps = round(1 / max(now - last_time, 1e-3), 1)
        last_time = now

        views = [coords for _, _, coords in analysed if coords is not None]
        if not views:
            # Cible non reperee (quelqu'un devant, mauvais cadrage) : on ne compte rien, sinon on croirait a un retrait.
            events.set_status(camera='cible', fps=fps, volee=tracker.codes, cameras=len(frames))
        else:
            tracker.feed(fuse(views))
            events.set_status(camera='ok', fps=fps, volee=tracker.codes, cameras=len(frames))

        if not args.sans_fenetre:
            panels = []
            for (square, result, coords), cal in zip(analysed, calibrations):
                view = square.copy()
                size = view.shape[0]
                th = max(1, size // 400)
                # Points de repere retenus (memoire) : croix blanches.
                for x, y in cal.coords():
                    if x >= 0:
                        cv2.drawMarker(view, (int(x * size), int(y * size)), (255, 255, 255), cv2.MARKER_CROSS, 14 * th, 2 * th)
                for box, k, c in zip(result.boxes.xywh.tolist(), result.boxes.cls.tolist(), result.boxes.conf.tolist()):
                    color = (0, 200, 255) if int(k) == 4 else (0, 255, 0)
                    cv2.circle(view, (int(box[0]), int(box[1])), 6 * th, color, th)
                    if int(k) == 4:
                        cv2.putText(view, f'{c:.2f}', (int(box[0]) + 8 * th, int(box[1])), cv2.FONT_HERSHEY_SIMPLEX, 0.8 * th, color, 2 * th)
                if coords is None:
                    cv2.putText(view, 'Cible non reperee', (10, 90 * th), cv2.FONT_HERSHEY_SIMPLEX, th, (0, 0, 255), 2 * th)
                side = 600 if len(analysed) == 1 else 480
                panels.append(cv2.resize(view, (side, side)))
            board = np.hstack(panels)
            cv2.putText(board, f'{" ".join(tracker.codes)}  ({fps} img/s)', (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.imshow('Dart Sense - TREM-DRAGOOON', board)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            if key == ord('s'):
                # Images brutes des cameras, pour analyser une flechette mal lue.
                os.makedirs('captures', exist_ok=True)
                stamp = time.strftime('%Y%m%d-%H%M%S')
                for i, frame in enumerate(frames):
                    name = os.path.join('captures', f'{stamp}-cam{i + 1}.png' if len(frames) > 1 else f'{stamp}.png')
                    cv2.imwrite(name, frame)
                    print('Image enregistree :', os.path.abspath(name))
    events.set_status(camera='arretee')


def main():
    parser = argparse.ArgumentParser(description='Dart Sense pour TREM-DRAGOOON')
    parser.add_argument('--camera', default='auto', help='auto (webcams qui voient la cible, une ou deux), numero de webcam (1), deux numeros (1,2), adresse IP Webcam, URL rtsp://..., ou dossier d images (essai)')
    parser.add_argument('--port', type=int, default=PORT)
    parser.add_argument('--modele', default='weights.pt')
    parser.add_argument('--origine', help='adresse de l appli si ce n est pas celle de Cloudflare (ex. http://192.168.1.20:4173)')
    parser.add_argument('--definition', help='definition demandee a la webcam, ex. 1920x1080 (sinon celle par defaut, souvent 640x480)')
    parser.add_argument('--confiance', type=float, default=0.15, help='confiance minimale d une detection (0.25 dans Dart Sense) : plus bas = plus de flechettes vues, plus de fausses')
    parser.add_argument('--sans-fenetre', action='store_true', help='pas de fenetre de controle')
    run(parser.parse_args())


if __name__ == '__main__':
    main()
