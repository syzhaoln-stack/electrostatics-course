"""Generate the approved v3.7 narration in C: workspace storage.

Dry-run is the default. Paid submissions preserve the v3.6 immutable request
helper and the approved preset, request rate, native pacing, and PCM checks.
An explicit first-only stage makes the opening a real service/voice check;
the full stage reuses that exact completed first request without resubmitting.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import shutil
import sys
import produce_coulomb_v36 as producer

PROJECT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v37-audio')
EDITION = 'v3-7-intuition'
CUE_PHRASES = {
    'push-release':['轻轻推它一下','撤掉这个力','横杆又转回来','会产生让横杆转回去'],
    'double-force':['先等它停稳','把力加到两倍','再等它停稳','转角也变成两倍'],
    'double-length':['银丝加长一倍','仍然施加刚才那个力','最终转角就变成两倍'],
    'double-lever':['离银丝两倍远','仍然横着推','力没有变大','平衡转角也会加倍'],
    'shield-and-scale':['风也能吹动','玻璃罩挡住气流','外圈刻度','穿过玻璃'],
    'historical-force':['十六微克','三十六度','两三度','一点三微克','零位误差'],
    'approach-response':['把施力球靠近','自己转远了一点','再把施力球追近','它又转开','最后在新的位置停稳'],
    'relative-reference':['原装置是转动银丝上端','这里换成上端固定','只比较停稳的状态','相对扭角也相同'],
    'three-readings':['第一次的距离和力都记作一','两球距离约剩一半','银丝却扭了四倍','两球只隔八点五度','累计扭过五百七十五点五度','超过一整圈','力接近十六倍'],
    'fit-law':['距离落在横轴','力落在纵轴','三个点','平方反比','一点九二','接近二'],
    'measurement-close':['先弄清多大的力','长银丝','长力臂','两球之间的距离'],
}


def cue_times(row):
    chars = []
    for word in row['words']:
        chars.extend((c, word['start'], word['end']) for c in word['text'] if re.match(r'[\u4e00-\u9fffA-Za-z0-9]', c))
    text = ''.join(c[0] for c in chars)
    result = []
    for phrase in CUE_PHRASES[row['base_id']]:
        needle = ''.join(re.findall(r'[\u4e00-\u9fffA-Za-z0-9]', phrase))
        at = text.find(needle)
        if at < 0:
            raise RuntimeError(f'Missing exact cue in provider words: {row["base_id"]}: {phrase}')
        result.append({'phrase':phrase, 'start':chars[at][1], 'end':chars[at+len(needle)-1][2],
                       'scene_time':round(chars[at][1]-row['start'],4)})
    return result


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--script', type=Path, default=PROJECT/'manim/coulomb-intuition-v37.json')
    parser.add_argument('--output-root', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--first-only', action='store_true')
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    lines = producer.read_script(args.script)
    work = args.output_root/'production'/EDITION/'coulomb'
    spec = {
        'state': 'dry_run_no_request', 'script': str(args.script.resolve()),
        'script_sha256': hashlib.sha256(args.script.read_bytes()).hexdigest(),
        'scenes': len(lines), 'characters': sum(producer.base.chars(s['text']) for s in lines),
        'voice': producer.VOICES['sedate'], 'speech_rate': 5, 'pitch_rate': 0,
        'output': str(work), 'native_tempo_preserved': True,
    }
    if not (args.first_only or args.generate):
        print(json.dumps(spec, ensure_ascii=False, indent=2))
        return
    args.output_root.mkdir(parents=True, exist_ok=True)
    if shutil.disk_usage(args.output_root).free < 500*1024*1024:
        raise RuntimeError('Less than 500 MiB free in selected output volume; no synthesis requested.')
    # Redirect this process only. The v3.6 module and its old output remain intact.
    producer.ROOT = args.output_root
    producer.base.OUT = args.output_root
    work.mkdir(parents=True, exist_ok=True)
    if args.first_only:
        turn = producer.find_or_create(work, 1, lines[0]['text'], 'sedate', 5)
        producer.base.save(work/'opening-check.json', {**spec, 'state':'first_pcm_verified', 'turn':turn})
        return
    producer.produce(lines, 'sedate', 5, EDITION, 'coulomb', 3)
    timeline = json.loads((work/'timeline.json').read_text(encoding='utf-8'))
    for row, scene in zip(timeline, lines, strict=True):
        row.update({k: scene[k] for k in ('base_id', 'shot', 'question', 'answer', 'visual_beats')})
        row['id'] = scene['base_id']
        row['wav'] = str(work/f'turn-{row["index"]+1:02}.paced.wav')
        row['pacing'] = str(work/f'turn-{row["index"]+1:02}.pacing.json')
        row['cues'] = cue_times(row)
    producer.base.save(work/'timeline.json', timeline)
    selection = []
    for i, scene in enumerate(lines, 1):
        pacing = json.loads((work/f'turn-{i:02}.pacing.json').read_text(encoding='utf-8'))
        selection.append({
            'index': i, 'base_id': scene['base_id'], 'shot': scene['shot'],
            'text': scene['text'], 'question': scene['question'], 'answer': scene['answer'],
            'duration': pacing['duration'], 'wav': str(work/f'turn-{i:02}.paced.wav'),
            'pacing': str(work/f'turn-{i:02}.pacing.json'),
            'paid_record': str(args.output_root/pacing['paid_record']),
        })
    producer.base.save(work/'selected-takes.json', selection)
    producer.base.save(work/'script-provenance.json', {**spec, 'state':'selected_native_takes',
                       'paid_requests_expected':len(lines), 'human_listening_review':False})


if __name__ == '__main__':
    main()
