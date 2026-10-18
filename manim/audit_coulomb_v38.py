"""Signal/ASR checks for two replaced takes and hashes of nine retained takes.

--diagnose-v37 preserves evidence around the reported 2:25 issue. This is not
a human listening review and never generates speech or changes selected audio.
"""
from pathlib import Path
import argparse
import hashlib
import json
import sys
import wave
import numpy as np
from audit_coulomb_v37 import measure, normalized
from produce_coulomb_v38 import DEFAULT_OUTPUT, EDITION, OLD, REPLACED, PROJECT


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')


def pcm(path):
    with wave.open(str(path),'rb') as f:
        p=f.getparams(); raw=f.readframes(p.nframes)
    return p,raw,np.frombuffer(raw,'<i2').reshape((-1,p.nchannels)).astype(np.float64)/32768


def leading_signal(path,words):
    p,raw,x=pcm(path)
    first=words[0]['start'] if words else None
    if first is None:return {'first_word_seconds':None}
    lead=x[:int(first*p.framerate)]
    frame=max(1,round(.02*p.framerate));n=len(lead)//frame
    rms=np.sqrt(np.mean(lead[:n*frame].reshape((n,frame,p.nchannels))**2,axis=(1,2))) if n else np.array([])
    return {'first_word_seconds':first,'preceding_signal_duration':len(lead)/p.framerate,
            'preceding_rms_dbfs':round(20*np.log10(max(float(np.sqrt(np.mean(lead**2))),1e-10)),2) if len(lead) else None,
            'preceding_peak_dbfs':round(20*np.log10(max(float(np.max(np.abs(lead))),1e-10)),2) if len(lead) else None,
            'preceding_seconds_above_minus_45_dbfs':round(float(np.count_nonzero(rms>10**(-45/20)))*.02,3),
            'unmarked_leading_signal_flag':bool(first>.8 and np.count_nonzero(rms>10**(-45/20))*.02>.5)}


def recognize(model,path):
    segments,_=model.transcribe(str(path),language='zh',beam_size=3,vad_filter=True)
    return [{'start':round(s.start,3),'end':round(s.end,3),'text':s.text} for s in segments]


