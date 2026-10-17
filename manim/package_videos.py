"""Mux original Manim pictures with real Doubao student dialogue and verify.

No network calls. Render files and PCM are preserved under local production/.
"""
from pathlib import Path
import array
import hashlib
import json
import math
import re
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'media' / 'lesson-dialogues'
SCENES = {'foundations': 'FoundationsDialogue', 'flux': 'FluxDialogue'}


def run(*args):
    subprocess.run(list(args), check=True)


def wrap_sentence(text, limit=30):
    """Wrap at spoken clause boundaries; do not split e.g. 四分之一."""
    clauses = [part for part in re.findall(r'[^，。！？；]+[，。！？；]?', text) if part]
    lines, current = [], ''
    for clause in clauses:
        if current and len(current+clause) > limit:
            lines.append(current)
            current = ''
        current += clause
    if current:
        lines.append(current)
    return r'\N'.join(lines)


def ass_stamp(seconds):
    cs = round(seconds*100)
    return f'{cs//360000}:{cs//6000%60:02}:{cs//100%60:02}.{cs%100:02}'


def write_subtitles(lesson, timeline):
    content = '''[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: xia,Microsoft YaHei,30,&H0075CEF6,&H0075CEF6,&H001B1107,&H001B1107,0,0,0,0,100,100,0,0,1,0.7,0,2,48,48,22,1
Style: che,Microsoft YaHei,30,&H00D8CB66,&H00D8CB66,&H001B1107,&H001B1107,0,0,0,0,100,100,0,0,1,0.7,0,2,48,48,22,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    for turn in timeline:
        caption = turn['name']+'：'+wrap_sentence(turn['text'])
        content += f"Dialogue: 0,{ass_stamp(turn['start'])},{ass_stamp(turn['end'])},{turn['speaker']},,0,0,0,,{caption}\n"
    file = OUT / 'production' / lesson / 'dialogue.ass'
    file.write_text(content, encoding='utf-8-sig')
    return file.relative_to(ROOT).as_posix()


def package(lesson):
    production = OUT / 'production'
    rendered = production / 'manim-render/videos/lesson_scenes/720p24' / f'{SCENES[lesson]}.mp4'
    audio = production / lesson / 'dialogue.wav'
    if not rendered.is_file() or not audio.is_file():
        raise RuntimeError(f'Missing rendered video or original audio for {lesson}')
    timeline = json.loads((OUT / f'{lesson}.timeline.json').read_text(encoding='utf-8'))
    ass_file = write_subtitles(lesson, timeline)
    video = OUT / f'{lesson}.mp4'
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(rendered), '-i', str(audio),
        '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '144k',
        '-vf', f"drawbox=x=0:y=616:w=iw:h=104:color=0x07111b:t=fill,ass=filename='{ass_file}'",
        '-af', 'loudnorm=I=-18:LRA=9:TP=-1.5', '-movflags', '+faststart', '-shortest', str(video))
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '3', '-i', str(video),
        '-frames:v', '1', '-q:v', '3', str(OUT / f'{lesson}.poster.jpg'))
    run('ffmpeg', '-v', 'error', '-i', str(video), '-f', 'null', '-')
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(video)],
                           check=True, capture_output=True, text=True, encoding='utf-8')
    info = json.loads(probe.stdout)
    streams = info['streams']
    vs = next(s for s in streams if s['codec_type'] == 'video')
    aud = next(s for s in streams if s['codec_type'] == 'audio')
    duration = float(info['format']['duration'])
    if not 45 <= duration <= 90:
        raise RuntimeError(f'{lesson}: actual duration outside requested sample range: {duration}')
    if timeline[-1]['end'] >= duration or any(t['end'] <= t['start'] for t in timeline):
        raise RuntimeError('Invalid dialogue timeline')
    if any(timeline[i]['end'] >= timeline[i+1]['start'] for i in range(len(timeline)-1)):
        raise RuntimeError('Overlapping speaker turns')
    with wave.open(str(audio), 'rb') as wav:
        raw = wav.readframes(wav.getnframes())
        if wav.getsampwidth() != 2:
            raise RuntimeError('PCM quality metrics require 16-bit audio')
    samples = array.array('h', raw)
    peak = max(abs(s) for s in samples)
    rms = math.sqrt(sum(s*s for s in samples)/len(samples))
    manifest = {
        'lesson': lesson, 'state': 'rendered_muxed_decode_verified', 'duration_seconds': duration,
        'video': {'codec': vs['codec_name'], 'width': vs['width'], 'height': vs['height'], 'fps': vs['avg_frame_rate']},
        'audio': {'provider': 'Doubao OpenSpeech', 'model': 'seed-audio-1.0', 'codec': aud['codec_name'],
                  'sample_rate': aud['sample_rate'], 'channels': aud['channels'],
                  'voices': {'xia': 'zh_female_vv_uranus_bigtts', 'che': 'zh_male_m191_uranus_bigtts'},
                  'original_pcm_peak_dbfs': 20*math.log10(peak/32768),
                  'original_pcm_rms_dbfs': 20*math.log10(rms/32768),
                  'original_full_scale_samples': sum(abs(s) >= 32767 for s in samples)},
        'production': 'Original 3D Manim Community 0.18.1 animation and original two-student script',
        'sha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'bytes': video.stat().st_size,
        'dialogue_turns': len(timeline), 'all_captions_within_video': True, 'full_final_mp4_decode': True,
        'visual_review': 'pending representative-frame inspection', 'human_listening_review': False,
    }
    (OUT / f'{lesson}.manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'lesson': lesson, 'duration': duration, 'bytes': video.stat().st_size,
                      'resolution': [vs['width'], vs['height']], 'decode': 'passed'}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    for name in (sys.argv[1:] or list(SCENES)):
        package(name)
