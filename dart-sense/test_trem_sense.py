"""Tests sans camera ni modele : python -m unittest test_trem_sense (depuis ce dossier)."""

import json
import threading
import unittest
import urllib.request

import numpy as np

from trem_sense import Events, VisitTracker, dart_of, fuse, position_of, serve

A, B, C = [0.3, 0.3], [0.6, 0.6], [0.5, 0.2]


def tracker():
    events = Events()
    codes = {tuple(A): 'T20', tuple(B): 'S5', tuple(C): 'DB'}
    score = lambda coords: [codes[min(codes, key=lambda k: abs(k[0] - c[0]) + abs(k[1] - c[1]))] for c in coords]
    return VisitTracker(score, events), events


class VisitTrackerTest(unittest.TestCase):
    def test_dart_counted_after_three_frames_once(self):
        t, events = tracker()
        t.feed([A])
        t.feed([A])
        self.assertEqual(events.items, [])
        for _ in range(5):
            t.feed([[A[0] + 0.002, A[1]]])
        self.assertEqual([(e['type'], e['code'], e['rang']) for e in events.items], [('flechette', 'T20', 1)])

    def test_full_visit_then_takeout(self):
        t, events = tracker()
        for frame in [[A]] * 3 + [[A, B]] * 3 + [[A, B, C]] * 3 + [[]] * 3:
            t.feed(frame)
        kinds = [(e['type'], e.get('code'), e['volee']) for e in events.items]
        self.assertEqual(kinds, [('flechette', 'T20', 1), ('flechette', 'S5', 1), ('flechette', 'DB', 1), ('retrait', None, 1)])
        self.assertEqual(events.items[1]['flechette'], {'segment': 5, 'multiplier': 1})
        # Position en mm depuis le centre : B est en bas a droite.
        self.assertEqual(events.items[1]['position'], {'x': 45.1, 'y': 45.1})
        # Volee suivante : on repart de zero.
        for frame in [[B]] * 3:
            t.feed(frame)
        self.assertEqual((events.items[-1]['volee'], events.items[-1]['rang']), (2, 1))

    def test_no_takeout_without_darts_or_on_short_gap(self):
        t, events = tracker()
        for _ in range(10):
            t.feed([])
        self.assertEqual(events.items, [])
        for frame in [[A]] * 3 + [[]] * 2 + [[A]]:
            t.feed(frame)
        self.assertEqual([e['type'] for e in events.items], ['flechette'])

    def test_flicker_is_not_a_dart(self):
        t, events = tracker()
        for frame in [[A], [B], [C], [A], [B]]:
            t.feed(frame)
        self.assertEqual(events.items, [])


class FuseTest(unittest.TestCase):
    def test_two_cameras(self):
        left = [[0.300, 0.300], [0.600, 0.600]]
        right = [[0.310, 0.302], [0.500, 0.200]]  # la 2e flechette de gauche est cachee pour la droite
        fused = sorted(map(tuple, fuse([left, right]).round(3)))
        self.assertEqual(fused, [(0.305, 0.301), (0.5, 0.2), (0.6, 0.6)])

    def test_close_darts_of_one_camera_stay_apart(self):
        # Deux flechettes serrees dans le T20, vues par les deux cameras : toujours deux flechettes.
        left = [[0.450, 0.250], [0.462, 0.240]]
        right = [[0.452, 0.251], [0.463, 0.238]]
        self.assertEqual(len(fuse([left, right])), 2)
        self.assertEqual(len(fuse([left])), 2)

    def test_one_camera_or_none(self):
        self.assertEqual(fuse([[A, B]]).tolist(), [A, B])
        self.assertEqual(fuse([np.zeros((0, 2)), np.zeros((0, 2))]).shape, (0, 2))

    def test_jitter_does_not_double_count(self):
        # Fusion qui bouge de 0,012 quand une camera perd la flechette : toujours une seule flechette.
        t, events = tracker()
        t.same = 0.015
        for frame in [[[0.300, 0.300]], [[0.312, 0.300]], [[0.300, 0.300]], [[0.312, 0.300]], [[0.300, 0.300]], [[0.312, 0.300]]]:
            t.feed(frame)
        self.assertEqual([e['type'] for e in events.items], ['flechette'])


class DartOfTest(unittest.TestCase):
    def test_codes(self):
        self.assertEqual(dart_of('T20'), {'segment': 20, 'multiplier': 3})
        self.assertEqual(dart_of('D16'), {'segment': 16, 'multiplier': 2})
        self.assertEqual(dart_of('SB'), {'segment': 25, 'multiplier': 1})
        self.assertEqual(dart_of('DB'), {'segment': 25, 'multiplier': 2})
        self.assertEqual(dart_of('miss'), {'segment': 0, 'multiplier': 1})


class PositionTest(unittest.TestCase):
    def test_mm_from_center(self):
        self.assertEqual(position_of([0.5, 0.5]), {'x': 0.0, 'y': 0.0})
        # Haut du double 20 : 170 mm au-dessus du centre.
        self.assertEqual(position_of([0.5, 0.5 - 170 / 451]), {'x': 0.0, 'y': -170.0})


class ServerTest(unittest.TestCase):
    def test_long_poll_and_origin(self):
        events = Events()
        server = serve(events, 0, ['https://exemple.dev'])
        base = f'http://127.0.0.1:{server.server_address[1]}'
        threading.Timer(0.2, lambda: events.add('flechette', volee=1, rang=1, code='S1', flechette=dart_of('S1'))).start()
        req = urllib.request.Request(base + '/flechettes?apres=0&attente=5', headers={'Origin': 'https://exemple.dev'})
        with urllib.request.urlopen(req) as res:
            body = json.load(res)
            self.assertEqual(res.headers['Access-Control-Allow-Origin'], 'https://exemple.dev')
        self.assertEqual([e['code'] for e in body['evenements']], ['S1'])
        with urllib.request.urlopen(base + '/etat') as res:
            self.assertEqual(json.load(res)['dernier'], 1)
        bad = urllib.request.Request(base + '/etat', headers={'Origin': 'https://pirate.example'})
        with self.assertRaises(urllib.error.HTTPError) as err:
            urllib.request.urlopen(bad)
        self.assertEqual(err.exception.code, 403)
        server.shutdown()


if __name__ == '__main__':
    unittest.main()
