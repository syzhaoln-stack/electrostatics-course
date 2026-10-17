"""Original two-student lessons, using the existing Doubao TTS helper only.

Existing paid request records are never overwritten or silently retried.
Credentials stay in process environment and are never written to files.
"""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import wave

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'media' / 'lesson-dialogues'
HELPER = Path(os.getenv('DOUBAO_TTS_HELPER', str(Path.home() / '.codex/skills/construction-safety-video/scripts/doubao_tts.py')))
VOICES = {'xia': 'zh_female_vv_uranus_bigtts', 'che': 'zh_male_m191_uranus_bigtts'}
NAMES = {'xia': '小夏', 'che': '阿澈'}
LESSONS = {
    'foundations': [
        ('xia', '换成两倍电量，电场箭头也该变长吧？'),
        ('che', '先别挪位置。蓝箭头是这里的电场，金箭头才是小球受到的力。'),
        ('xia', '哦！正二 e 的力变成两倍，电场没动。'),
        ('che', '对。源电荷不变，同一个位置的电场就不变。力等于电荷量乘电场。'),
        ('xia', '那换成电子呢？哎，力反过来了！'),
        ('che', '电子带负电。电场方向按正电荷规定，所以电子受力跟它相反。'),
        ('xia', '拖远一倍，两个箭头都缩得好厉害。'),
        ('che', '点电荷的场按距离平方衰减。距离变成两倍，电场和同一个小球的力，都剩四分之一。'),
        ('xia', '长线、大平面，也一样吗？'),
        ('che', '不一样。无限长线的场垂直于线，距离加倍，强度减半。无限大平面的场垂直于面，强度不随距离变。'),
        ('xia', '明白！认出源，找到位置，再看放进去的电荷。轮到我拖一拖。'),
    ],
    'flux': [
        ('xia', '看不到球面里面，能从外面知道它带了多少电吗？'),
        ('che', '试试看。这枚正电荷先放外面。沿这条场线看，它穿进来，又穿出去。'),
        ('xia', '一进一出，抵消了？可球面上明明还有电场。'),
        ('che', '对。穿入记负，穿出记正。把整个闭合面的贡献加起来，外面的电荷净贡献是零。'),
        ('xia', '把电荷拖进来呢？这次只看见往外穿！'),
        ('che', '包住正电荷，净通量就为正。换成负电荷，箭头反过来，净通量为负。'),
        ('xia', '那我把面变大、捏扁，会不会算出另一份电量？'),
        ('che', '只要包住的净电荷没变，净通量就不变。各处场强会变，但总和相同。这就是高斯定理。'),
        ('xia', '所以测到零，就能说里面什么电荷都没有？'),
        ('che', '还不能。等量正负电荷也会抵消。它告诉我们的是净电荷，不是电荷总个数。'),
        ('xia', '原来如此！我来挪这枚电荷，看看什么时候少了那个穿入点。'),
    ],
}


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def pcm(path):
    with wave.open(str(path), 'rb') as wav:
        p = wav.getparams()
        data = wav.readframes(p.nframes)
    if len(data) != p.nframes * p.nchannels * p.sampwidth:
        raise RuntimeError('Incomplete audio PCM')
    return p, data


def stamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02}.{ms % 1000:03}'


