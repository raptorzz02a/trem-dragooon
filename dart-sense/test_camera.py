# Test de connexion camera pour dart-sense
# Usage : python test_camera.py            -> essaie les webcams USB et les adresses Wi-Fi courantes
#         python test_camera.py <source>   -> teste une source precise (ex: 1 ou rtsp://192.168.1.254/live)
import sys
import cv2

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


if len(sys.argv) > 1:
    arg = sys.argv[1]
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
