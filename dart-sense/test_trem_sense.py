"""Tests sans camera ni modele : python -m unittest test_trem_sense (depuis ce dossier)."""

import json
import threading
import unittest
import urllib.request

from trem_sense import Events, VisitTracker, dart_of, serve

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


class DartOfTest(unittest.TestCase):
    def test_codes(self):
        self.assertEqual(dart_of('T20'), {'segment': 20, 'multiplier': 3})
        self.assertEqual(dart_of('D16'), {'segment': 16, 'multiplier': 2})
        self.assertEqual(dart_of('SB'), {'segment': 25, 'multiplier': 1})
        self.assertEqual(dart_of('DB'), {'segment': 25, 'multiplier': 2})
        self.assertEqual(dart_of('miss'), {'segment': 0, 'multiplier': 1})


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
