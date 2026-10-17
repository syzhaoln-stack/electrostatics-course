"""Mux original Manim pictures with real Doubao student dialogue and verify.

No network calls. Render files and PCM are preserved under local production/.
"""
from pathlib import Path
import array
import hashlib
import json
import math
import os
import re
import argparse
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'media' / 'lesson-dialogues'
SCENES = {'foundations': ('lesson_scenes', 'FoundationsDialogue'),
          'flux': ('lesson_scenes', 'FluxDialogue'),
          'field': ('field_scene', 'SuperpositionDialogue'),
          'potential': ('energy_scenes', 'PotentialDialogue'),
          'paths': ('energy_scenes', 'WorkDialogue'),
          'conductors': ('energy_scenes', 'EquilibriumDialogue')}


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


def decoded_alignment(video, source_audio, timeline):
    """Verify every delivered AAC turn against this version's source PCM.

    Gain-normalized waveform correlation at 1 kHz checks content identity and
    timing. It deliberately makes no claim about pronunciation or listening.
    """
    decoded = []
    for file in (source_audio, video):
        proc = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(file), '-vn', '-ac', '1',
                               '-ar', '1000', '-f', 's16le', '-'], capture_output=True, check=True)
        samples = array.array('h', proc.stdout)
        decoded.append(samples)
    source, target = decoded
    results = []
    for turn in timeline:
        duration = turn['end']-turn['start']
        start = round((turn['start']+min(.25, duration*.15))*1000)
        length = min(1200, round((duration-.4)*1000))
        if length < 400:
            raise RuntimeError('Dialogue turn too short to validate audio alignment')
        x = source[start:start+length]
        mean = sum(x)/len(x)
        x = [s-mean for s in x]
        xx = sum(s*s for s in x)
        best, lag = -1, None
        for shift in range(-80, 81, 2):
            y = target[start+shift:start+shift+length]
            if len(y) != length:
                continue
            ymean = sum(y)/len(y)
            y = [s-ymean for s in y]
            yy = sum(s*s for s in y)
            score = sum(a*b for a, b in zip(x, y)) / math.sqrt(xx*yy) if xx*yy else 0
            if score > best:
                best, lag = score, shift
        if best < .9 or abs(lag) > 50:
            raise RuntimeError(f'Actual AAC differs from current PCM/timing at turn {turn["index"]}: r={best:.3f}, offset={lag}ms')
        results.append({'index': turn['index'], 'correlation': round(best, 5), 'offset_ms': lag})
    return results


def write_subtitles(work, timeline):
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
    file = work / 'dialogue.ass'
    file.write_text(content, encoding='utf-8-sig')
    return file.relative_to(ROOT).as_posix()


