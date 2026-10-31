"""Dart Sense -> TREM-DRAGOOON.

Lit la camera, repere chaque flechette plantee avec le modele de Dart Sense (weights.pt)
et la met a disposition de l'appli sur ce PC : http://127.0.0.1:55445.
L'appli (onglet ouvert sur la borne) interroge ce serveur et saisit la flechette
comme si on avait tape sur le pave. Quand les flechettes sont retirees de la cible,
un evenement « retrait » termine la volee.

A copier dans le dossier de Dart Sense (a cote de get_scores.py et weights.pt), puis :
    python trem_sense.py --camera 1
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

    def __init__(self, score, events, repeat=3, window=5):
        self.score = score  # coordonnees (N, 2) -> liste de codes ('T20', 'SB', 'miss'...)
        self.events = events
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
            if all(np.linalg.norm(pred - d) > SAME_DART for d in self.darts):
                code = self.score(np.array([pred]))[0]
                self.darts.append(pred)
                self.codes.append(code)
                self.events.add('flechette', volee=self.visit, rang=len(self.darts), code=code, flechette=dart_of(code))

    def _stable(self):
        """Positions vues sur au moins `repeat` images recentes, de la plus vue a la moins vue."""
        groups = []
        for frame in self.frames:
            for pred in frame:
                for g in groups:
                    if np.linalg.norm(pred - g[0]) < SAME_DART:
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


def frames_from(source, size=None):
    """Images de la camera (numero de webcam, adresse IP Webcam, URL rtsp/http) ou d'un dossier d'images (essai)."""
    import cv2

    if os.path.isdir(source):
        # Essai sans camera : chaque image est repetee comme si elle restait devant l'objectif.
        files = sorted(f for f in os.listdir(source) if f.lower().endswith(('.png', '.jpg', '.jpeg')))
        for name in files:
            frame = cv2.imread(os.path.join(source, name))
            print('Image', name)
            for _ in range(6):
                yield frame
        return

    if source.isdigit():
        cap = cv2.VideoCapture(int(source), cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)
    else:
        cap = cv2.VideoCapture(source if '://' in source else 'http://' + source + '/video')
    if not cap.isOpened():
        raise ConnectionError(f'Impossible d ouvrir la camera : {source}')
    if size:
        # Demande une definition plus fine a la webcam (elle donne la plus proche qu'elle sait faire).
        w, h = (int(v) for v in size.lower().split('x'))
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    print(f'Camera : {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}')
    # Lecture dans un thread : on analyse toujours l'image la plus recente (pas de retard qui s'accumule).
    latest = {'frame': None, 'id': 0, 'running': True, 'time': time.time()}

    def reader():
        while latest['running']:
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.01)
                continue
            latest['frame'], latest['time'] = frame, time.time()
            latest['id'] += 1

    threading.Thread(target=reader, daemon=True).start()
    last = 0
    try:
        while True:
            if latest['id'] == last:
                if time.time() - latest['time'] > 10:
                    print('Plus d image de la camera depuis 10 s, arret.')
                    return
                time.sleep(0.005)
                continue
            last = latest['id']
            yield latest['frame']
    finally:
        latest['running'] = False
        cap.release()


def run(args):
    import cv2
    from ultralytics import YOLO
    from get_scores import GetScores

    model = YOLO(args.modele)
    scorer = GetScores(args.modele)
    events = Events()
    tracker = VisitTracker(lambda coords: scorer.score(coords.copy())[0], events)
    serve(events, args.port, ORIGINS + ([args.origine] if args.origine else []))
    print(f'Dart Sense pret pour TREM-DRAGOOON : http://127.0.0.1:{args.port} (q dans la fenetre pour quitter)')

    last_time = time.time()
    for frame in frames_from(args.camera, args.definition):
        h, w = frame.shape[:2]
        size = min(h, w)
        x0, y0 = (w - size) // 2, (h - size) // 2
        # Le modele a ete entraine sur des images carrees ou la cible remplit le cadre.
        square = frame[y0:y0 + size, x0:x0 + size]
        result = model(square, conf=args.confiance, verbose=False)[0]
        calibration, darts = scorer.process_yolo_output(result)
        now = time.time()
        fps = round(1 / max(now - last_time, 1e-3), 1)
        last_time = now

        found = np.count_nonzero(np.all(calibration != -1, axis=1))
        if found < 4:
            # Cible non reperee (quelqu'un devant, mauvais cadrage) : on ne compte rien, sinon on croirait a un retrait.
            events.set_status(camera='cible', fps=fps, volee=tracker.codes)
            coords = None
        else:
            H = scorer.find_homography(calibration, size)
            darts = darts[np.all((darts >= 0) & (darts <= 1), axis=1)] if len(darts) else darts
            coords = scorer.transform_to_boardplane(H[0], darts, size) if len(darts) else np.zeros((0, 2))
            tracker.feed(coords)
            events.set_status(camera='ok', fps=fps, volee=tracker.codes)

        if not args.sans_fenetre:
            view = square.copy()
            th = max(1, size // 400)
            for box, k, c in zip(result.boxes.xywh.tolist(), result.boxes.cls.tolist(), result.boxes.conf.tolist()):
                color = (0, 200, 255) if int(k) == 4 else (0, 255, 0)
                cv2.circle(view, (int(box[0]), int(box[1])), 6 * th, color, th)
                if int(k) == 4:
                    cv2.putText(view, f'{c:.2f}', (int(box[0]) + 8 * th, int(box[1])), cv2.FONT_HERSHEY_SIMPLEX, 0.8 * th, color, 2 * th)
            text = ' '.join(tracker.codes) if coords is not None else 'Cible non reperee : remplis le cadre'
            cv2.putText(view, f'{text}  ({fps} img/s)', (10, 40 * th), cv2.FONT_HERSHEY_SIMPLEX, th, (0, 0, 255), 2 * th)
            scale = 600 / size
            cv2.imshow('Dart Sense - TREM-DRAGOOON', cv2.resize(view, None, fx=scale, fy=scale))
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            if key == ord('s'):
                # Image brute de la camera, pour analyser une flechette mal lue.
                os.makedirs('captures', exist_ok=True)
                name = os.path.join('captures', time.strftime('%Y%m%d-%H%M%S') + '.png')
                cv2.imwrite(name, frame)
                print('Image enregistree :', os.path.abspath(name))
    events.set_status(camera='arretee')


def main():
    parser = argparse.ArgumentParser(description='Dart Sense pour TREM-DRAGOOON')
    parser.add_argument('--camera', default='0', help='numero de webcam (0, 1...), adresse IP Webcam, URL rtsp://..., ou dossier d images (essai)')
    parser.add_argument('--port', type=int, default=PORT)
    parser.add_argument('--modele', default='weights.pt')
    parser.add_argument('--origine', help='adresse de l appli si ce n est pas celle de Cloudflare (ex. http://192.168.1.20:4173)')
    parser.add_argument('--definition', help='definition demandee a la webcam, ex. 1920x1080 (sinon celle par defaut, souvent 640x480)')
    parser.add_argument('--confiance', type=float, default=0.15, help='confiance minimale d une detection (0.25 dans Dart Sense) : plus bas = plus de flechettes vues, plus de fausses')
    parser.add_argument('--sans-fenetre', action='store_true', help='pas de fenetre de controle')
    run(parser.parse_args())


if __name__ == '__main__':
    main()
