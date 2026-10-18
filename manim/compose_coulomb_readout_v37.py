"""39 s readout: one solved motion drives Blender poses, numbers and web graph.

The source advances and pauses. The suspended sphere is the response, never a
prescribed constant-gap follower. All temporary media is written on C:; final
files replace the public assets only after encoding and decoding succeed.
"""
from pathlib import Path
from functools import lru_cache
import hashlib, json, math, re, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
C_ROOT = Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904')
RENDERS = C_ROOT / 'coulomb-v37-renders'
WORK = C_ROOT / 'coulomb-readout-v37'
OUT = ROOT / 'media/lesson-dialogues'
DATA_PATH = OUT / 'coulomb-motion-v37.json'
PROJECTION_PATH = RENDERS / 'projection-intuition.json'
FFMPEG = 'D:/Python tools/ffmpeg-6.0-full_build/bin/ffmpeg.exe'
FFPROBE = 'D:/Python tools/ffmpeg-6.0-full_build/bin/ffprobe.exe'
W, H, FPS = 640, 780, 24
TIMING = {'leadIn': .4, 'readingDuration': 12, 'twistAt': .2, 'followAt': .2,
          'followDuration': 9.4, 'motionAt': .2, 'motionDuration': 9.4,
          'forceAt': 9.6, 'pointAt': 10.4, 'fitStart': 36.4, 'fitDuration': 2.2, 'duration': 39}
BG, INK, MUTED, GOLD, CYAN, CORAL = '#090d10', '#efe9dc', '#9bafb0', '#e4bf7d', '#8bd2d7', '#ec9c85'
SUFFIXES = ('0', '126', '567')
FIELDS = ('t', 'twist_deg', 'separation_deg', 'source_angle_deg', 'speed_deg_s', 'source_speed_deg_s')
WHOLE_BOX, WHOLE_CROP = (4, 152, 180, 617), (756, 0, 1164, 1080)
CLOSE_BOX, CLOSE_CROP = (176, 174, 638, 616), (370, 0, 1550, 1080)


def export_motion(projections):
    trials = []
    for suffix in SUFFIXES:
        shot = 'pursuit-close-' + suffix
        rows = projections['shots'][shot]
        if len(rows) < 64:
            raise ValueError(f'Incomplete motion metadata: {shot}')
        trials.append({'shot': shot, 'duration': projections['durations'][shot],
                       'samples': [[round(float(row[key]), 9) for key in FIELDS] for row in rows]})
    data = {'version': '3.7.0', 'columns': list(FIELDS), 'timing': TIMING,
            'meaning': 'Source advances and pauses; needle angle is solved from a damped angular equation. '
                       'Times, inertia and damping are explanatory; final equilibria are calibrated to memoir observations.',
            'trials': trials}
    DATA_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf8')
    js_path = ROOT / 'coulomb-fit.js'
    js = js_path.read_text(encoding='utf8')
    body = 'const COULOMB_MOTION_TRIALS = ' + json.dumps(trials, ensure_ascii=False, separators=(',', ':')) + ';'
    js, count = re.subn(r'(?<=// BEGIN GENERATED COULOMB MOTION V37\n).*?(?=\n// END GENERATED COULOMB MOTION V37)', body, js, flags=re.S)
    if count != 1:
        raise ValueError('The web motion-table markers must occur exactly once')
    js_path.write_text(js, encoding='utf8')
    fit_path = ROOT / 'coulomb-fit-data.json'
    fit = json.loads(fit_path.read_text(encoding='utf8'))
    fit['timelineSeconds'] = TIMING
    fit_path.write_text(json.dumps(fit, ensure_ascii=False, indent=2), encoding='utf8')
    return data


def state_at(t):
    if not math.isfinite(t):
        raise ValueError('Timeline must be finite')
    t = max(0, min(TIMING['duration'], t))
    if t < TIMING['leadIn']:
        trial, local, phase = 0, 0, 'ready'
    elif t >= TIMING['fitStart']:
        trial, local, phase = 2, 12, 'fit'
    else:
        trial = min(2, int((t - TIMING['leadIn']) / TIMING['readingDuration']))
        local = t - TIMING['leadIn'] - trial * TIMING['readingDuration']
        phase = ('distance' if local < TIMING['motionAt'] else 'motion' if local < TIMING['forceAt']
                 else 'force' if local < TIMING['pointAt'] else 'point')
    u = max(0, min(1, (local - TIMING['motionAt']) / TIMING['motionDuration']))
    return {'time': t, 'trial': trial, 'local': local, 'phase': phase, 'u': u}


@lru_cache(None)
def font(size):
    return ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', size)


def text(draw, xy, value, size=24, color=INK, anchor=None):
    draw.text(xy, str(value), font=font(size), fill=color, anchor=anchor)


def glow(draw, point, radius, color, width=2):
    x, y = point
    draw.ellipse((x-radius, y-radius, x+radius, y+radius), outline=color, width=width)


