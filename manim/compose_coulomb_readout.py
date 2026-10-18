"""39-second Blender follow readout, synchronized with the web graph.

Blender already eases the poses: map time to u linearly, then read projected
sphere separation and cumulative torsion. Never treat lower angle as distance.
"""
import json, math, subprocess, sys
from PIL import Image, ImageDraw
import compose_coulomb_v36 as film

ROOT = film.ROOT
OUT, WORK = film.PUBLIC, film.WORK
W, H, FPS = 640, 780, 24
DURATION = 39
LEAD_IN, READING_DURATION = .4, 12
APPROACH_AT, FOLLOW_AT, FORCE_AT, POINT_AT, FIT_AT = 1.8, 3, 8.2, 9.8, 36.4
BG, CYAN, GOLD, INK, MUTED = film.BG, film.CYAN, film.GOLD, film.INK, film.MUTED
CORAL = film.CORAL
SUFFIXES = ('0', '126', '567')
WHOLE_BOX, WHOLE_CROP = (10, 146, 204, 610), (780, 140, 1140, 1000)
CLOSE_BOX, CLOSE_CROP = (210, 220, 632, 580), (220, 0, 1700, 1080)


def readout_state(t):
    """Match COULOMB_FIT_TIMING, with no second ease."""
    if not math.isfinite(t):
        raise ValueError('Readout time must be finite')
    t = max(0, min(DURATION, t))
    if t < LEAD_IN:
        trial, local, phase = 0, 0, 'ready'
    elif t >= FIT_AT:
        trial, local, phase = 2, READING_DURATION, 'fit'
    else:
        trial = min(2, int((t - LEAD_IN) / READING_DURATION))
        local = t - LEAD_IN - trial * READING_DURATION
        phase = ('distance' if local < APPROACH_AT else 'approach' if local < FOLLOW_AT
                 else 'follow' if local < FORCE_AT else 'force' if local < POINT_AT else 'point')
    if local < APPROACH_AT:
        u = 0
    elif local < FOLLOW_AT:
        u = .16 * (local - APPROACH_AT) / (FOLLOW_AT - APPROACH_AT)
    elif local < FORCE_AT:
        u = .16 + .7 * (local - FOLLOW_AT) / (FORCE_AT - FOLLOW_AT)
    else:
        u = 1
    return {'time': t, 'trial': trial, 'local': local, 'phase': phase, 'u': max(0, min(1, u))}


def _key_points(record):
    points = record['points']
    source = points.get('driving_ball', points.get('source_ball'))
    if source is None:
        raise KeyError('The follow shot must contain the visible driving/source ball')
    return points, source, points['moving_ball']


def readout_values(state):
    """Exact web readouts; unlike image interpolation these have no sample error.

    This single smoothstep evaluates the same Blender trajectory. It never feeds
    an eased u back into footage, so motion is not eased twice.
    """
    trial, local = state['trial'], state['local']
    approach = film.ease((local - APPROACH_AT) / (FOLLOW_AT - APPROACH_AT))
    follow = film.ease((local - FOLLOW_AT) / (FORCE_AT - FOLLOW_AT))
    previous_theta, target_theta = (0, 36, 144)[trial], (36, 144, 575.5)[trial]
    previous_gap, target_gap = (72, 36, 18)[trial], (36, 18, 8.5)[trial]
    return {'twist_deg': previous_theta + (target_theta - previous_theta) * follow,
            'separation_deg': previous_gap + (target_gap - previous_gap) * approach}


def _ball_key(d, x, y, label, color):
    d.ellipse((x, y + 5, x + 10, y + 15), fill=color)
    film.text(d, (x + 19, y - 2), label, 22, color)


