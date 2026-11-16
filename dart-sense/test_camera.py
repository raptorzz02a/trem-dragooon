# Test de connexion camera pour dart-sense
# Usage : python test_camera.py            -> essaie les webcams USB et les adresses Wi-Fi courantes
#         python test_camera.py <source>   -> teste une source precise (ex: 1 ou rtsp://192.168.1.254/live)
#         python test_camera.py 1 2        -> ouvre les cameras 1 et 2 EN MEME TEMPS (640x480, MJPG)
#         python test_camera.py 1 2 320x240 15  -> idem en 320x240 a 15 img/s (si une image reste noire)
import sys
import time
import cv2
import numpy as np

USB = [0, 1, 2, 3]
WIFI = [
    'rtsp://192.168.1.254/xxxx.mov',
    'http://192.168.1.254:8192',
    'rtsp://192.168.1.254/live',
    'rtsp://192.168.1.1/live',
    'rtsp://192.168.1.1:554/',
    'rtsp://192.168.42.1/live',
    'rtsp://192.168.0.1/live',
]


def try_source(src):
    if isinstance(src, int):
        cap = cv2.VideoCapture(src, cv2.CAP_DSHOW)
    else:
        cap = cv2.VideoCapture(src, cv2.CAP_FFMPEG, [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 4000, cv2.CAP_PROP_READ_TIMEOUT_MSEC, 4000])
    ok, frame = cap.read() if cap.isOpened() else (False, None)
    if ok:
        print(f'OK   {src}  ->  image {frame.shape[1]}x{frame.shape[0]}')
    else:
        print(f'--   {src}')
    return cap if ok else None


def show(src, cap):
    print(f'\nApercu de {src} (touche Q pour fermer)')
    print(f'Dans Dart Sense, tape dans le champ Webcam IP : {src}')
    while True:
        ok, frame = cap.read()
        if not ok:
            print('Flux interrompu.')
            break
        scale = 800 / max(frame.shape[:2])
        cv2.imshow(f'Test camera : {src}', cv2.resize(frame, None, fx=scale, fy=scale))
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    cap.release()
    cv2.destroyAllWindows()


# ---------- Mode deux cameras en meme temps (hub USB) ----------

def open_small(index, w, h, fps):
    """Ouvre une webcam en MJPG basse definition pour economiser la bande passante USB.
    Important : le format MJPG doit etre demande AVANT la taille."""
    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        return None
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, w)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, h)
    if fps:
        cap.set(cv2.CAP_PROP_FPS, fps)
    code = int(cap.get(cv2.CAP_PROP_FOURCC))
    fourcc = ''.join(chr((code >> (8 * i)) & 0xFF) for i in range(4)) if code else '?'
    rw, rh = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f'Camera {index} ouverte : {rw}x{rh}, format {fourcc.strip() or "?"}'
          + ('' if fourcc.strip().upper() == 'MJPG' else '  (MJPG refuse -> plus gourmand en USB)'))
    return cap


def is_blank(frame):
    return frame is None or frame.max() < 15  # image noire / vide


def label(img, text, color):
    cv2.putText(img, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 4)
    cv2.putText(img, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)


def dual(indexes, w, h, fps):
    print(f'\nOuverture des cameras {indexes} en {w}x{h} MJPG' + (f' a {fps} img/s' if fps else ''))
    caps = []
    for i in indexes:
        cap = open_small(i, w, h, fps)
        if cap is None:
            print(f'Camera {i} : impossible de l\'ouvrir.')
        caps.append(cap)
        time.sleep(0.5)  # laisse la premiere camera reserver sa bande passante

    print('\nApercu cote a cote (touche Q pour fermer).')
    count = [0] * len(caps)
    blank = [0] * len(caps)
    start = time.time()
    last_report = start
    while True:
        tiles = []
        for k, cap in enumerate(caps):
            frame = None
            if cap is not None:
                ok, frame = cap.read()
                frame = frame if ok else None
            if is_blank(frame):
                blank[k] += 1
                tile = np.zeros((h, w, 3), np.uint8)
                label(tile, f'Camera {indexes[k]} : IMAGE VIDE', (0, 0, 255))
            else:
                count[k] += 1
                tile = cv2.resize(frame, (w, h))
                label(tile, f'Camera {indexes[k]} : OK', (0, 255, 0))
            tiles.append(tile)
        view = np.hstack(tiles)
        if view.shape[1] > 1600:
            view = cv2.resize(view, None, fx=1600 / view.shape[1], fy=1600 / view.shape[1])
        cv2.imshow('Test 2 cameras', view)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
        now = time.time()
        if now - last_report >= 5:
            dt = now - start
            print('   '.join(f'Camera {indexes[k]} : {count[k] / dt:.1f} img/s, {blank[k]} vides'
                           for k in range(len(caps))))
            last_report = now

    for cap in caps:
        if cap is not None:
            cap.release()
    cv2.destroyAllWindows()
    dt = time.time() - start
    print('\nResultat :')
    for k in range(len(caps)):
        total = count[k] + blank[k]
        state = 'OK' if count[k] > 0 and blank[k] < total * 0.2 else 'PROBLEME (images vides)'
        print(f'  Camera {indexes[k]} : {count[k]} images bonnes, {blank[k]} vides -> {state}')
    if any(b > 0 for b in blank):
        print(f'\nSi une camera reste vide, essaie plus petit : python test_camera.py '
              f'{" ".join(map(str, indexes))} 320x240 15')


args = sys.argv[1:]
nums = [a for a in args if a.isdigit() and len(a) <= 2]
if len(nums) >= 2:
    size = next((a for a in args if 'x' in a.lower()), '640x480')
    w, h = (int(v) for v in size.lower().split('x'))
    rest = [a for a in args if a.isdigit() and a not in nums[:2]]
    fps = int(rest[0]) if rest else 0
    dual([int(n) for n in nums[:2]], w, h, fps)
    sys.exit()

if len(args) > 0:
    arg = args[0]
    sources = [int(arg)] if arg.isdigit() else [arg]
else:
    sources = USB + WIFI

found = []
for s in sources:
    cap = try_source(s)
    if cap is not None:
        found.append((s, cap))

if not found:
    print('\nAucune camera trouvee. Envoie-moi cette liste et le modele exact de la camera.')
else:
    print('\nSources trouvees :', ', '.join(str(s) for s, _ in found))
    for s, cap in found: # apercu de chaque source l'une apres l'autre
        show(s, cap)