def nearest_index(u, count):
    # Match JavaScript Math.round for nonnegative progress, including half frames.
    return min(count - 1, max(0, math.floor(u * (count - 1) + .5)))


@lru_cache(maxsize=8)
def load_frame(shot, index):
    with Image.open(RENDERS / shot / f'{index:04}.png') as image:
        return image.convert('RGB')


def paste_pose(image, projections, shot, index, box, crop):
    row = projections['shots'][shot][index]
    source = load_frame(shot, index)
    scale = min((box[2]-box[0])/(crop[2]-crop[0]), (box[3]-box[1])/(crop[3]-crop[1]))
    size = (round((crop[2]-crop[0])*scale), round((crop[3]-crop[1])*scale))
    offset = (round(box[0]+(box[2]-box[0]-size[0])/2), round(box[1]+(box[3]-box[1]-size[1])/2))
    image.paste(source.crop(crop).resize(size, Image.Resampling.LANCZOS), offset)
    return {key: (offset[0]+(point['x']-crop[0])*scale, offset[1]+(point['y']-crop[1])*scale)
            for key, point in row['points'].items()}


def frame(t, projections, motion):
    state = state_at(t)
    trial, phase = state['trial'], state['phase']
    track = motion['trials'][trial]
    index = nearest_index(state['u'], len(track['samples']))
    simulation_t, twist, gap, source_deg, speed, source_speed = track['samples'][index]
    row = projections['shots'][track['shot']][index]
    if max(abs(row[key]-value) for key, value in zip(FIELDS, track['samples'][index])) > 1e-7:
        raise ValueError('Web numbers must come from the displayed close-up pose')
    # The whole-wire render concatenates these same three ODE trajectories.
    cumulative_t = simulation_t + sum(item['duration'] + 1/480 for item in motion['trials'][:trial])
    wire_rows = projections['shots']['pursuit-wire']
    wire_index = min(range(len(wire_rows)), key=lambda i: abs(wire_rows[i]['t'] - cumulative_t))
    image = Image.new('RGB', (W, H), BG)
    wp = paste_pose(image, projections, 'pursuit-wire', wire_index, WHOLE_BOX, WHOLE_CROP)
    cp = paste_pose(image, projections, track['shot'], index, CLOSE_BOX, CLOSE_CROP)
    draw = ImageDraw.Draw(image)
    text(draw, (26, 24), '先靠近，再看它退开', 30)
    if phase in ('force', 'point', 'fit'):
        explanation = '停稳后，读距离与扭角' if phase == 'force' else '把这次平衡放到图上' if phase == 'point' else '三个平衡点，比较距离与斥力'
    elif phase == 'ready':
        explanation = '金色球先动，悬球随后回应'
    elif source_speed > .01:
        explanation = '施力球靠近，悬球被推开'
    elif speed > .15:
        explanation = '施力球停下，悬球继续退开'
    elif speed < -.15:
        explanation = '施力球停下，银丝拉回悬球'
    else:
        explanation = '施力球暂时停下'
    text(draw, (27, 74), f'第 {trial+1} 次  /  {explanation}', 21, MUTED)
    text(draw, (86, 123), '上端固定', 20, GOLD, 'ma')
    text(draw, (222, 124), '施力球', 22, GOLD)
    text(draw, (427, 124), '悬球', 22, CORAL)
    draw.ellipse((202, 134, 212, 144), fill=GOLD)
    draw.ellipse((407, 134, 417, 144), fill=CORAL)
    top = wp['upper_clamp']
    draw.line((top[0]-20, top[1]-7, top[0]+20, top[1]-7), fill=GOLD, width=2)
    for x in range(round(top[0]-20), round(top[0]+20), 9):
        draw.line((x, top[1]-7, x-5, top[1]-14), fill=GOLD, width=2)
    arc = [cp[f'gap_arc_{i:02}'] for i in range(17)]
    draw.line(arc, fill=CYAN, width=2)
    glow(draw, cp['source_ball'], 9, GOLD)
    glow(draw, cp['moving_ball'], 9, CORAL)
    draw.line((28, 622, 612, 622), fill='#29383c', width=1)
    text(draw, (30, 637), '两球夹角', 23, CYAN)
    text(draw, (330, 637), '银丝累计扭转', 23, GOLD)
    text(draw, (30, 671), f'{gap:.1f}°', 40, CYAN)
    text(draw, (330, 671), f'{twist:.1f}°', 40, GOLD)
    if phase in ('force', 'point', 'fit'):
        text(draw, (30, 734), f'相对距离 {gap/36:.2f}', 21, MUTED)
        text(draw, (330, 733), ('斥力 1倍', '斥力 4倍', '斥力 约16倍')[trial], 24, GOLD)
    else:
        text(draw, (30, 734), '靠近时缩小，退开时增大', 18, MUTED)
        text(draw, (330, 734), '停稳后，扭角表示力矩', 18, MUTED)
    return image


