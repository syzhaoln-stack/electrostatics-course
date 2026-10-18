"""Verify rendered frame completeness and the film's physical drawing contract."""
import json
import math
import struct
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'media/lesson-dialogues/production/v3-6/coulomb/renders'
data = json.loads((OUT / 'projection.json').read_text(encoding='utf-8'))
shots = data['shots']
expected = {
    'whole': 64, 'materials': 64, 'charge': 64, 'wire': 64,
    'knob': 64, 'knob-0': 64, 'knob-126': 64, 'knob-567': 64,
    'measure-0': 64, 'measure-126': 64, 'measure-567': 64,
    'active': 96, 'knob-active': 96,
    'equiv-passive': 64, 'equiv-active': 64, 'passive-readout': 64,
}
assert set(shots) == set(expected), 'Missing or unexpected shot projections'
count = 0
for name, length in expected.items():
    frames = shots[name]
    assert len(frames) == length, (name, len(frames), length)
    pngs = sorted((OUT / name).glob('*.png'))
    assert len(pngs) == length, (name, len(pngs), length)
    for i, png in enumerate(pngs):
        assert png.name == f'{i:04}.png', (name, png.name)
        with png.open('rb') as stream:
            header = stream.read(24)
        assert header[:8] == b'\x89PNG\r\n\x1a\n', png
        assert struct.unpack('>II', header[16:24]) == (1920, 1080), png
        count += 1
    for frame in frames:
        assert math.isclose(frame['twist_deg'], frame['alpha_deg'] + frame['beta_deg'], abs_tol=1e-9)
        for point in frame['points'].values():
            assert math.isfinite(point['x']) and math.isfinite(point['y'])
    # These stationary model parts cannot translate when a torsion angle changes.
    for point_name in ['wire_top', 'wire_bottom', 'upper_clamp', 'lower_clamp', 'needle_center', 'zero']:
        assert all(frame['points'][point_name] == frames[0]['points'][point_name] for frame in frames), (name, point_name)

for suffix, alpha, beta in [('0', 36, 0), ('126', 18, 126), ('567', 8.5, 567)]:
    for prefix in ['measure', 'knob']:
        end = shots[f'{prefix}-{suffix}'][-1]
        assert math.isclose(end['alpha_deg'], alpha, abs_tol=1e-9)
        assert math.isclose(end['beta_deg'], beta, abs_tol=1e-9)
    final = shots[f'measure-{suffix}'][19]
    for frame in shots[f'measure-{suffix}'][20:]:
        assert frame['alpha_deg'] == final['alpha_deg']
        assert frame['beta_deg'] == final['beta_deg']

assert all(frame['alpha_deg'] == 36 for frame in shots['materials'])
assert hashlib.sha256((OUT / 'materials/0000.png').read_bytes()).digest() == hashlib.sha256((OUT / 'materials/0063.png').read_bytes()).digest()

for low, top in zip(shots['active'], shots['knob-active']):
    assert all(low[key] == top[key] for key in ['u', 'alpha_deg', 'beta_deg', 'twist_deg'])
assert shots['active'][0]['alpha_deg'] == 8.5
assert shots['active'][0]['beta_deg'] == 0
assert shots['active'][-1]['alpha_deg'] == 8.5
assert shots['active'][-1]['beta_deg'] == 567
assert max(frame['alpha_deg'] for frame in shots['active']) == 36

for passive, active in zip(shots['equiv-passive'], shots['equiv-active']):
    assert passive['u'] == active['u']
    assert passive['beta_deg'] == 0
    assert math.isclose(passive['twist_deg'], active['twist_deg'], abs_tol=1e-9)
    assert passive['points']['wire_top'] == active['points']['wire_top']
    assert passive['points']['wire_bottom'] == active['points']['wire_bottom']
assert shots['wire'][0]['alpha_deg'] == shots['wire'][-1]['alpha_deg'] == 0
for i, theta in [(0, 0), (21, 36), (42, 144), (63, 575.5)]:
    frame = shots['passive-readout'][i]
    assert math.isclose(frame['alpha_deg'], theta, abs_tol=1e-9)
    assert frame['beta_deg'] == 0

report = {'shots': len(shots), 'frames': count, 'dimensions': [1920, 1080],
          'verified': ['complete frame sequences', 'fixed axes and zero reference',
                       'historical final readings', 'hold phases',
                       'matched active top and bottom views', 'equal relative twist']}
(OUT / 'verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
