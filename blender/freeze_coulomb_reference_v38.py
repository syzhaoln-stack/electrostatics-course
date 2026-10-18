"""Freeze the three accepted reference shots after complete verification."""
from pathlib import Path
import json, hashlib, datetime
repo=Path(__file__).resolve().parent.parent
root=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v38-renders')
report=json.loads((repo/'blender/coulomb-reference-v38-validation.json').read_text(encoding='utf8'))
assert len(report['checks'])==15 and all(x['pass'] for x in report['checks'])
assert report['checks'][-1]['count']==336
counts={'active-bottom-top':96,'active-top':96,'passive-bottom-top':144}
files=[root/name/f'{i:04}.png' for name,n in counts.items() for i in range(n)]
files += [root/'projection-reference.json',root/'wire-midpoint-v37.json']
entries=[{'path':p.relative_to(root).as_posix(),'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
payload={'status':'frozen','frozen_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'frame_count':336,'counts':counts,'png_bytes':sum(e['size'] for e in entries if e['path'].endswith('.png')),
    'validation_checks':15,'files':entries,'scope':'Only the three accepted reference shots and their metadata; winding-key-v38 is separate.'}
(root/'reference-frozen.json').write_text(json.dumps(payload,indent=2),encoding='utf8')
path=repo/'blender/coulomb-reference-v38-checkpoint.json';state=json.loads(path.read_text(encoding='utf8'))
state['status']='Complete and frozen for scene6 composition'
state['compression']['remaining_batch_frames_to_recheck']=0
state['compression']['remaining_batch_status']='All 240 remaining frames completed; RGBA pixels equal. All 336 files are now compressed.'
state['compression']['temporary_files_at_stop']=0
state['validation']['physics_and_projection']='14 checks passed'
state['validation']['all_336_png_decode']='Passed; all 336 native 1920x1080 PNG files fully decoded'
state['validation']['final_signature_frozen']=True
state['resume_from_repository_root']=['Reference assets complete. Compose scene6 using reference-frozen.json; do not change the accepted 336 frames.']
state['outputs']['freeze_manifest']=str(root/'reference-frozen.json')
path.write_text(json.dumps(state,indent=2),encoding='utf8')
print(json.dumps({'status':'frozen','frames':336,'png_bytes':payload['png_bytes'],'checks':15,'manifest':str(root/'reference-frozen.json')}))