def package(lesson, version='v3-3'):
    production = OUT / 'production'
    work = production / version / lesson
    module, scene = SCENES[lesson]
    render_dir = 'manim-render' if lesson=='foundations' else 'manim-render-'+lesson
    rendered = production / version / f'{render_dir}/videos/{module}/720p24' / f'{scene}.mp4'
    audio = work / 'dialogue.wav'
    if not rendered.is_file() or not audio.is_file():
        raise RuntimeError(f'Missing rendered video or original audio for {lesson}')
    if rendered.stat().st_mtime < (work / 'timeline.json').stat().st_mtime:
        raise RuntimeError(f'{lesson}: rendered picture predates the current audio timeline; render the new scene first')
    timeline = json.loads((work / 'timeline.json').read_text(encoding='utf-8'))
    cues = json.loads((work / 'visual-cues.json').read_text(encoding='utf-8'))
    if not cues or any(c['start'] < timeline[c['turn']]['start'] or c['end'] > timeline[c['turn']]['end']+.7 for c in cues):
        raise RuntimeError('Invalid visual cue timing')
    audio_manifest = json.loads((work / 'manifest.json').read_text(encoding='utf-8'))
    ass_file = write_subtitles(work, timeline)
    # Never destroy the currently published video while encoding or verifying.
    video = work / f'{lesson}.candidate.mp4'
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(rendered), '-i', str(audio),
        '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '144k',
        '-vf', f"drawbox=x=0:y=616:w=iw:h=104:color=0x07111b:t=fill,ass=filename='{ass_file}'",
        '-af', 'loudnorm=I=-16:LRA=9:TP=-3,aresample=48000,aformat=channel_layouts=stereo,alimiter=limit=0.75:attack=5:release=50:level=false:latency=true',
        '-ar', '48000', '-movflags', '+faststart', '-shortest', str(video))
    poster = work / f'{lesson}.poster.jpg'
    run('ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '3', '-i', str(video),
        '-frames:v', '1', '-q:v', '3', str(poster))
    run('ffmpeg', '-v', 'error', '-i', str(video), '-f', 'null', '-')
    probe = subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(video)],
                           check=True, capture_output=True, text=True, encoding='utf-8')
    info = json.loads(probe.stdout)
    streams = info['streams']
    vs = next(s for s in streams if s['codec_type'] == 'video')
    aud = next(s for s in streams if s['codec_type'] == 'audio')
    duration = float(info['format']['duration'])
    if not 25 <= duration <= 180:
        raise RuntimeError(f'{lesson}: actual duration outside requested sample range: {duration}')
    if timeline[-1]['end'] >= duration or any(t['end'] <= t['start'] for t in timeline):
        raise RuntimeError('Invalid dialogue timeline')
    if any(timeline[i]['end'] >= timeline[i+1]['start'] for i in range(len(timeline)-1)):
        raise RuntimeError('Overlapping speaker turns')
    if abs(duration-audio_manifest['duration']) > .18:
        raise RuntimeError(f'Video/audio duration mismatch: video={duration}, audio={audio_manifest["duration"]}')
    alignment = decoded_alignment(video, audio, timeline)
    with wave.open(str(audio), 'rb') as wav:
        raw = wav.readframes(wav.getnframes())
        if wav.getsampwidth() != 2:
            raise RuntimeError('PCM quality metrics require 16-bit audio')
    samples = array.array('h', raw)
    peak = max(abs(s) for s in samples)
    rms = math.sqrt(sum(s*s for s in samples)/len(samples))
    # Measure the actual encoded AAC, rather than inheriting the source WAV peak.
    loudness_check = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(video),
                                    '-af', 'loudnorm=I=-16:LRA=9:TP=-1.5:print_format=json',
                                    '-vn', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', check=True)
    loudness_json = re.search(r'\{\s*"input_i".*?\}', loudness_check.stderr, re.S)
    if not loudness_json:
        raise RuntimeError('Final AAC loudness verification output missing')
    loudness = json.loads(loudness_json.group(0))
    if float(loudness['input_tp']) > -.5:
        raise RuntimeError('Final AAC true peak exceeds accepted headroom')
    manifest = {
        'lesson': lesson, 'edition': version, 'state': 'rendered_muxed_decode_verified', 'duration_seconds': duration,
        'video': {'codec': vs['codec_name'], 'width': vs['width'], 'height': vs['height'], 'fps': vs['avg_frame_rate']},
        'audio': {'provider': 'Doubao OpenSpeech', 'model': 'seed-audio-1.0', 'codec': aud['codec_name'],
                  'sample_rate': aud['sample_rate'], 'channels': aud['channels'],
                  'voices': audio_manifest['synthetic_voices'],
                  'voice_names': audio_manifest['voice_names'],
                  'speech_rate_request': audio_manifest['speech_rate_request'], 'pitch_rate': 0,
                  'inter_turn_silence_seconds': audio_manifest['inter_turn_silence_seconds'],
                  'character_proxy_per_second': audio_manifest['character_proxy_per_second'],
                  'pacing_note': audio_manifest['pacing_note'],
                  'local_tempo_by_turn': [t['pitch_preserving_local_tempo'] for t in audio_manifest['turns']],
                  'original_pcm_peak_dbfs': 20*math.log10(peak/32768),
                  'original_pcm_rms_dbfs': 20*math.log10(rms/32768),
                  'original_full_scale_samples': sum(abs(s) >= 32767 for s in samples),
                  'final_aac_integrated_lufs': float(loudness['input_i']),
                  'final_aac_true_peak_dbtp': float(loudness['input_tp']),
                  'final_aac_loudness_range_lu': float(loudness['input_lra'])},
        'production': 'Original 3D Manim animation and original two-student script',
        'render_engine_metadata': info.get('format', {}).get('tags', {}).get('comment', ''),
        'sha256': hashlib.sha256(video.read_bytes()).hexdigest(), 'bytes': video.stat().st_size,
        'dialogue_turns': len(timeline), 'all_captions_within_video': True, 'full_final_mp4_decode': True,
        'visual_cue_count':len(cues),
        'visual_cue_timing':'Provider word metadata adjusted for trim/tempo; actual objects highlighted in Manim. Not independently forced-aligned.',
        'source_audio_sha256': hashlib.sha256(audio.read_bytes()).hexdigest(),
        'source_timeline_sha256': hashlib.sha256((work / 'timeline.json').read_bytes()).hexdigest(),
        'final_aac_turn_alignment': alignment,
        'visual_review': 'pending representative-frame inspection', 'human_listening_review': False,
    }
    manifest_path = work / f'{lesson}.manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    # All candidates have passed before the published files change. os.replace
    # is atomic per file; the site is built only after the complete set installs.
    for source, target in [(video, OUT / f'{lesson}.mp4'), (poster, OUT / f'{lesson}.poster.jpg'),
                           (work / 'timeline.json', OUT / f'{lesson}.timeline.json'),
                           (work / 'dialogue.vtt', OUT / f'{lesson}.vtt'),
                           (work / 'visual-cues.json', OUT / f'{lesson}.cues.json'),
                           (manifest_path, OUT / f'{lesson}.manifest.json')]:
        staged = target.with_name(target.name+'.installing')
        staged.write_bytes(source.read_bytes())
        os.replace(staged, target)
    print(json.dumps({'lesson': lesson, 'duration': duration, 'bytes': video.stat().st_size,
                      'resolution': [vs['width'], vs['height']], 'decode': 'passed'}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('lessons', nargs='*')
    parser.add_argument('--version', default='v3-3')
    args = parser.parse_args()
    for name in (args.lessons or list(SCENES)):
        package(name, args.version)
