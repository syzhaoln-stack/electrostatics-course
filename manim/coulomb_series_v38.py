"""Two equal lengths of one continuous silver wire: theta + theta = 2 theta.

Called by the film compositor as render(img, turn, t, dur, api).  The supplied
api is the film module (footage, close, cue, text, colours and projections).
No public assets are written.  Existing native Blender frames remain intact.
The middle ring is an observation overlay, never a physical splice.
"""
from pathlib import Path
from functools import lru_cache
import argparse
import importlib.util
import json
import math
from PIL import Image, ImageDraw


STORAGE = Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904')
PREVIEWS = STORAGE / 'coulomb-v38-series-previews'
MIDPOINT_PATH = STORAGE / 'coulomb-v38-renders/wire-midpoint-v37.json'
POSE_PATH = STORAGE / 'coulomb-v37-renders/projection-intuition.json'
DEPENDENCY_FILES = (Path(__file__), POSE_PATH, MIDPOINT_PATH)


@lru_cache(maxsize=1)
def _midpoints():
    return json.loads(MIDPOINT_PATH.read_text(encoding='utf8'))['shots']


def _midpoint_pose(name, record):
    rows = _midpoints()[name]
    row = min(rows, key=lambda p: abs(p['u']-record['u']))
    if abs(row['t']-record['t']) > 1e-8:
        raise ValueError('Midpoint observation must use the exact rendered frame')
    raw_top = row['points']['wire_top']
    shown_top = record['points']['wire_top']
    project = lambda p: (shown_top[0]+.63*(p['x']-raw_top['x']),
                         shown_top[1]+.63*(p['y']-raw_top['y']))
    return row, {key:project(point) for key,point in row['points'].items()}, [project(p) for p in row['ring_points']]


def _cue(api, turn, phrase, default):
    return api.cue(turn, phrase, default)


def timing(turn, dur, api):
    mark = _cue(api, turn, '中间做个记号', dur * .37)
    both = _cue(api, turn, '上下两段', dur * .47)
    begin = _cue(api, turn, '同样的力', dur * .06)
    finish = max(begin + 2, min(mark - .75, both - .9, dur * .28))
    return dict(begin=begin, finish=finish, mark=mark, both=both,
                upper=_cue(api, turn, '上半段', dur * .60),
                lower=_cue(api, turn, '下半段', dur * .73),
                total=_cue(api, turn, '合起来', dur * .86))


def _fixed_scale_footage(img, api, name, seconds, x, top=230):
    # Both shots use the same Blender camera.  The short-wire crop removes
    # only the empty area above its clamp; no image is vertically stretched.
    raw = api.PROJECTIONS[name][0]['points']
    reference = api.PROJECTIONS['force-cycle'][0]['points']
    shift = raw['wire_top']['y'] - reference['wire_top']['y']
    crop = (700, 25 + shift, 1270, 1060)
    scale = .63
    width, height = (crop[2]-crop[0])*scale, (crop[3]-crop[1])*scale
    record = api.footage(img, name, api.fraction(name, seconds),
                         (x, top, x+width, top+height), crop)
    return record


def _bracket(d, api, x, a, b, label, color, side='left'):
    d.line((x, a, x, b), fill=color, width=2)
    for y in (a, b):
        d.line((x-7, y, x+7, y), fill=color, width=2)
    api.text(d, (x-15 if side == 'left' else x+15, (a+b)/2), label,
             29, color, 'rm' if side == 'left' else 'lm', serif=True)


def _direction_disc(d, api, midpoint, lower, emphasis):
    """One top-view inset, so two relative turns share a visible reference."""
    centre = (1535, 382)
    radius = 108
    colors = (api.MUTED, api.GOLD, api.CYAN)
    angles = (0.0, midpoint, lower)
    d.ellipse((centre[0]-radius, centre[1]-radius, centre[0]+radius, centre[1]+radius),
              outline='#304044', width=2)
    ends = []
    for i, (angle, color) in enumerate(zip(angles, colors)):
        a = math.radians(angle)
        p = (centre[0]+radius*math.cos(a), centre[1]-radius*math.sin(a))
        ends.append(p)
        d.line((centre, p), fill=color, width=3 if i else 2)
        d.ellipse((p[0]-4, p[1]-4, p[0]+4, p[1]+4), fill=color)
    # Labels are separated vertically, not piled on the small angular sector.
    for p, label, angle, color, yy in zip(ends,
            ('上端', '中点', '下端'), angles, colors, (443, 391, 339)):
        elbow = (1670, yy)
        d.line((p, elbow), fill=color, width=1)
        api.text(d, (1682, yy), f'{label}  {angle:.0f}°', 25, color, 'lm')
    for start, end, rr, color, active in (
            (0, midpoint, 68, api.GOLD, emphasis in ('upper', 'sum')),
            (midpoint, lower, 88, api.CYAN, emphasis in ('lower', 'sum'))):
        if active:
            pts = [(centre[0]+rr*math.cos(math.radians(start+(end-start)*i/30)),
                    centre[1]-rr*math.sin(math.radians(start+(end-start)*i/30)))
                   for i in range(31)]
            d.line(pts, fill=color, width=4)
    api.text(d, (1535, 236), '俯视：三个位置的方向', 27, api.MUTED, 'mm')
    d.ellipse((centre[0]-4, centre[1]-4, centre[0]+4, centre[1]+4), fill=api.INK)