def frame(t):
    state = readout_state(t)
    trial, local, phase, u = (state[k] for k in ('trial', 'local', 'phase', 'u'))
    suffix = SUFFIXES[trial]
    img = Image.new('RGB', (W, H), BG)
    whole = film.footage(img, f'passive-follow-{suffix}', u, WHOLE_BOX, WHOLE_CROP)
    close = film.footage(img, f'passive-follow-close-{suffix}', u, CLOSE_BOX, CLOSE_CROP)
    d = ImageDraw.Draw(img)
    p, source, moving = _key_points(close)
    values = readout_values(state)
    separation, twist = values['separation_deg'], values['twist_deg']
    # The third shot intentionally has 64 whole and 128 close samples. Their
    # independently interpolated angles can differ slightly from the exact curve.
    if abs(close['twist_deg'] - whole['twist_deg']) > .2:
        raise ValueError('Whole-wire and sphere close-up poses are not synchronized')
    if any(abs(record['twist_deg'] - twist) > .2 for record in (whole, close)):
        raise ValueError('Rendered torsion disagrees with the common animation clock')

    film.text(d, (28, 25), '上端固定 · 施力球跟随', 29, INK)
    phase_labels = {'ready': '看清两颗球，再看银丝', 'distance': '两球保持当前间隔',
                    'approach': '施力球靠近', 'follow': '两球转动，银丝继续扭紧',
                    'force': '达到平衡，读出斥力', 'point': '把这次读数放到图上',
                    'fit': '三次平衡，三个测量点'}
    film.text(d, (29, 77), f'第 {trial + 1} 次  /  {phase_labels[phase]}', 21, MUTED)

    top = whole['points']['upper_clamp']
    film.text(d, (107, 120), '上端不动', 21, GOLD, 'ma')
    d.line((top[0] - 25, top[1] - 6, top[0] + 25, top[1] - 6), fill=GOLD, width=3)
    for x in range(round(top[0] - 25), round(top[0] + 25), 10):
        d.line((x, top[1] - 6, x - 6, top[1] - 14), fill=GOLD, width=2)
    film.text(d, (220, 151), '同一装置 · 双球近景', 22, MUTED)
    _ball_key(d, 224, 190, '施力球', GOLD)
    _ball_key(d, 423, 190, '活动球', CORAL)

    # Repulsion is already rendered along the true sphere chord. Add no arrow.
    film.glow(d, source, 9, GOLD, 2)
    film.glow(d, moving, 9, CORAL, 2)
    arc = [p[f'gap_arc_{i:02}'] for i in range(17)]
    d.line(arc, fill=CYAN, width=2)
    lower = whole['points']['lower_clamp']
    film.glow(d, lower, 12, CYAN, 1)
    film.dashed(d, (lower[0] + 15, lower[1]), (212, 558), '#4a6065', 1)

    # Independent readings sit below the images, never over the thin wire.
    d.line((28, 622, 612, 622), fill='#29383c', width=1)
    film.text(d, (30, 638), '两球夹角', 23, CYAN)
    film.text(d, (332, 638), '银丝累计扭转', 23, GOLD)
    film.text(d, (30, 672), f'{separation:.1f}°', 40, CYAN)
    film.text(d, (332, 672), f'{twist:.1f}°', 40, GOLD)
    if phase in ('force', 'point', 'fit'):
        relative = film.REL['points'][trial]
        film.text(d, (30, 733), f'相对距离 {relative["distanceRatio"]:.2f}', 21, MUTED)
        film.text(d, (332, 733), f'斥力 {relative["forceLabel"]}', 24, GOLD)
    else:
        film.text(d, (30, 733), '两球间距看夹角', 21, MUTED)
        film.text(d, (332, 733), '平衡后比较斥力', 21, MUTED)
    if phase == 'point':
        alpha = max(0, 1 - (local - POINT_AT) / .8)
        if alpha:
            base = tuple(int(CYAN[k:k + 2], 16) for k in (1, 3, 5))
            col = tuple(round(channel * alpha) for channel in base)
            d.rectangle((5, 5, W - 5, H - 5), outline=col, width=2)
    return img


