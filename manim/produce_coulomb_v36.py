"""Coulomb v3.6: mature Doubao presets, native pacing, immutable paid records.

Defaults to a dry run. --audition generates one short sample per selected preset.
--generate --script manim/coulomb-film-v36.json produces the complete new edition.
No global time stretching, pitch shifting, interior silence deletion, or old-text fallback.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import wave
import produce_dialogues as base

ROOT=base.ROOT
OFFICIAL_VOICES='https://docs.volcengine.com/docs/DoubaoVoice/Tonelist-1?lang=zh'
VOICES={
    'sedate': {'name':'沉稳优雅 2.0','id':'ICL_uranus_zh_male_chenwenyouya_tob'},
    'bearded': {'name':'胡子叔叔 2.0','id':'ICL_uranus_zh_male_huzishushu_tob'},
}
PROMPT=('成熟男性研究者的中文科学叙事。声音沉稳、温厚、有阅历，像在仪器旁向大学生解释自己做过的实验。'
        '清楚而自然，正常交流速度，整体约每秒四到四点五个汉字；新概念和关键数字稍停，句末利落。'
        '保持这个音色本身的自然声线，不刻意压低嗓音，不装衰老，不颤抖，不沙哑，不用广告腔或舞台腔。'
        '这是一段历史实验的现代重述，不是模仿历史人物的真实声音。'
        '只朗读以下正文，不朗读控制要求，不添加音乐、音效、笑声或其他文字：\n')
AUDITION=('我并不是直接看见了电力。我看见的，是这根银丝被扭转之后，仍想转回原来的方向。'
          '只要先弄清楚，扭转多少，需要多大的力，我就能反过来，用转动的角度，测量微弱的电力。')


def body_for(text,voice,rate):
    return {'model':'seed-audio-1.0','text_prompt':PROMPT+text,
            'references':[{'speaker':VOICES[voice]['id']}],
            'audio_config':{'format':'wav','sample_rate':48000,'speech_rate':rate,
                            'pitch_rate':0,'loudness_rate':0,'enable_subtitle':True}}


def find_or_create(work,index,text,voice,rate):
    """Exactly one paid request for a new body; uncertain outcomes never retry."""
    if (work/'PAUSE_NEW_REQUESTS').exists():raise RuntimeError('New synthesis paused before submission')
    body=body_for(text,voice,rate)
    digest=hashlib.sha256(json.dumps(body,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
    stem=work/'requests'/f'{voice}-{digest[:16]}';stem.parent.mkdir(parents=True,exist_ok=True)
    request,source,record,raw=(Path(str(stem)+suffix) for suffix in ('.request.json','.txt','.record.json','.wav'))
    if not record.exists():
        for existing in (base.OUT/'production').rglob('*.record.json'):
            prior=json.loads(existing.read_text(encoding='utf-8-sig'))
            if prior.get('expected_text')!=text or prior.get('request')!=body:continue
            candidate=Path(str(existing).removesuffix('.record.json')+'.wav')
            if prior.get('state')!='completed_pcm_verified' or not candidate.exists():
                raise RuntimeError(f'Turn {index}: matching incomplete paid record; no retry sent')
            record,raw=existing,candidate;break
    if record.exists():
        previous=json.loads(record.read_text(encoding='utf-8-sig'))
        if previous.get('state')!='completed_pcm_verified' or not raw.exists():
            raise RuntimeError(f'Turn {index}: existing uncertain/failed record; no retry sent')
        if previous.get('expected_text')!=text or previous.get('request')!=body:
            raise RuntimeError(f'Turn {index}: immutable paid request differs; choose a deliberate new version')
    else:
        source.write_text(text,encoding='utf-8');base.save(request,body)
        run=subprocess.run([sys.executable,str(base.HELPER),'synthesize','--request',str(request),
             '--expected-text',str(source),'--record',str(record),'--output',str(raw)],
             capture_output=True,text=True,encoding='utf-8')
        if run.returncode:raise RuntimeError(f'Turn {index}: synthesis failed; redacted record retained, no retry sent')
    params,data=base.pcm(raw)
    trimmed,head,tail=base.trim_edges(params,data)
    # Deliberately bypass the earlier dialogue producer's automatic atempo band.
    out=work/f'turn-{index:02}.paced.wav';base.write_wav(out,params,trimmed)
    duration=len(trimmed)/params.nchannels/params.sampwidth/params.framerate
    subtitle=json.loads(raw.with_suffix('.subtitle.json').read_text(encoding='utf-8'))
    raw_words=[w for sentence in (subtitle.get('subtitle') or {}).get('sentences',[]) for w in sentence.get('words',[])]
    words=[{'text':w['text'],'start':round(max(0,w['start_time']/1000-head),4),
            'end':round(min(duration,max(0,w['end_time']/1000-head)),4)} for w in raw_words]
    total_characters=base.chars(text)
    spoken_span=(words[-1]['end']-words[0]['start']) if words else duration
    turn={'index':index,'speaker':'coulomb','name':'库仑视角 · 现代重述','text':text,
          'voice':VOICES[voice]['id'],'voice_name':VOICES[voice]['name'],
          'duration':duration,'raw_duration':params.nframes/params.framerate,
          'edge_silence_removed':{'head_seconds':head,'tail_seconds':tail,'threshold_dbfs':-52,'retained_pad_seconds':.06},
          'speech_rate_request':rate,'pitch_rate':0,'pitch_preserving_local_tempo':1,
          'interior_pause_edits':[],'spoken_character_proxy_count':total_characters,
          'character_proxy_per_second':round(total_characters/duration,3),
          'character_proxy_per_speech_span_second':round(total_characters/max(.001,spoken_span),3),
          'sha256':hashlib.sha256(trimmed).hexdigest(),'paid_record':record.relative_to(ROOT).as_posix(),
          'words':words,'word_timing_source':'Provider word timestamps; only measured edge trim offset applied. No time stretching or forced alignment.'}
    base.save(work/f'turn-{index:02}.pacing.json',turn)
    print(f'{work.name}: {index:02} ready, {duration:.2f}s, {turn["character_proxy_per_second"]:.2f} char proxy/s, native tempo',flush=True)
    return turn


def produce(lines,voice='sedate',rate=0,edition='v3-6',lesson='coulomb',workers=3):
    work=base.OUT/'production'/edition/lesson;work.mkdir(parents=True,exist_ok=True)
    status={'edition':edition,'lesson':lesson,'state':'generating','provider':'Doubao OpenSpeech',
            'model':'seed-audio-1.0','voice':VOICES[voice], 'official_voice_reference':OFFICIAL_VOICES,
            'speech_rate_request':rate,'pitch_rate':0,'native_tempo_preserved':True,
            'human_listening_review':False,'historical_voice_reconstruction':False,
            'note':'Preset synthetic narration for a modern first-person adaptation; no claim to reconstruct Coulomb’s actual voice.',
            'script_sha256':hashlib.sha256(json.dumps(lines,ensure_ascii=False).encode()).hexdigest(),
            'script':lines,'turns':[]}
    manifest=work/'manifest.json'
    if manifest.exists():
        previous=json.loads(manifest.read_text(encoding='utf-8-sig'))
        for key in ['script_sha256','voice','speech_rate_request','pitch_rate']:
            if previous.get(key)!=status[key]:
                raise RuntimeError(f'Frozen edition differs in {key}; choose a deliberate new version. No request sent.')
    base.save(work/'manifest.json',status)
    turns={};errors=[]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        jobs=[pool.submit(find_or_create,work,i,line['text'],voice,rate) for i,line in enumerate(lines,1)]
        for job in as_completed(jobs):
            try:
                turn=job.result();turns[turn['index']]=turn;status['turns']=[turns[i] for i in sorted(turns)];base.save(work/'manifest.json',status)
            except Exception as error:errors.append(str(error))
    if errors:
        status.update(state='failed_no_retry',errors=errors);base.save(work/'manifest.json',status)
        raise RuntimeError('; '.join(errors))
    params,_=base.pcm(work/'turn-01.paced.wav');current=.35;timeline=[]
    with wave.open(str(work/'dialogue.wav'),'wb') as out:
        out.setnchannels(params.nchannels);out.setsampwidth(params.sampwidth);out.setframerate(params.framerate)
        silence=lambda seconds:b'\0'*round(seconds*params.framerate)*params.nchannels*params.sampwidth
        out.writeframes(silence(current))
        for i,turn in enumerate(status['turns']):
            p,data=base.pcm(work/f'turn-{i+1:02}.paced.wav')
            if(p.nchannels,p.sampwidth,p.framerate)!=(params.nchannels,params.sampwidth,params.framerate):raise RuntimeError('PCM formats differ')
            out.writeframes(data)
            timeline.append({'index':i,'id':lines[i].get('id',str(i+1)),'start':round(current,4),'end':round(current+turn['duration'],4),
                'speaker':'coulomb','name':turn['name'],'text':turn['text'],
                'words':[{**w,'start':round(current+w['start'],4),'end':round(current+w['end'],4)}for w in turn['words']],
                'word_timing_source':turn['word_timing_source']})
            current+=turn['duration'];gap=.35 if i<len(lines)-1 else .65;out.writeframes(silence(gap));current+=gap
    base.save(work/'timeline.json',timeline)
    vtt=['WEBVTT','']
    for i,turn in enumerate(timeline,1):vtt.extend([str(i),f"{base.stamp(turn['start'])} --> {base.stamp(turn['end'])}",turn['text'],''])
    (work/'dialogue.vtt').write_text('\n'.join(vtt),encoding='utf-8')
    status.update(state='generated_pcm_verified',duration=round(current,4),
        character_proxy_per_second=round(sum(t['spoken_character_proxy_count']for t in status['turns'])/sum(t['duration']for t in status['turns']),3))
    base.save(work/'manifest.json',status)
    print(f'AUDIO TIMELINE READY {current:.2f}s: {work / "timeline.json"}',flush=True)
    return work


def read_script(path):
    value=json.loads(path.read_text(encoding='utf-8-sig'))
    lines=value if isinstance(value,list) else value.get('scenes')
    if not isinstance(lines,list) or not lines:raise ValueError('Expected a nonempty scene array')
    for line in lines:
        if not isinstance(line,dict) or not isinstance(line.get('text'),str) or not line['text'].strip():raise ValueError('Every scene needs text')
        if len(PROMPT+line['text'])>2900:raise ValueError('Split long scenes before submitting')
    return lines


def main():
    if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audition',action='store_true')
    parser.add_argument('--generate',action='store_true')
    parser.add_argument('--voice',choices=list(VOICES),default='sedate')
    parser.add_argument('--rate',type=int,default=0)
    parser.add_argument('--version',default='v3-6')
    parser.add_argument('--script',type=Path,default=ROOT/'manim/coulomb-film-v36.json')
    parser.add_argument('--workers',type=int,default=3)
    args=parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9_-]+',args.version):raise ValueError('Version must be one safe directory name')
    if not -50<=args.rate<=100:raise ValueError('Invalid speech rate')
    if args.audition:
        for voice in VOICES:produce([{'id':'voice-audition','text':AUDITION}],voice,args.rate,args.version+'-audition','coulomb-'+voice,1)
    elif args.generate:
        produce(read_script(args.script),args.voice,args.rate,args.version,'coulomb',max(1,min(3,args.workers)))
    else:
        lines=read_script(args.script);print(json.dumps({'state':'dry_run_no_request','voice':VOICES[args.voice],
            'speech_rate':args.rate,'pitch_rate':0,'scenes':len(lines),'characters':sum(base.chars(s['text'])for s in lines),
            'script':str(args.script)},ensure_ascii=False,indent=2))


if __name__=='__main__':main()
