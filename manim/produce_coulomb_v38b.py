"""Revision B: ten scenes, three new native takes, seven byte-identical reused takes.

Revision A and v3.7 remain immutable. Only --generate submits paid synthesis;
every request is single-shot with the existing immutable/no-unknown-retry helper.
"""
from pathlib import Path
import argparse
import copy
import hashlib
import json
import shutil
import sys
import wave
import produce_coulomb_v36 as producer
import produce_coulomb_v37 as prior
import produce_coulomb_v38 as revision_a

PROJECT = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = prior.DEFAULT_OUTPUT.parent/'coulomb-v38b-audio'
EDITION = 'v3-8-series'
OLD = prior.DEFAULT_OUTPUT/'production'/prior.EDITION/'coulomb'
REVISION_A = revision_a.DEFAULT_OUTPUT/'production'/revision_a.EDITION/'coulomb'
REPLACED = {0, 2, 9}
# New zero-based index -> (original output root, audio directory, one-based take).
SOURCES = {1:(prior.DEFAULT_OUTPUT,OLD,2), 3:(prior.DEFAULT_OUTPUT,OLD,5),
           4:(prior.DEFAULT_OUTPUT,OLD,6), 5:(prior.DEFAULT_OUTPUT,OLD,7),
           6:(revision_a.DEFAULT_OUTPUT,REVISION_A,8),
           7:(prior.DEFAULT_OUTPUT,OLD,9), 8:(prior.DEFAULT_OUTPUT,OLD,10)}
CUE_PHRASES = {**revision_a.CUE_PHRASES,
    'push-release':['两球靠近','斥力会变大','小得惊人','十六微克','一点摩擦','一阵轻风','怎样抓住这个微小信号','线索','这根银丝','轻推','它转开','撤掉力','它又转回来'],
    'double-length':['同样的力','两倍长的银丝','材质','粗细','施力的位置','做个记号','上下两段','短丝一样长','同样的扭矩','上半段扭过一个角度','从中间往下看','下半段又多扭了','合起来','就是两倍','更敏感的原因'],
    'measurement-close':['微小的力','转动的线索','先标定','再读角度','知道力的大小','把银丝加长','信号会更明显','改变两球的距离','这几次读数'],
}
PROMPT = ('成熟男性研究者在仪器旁向大学生解释物理实验，声音温厚、有阅历，但不假装低沉。'
          '像追查实验线索，疑问真实，发现时有轻微惊喜；克制自然，不用戏剧腔、广告腔或舞台腔。'
          '用正常交流速度和短句节奏，约每秒四个汉字，句子之间自然停顿，句末利落，不拖长字音。'
          '保持这个音色本身，不装衰老，不颤抖，不沙哑。'
          '直接从正文第一个字开始，不添加开场声、叹息、清嗓、音乐、笑声或音效。'
          '只朗读以下正文，不朗读任何控制说明，不添加或省略正文：\n')


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def cue_times(row):
    old = prior.CUE_PHRASES
    try:
        prior.CUE_PHRASES = CUE_PHRASES
        return prior.cue_times(row)
    finally:
        prior.CUE_PHRASES = old


