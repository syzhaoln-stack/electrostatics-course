"""Read-only PCM/subtitle audit of the selected v3.7 narration, with optional ASR.

This records signal and text checks, not a human listening review. It never
submits synthesis, changes pacing, trims a clip, or overwrites selected takes.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import sys
import wave
import numpy as np
from produce_coulomb_v37 import DEFAULT_OUTPUT, EDITION


def normalized(text):
    return ''.join(re.findall(r'[\u4e00-\u9fffA-Za-z0-9]', text)).lower()


def measure(wav):
    with wave.open(str(wav), 'rb') as audio:
        p = audio.getparams()
        raw = audio.readframes(p.nframes)
    if p.sampwidth != 2 or p.comptype != 'NONE' or len(raw) != p.nframes*p.nchannels*p.sampwidth:
        raise ValueError(f'Not fully decoded 16-bit PCM: {wav.name}')
    samples = np.frombuffer(raw, '<i2').astype(np.float64).reshape((-1, p.nchannels))/32768
    magnitude = np.abs(samples)
    frame_len = round(.01*p.framerate)
    whole = len(samples)//frame_len
    blocks = samples[:whole*frame_len].reshape((whole, frame_len, p.nchannels))
    rms = np.sqrt(np.mean(blocks*blocks, axis=(1, 2)))
    quiet = rms < 10**(-52/20)
    intervals, start = [], None
    for idx, is_quiet in enumerate(quiet):
        if is_quiet and start is None:
            start = idx
        if start is not None and (not is_quiet or idx == len(quiet)-1):
            end = idx if not is_quiet else idx+1
            if end-start >= 150 and start > 0 and end < len(quiet):
                intervals.append({'start':round(start*.01, 3), 'end':round(end*.01, 3)})
            start = None
    return {
        'sha256':hashlib.sha256(raw).hexdigest(), 'duration':p.nframes/p.framerate,
        'sample_rate':p.framerate, 'channels':p.nchannels, 'sample_width':p.sampwidth,
        'decoded_frames':p.nframes, 'decode_complete':True,
        'peak_dbfs':round(20*np.log10(max(float(magnitude.max()), 1e-10)), 3),
        'full_scale_samples':int(np.count_nonzero(magnitude >= 32767/32768)),
        'interior_quiet_longer_than_1_5_seconds':intervals,
    }


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-root', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--asr', action='store_true', help='Unprompted local ASR of opening, tiny force and final three readings.')
    args = parser.parse_args()
    work = args.output_root/'production'/EDITION/'coulomb'
    manifest = json.loads((work/'manifest.json').read_text(encoding='utf-8'))
    scenes = manifest['script']
    audit = {'state':'review', 'human_listening_review':False, 'native_tempo_preserved':True,
             'subtitle_check':'Provider transcript checked against fixed requested text; not a listening or tone proof.',
             'turns':[]}
    model = None
    if args.asr:
        from faster_whisper import WhisperModel
        model = WhisperModel('base', device='cpu', compute_type='int8', cpu_threads=4, local_files_only=True)
    for i, scene in enumerate(scenes, 1):
        wav = work/f'turn-{i:02}.paced.wav'
        pacing = json.loads((work/f'turn-{i:02}.pacing.json').read_text(encoding='utf-8'))
        words = pacing['words']
        result = {**measure(wav), 'index':i, 'base_id':scene['base_id'],
                  'character_proxy_per_second':pacing['character_proxy_per_second'],
                  'provider_words_match_text':normalized(''.join(w['text'] for w in words))==normalized(scene['text']),
                  'word_times_monotonic':all(a['start']<=b['start'] for a,b in zip(words, words[1:])),
                  'words_within_clip':all(0<=w['start']<=w['end']<=pacing['duration']+.001 for w in words),
                  'pitch_preserving_local_tempo':pacing['pitch_preserving_local_tempo']}
        if model and scene['base_id'] in ('push-release','historical-force','three-readings'):
            segments, info = model.transcribe(str(wav), language='zh', beam_size=3, vad_filter=True)
            result['unprompted_asr'] = ''.join(s.text for s in segments)
            result['asr_model'] = 'faster-whisper base, local int8, no initial prompt'
        audit['turns'].append(result)
    audit['dialogue'] = measure(work/'dialogue.wav')
    audit['state'] = 'pcm_and_provider_text_verified' if all(
        t['provider_words_match_text'] and t['word_times_monotonic'] and t['words_within_clip']
        and t['full_scale_samples']==0 and t['pitch_preserving_local_tempo']==1 for t in audit['turns']) else 'needs_review'
    (work/'audio-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'state':audit['state'], 'turns':len(audit['turns']),
        'duration':audit['dialogue']['duration'], 'audit':str(work/'audio-audit.json'),
        'quiet_flags':sum(len(t['interior_quiet_longer_than_1_5_seconds']) for t in audit['turns'])}, ensure_ascii=False))


if __name__ == '__main__':
    main()
