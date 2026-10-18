"""Checks for the targeted v3.8 reference views and their rendered evidence."""
from pathlib import Path
import json, math, sys
ROOT=Path(__file__).resolve().parent.parent
source=ROOT/'blender/build_coulomb_reference_v38.py'
ns={'__file__':str(source)}
exec(compile(source.read_text(encoding='utf8').split('\n# BLENDER SCENE:',1)[0],str(source),'exec'),ns)
checks=[]
def check(name,passed,**evidence):
    checks.append({'name':name,'pass':bool(passed),**evidence});assert passed,(name,evidence)
active=ns['ACTIVE'];passive=ns['PASSIVE']
for name,rows in [('active',active),('passive',passive)]:
    r=rows[-1]
    check(name+' final gap and relative twist',abs(r['gap_deg']-8.5)<.001 and abs(r['twist_deg']-575.5)<.001,gap_deg=r['gap_deg'],twist_deg=r['twist_deg'])
    check(name+' relative twist identity',all(abs(x['twist_deg']-x['lower_deg']+x['upper_deg'])<1e-8 for x in rows))
    contact=2*math.asin(.065/1.08)*180/math.pi;mingap=min(x['gap_deg'] for x in rows)
    check(name+' finite spheres stay separate',mingap>contact,minimum_gap_deg=mingap,contact_gap_deg=contact)
check('active source remains fixed',all(x['source_deg']==0 for x in active))
check('passive upper end remains fixed',all(x['upper_deg']==0 for x in passive))
recoil=[passive[i+120]['gap_deg']-r['gap_deg'] for i,r in enumerate(passive[:-120]) if r['phase']=='recoil' and passive[i+120]['phase']=='recoil']
check('passive source stops while needle moves away',max(recoil)>.5,gap_increase_deg=max(recoil))
check('active upper end reaches minus567',active[-1]['upper_deg']==-567)
out=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v38-renders')
projection=out/'projection-reference.json'
if projection.exists():
    data=json.loads(projection.read_text(encoding='utf8'));angle_errors=[];force_errors=[];outside=[]
    for shot,rows in data['shots'].items():
        for i,r in enumerate(rows):
            p=r['points']
            if shot=='active-top':continue
            c=p['needle_center'];b=p['moving_ball'];s=p['source_ball'];z=p['force_tail'];e=p['force_tip']
            angle=math.degrees(math.atan2(-(b['y']-c['y']),b['x']-c['x']))
            angle_errors.append(abs((angle-r['lower_deg']+180)%360-180))
            ux,uy=b['x']-s['x'],b['y']-s['y'];vx,vy=e['x']-z['x'],e['y']-z['y']
            force_errors.append(abs(ux*vy-uy*vx)/(math.hypot(ux,uy)*math.hypot(vx,vy)))
            for key in ['moving_ball','source_ball','force_tip','arm_end']:
                v=p[key]
                if not(420<v['x']<1500 and 0<v['y']<1080):outside.append([shot,i,key])
    check('true overhead angle equals physical lower angle',max(angle_errors)<.0002,maximum_error_deg=max(angle_errors))
    check('force arrow aligns with real sphere line',max(force_errors)<.0001,maximum_normalized_cross_error=max(force_errors))
    check('all bottom geometry fits common square crop',not outside,failures=outside)
    a=data['shots']['active-top'];b=data['shots']['active-bottom-top']
    check('upper and lower active images share exact poses',len(a)==len(b) and all(x['t']==y['t'] and x['upper_deg']==y['upper_deg'] and x['lower_deg']==y['lower_deg'] for x,y in zip(a,b)))
    if '--renders' in sys.argv:
        from PIL import Image
        count=0;fail=[]
        for shot,rows in data['shots'].items():
            for i in range(len(rows)):
                path=out/shot/f'{i:04}.png'
                try:
                    with Image.open(path) as im:im.load();assert im.size==(1920,1080)
                    count+=1
                except Exception as error:fail.append({'path':str(path),'error':str(error)})
        check('all reference renders fully decode',not fail and count==336,count=count,failures=fail)
report={'checks':checks,'scope':'Two distinct motions with identical final gap, twist and balance torque. Historical angles calibrate endpoint; timing and moving trajectories are modern explanatory simulations.'}
(ROOT/'blender/coulomb-reference-v38-validation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))