def main():
    if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--script',type=Path,default=PROJECT/'manim/coulomb-intuition-v38b.json')
    p.add_argument('--output-root',type=Path,default=DEFAULT_OUTPUT)
    p.add_argument('--generate',action='store_true')
    args=p.parse_args();lines=producer.read_script(args.script)
    old_lines=[r for r in producer.read_script(PROJECT/'manim/coulomb-intuition-v38.json') if r['base_id']!='double-lever']
    if len(lines)!=10 or len(old_lines)!=10:raise RuntimeError('Expected ten scenes after the approved removal.')
    for i,(new,old) in enumerate(zip(lines,old_lines,strict=True)):
        if i not in REPLACED and new!=old:raise RuntimeError(f'Unapproved change to reused scene {i}')
    work=args.output_root/'production'/EDITION/'coulomb'
    spec={'state':'dry_run_no_request','edition':EDITION,'script':lines,'script_path':str(args.script),
          'script_sha256':file_hash(args.script),'voice':producer.VOICES['sedate'],'model':'seed-audio-1.0',
          'speech_rate_request':5,'pitch_rate':0,'native_tempo_preserved':True,'human_listening_review':False,
          'replaced_scene_indices':sorted(REPLACED),'paid_requests_maximum':3,'output':str(work)}
    if not args.generate:
        print(json.dumps({**spec,'script':[{'base_id':r['base_id'],'characters':producer.base.chars(r['text'])} for r in lines]},ensure_ascii=False,indent=2));return
    args.output_root.mkdir(parents=True,exist_ok=True)
    if shutil.disk_usage(args.output_root).free<500*1024*1024:raise RuntimeError('Less than 500 MiB free; no synthesis requested.')
    work.mkdir(parents=True,exist_ok=True);manifest=work/'manifest.json'
    if manifest.exists() and json.loads(manifest.read_text(encoding='utf-8'))['script_sha256']!=spec['script_sha256']:
        raise RuntimeError('Immutable edition text differs; no synthesis requested.')
    producer.ROOT=args.output_root;producer.base.OUT=args.output_root;producer.PROMPT=PROMPT
    status={**spec,'state':'generating','turns':[],'reused_sources':[]};producer.base.save(manifest,status)
    for i,scene in enumerate(lines):
        index=i+1;wav=work/f'turn-{index:02}.paced.wav';pacing_path=work/f'turn-{index:02}.pacing.json'
        if i in REPLACED:
            turn=producer.find_or_create(work,index,scene['text'],'sedate',5)
            turn['source_revision']='v3.8 revision B new native take'
        else:
            source_root,source_dir,source_index=SOURCES[i]
            original_wav=source_dir/f'turn-{source_index:02}.paced.wav'
            original_pacing=source_dir/f'turn-{source_index:02}.pacing.json'
            turn=copy.deepcopy(json.loads(original_pacing.read_text(encoding='utf-8')))
            if turn['text']!=scene['text']:raise RuntimeError(f'Reused take {index} differs from exact text.')
            digest=file_hash(original_wav)
            if wav.exists() and file_hash(wav)!=digest:raise RuntimeError(f'Existing reused audio differs: {wav}')
            if not wav.exists():shutil.copy2(original_wav,wav)
            turn.update(index=index,source_revision='v3.8 A repaired relative-reference' if i==6 else 'v3.7 unchanged native take',
                        original_wav=str(original_wav),original_pacing=str(original_pacing),original_wav_file_sha256=digest,
                        paid_record=str(source_root/turn['paid_record']))
            status['reused_sources'].append({'index':index,'source':str(original_wav),'source_file_sha256':digest,'copy_file_sha256':file_hash(wav)})
        producer.base.save(pacing_path,turn);status['turns'].append(turn);producer.base.save(manifest,status)
    params,_=producer.base.pcm(work/'turn-01.paced.wav');current=.35;timeline=[]
    with wave.open(str(work/'dialogue.wav'),'wb') as out:
        out.setnchannels(params.nchannels);out.setsampwidth(params.sampwidth);out.setframerate(params.framerate)
        def silence(seconds):return b'\0'*round(seconds*params.framerate)*params.nchannels*params.sampwidth
        out.writeframes(silence(current))
        for i,(turn,scene) in enumerate(zip(status['turns'],lines,strict=True)):
            wav=work/f'turn-{i+1:02}.paced.wav';p,data=producer.base.pcm(wav)
            if(p.nchannels,p.sampwidth,p.framerate)!=(params.nchannels,params.sampwidth,params.framerate):raise RuntimeError('PCM formats differ')
            out.writeframes(data)
            row={'index':i,'id':scene['base_id'],'start':round(current,4),'end':round(current+turn['duration'],4),
                 'speaker':'coulomb','name':turn['name'],'text':turn['text'],
                 'words':[{**w,'start':round(current+w['start'],4),'end':round(current+w['end'],4)} for w in turn['words']],
                 'word_timing_source':turn['word_timing_source'],'wav':str(wav),'pacing':str(work/f'turn-{i+1:02}.pacing.json'),
                 'source_revision':turn['source_revision'],
                 **{k:scene[k] for k in ('base_id','shot','question','answer','visual_beats')}}
            row['cues']=cue_times(row);timeline.append(row);current+=turn['duration']
            gap=.35 if i<len(lines)-1 else .65;out.writeframes(silence(gap));current+=gap
    producer.base.save(work/'timeline.json',timeline);vtt=['WEBVTT','']
    for i,row in enumerate(timeline,1):vtt.extend([str(i),f"{producer.base.stamp(row['start'])} --> {producer.base.stamp(row['end'])}",row['text'],''])
    (work/'dialogue.vtt').write_text('\n'.join(vtt),encoding='utf-8')
    producer.base.save(work/'selected-takes.json',[{'index':i+1,**{k:row[k] for k in ('base_id','shot','text','question','answer','wav','pacing','source_revision')},'duration':status['turns'][i]['duration'],'paid_record':str(args.output_root/status['turns'][i]['paid_record'])} for i,row in enumerate(timeline)])
    status.update(state='generated_pcm_verified',duration=round(current,4),dialogue_sha256=file_hash(work/'dialogue.wav'),timeline_sha256=file_hash(work/'timeline.json'))
    producer.base.save(manifest,status)
    print(json.dumps({'state':status['state'],'duration':current,'timeline':str(work/'timeline.json'),'reused':len(status['reused_sources']),'new_requests_maximum':3},ensure_ascii=False))


if __name__=='__main__':main()