def render(img, turn, t, dur, api):
    """Render one shot; return observed pose values for compositor validation."""
    cues = timing(turn, dur, api)
    progress = api.clamp((t-cues['begin'])/max(.1, cues['finish']-cues['begin']))
    if t < cues['begin']:
        short_time = long_time = 0
    else:
        short_time = api.mix(.18, 8, progress)
        long_time = api.mix(9.0, 14.75, progress)
    short = _fixed_scale_footage(img, api, 'short-wire', short_time, 80)
    long = _fixed_scale_footage(img, api, 'force-cycle', long_time, 900)
    short_angle, long_angle = short['twist_deg'], long['twist_deg']
    settled = (progress >= 1 and abs(short['speed_deg_s']) < .06
               and abs(long['speed_deg_s']) < .06
               and abs(short_angle-18) < .03 and abs(long_angle-36) < .03)

    # Both arm insets use the same object-to-pixel scale, compensating for the
    # two original camera zooms instead of making the shorter wire's arm larger.
    small_ratio = 4.8/5.6
    cx, cy, hw, hh = 640, 545, 265, 185
    short_detail = api.close(img, 'short-wire-close', api.fraction('short-wire-close', short['t']),
        (cx-hw*small_ratio, cy-hh*small_ratio, cx+hw*small_ratio, cy+hh*small_ratio))
    long_detail = api.close(img, 'force-close', api.fraction('force-close', long['t']),
                            (1300, 575, 1830, 945))
    api.lower_angle(ImageDraw.Draw(img), short_detail, color=api.GOLD)
    api.lower_angle(ImageDraw.Draw(img), long_detail, color=api.CYAN)

    d = ImageDraw.Draw(img)
    api.text(d, (105, 185), '一段 L', 38, api.GOLD, serif=True)
    api.text(d, (925, 185), '两段 L，仍是一根银丝', 38, api.INK, serif=True)
    api.text(d, (470, 345), '同样的力 F', 29, api.CORAL)
    api.text(d, (1370, 565), '同样的力 F', 29, api.CORAL)

    p0, p1 = short['points']['wire_top'], short['points']['wire_bottom']
    q0, q2 = long['points']['wire_top'], long['points']['wire_bottom']
    mid_record, mid_points, ring = _midpoint_pose('force-cycle', long)
    q1 = mid_points['wire_midpoint']
    midpoint_angle = mid_record['midpoint_angle_deg']
    _bracket(d, api, p0[0]-60, p0[1], p1[1], 'L', api.GOLD)
    # Neutral fixed-clamp bars connect the equal-scale top positions.
    for p in (p0, q0):
        d.line((p[0]-18, p[1]-10, p[0]+18, p[1]-10), fill=api.MUTED, width=3)

    emphasis = ('sum' if t >= cues['total'] else 'lower' if t >= cues['lower']
                else 'upper' if t >= cues['upper'] else 'none')
    if t >= cues['mark']:
        # Draw an open observation ring without hiding or breaking the real wire.
        d.line(ring, fill=api.GOLD, width=2)
        d.line((q1, mid_points['midpoint_zero']), fill=api.MUTED, width=1)
        d.line((q1, mid_points['midpoint_index']), fill=api.GOLD, width=2)
        d.line((q1[0]+33, q1[1], 1220, q1[1]), fill=api.GOLD, width=2)
        api.text(d, (1232, q1[1]), '中点观察记号', 24, api.GOLD, 'lm')
        _bracket(d, api, q0[0]-60, q0[1], q1[1], 'L', api.GOLD)
        _bracket(d, api, q0[0]-60, q1[1], q2[1], 'L', api.CYAN)
    else:
        _bracket(d, api, q0[0]-60, q0[1], q2[1], '2L', api.MUTED)

    # Equilibrium is required before equal transmitted torque / equal segment
    # twist is asserted. The visual highlight follows the speech, never an
    # invented sequence of one physical segment twisting before the other.
    if settled:
        api.text(d, (470, 766), f'θ ≈ {short_angle:.0f}°', 46, api.GOLD, serif=True)
        api.text(d, (1370, 917), f'2θ ≈ {long_angle:.0f}°', 43, api.CYAN, serif=True)
        if t >= cues['mark']:
            _direction_disc(d, api, midpoint_angle, long_angle, emphasis)
        if emphasis in ('upper', 'sum'):
            d.line((q0, q1), fill=api.GOLD, width=3)
            api.text(d, (q0[0]+52, (q0[1]+q1[1])/2),
                     f'上段 θ ≈ {mid_record["upper_segment_twist_deg"]:.0f}°', 31, api.GOLD, 'lm')
        if emphasis in ('lower', 'sum'):
            d.line((q1, q2), fill=api.CYAN, width=3)
            api.text(d, (q0[0]+52, (q1[1]+q2[1])/2),
                     f'下段 θ ≈ {mid_record["lower_segment_twist_deg"]:.0f}°', 31, api.CYAN, 'lm')
        if t >= cues['total']:
            api.text(d, (610, 897), 'θ + θ = 2θ', 54, api.INK, 'mm', serif=True)
    else:
        api.text(d, (470, 766), '正在扭转…' if t >= cues['begin'] else '同材质 · 同粗细', 29, api.MUTED)

    return dict(settled=settled, emphasis=emphasis, progress=progress,
        upper_segment_highlighted=settled and emphasis in ('upper', 'sum'),
        lower_segment_highlighted=settled and emphasis in ('lower', 'sum'),
        short_twist_deg=short_angle, long_twist_deg=long_angle,
        upper_segment_deg=mid_record['upper_segment_twist_deg'], lower_segment_deg=mid_record['lower_segment_twist_deg'],
        top=q0, midpoint=q1, bottom=q2,
        short_wire_height=p1[1]-p0[1], long_wire_height=q2[1]-q0[1],
        short_time=short['t'], long_time=long['t'], cues=cues)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--api', default='compose_coulomb_v37.py')
    args = parser.parse_args()
    path = Path(__file__).parent / args.api
    spec = importlib.util.spec_from_file_location('series_preview_api', path)
    api = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api)
    PREVIEWS.mkdir(exist_ok=True)
    # Use a completed speech timeline when present; explicit cue times make the
    # fallback a useful visual review without fabricating audio timestamps.
    audio = STORAGE / 'coulomb-v38b-audio/production/v3-8-series/coulomb/timeline.json'
    if audio.exists():
        turn = next(x for x in json.loads(audio.read_text(encoding='utf8')) if x['base_id']=='double-length')
        dur = turn['end']-turn['start']
    else:
        dur=35
        phrases=[('两倍长',4),('中间做个记号',13),('上下两段',16),('上半段',22),('下半段',26),('合起来',30)]
        turn={'start':0,'end':dur,'words':[{'text':p,'start':t,'end':t+.5} for p,t in phrases],
              'question':'长一倍，为什么就多转一倍？'}
    cues=timing(turn,dur,api)
    states=[]
    for i,t in enumerate((cues['begin']+1, cues['upper']+.7, min(dur-.2,cues['total']+1))):
        img=Image.new('RGB',(1920,1080),api.BG)
        state=render(img,turn,t,dur,api)
        d=ImageDraw.Draw(img)
        api.text(d,(74,32),'库仑的电秤  /  银丝为什么越长越敏感',22,api.GOLD)
        api.text(d,(74,78),turn.get('question','长一倍，为什么就多转一倍？'),48,api.INK,serif=True)
        img.save(PREVIEWS/f'series-{i:02}.jpg',quality=95)
        states.append({'time':t,**state})
    assert all(abs(s['long_wire_height']/s['short_wire_height']-2)<1e-4 for s in states)
    assert states[-1]['settled'] and abs(states[-1]['short_twist_deg']-18)<.03
    assert abs(states[-1]['upper_segment_deg']-states[-1]['lower_segment_deg'])<1e-8
    (PREVIEWS/'states.json').write_text(json.dumps(states,ensure_ascii=False,indent=2),encoding='utf8')
    print(json.dumps({'previews':str(PREVIEWS),'states':states},ensure_ascii=False))


if __name__ == '__main__':
    main()
