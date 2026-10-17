"""Produce conversational original student dialogue with Doubao and measured PCM timing.

The locked script lives in dialogue-scripts.json. New paid records are versioned,
never overwritten/retried automatically. Public MP4/timelines stay unchanged until
package_videos.py validates and installs the completed replacement.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse
import array
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'media' / 'lesson-dialogues'
HELPER = Path(os.getenv('DOUBAO_TTS_HELPER', str(Path.home() / '.codex/skills/construction-safety-video/scripts/doubao_tts.py')))
VOICES = {'xia': 'zh_female_shuangkuaisisi_uranus_bigtts', 'che': 'zh_male_qingshuangnanda_uranus_bigtts'}
VOICE_NAMES = {'xia': '爽快思思', 'che': '清爽男大'}
NAMES = {'xia': '小夏', 'che': '阿澈'}
PROMPT = ('两个大学生坐在电脑前一起试一个物理模型。这是对身边同学说的一句话，'
          '自然、放松、清楚，有思考的停顿；不要广告感、主持腔或夸张的惊叹。'
          '正常交谈速度，遇到新概念稍停一下，不抢话，不刻意拖字尾。'
          'F读英文字母F，E读英文字母E，Q和q读英文字母Q，P读英文字母P，r读英文字母R。'
          '不要添加音乐、笑声、解释，只说下面这句话，不朗读控制说明：\n')


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    os.replace(tmp, path)


def pcm(path):
    with wave.open(str(path), 'rb') as wav:
        p = wav.getparams()
        data = wav.readframes(p.nframes)
    if p.sampwidth != 2 or p.comptype != 'NONE' or len(data) != p.nframes * p.nchannels * p.sampwidth:
        raise RuntimeError('Expected complete 16-bit PCM WAV')
    return p, data


def write_wav(path, p, data):
    with wave.open(str(path), 'wb') as wav:
        wav.setnchannels(p.nchannels)
        wav.setsampwidth(p.sampwidth)
        wav.setframerate(p.framerate)
        wav.writeframes(data)


def chars(text):
    """Syllable proxy only, not phoneme alignment or a listening review."""
    return len(re.findall(r'[\u4e00-\u9fffA-Za-z0-9]', text))


def trim_edges(p, data):
    """Trim only low-energy edges, retaining 60 ms around detected speech."""
    samples = array.array('h', data)
    window = max(1, round(p.framerate * .01)) * p.nchannels
    threshold = 32768 * 10 ** (-52 / 20)
    active = []
    for start in range(0, len(samples), window):
        block = samples[start:start+window]
        rms = math.sqrt(sum(s*s for s in block) / len(block))
        if rms >= threshold:
            active.append(start)
    if not active:
        raise RuntimeError('Generated audio contains no detected speech')
    pad = round(p.framerate * .06) * p.nchannels
    start = max(0, active[0] - pad)
    end = min(len(samples), active[-1] + window + pad)
    start -= start % p.nchannels
    end -= end % p.nchannels
    return samples[start:end].tobytes(), start / p.nchannels / p.framerate, (len(samples)-end) / p.nchannels / p.framerate


def stamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}'


def synthesize_turn(work, idx, speaker, text, speech_rate):
    if (work / 'PAUSE_NEW_REQUESTS').exists():
        raise RuntimeError('New synthesis paused before submission')
    body = {'model': 'seed-audio-1.0', 'text_prompt': PROMPT + text,
            'references': [{'speaker': VOICES[speaker]}],
            'audio_config': {'format': 'wav', 'sample_rate': 48000, 'speech_rate': speech_rate,
                             'pitch_rate': 0, 'loudness_rate': 0, 'enable_subtitle': True}}
    request_hash = hashlib.sha256(json.dumps(body, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()
    stem = work / 'requests' / f'{speaker}-{request_hash[:16]}'
    stem.parent.mkdir(parents=True, exist_ok=True)
    req, txt, rec, raw = (Path(str(stem) + suffix) for suffix in ('.request.json', '.txt', '.record.json', '.wav'))
    # Reuse an already completed deliberately generated sentence even if its index
    # moved. Never turn an in-flight/uncertain record into another paid request.
    if not rec.exists():
        for existing in (OUT / 'production').rglob('*.record.json'):
            prior = json.loads(existing.read_text(encoding='utf-8-sig'))
            request = prior.get('request', {})
            same = prior.get('expected_text') == text and request == body
            if not same:
                continue
            existing_wav = Path(str(existing).removesuffix('.record.json') + '.wav')
            if prior.get('state') != 'completed_pcm_verified' or not existing_wav.exists():
                raise RuntimeError(f'{work.name} turn {idx}: matching incomplete paid record exists; inspect it, no retry sent')
            rec, raw = existing, existing_wav
            break
    if rec.exists():
        prior = json.loads(rec.read_text(encoding='utf-8'))
        if prior.get('state') != 'completed_pcm_verified' or not raw.exists():
            raise RuntimeError(f'{work.name} turn {idx}: existing incomplete record, no retry sent')
        request = prior.get('request', {})
        if prior.get('expected_text') != text or request != body:
            raise RuntimeError(f'{work.name} turn {idx}: frozen paid record differs from requested script/config; choose a deliberate new version')
    else:
        txt.write_text(text, encoding='utf-8')
        save(req, body)
        result = subprocess.run([sys.executable, str(HELPER), 'synthesize', '--request', str(req),
                                 '--expected-text', str(txt), '--record', str(rec), '--output', str(raw)],
                                capture_output=True, text=True, encoding='utf-8')
        if result.returncode:
            raise RuntimeError(f'{work.name} turn {idx}: synthesis failed; redacted record retained, no retry sent')
    p, data = pcm(raw)
    trimmed, head, tail = trim_edges(p, data)
    trimmed_path = work / f'turn-{idx:02}.trimmed.wav'
    processed = work / f'turn-{idx:02}.paced.wav'
    write_wav(trimmed_path, p, trimmed)
    trimmed_duration = len(trimmed) / p.nchannels / p.sampwidth / p.framerate
    proxy_count = chars(text)
    raw_rate = proxy_count / trimmed_duration
    # A conversational band per speaker replaces the old blanket fast setting.
    # Avoid both rushed explanations and stretched synthetic syllables.
    ceiling = 4.65 if speaker == 'che' else 5.2
    floor = 3.6 if speaker == 'che' else 3.9
    target = 3.8 if speaker == 'che' else 4.2
    tempo = min(1.6,target/raw_rate) if raw_rate < floor else max(.65,min(1.0,ceiling/raw_rate))
    if tempo != 1.0:
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(trimmed_path),
                        '-af', f'atempo={tempo:.8f}', '-c:a', 'pcm_s16le', str(processed)], check=True)
    else:
        write_wav(processed, p, trimmed)
    final_p, final_data = pcm(processed)
    duration = final_p.nframes / final_p.framerate
    turn = {'index': idx, 'speaker': speaker, 'name': NAMES[speaker], 'text': text, 'voice': VOICES[speaker],
            'raw_duration': p.nframes/p.framerate, 'duration': duration,
            'edge_silence_removed': {'head_seconds': round(head, 4), 'tail_seconds': round(tail, 4),
                                     'rms_threshold_dbfs': -52, 'retained_pad_seconds': .06},
            'pitch_preserving_local_tempo': round(tempo, 6), 'speech_rate_request': speech_rate,
            'spoken_character_proxy_count': proxy_count, 'character_proxy_per_second': round(proxy_count/duration, 3),
            'sha256': hashlib.sha256(final_data).hexdigest()}
    turn['paid_record'] = rec.relative_to(ROOT).as_posix()
    subtitles = json.loads(raw.with_suffix('.subtitle.json').read_text(encoding='utf-8'))
    words = [w for s in (subtitles.get('subtitle') or {}).get('sentences', []) for w in s.get('words', [])]
    turn['words'] = [{'text': w['text'], 'start': round(max(0, (w['start_time']/1000-head)/tempo),4),
                      'end': round(min(duration, max(0, (w['end_time']/1000-head)/tempo)),4)} for w in words]
    turn['word_timing_source'] = 'Provider subtitle metadata, adjusted for edge trim and pitch-preserving tempo; not independently forced-aligned.'
    save(work / f'turn-{idx:02}.pacing.json', turn)
    print(f'{work.name}: turn {idx} ready ({duration:.2f}s, {proxy_count/duration:.2f} character proxy/s)', flush=True)
    return turn


def produce(lesson, lines, version, speech_rate, workers):
    work = OUT / 'production' / version / lesson
    work.mkdir(parents=True, exist_ok=True)
    status = {'lesson': lesson, 'edition': version, 'state': 'generating', 'provider': 'Doubao OpenSpeech',
              'model': 'seed-audio-1.0', 'synthetic_voices': VOICES, 'voice_names': VOICE_NAMES,
              'speech_rate_request': speech_rate, 'pitch_rate': 0, 'inter_turn_silence_seconds': .3,
              'character_proxy_ceiling_per_second': {'che':4.65,'xia':5.2}, 'human_listening_review': False,
              'pacing_note': 'Measured character proxy per processed whole phrase, not phoneme alignment or listening review.',
              'official_api_reference': 'https://docs.volcengine.com/docs/DoubaoVoice/audio-generation-http?lang=zh',
              'official_voice_reference': 'https://docs.volcengine.com/docs/DoubaoVoice/Tonelist-1?lang=zh',
              'script': [{'speaker': s, 'name': NAMES[s], 'text': t} for s, t in lines], 'turns': []}
    save(work / 'manifest.json', status)
    turns = {}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(synthesize_turn, work, idx, speaker, text, speech_rate[speaker]): idx for idx, (speaker, text) in enumerate(lines, 1)}
        errors = []
        for future in as_completed(futures):
            try:
                turn = future.result()
                turns[turn['index']] = turn
                status['turns'] = [turns[i] for i in sorted(turns)]
                save(work / 'manifest.json', status)
            except Exception as exc:
                errors.append(str(exc))
        if errors:
            status.update(state='failed_no_retry', errors=errors)
            save(work / 'manifest.json', status)
            raise RuntimeError('; '.join(errors))
    params, _ = pcm(work / 'turn-01.paced.wav')
    current, timeline = .35, []
    with wave.open(str(work / 'dialogue.wav'), 'wb') as out:
        out.setnchannels(params.nchannels)
        out.setsampwidth(params.sampwidth)
        out.setframerate(params.framerate)
        silence = lambda seconds: b'\0' * round(seconds * params.framerate) * params.nchannels * params.sampwidth
        out.writeframes(silence(current))
        for i, turn in enumerate(status['turns']):
            p, data = pcm(work / f'turn-{i+1:02}.paced.wav')
            if (p.nchannels, p.sampwidth, p.framerate) != (params.nchannels, params.sampwidth, params.framerate):
                raise RuntimeError('Audio segment formats differ')
            out.writeframes(data)
            timeline.append({'index': i, 'start': round(current, 4), 'end': round(current + turn['duration'], 4),
                             'speaker': turn['speaker'], 'name': turn['name'], 'text': turn['text'],
                             'words': [{**w,'start':round(current+w['start'],4),'end':round(current+w['end'],4)} for w in turn['words']],
                             'word_timing_source': turn['word_timing_source']})
            current += turn['duration']
            gap = .3 if i < len(status['turns'])-1 else .6
            out.writeframes(silence(gap))
            current += gap
    save(work / 'timeline.json', timeline)
    vtt = ['WEBVTT', '']
    for i, turn in enumerate(timeline, 1):
        vtt += [str(i), f"{stamp(turn['start'])} --> {stamp(turn['end'])}", f"{turn['name']}：{turn['text']}", '']
    (work / 'dialogue.vtt').write_text('\n'.join(vtt), encoding='utf-8')
    status.update(state='generated_pcm_verified', duration=round(current, 4),
                  character_proxy_count=sum(t['spoken_character_proxy_count'] for t in status['turns']),
                  character_proxy_per_second=round(sum(t['spoken_character_proxy_count'] for t in status['turns']) / sum(t['duration'] for t in status['turns']), 3))
    save(work / 'manifest.json', status)
    print(f'{lesson}: AUDIO TIMELINE READY {current:.2f}s at {status["character_proxy_per_second"]} character proxy/s: {work / "timeline.json"}', flush=True)


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('lessons', nargs='*')
    parser.add_argument('--version', default='v3-3')
    parser.add_argument('--male-rate', type=int, default=-8)
    parser.add_argument('--female-rate', type=int, default=5)
    parser.add_argument('--workers', type=int, default=3)
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_-]+', args.version):
        raise SystemExit('Version must be one safe directory name')
    if not HELPER.is_file():
        raise SystemExit('Existing Doubao helper not found. Set DOUBAO_TTS_HELPER; no substitute provider used.')
    if not os.getenv('DOUBAO_SPEECH_API_KEY'):
        raise SystemExit('Doubao speech environment is unavailable. No substitute provider used.')
    scripts = json.loads((ROOT / 'manim/dialogue-scripts.json').read_text(encoding='utf-8-sig'))
    for key in (args.lessons or ['foundations', 'flux']):
        produce(key, scripts[key], args.version, {'che':args.male_rate,'xia':args.female_rate}, max(1, min(3, args.workers)))
