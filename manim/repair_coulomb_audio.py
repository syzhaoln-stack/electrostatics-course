"""Repair verified synthesis silences using frozen paid PCM, without regeneration.

The original paced files and timing are archived once. The first turn's 3.12 s
head removal was verified with both waveform analysis and cached local ASR.
Only interior gaps longer than 2 s, quiet in BOTH RMS and peak amplitude, are
shortened. Ordinary pauses remain. Processing always restarts from paid raw
PCM, never from an already speed-adjusted version.
"""
from pathlib import Path
import array, hashlib, json, math, os, re, shutil, subprocess, wave

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT/'media/lesson-dialogues/production/v3-5/coulomb'
ARCHIVE = WORK/'archive-original-timing'
STAGE = WORK/'repair-staging'
FFMPEG = shutil.which('ffmpeg') or r'D:/Python tools/ffmpeg-6.0-full_build/bin/ffmpeg.exe'
KEEP_GAP = .62  # 0.554–0.689 s after the bounded tempo adjustment below.

def read_json(path): return json.loads(path.read_text(encoding='utf-8'))
def save(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def pcm(path):
    with wave.open(str(path),'rb') as f:
        params=f.getparams(); data=f.readframes(params.nframes)
    if params.sampwidth!=2 or params.comptype!='NONE' or len(data)!=params.nframes*params.nchannels*2:
        raise ValueError(f'Incomplete or non-PCM input: {path.name}')
    return params,data
def write_pcm(path,p,data):
    with wave.open(str(path),'wb') as f:
        f.setnchannels(p.nchannels);f.setsampwidth(p.sampwidth);f.setframerate(p.framerate);f.writeframes(data)
def stamp(seconds):
    ms=round(seconds*1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
def quiet_gaps(p,data):
    samples=array.array('h',data); window=round(p.framerate*.01)*p.nchannels
    start=None; result=[]
    for i in range(0,len(samples)+window,window):
        block=samples[i:i+window]
        quiet=bool(block) and math.sqrt(sum(x*x for x in block)/len(block))<32768*10**(-60/20) and max(abs(x) for x in block)<32768*10**(-40/20)
        if quiet and start is None:start=i
        if not quiet and start is not None:
            a=start/(p.framerate*p.nchannels);b=i/(p.framerate*p.nchannels)
            if b-a>2:result.append((a,b))
            start=None
    return result
def remap(t,cuts):
    return t-sum(max(0,min(t,b)-a) for a,b in cuts if t>a)
def remove_intervals(p,data,cuts):
    chunks=[];cursor=0; framebytes=p.nchannels*2
    for a,b in cuts:
        start=round(a*p.framerate)*framebytes;end=round(b*p.framerate)*framebytes
        chunks.append(data[cursor:start]);cursor=end
    chunks.append(data[cursor:]);return b''.join(chunks)

def main():
    ARCHIVE.mkdir(exist_ok=True); STAGE.mkdir(exist_ok=True)
    # Preserve the original on the first run; later reruns derive from the same raw PCM.
    for pattern in ['turn-*.paced.wav','turn-*.trimmed.wav','turn-*.pacing.json','dialogue.wav','dialogue.vtt','timeline.json','manifest.json']:
        for file in WORK.glob(pattern):
            if not (ARCHIVE/file.name).exists():shutil.copy2(file,ARCHIVE/file.name)
    # The first archive preserves the original edition, but a deliberate one-turn
    # re-recording may have a new paid_record. Always use the currently selected
    # frozen records; all processing below still restarts from their raw PCM.
    manifest=read_json(WORK/'manifest.json');turns=[];audit=[]
    for old in manifest['turns']:
        idx=old['index'];raw=ROOT/old['paid_record'].replace('.record.json','.wav')
        record=read_json(ROOT/old['paid_record'])
        if record['state']!='completed_pcm_verified' or record['expected_text']!=old['text']:
            raise ValueError(f'Paid record mismatch for turn {idx}')
        p,data=pcm(raw);raw_duration=p.nframes/p.framerate
        subtitles=read_json(raw.with_suffix('.subtitle.json'))
        words=[w for s in subtitles['subtitle']['sentences'] for w in s.get('words',[])]
        cuts=[];gap_evidence=[]
        if idx==1:
            if not (3.20<=words[0]['start_time']/1000<=3.30):raise ValueError('First-turn onset changed; investigate before editing')
            cuts.append((0,3.12))
        for a,b in quiet_gaps(p,data):
            if a<.1 or b>raw_duration-.1:continue
            cuts.append((a+KEEP_GAP/2,b-KEEP_GAP/2))
            gap_evidence.append({'quiet_interval_raw_seconds':[round(a,4),round(b,4)],'retained_before_tempo_seconds':KEEP_GAP})
        cuts.sort()
        for w in words:
            if re.search(r'[\u4e00-\u9fffA-Za-z0-9]',w['text']):
                start=w['start_time']/1000;end=w['end_time']/1000
                if any(a<=start and end<=b and start!=end for a,b in cuts):
                    raise ValueError(f'Provider places a spoken word inside a cut: turn {idx}: {w}')
        edited=remove_intervals(p,data,cuts);cut_duration=len(edited)/(p.framerate*p.nchannels*2)
        count=old['spoken_character_proxy_count'];rate=count/cut_duration
        tempo=1 if 4.1<=rate<=4.5 else max(.9,min(1.12,4.25/rate))
        temp=STAGE/f'turn-{idx:02}.silence-repaired.wav';target=STAGE/f'turn-{idx:02}.paced.wav'
        write_pcm(temp,p,edited)
        if tempo==1:shutil.copy2(temp,target)
        else:
            subprocess.run([FFMPEG,'-hide_banner','-loglevel','error','-y','-i',str(temp),'-af',f'atempo={tempo:.10f}','-c:a','pcm_s16le',str(target)],check=True)
        final_p,final_data=pcm(target);duration=final_p.nframes/final_p.framerate
        adjusted=[]
        for w in words:
            start=max(0,min(duration,remap(w['start_time']/1000,cuts)/tempo))
            end=max(start,min(duration,remap(w['end_time']/1000,cuts)/tempo))
            adjusted.append({'text':w['text'],'start':round(start,4),'end':round(end,4)})
        turn={**old,'duration':duration,'words':adjusted,'pitch_preserving_local_tempo':round(tempo,8),
              'character_proxy_per_second':round(count/duration,3),'sha256':hashlib.sha256(final_data).hexdigest(),
              'edge_silence_removed':{'head_seconds':3.12 if idx==1 else 0,'tail_seconds':0,'method':'Only verified first-turn onset repaired; all other raw edges retained.'},
              'word_timing_source':'Original provider timestamps mapped through documented raw-PCM interval cuts and bounded pitch-preserving tempo; no claim of independent forced alignment.',
              'silence_repair':{'source':'Original paid PCM; not the previous paced audio','removed_intervals_raw_seconds':cuts,
                  'quiet_gap_evidence':gap_evidence,'rms_threshold_dbfs':-60,'peak_threshold_dbfs':-40,
                  'local_asr_review':'Cached local faster-whisper base used for independent content/onset review, not human listening.',
                  'pre_tempo_character_proxy_per_second':round(rate,3),'target_band':[4.1,4.5],
                  'tempo_limit':[.9,1.12],'note':'Ordinary pauses preserved. Target band is secondary to limiting unnatural time stretching, especially number-heavy passages.'}}
        save(STAGE/f'turn-{idx:02}.pacing.json',turn);turns.append(turn)
        audit.append({'index':idx,'old_duration':old['duration'],'raw_duration':raw_duration,'new_duration':duration,'cuts':cuts,'tempo':tempo,'rate':round(count/duration,3)})
        print(f'Turn {idx:02}: {duration:.3f}s; tempo {tempo:.4f}; cuts {cuts}',flush=True)

    params,_=pcm(STAGE/'turn-01.paced.wav');current=.35;timeline=[]
    silence=lambda t:b'\0'*round(t*params.framerate)*params.nchannels*2
    with wave.open(str(STAGE/'dialogue.wav'),'wb') as out:
        out.setnchannels(params.nchannels);out.setsampwidth(2);out.setframerate(params.framerate);out.writeframes(silence(current))
        for i,turn in enumerate(turns):
            p,data=pcm(STAGE/f'turn-{i+1:02}.paced.wav');out.writeframes(data)
            timeline.append({'index':i,'start':round(current,4),'end':round(current+turn['duration'],4),'speaker':turn['speaker'],'name':turn['name'],'text':turn['text'],
                'words':[{**w,'start':round(current+w['start'],4),'end':round(current+w['end'],4)} for w in turn['words']], 'word_timing_source':turn['word_timing_source']})
            current+=turn['duration'];gap=.3 if i<len(turns)-1 else .6;out.writeframes(silence(gap));current+=gap
    save(STAGE/'timeline.json',timeline)
    vtt=['WEBVTT','']
    for i,t in enumerate(timeline,1):vtt += [str(i),f"{stamp(t['start'])} --> {stamp(t['end'])}",f"{t['name']}：{t['text']}",'']
    (STAGE/'dialogue.vtt').write_text('\n'.join(vtt),encoding='utf-8')
    manifest.update(turns=turns,duration=round(current,4),state='silence_repaired_pcm_verified',human_listening_review=False,
        pacing_note='Verified multi-second synthesis silences removed before rate estimation. Tempo changes limited to 0.90–1.12; number-rich speech can remain below the advisory 4.1–4.5 character/s band.',
        character_proxy_per_second=round(sum(t['spoken_character_proxy_count'] for t in turns)/sum(t['duration'] for t in turns),3),
        audio_repair={'script':'manim/repair_coulomb_audio.py','original_timing_archive':'archive-original-timing','paid_raw_preserved':True,'new_paid_requests':0,'audit':audit})
    save(STAGE/'manifest.json',manifest)
    for file in STAGE.iterdir():
        if file.name.endswith('.silence-repaired.wav'):continue
        os.replace(file,WORK/file.name)
    save(WORK/'audio-repair-audit.json',audit)
    print(f'REPAIRED TOTAL DURATION: {current:.4f}s',flush=True)

if __name__=='__main__':main()