def validate_renders():
    """Reject incomplete render sets and old passive-shot fallbacks in delivery."""
    for prefix in ('passive-follow-', 'passive-follow-close-'):
        for trial, suffix in enumerate(SUFFIXES):
            shot = prefix + suffix
            seq = film.PROJECTIONS.get(shot, [])
            if len(seq) < 64:
                raise RuntimeError(f'Follow render metadata incomplete: {shot}')
            for i, record in enumerate(seq):
                if not film.frame_path(shot, i).exists():
                    raise RuntimeError(f'Follow image not rendered yet: {shot}/{i:04}.png')
                if abs(record['beta_deg']) > 1e-8:
                    raise ValueError(f'Upper end must stay fixed: {shot}/{i:04}')
                _key_points(record)
                if 'separation_deg' not in record:
                    raise ValueError(f'Separation angle missing: {shot}/{i:04}')
            previous, target = (0, 36, 144)[trial], (36, 144, 575.5)[trial]
            previous_gap, target_gap = (72, 36, 18)[trial], (36, 18, 8.5)[trial]
            checks = ((seq[0]['twist_deg'], previous), (seq[-1]['twist_deg'], target),
                      (seq[0]['separation_deg'], previous_gap), (seq[-1]['separation_deg'], target_gap))
            if any(abs(a - b) > 1e-6 for a, b in checks):
                raise ValueError(f'Follow endpoints disagree with observations: {shot}')


def main():
    if '--preview' in sys.argv:
        times = [.7, 2.8, 5.7, 8.9, 10.5, 12.7, 14.8, 17.7, 20.9,
                 22.5, 24.7, 26.8, 29.7, 32.9, 34.5, 38]
        for i, t in enumerate(times):
            try:
                state = readout_state(t)
                for prefix in ('passive-follow-', 'passive-follow-close-'):
                    shot = prefix + SUFFIXES[state['trial']]
                    if len(film.PROJECTIONS.get(shot, [])) < 64:
                        raise FileNotFoundError(f'{shot} metadata pending')
                    left, right, _, _ = film.sample(shot, state['u'])
                    if not all(film.frame_path(shot, index).exists() for index in (left, right)):
                        raise FileNotFoundError(shot)
                frame(t).save(WORK / f'readout-follow-{i:02}.jpg', quality=94)
                print(f'Preview {i:02} at {t:.1f}s', flush=True)
            except (KeyError, FileNotFoundError) as error:
                print(f'Pending follow preview {i:02}: {error}', flush=True)
        return
    validate_renders()
    log = (WORK / 'readout-follow-encode.log').open('w')
    proc = subprocess.Popen([film.FFMPEG, '-hide_banner', '-loglevel', 'warning', '-y',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
        '-an', '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-threads', '2', '-g', '12',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(OUT / 'coulomb-readout.mp4')],
        stdin=subprocess.PIPE, stderr=log)
    try:
        for i in range(DURATION * FPS):
            proc.stdin.write(frame(i / FPS).tobytes())
    finally:
        proc.stdin.close()
    if proc.wait():
        raise RuntimeError('Follow readout encoding failed')
    frame(20.9).save(OUT / 'coulomb-readout.poster.jpg', quality=94)
    (OUT / 'coulomb-readout.manifest.json').write_text(json.dumps({
        'duration': DURATION, 'width': W, 'height': H, 'fps': FPS,
        'picture': 'Blender native-HD follow footage: whole wire and synchronized two-sphere close-up throughout',
        'timing': {'leadIn': LEAD_IN, 'readingDuration': READING_DURATION, 'approachAt': APPROACH_AT,
                   'followAt': FOLLOW_AT, 'forceAt': FORCE_AT, 'pointAt': POINT_AT, 'fitStart': FIT_AT},
        'animation_easing': 'Linear time-to-u mapping; smoothstep already baked into the Blender poses',
        'force_arrow': 'Rendered along the actual sphere-centre chord; fixed display length, not force magnitude',
        'meaning': 'Explanatory fixed-upper-end reference, not a historical measured motion or dynamic solution. '
                   'Separation angle determines distance; cumulative relative wire torsion determines restoring torque. '
                   'Force ratios use the stated small-angle, approximately constant-moment-arm comparison at equilibrium.',
        'previous_torsions_degrees': [0, 36, 144], 'final_torsions_degrees': [36, 144, 575.5],
        'previous_separations_degrees': [72, 36, 18], 'final_separations_degrees': [36, 18, 8.5]
    }, ensure_ascii=False, indent=2), encoding='utf8')
    print('Installed 39s Blender follow readout clip', flush=True)


if __name__ == '__main__':
    main()