def produce(lesson):
    work = OUT / 'production' / lesson
    work.mkdir(parents=True, exist_ok=True)
    lines = LESSONS[lesson]
    status = {'lesson': lesson, 'state': 'generating', 'provider': 'Doubao OpenSpeech',
              'model': 'seed-audio-1.0', 'synthetic_voices': VOICES, 'human_listening_review': False,
              'script': [{'speaker': s, 'name': NAMES[s], 'text': t} for s, t in lines], 'turns': []}
    save(work / 'manifest.json', status)
    for idx, (speaker, text) in enumerate(lines, 1):
        stem = work / f'turn-{idx:02}'
        req, txt, rec, wav = (Path(str(stem) + suffix) for suffix in ('.request.json', '.txt', '.record.json', '.wav'))
        if rec.exists():
            prior = json.loads(rec.read_text(encoding='utf-8'))
            if prior.get('state') != 'completed_pcm_verified' or not wav.exists():
                raise RuntimeError(f'{lesson} turn {idx} existing incomplete record: no retry sent')
        else:
            txt.write_text(text, encoding='utf-8')
            save(req, {'model': 'seed-audio-1.0',
                       'text_prompt': '自然清楚的普通话，年轻大学生和朋友聊天，语气轻快、有好奇心，句间稍有停顿。不要播音腔，不加音乐或笑声，只朗读以下正文，不读说明：\n' + text,
                       'references': [{'speaker': VOICES[speaker]}],
                       'audio_config': {'format': 'wav', 'sample_rate': 48000, 'speech_rate': 7,
                                        'pitch_rate': 0, 'loudness_rate': 0, 'enable_subtitle': True}})
            result = subprocess.run([sys.executable, str(HELPER), 'synthesize', '--request', str(req),
                                     '--expected-text', str(txt), '--record', str(rec), '--output', str(wav)],
                                    capture_output=True, text=True, encoding='utf-8')
            if result.returncode:
                status.update(state='failed_no_retry', failed_turn=idx)
                save(work / 'manifest.json', status)
                raise RuntimeError(f'{lesson} turn {idx}: synthesis failed, redacted record retained; no retry sent')
        p, data = pcm(wav)
        status['turns'].append({'index': idx, 'speaker': speaker, 'name': NAMES[speaker], 'text': text,
                                'voice': VOICES[speaker], 'duration': p.nframes / p.framerate,
                                'sha256': hashlib.sha256(data).hexdigest()})
        save(work / 'manifest.json', status)
        print(f'{lesson}: turn {idx}/{len(lines)} ready ({p.nframes / p.framerate:.2f}s)', flush=True)
    params, _ = pcm(work / 'turn-01.wav')
    current, timeline = 1.2, []
    gap = 0.24
    with wave.open(str(work / 'dialogue.wav'), 'wb') as out:
        out.setnchannels(params.nchannels)
        out.setsampwidth(params.sampwidth)
        out.setframerate(params.framerate)
        silence = lambda seconds: b'\0' * round(seconds * params.framerate) * params.nchannels * params.sampwidth
        out.writeframes(silence(current))
        for i, turn in enumerate(status['turns']):
            p, data = pcm(work / f'turn-{i+1:02}.wav')
            if (p.nchannels, p.sampwidth, p.framerate) != (params.nchannels, params.sampwidth, params.framerate):
                raise RuntimeError('Audio segment formats differ')
            out.writeframes(data)
            timeline.append({'index': i, 'start': round(current, 4), 'end': round(current + turn['duration'], 4),
                             'speaker': turn['speaker'], 'name': turn['name'], 'text': turn['text']})
            current += turn['duration']
            out.writeframes(silence(gap))
            current += gap
        out.writeframes(silence(1.5))
        current += 1.5
    save(OUT / f'{lesson}.timeline.json', timeline)
    vtt = ['WEBVTT', '']
    for i, turn in enumerate(timeline, 1):
        vtt += [str(i), f"{stamp(turn['start'])} --> {stamp(turn['end'])}", f"{turn['name']}：{turn['text']}", '']
    (OUT / f'{lesson}.vtt').write_text('\n'.join(vtt), encoding='utf-8')
    status.update(state='generated_pcm_verified', duration=round(current, 4))
    save(work / 'manifest.json', status)
    print(f'{lesson}: complete audio timeline {current:.2f}s', flush=True)


if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if not HELPER.is_file():
        raise SystemExit('Existing Doubao helper not found. Set DOUBAO_TTS_HELPER; no substitute provider used.')
    if not os.getenv('DOUBAO_SPEECH_API_KEY'):
        raise SystemExit('Doubao speech environment is unavailable. No substitute provider used.')
    for key in (sys.argv[1:] or list(LESSONS)):
        produce(key)