def diagnose(output,model):
    wav=OLD/'turn-08.paced.wav';p,raw,x=pcm(wav)
    pacing=json.loads((OLD/'turn-08.pacing.json').read_text(encoding='utf-8'))
    old_timeline=json.loads((OLD/'timeline.json').read_text(encoding='utf-8'))
    qa=output/'qa-v37-diagnosis';qa.mkdir(parents=True,exist_ok=True)
    crop=qa/'v37-scene7-first-10-seconds.wav'
    with wave.open(str(crop),'wb') as f:
        f.setparams(p);f.writeframes(raw[:int(10*p.framerate)*p.nchannels*p.sampwidth])
    report={'object':str(wav),'file_sha256':sha(wav),'scene_global_start':old_timeline[7]['start'],
            'measurement':measure(wav),'leading_signal':leading_signal(wav,pacing['words']),
            'first_10_seconds_evidence':str(crop),'requested_text':pacing['text'],
            'human_listening_review':False,'provider_words':pacing['words']}
    if model:report['unprompted_asr']=recognize(model,wav)
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from scipy.signal import spectrogram
    mono=x.mean(axis=1);step=max(1,len(mono)//50000)
    fig,axes=plt.subplots(2,1,figsize=(15,6),sharex=True)
    axes[0].plot(np.arange(0,len(mono),step)/p.framerate,mono[::step],color='#497f89',lw=.5)
    axes[0].axvspan(0,pacing['words'][0]['start'],color='#e5a65c',alpha=.25,label='Before first provider-tagged word')
    axes[0].legend(loc='upper right');axes[0].set_ylabel('PCM amplitude')
    f,t,S=spectrogram(mono[::3],fs=p.framerate/3,nperseg=512,noverlap=400)
    axes[1].pcolormesh(t,f,10*np.log10(np.maximum(S,1e-12)),shading='auto',cmap='magma',vmin=-95,vmax=-30)
    axes[1].set_ylim(0,4000);axes[1].set_xlabel('Scene-local seconds');axes[1].set_ylabel('Hz')
    for a in axes:a.axvline(5.6,color='#d76d53',lw=1);a.set_xlim(0,len(mono)/p.framerate)
    fig.suptitle('v3.7 scene 7: waveform and spectrogram; no human listening claim')
    fig.tight_layout();fig.savefig(qa/'v37-scene7-signal.png',dpi=130);plt.close(fig)
    report['signal_figure']=str(qa/'v37-scene7-signal.png')
    report['interpretation']='A provider timestamp gap is not proof of silence. Unprompted ASR and signal evidence retained; audible character/prosody requires listening.'
    save(qa/'diagnosis.json',report)
    print(json.dumps({'diagnosis':str(qa/'diagnosis.json'),'leading_signal':report['leading_signal'],
                      'unprompted_asr':report.get('unprompted_asr')},ensure_ascii=False))


def audit(output,model):
    work=output/'production'/EDITION/'coulomb'
    manifest=json.loads((work/'manifest.json').read_text(encoding='utf-8'))
    timeline=json.loads((work/'timeline.json').read_text(encoding='utf-8'))
    report={'human_listening_review':False,'native_tempo_preserved':True,
            'asr_method':'faster-whisper base local CPU int8; no initial text prompt' if model else None,
            'turns':[],'reused_audio':[]}
    for i,scene in enumerate(manifest['script']):
        wav=work/f'turn-{i+1:02}.paced.wav'
        pacing=json.loads((work/f'turn-{i+1:02}.pacing.json').read_text(encoding='utf-8'))
        words=pacing['words']
        record={'index':i,'base_id':scene['base_id'],**measure(wav),'file_sha256':sha(wav),
            'provider_words_match_text':normalized(''.join(w['text'] for w in words))==normalized(scene['text']),
            'word_times_monotonic':all(a['start']<=b['start'] for a,b in zip(words,words[1:])),
            'words_within_clip':all(0<=w['start']<=w['end']<=pacing['duration']+.001 for w in words),
            'local_tempo':pacing['pitch_preserving_local_tempo'],'interior_pause_edits':pacing['interior_pause_edits'],
            'character_proxy_per_second':pacing['character_proxy_per_second'],
            'leading_signal':leading_signal(wav,words)}
        if i in REPLACED and model:record['unprompted_asr']=recognize(model,wav)
        if i not in REPLACED:
            original=OLD/wav.name
            report['reused_audio'].append({'index':i,'old':str(original),'new':str(wav),
                'old_file_sha256':sha(original),'new_file_sha256':sha(wav),'byte_identical':sha(original)==sha(wav)})
        report['turns'].append(record)
    report['dialogue']=measure(work/'dialogue.wav')
    report['state']='pcm_text_and_reuse_verified' if all(t['provider_words_match_text'] and t['word_times_monotonic'] and t['words_within_clip'] and t['full_scale_samples']==0 and t['local_tempo']==1 and not t['interior_pause_edits'] for t in report['turns']) and all(t['byte_identical'] for t in report['reused_audio']) and not any(report['turns'][i]['leading_signal']['unmarked_leading_signal_flag'] for i in REPLACED) else 'needs_review'
    save(work/'audio-audit.json',report)
    frozen={'state':report['state'],'human_listening_review':False,
        'files':{name:sha(work/name) for name in ['dialogue.wav','timeline.json','selected-takes.json']},
        'script_sha256':sha(PROJECT/'manim/coulomb-intuition-v38.json'),
        'duration':report['dialogue']['duration'],'new_indices':sorted(REPLACED),
        'unchanged_takes':len(report['reused_audio'])}
    save(work/'audio-frozen.json',frozen)
    print(json.dumps({'state':report['state'],'duration':report['dialogue']['duration'],
        'audit':str(work/'audio-audit.json'),'new_takes':[report['turns'][i] for i in sorted(REPLACED)],
        'all_nine_old_takes_byte_identical':all(t['byte_identical'] for t in report['reused_audio'])},ensure_ascii=False))


def main():
    if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--output-root',type=Path,default=DEFAULT_OUTPUT)
    p.add_argument('--asr',action='store_true')
    p.add_argument('--diagnose-v37',action='store_true')
    args=p.parse_args();model=None
    if args.asr:
        from faster_whisper import WhisperModel
        model=WhisperModel('base',device='cpu',compute_type='int8',cpu_threads=4,local_files_only=True)
    if args.diagnose_v37:diagnose(args.output_root,model)
    else:audit(args.output_root,model)


if __name__=='__main__':main()