def validate(projections, motion, images=False):
    for trial, track in enumerate(motion['trials']):
        rows = projections['shots'][track['shot']]
        if len(rows) != len(track['samples']):
            raise ValueError('Projection count and web samples differ')
        last = rows[-1]
        if abs(last['twist_deg'] - (36, 144, 575.5)[trial]) > .01 or abs(last['separation_deg'] - (36, 18, 8.5)[trial]) > .01:
            raise ValueError('Rendered endpoints must reproduce the historical equilibrium observations')
        # A source pause must be followed by a measurable increase in sphere gap.
        recoil = [(a, b) for a, b in zip(rows, rows[1:])
                  if abs(b['source_angle_deg']-a['source_angle_deg']) < 1e-6
                  and b['separation_deg']-a['separation_deg'] > .05]
        if not recoil:
            raise ValueError('Missing causal recoil: source must stop while the suspended sphere retreats')
        for row, sample in zip(rows, track['samples']):
            if max(abs(row[key]-value) for key, value in zip(FIELDS, sample)) > 1e-7:
                raise ValueError('Motion samples are stale')
    if images:
        for shot in ['pursuit-wire', *[track['shot'] for track in motion['trials']]]:
            for index in range(len(projections['shots'][shot])):
                path = RENDERS / shot / f'{index:04}.png'
                with Image.open(path) as image:
                    image.load()
                    if image.size != (1920, 1080):
                        raise ValueError(f'Unexpected render size: {path}')


def encode(projections, motion):
    validate(projections, motion, images=True)
    video = WORK / 'coulomb-readout.mp4'
    with (WORK / 'encode.log').open('w') as log:
        process = subprocess.Popen([FFMPEG, '-hide_banner', '-loglevel', 'warning', '-y',
            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
            '-an', '-c:v', 'libx264', '-crf', '20', '-preset', 'fast', '-threads', '2', '-g', '12',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(video)], stdin=subprocess.PIPE, stderr=log)
        try:
            for index in range(TIMING['duration'] * FPS):
                process.stdin.write(frame(index/FPS, projections, motion).tobytes())
                if index % (FPS*5) == 0:
                    print(f'Readout {index/FPS:.0f} / 39 s', flush=True)
        finally:
            process.stdin.close()
        if process.wait():
            raise RuntimeError('Readout encode failed; public video was not replaced')
    subprocess.run([FFMPEG, '-v', 'error', '-i', str(video), '-f', 'null', '-'], check=True)
    probe = json.loads(subprocess.check_output([FFPROBE, '-v', 'error', '-show_entries',
        'format=duration:stream=width,height,nb_frames', '-of', 'json', str(video)], text=True))
    if abs(float(probe['format']['duration'])-39) > .01 or int(probe['streams'][0]['nb_frames']) != 936:
        raise ValueError('Readout duration/frame count is incorrect')
    poster = WORK / 'coulomb-readout.poster.jpg'
    frame(34.9, projections, motion).save(poster, quality=94)
    manifest = {'version': '3.7.0', 'duration': 39, 'width': W, 'height': H, 'fps': FPS,
                'picture': 'Blender native-HD solved torsion response; advancing source and freely responding needle',
                'timing': TIMING, 'motion_data': 'coulomb-motion-v37.json',
                'motion': motion['meaning'], 'sample_policy': 'Nearest rendered close-up pose; web and image show the exact same numbers',
                'force_reading': 'Only after final equilibrium; original approximate ratios 1, 4, 575.5/36',
                'force_arrow': 'Rendered along the sphere-centre chord; fixed display length indicates direction, not magnitude',
                'probe': probe, 'video_sha256': hashlib.sha256(video.read_bytes()).hexdigest(),
                'motion_sha256': hashlib.sha256(DATA_PATH.read_bytes()).hexdigest()}
    manifest_path = WORK / 'coulomb-readout.manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
    for source in (video, poster, manifest_path):
        shutil.copy2(source, OUT / source.name)
    print('Verified and installed v3.7 readout media', flush=True)


def main():
    WORK.mkdir(exist_ok=True)
    projections = json.loads(PROJECTION_PATH.read_text(encoding='utf8'))
    motion = export_motion(projections)
    validate(projections, motion)
    if '--export-motion' in sys.argv:
        print('Exported solved motion samples for web and readout', flush=True)
        return
    if '--preview' in sys.argv:
        for index, t in enumerate((.7, 1.7, 3.2, 4.5, 7, 10.3, 12.7, 15, 18, 22.3, 25, 28, 31, 34.9, 38)):
            try:
                frame(t, projections, motion).save(WORK / f'preview-{index:02}.jpg', quality=94)
                print(f'Preview {t:g} s', flush=True)
            except FileNotFoundError as error:
                print(f'Render pending: {error}', flush=True)
        return
    encode(projections, motion)


if __name__ == '__main__':
    main()
