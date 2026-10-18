"""Read-only final MP4/AAC verification against frozen revision-C native WAV.

Prepare/dry-run is the default. Run --execute only after the final mux finishes.
No synthesis, edits, time stretching, normalization, or output video replacement.
The loudnorm filter is used only to measure the existing final audio into null.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import re
import shutil
import subprocess
import sys
import wave
import numpy as np
from scipy.signal import correlate, resample_poly
from produce_coulomb_v38c import DEFAULT_OUTPUT, EDITION, OLD

STORAGE=DEFAULT_OUTPUT.parent
SOURCE=DEFAULT_OUTPUT/'production'/EDITION/'coulomb'
DEFAULT_VIDEO=STORAGE/'coulomb-v38c-edit/coulomb.mp4'
DEFAULT_AUDIT=STORAGE/'coulomb-v38-final-audit'
FFMPEG=Path('D:/Python tools/ffmpeg-6.0-full_build/bin/ffmpeg.exe')
FFPROBE=FFMPEG.with_name('ffprobe.exe')
TARGETS=(0,2,6,9)
FS=8000


def file_hash(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda:f.read(4*1024*1024),b''):h.update(block)
    return h.hexdigest()


def save(path,value):
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')


def run(args):
    proc=subprocess.run([str(a) for a in args],capture_output=True,text=True,encoding='utf-8',errors='replace')
    if proc.returncode:
        raise RuntimeError(f'Command failed ({proc.returncode}): {Path(str(args[0])).name}\n{proc.stderr[-4000:]}')
    return proc


def read_wav(path):
    with wave.open(str(path),'rb') as f:
        p=f.getparams();raw=f.readframes(p.nframes)
    if p.sampwidth!=2 or p.comptype!='NONE' or len(raw)!=p.nframes*p.nchannels*p.sampwidth:
        raise RuntimeError(f'Incomplete 16-bit PCM: {path}')
    samples=np.frombuffer(raw,'<i2').reshape((-1,p.nchannels))
    return p,raw,samples


def mono8k(samples,rate):
    mono=samples.astype(np.float64).mean(axis=1)/32768
    divisor=math.gcd(FS,rate)
    return resample_poly(mono,FS//divisor,rate//divisor)


def coefficient(a,b):
    count=min(len(a),len(b));a=a[:count]-np.mean(a[:count]);b=b[:count]-np.mean(b[:count])
    return float(np.dot(a,b)/max(1e-15,np.linalg.norm(a)*np.linalg.norm(b)))


def normalized_match(final,reference,expected,search=.75):
    """Mean/gain-insensitive normalized cross correlation, at 0.125 ms resolution."""
    ref=reference-reference.mean();n=len(ref)
    left=max(0,math.floor((expected-search)*FS))
    right=min(len(final),math.ceil((expected+search)*FS)+n)
    candidate=final[left:right]
    if len(candidate)<n:raise RuntimeError('Final audio is shorter than the compared source clip.')
    numerator=correlate(candidate,ref,mode='valid',method='fft')
    sums=np.concatenate(([0.],np.cumsum(candidate)))
    squared=np.concatenate(([0.],np.cumsum(candidate*candidate)))
    local_sum=sums[n:]-sums[:-n]
    variance=np.maximum(0.,squared[n:]-squared[:-n]-local_sum*local_sum/n)
    scores=numerator/np.maximum(1e-15,np.sqrt(variance)*np.linalg.norm(ref))
    best=int(np.argmax(scores));best_start=(left+best)/FS
    return {'expected_start_seconds':expected,'matched_start_seconds':best_start,
            'offset_seconds':round(best_start-expected,7),'normalized_correlation':float(scores[best]),
            'search_radius_seconds':search,'comparison_sample_rate':FS,'time_step_seconds':1/FS,
            'reference_duration_seconds':n/FS,'method':'Demeaned waveform normalized cross-correlation, FFT valid mode; insensitive to constant gain and DC.'}


def measure_loudness(video,folder):
    proc=run([FFMPEG,'-hide_banner','-nostdin','-i',video,'-map','0:a:0','-vn',
              '-af','loudnorm=I=-17:TP=-1.5:LRA=9:print_format=json','-f','null','-'])
    (folder/'final-loudness.log').write_text(proc.stderr,encoding='utf-8')
    matches=re.findall(r'\{\s*"input_i"[\s\S]*?\}',proc.stderr)
    if not matches:raise RuntimeError('Final audio loudness measurement did not return its input values.')
    measured=json.loads(matches[-1])
    return {'integrated_lufs':float(measured['input_i']),'true_peak_dbtp':float(measured['input_tp']),
            'loudness_range_lu':float(measured['input_lra']),'threshold_lufs':float(measured['input_thresh']),
            'measurement':'FFmpeg loudnorm input measurements from final AAC; no output audio/video modified.',
            'intended_mastering_lufs':-17,'intended_mastering_max_true_peak_dbtp':-1.5,
            'raw_measurement':measured}


def main():
    if hasattr(sys.stdout,'reconfigure'):sys.stdout.reconfigure(encoding='utf-8')
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--video',type=Path,default=DEFAULT_VIDEO)
    p.add_argument('--audit-root',type=Path,default=DEFAULT_AUDIT)
    p.add_argument('--execute',action='store_true')
    args=p.parse_args()
    if not args.execute:
        print(json.dumps({'state':'prepared_not_executed','video':str(args.video),'source_audio':str(SOURCE),
                          'target_scene_indices':TARGETS,'audit_root':str(args.audit_root),
                          'note':'Await completed-mux notification before --execute. No final file polling.'},ensure_ascii=False,indent=2));return
    if not args.video.is_file():raise RuntimeError('Completed final MP4 not found; no polling performed.')
    if not FFMPEG.is_file() or not FFPROBE.is_file():raise RuntimeError('Configured FFmpeg tools not found.')
    frozen=json.loads((SOURCE/'audio-frozen.json').read_text(encoding='utf-8'))
    for name,digest in frozen['files'].items():
        if file_hash(SOURCE/name)!=digest:raise RuntimeError(f'Frozen revision C changed: {name}')
    timeline=json.loads((SOURCE/'timeline.json').read_text(encoding='utf-8'))
    if len(timeline)!=10 or timeline[6]['base_id']!='relative-reference':raise RuntimeError('Wrong revision timeline.')
    args.audit_root.mkdir(parents=True,exist_ok=True)
    if shutil.disk_usage(args.audit_root).free<500*1024*1024:raise RuntimeError('Less than 500 MiB free for audit evidence.')
    before=args.video.stat();video_hash=file_hash(args.video)
    folder=args.audit_root/video_hash[:16];folder.mkdir(exist_ok=True)
    probe=json.loads(run([FFPROBE,'-v','error','-show_streams','-show_format','-of','json',args.video]).stdout)
    save(folder/'ffprobe.json',probe)
    streams=probe['streams'];audios=[s for s in streams if s['codec_type']=='audio'];videos=[s for s in streams if s['codec_type']=='video']
    if len(audios)!=1 or len(videos)!=1:raise RuntimeError('Expected exactly one video stream and one audio stream.')
    full_decode=run([FFMPEG,'-hide_banner','-nostdin','-v','error','-xerror','-i',args.video,'-map','0:v:0','-map','0:a:0','-f','null','-'])
    (folder/'full-decode.log').write_text(full_decode.stderr,encoding='utf-8')
    pcm=folder/'final-decoded-48k-stereo.wav'
    run([FFMPEG,'-hide_banner','-nostdin','-v','error','-y','-i',args.video,'-map','0:a:0','-vn','-ar','48000','-ac','2','-c:a','pcm_s16le',pcm])
    params,raw,samples=read_wav(pcm);final8=mono8k(samples,params.framerate)
    report={'state':'review','video':str(args.video),'video_sha256':video_hash,
            'human_listening_review':False,'final_aac_verified':False,
            'source_directory':str(SOURCE),'frozen_source_hashes':frozen['files'],
            'source_audio_frozen_sha256':file_hash(SOURCE/'audio-frozen.json'),
            'source_script_sha256':frozen['script_sha256'],'timeline_scene_count':len(timeline),
            'streams':{'audio':audios[0],'video':videos[0]},'full_codec_decode':{'exit_code':0,'stderr':full_decode.stderr},
            'decoded_pcm':{'path':str(pcm),'file_sha256':file_hash(pcm),'pcm_sha256':hashlib.sha256(raw).hexdigest(),
                'sample_rate':params.framerate,'channels':params.nchannels,'duration_seconds':params.nframes/params.framerate,
                'peak_dbfs':float(20*np.log10(max(1e-15,float(np.max(np.abs(samples.astype(np.int32))))/32768))),
                'full_scale_sample_count':int(np.count_nonzero(np.abs(samples.astype(np.int32))>=32767))},
            'scene_matches':[]}
    for i in TARGETS:
        row=timeline[i];source=Path(row['wav']);p0,raw0,x0=read_wav(source);reference=mono8k(x0,p0.framerate)
        result={'index':i,'base_id':row['base_id'],'source_wav':str(source),'source_file_sha256':file_hash(source),
                **normalized_match(final8,reference,row['start'])}
        a=round(result['matched_start_seconds']*params.framerate);n=round(len(x0)/p0.framerate*params.framerate)
        extracted=samples[max(0,a):min(len(samples),a+n)]
        clip=folder/f'scene-{i:02}-final-aac-decoded.wav'
        with wave.open(str(clip),'wb') as f:
            f.setnchannels(params.nchannels);f.setsampwidth(2);f.setframerate(params.framerate);f.writeframes(extracted.astype('<i2').tobytes())
        result['extracted_final_wav']=str(clip);result['extracted_final_file_sha256']=file_hash(clip)
        if i==6:
            first=reference[:6*FS];prefix_match=normalized_match(final8,first,row['start'],.25)
            old=OLD/'turn-08.paced.wav';po,_,xo=read_wav(old);old_prefix=mono8k(xo,po.framerate)[:round(5.6*FS)]
            at=round(result['matched_start_seconds']*FS);actual_prefix=final8[at:at+len(old_prefix)]
            old_correlation=coefficient(actual_prefix,old_prefix)
            result['repaired_prefix_check']={'new_source_first_six_seconds':prefix_match,
                'old_anomalous_prefix_source':str(old),'old_anomalous_source_sha256':file_hash(old),
                'old_anomalous_prefix_duration_seconds':5.6,'old_prefix_correlation_at_current_start':old_correlation,
                'interpretation':'A high match to the repaired beginning, low match to the old 5.6-second prelude, and near-zero timing offset verify source selection. This is not human listening.',
                'repaired_source_confirmed':bool(prefix_match['normalized_correlation']>=.95 and abs(prefix_match['offset_seconds'])<=.025 and abs(old_correlation)<.5)}
        result['alignment_pass']=bool(result['normalized_correlation']>=.95 and abs(result['offset_seconds'])<=.025)
        report['scene_matches'].append(result)
    report['loudness']=measure_loudness(args.video,folder)
    report['duration_difference_from_frozen_source_seconds']=round(report['decoded_pcm']['duration_seconds']-frozen['duration'],7)
    after=args.video.stat()
    if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns) or file_hash(args.video)!=video_hash:
        raise RuntimeError('Video changed during audit; this report is not valid for a completed artifact.')
    prefix=next(s for s in report['scene_matches'] if s['index']==6)['repaired_prefix_check']
    checks={'aac_codec':audios[0]['codec_name']=='aac','full_decode_clean':not full_decode.stderr.strip(),
            'all_four_source_matches':all(s['alignment_pass'] for s in report['scene_matches']),
            'repaired_scene6_prefix':prefix['repaired_source_confirmed'],
            'no_full_scale_samples':report['decoded_pcm']['full_scale_sample_count']==0,
            'true_peak_below_minus_point_five':report['loudness']['true_peak_dbtp']<=-.5,
            'integrated_loudness_within_1_5_lu_of_target':abs(report['loudness']['integrated_lufs']+17)<=1.5,
            'duration_within_150ms':abs(report['duration_difference_from_frozen_source_seconds'])<=.15}
    report['checks']=checks;report['final_aac_verified']=all(checks.values())
    report['state']='final_aac_verified' if report['final_aac_verified'] else 'needs_review'
    report['limits']='Source identity, timing, decode, level and signal checks only. No new ASR or human listening is claimed; no inference that every visual cue is synchronized.'
    save(folder/'final-audio-audit.json',report)
    save(args.audit_root/'latest.json',{'report':str(folder/'final-audio-audit.json'),'video_sha256':video_hash,'state':report['state']})
    print(json.dumps({'state':report['state'],'report':str(folder/'final-audio-audit.json'),
        'video_sha256':video_hash,'checks':checks,'duration':report['decoded_pcm']['duration_seconds'],
        'loudness':report['loudness'],'matches':[{'index':s['index'],'correlation':s['normalized_correlation'],'offset_seconds':s['offset_seconds']} for s in report['scene_matches']],
        'repaired_prefix':prefix},ensure_ascii=False,indent=2))


if __name__=='__main__':main()
