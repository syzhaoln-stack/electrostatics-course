"""Check the explanatory promises against solved poses and native narration."""
import bisect,json,math,sys
from pathlib import Path
import compose_coulomb_v37 as film

def nearest(name,t):
    rows=film.PROJECTIONS[name];times=[r['t'] for r in rows]
    j=min(len(rows)-1,bisect.bisect_left(times,t));i=max(0,j-1)
    return rows[i if abs(times[i]-t)<abs(times[j]-t) else j]

checks=[]
def check(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    if not condition:raise AssertionError(name)

check('11 question-led scenes, less than four minutes',len(film.TIME)==11 and film.DURATION<240)
for name,target in [('short-wire-close',18),('long-arm-close',72),('force-double-close',72)]:
    check(name+' settles at intended angle',abs(film.PROJECTIONS[name][-1]['twist_deg']-target)<.06)
for t in [4.1,5,7,8.8]:check(f'no applied force after release at {t}s',nearest('force-close',t)['force_ratio']==0)
for delta in [0,1,2,4,5.5]:
    whole=nearest('force-cycle',15+delta)['twist_deg'];close=nearest('force-double-close',.5+delta)['twist_deg']
    check(f'whole/close double-force responses agree at {delta}s',abs(whole-close)<4)
for suffix,gap,twist in [('0',36,36),('126',18,144),('567',8.5,575.5)]:
    rows=film.PROJECTIONS['pursuit-close-'+suffix];last=rows[-1]
    check(suffix+' final historical reading',abs(last['separation_deg']-gap)<.003 and abs(last['twist_deg']-twist)<.003)
    check(suffix+' source pauses while needle retreats',any(abs(r['source_speed_deg_s'])<.01 and r['speed_deg_s']>1 for r in rows))
    check(suffix+' sphere surfaces never intersect',min(r['separation_deg'] for r in rows)>math.degrees(2*math.asin(.065/1.08)))
approach=next(t for t in film.TIME if t['base_id']=='approach-response')
check('approach narration has distinct action cues',film.cue(approach,'再把施力球追近',-1)>film.cue(approach,'等它停下',100))
for t in [1.4,3.85,6.2]:check(f'recoil teaching pose has stopped source {t}s',abs(nearest('pursuit-close-567',t)['source_speed_deg_s'])<.01)
for name in ['force-close','force-double-close','short-wire-close','long-arm-close','pursuit-close-0','pursuit-close-126','pursuit-close-567']:
    check(name+' sphere/force stay inside composition crop',all(120<=r['points'][key]['x']<=1800 and 0<=r['points'][key]['y']<=1080 for r in film.PROJECTIONS[name] for key in ['moving_ball','force_tip']))
audit=json.loads((film.AUDIO/'audio-audit.json').read_text(encoding='utf8'))
check('all narration clips decoded without clipping',all(t['decode_complete'] and t['full_scale_samples']==0 and t['provider_words_match_text'] for t in audit['turns']))
check('spoken pace preserved',audit['native_tempo_preserved'])
if '--complete' in sys.argv:
    for name,rows in film.PROJECTIONS.items():
        check(name+' all Blender frames present',all((film.RENDERS/name/f'{i:04}.png').exists() for i in range(len(rows))))
report={'checks':checks,'passed':len(checks),'failed':0,'duration':film.DURATION,'first_force_N':.053e-3/3400*9.80665,'zero_uncertainty_equivalent_N':.053e-3/40000*9.80665}
(film.WORK/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2))
