"""Check v3.7 mechanical poses independently of Blender's rendering engine."""
from pathlib import Path
import json, math, sys
ROOT=Path(__file__).resolve().parent.parent
namespace={'__file__':str(ROOT/'blender/build_coulomb_intuition.py')}
exec(compile((ROOT/'blender/build_coulomb_intuition.py').read_text(encoding='utf8').split('# BLENDER SCENE:')[0], 'physics', 'exec'), namespace)
series=namespace['SERIES'];step=namespace['DT'];checks=[]
def check(name,condition,**data):
    checks.append({'name':name,'pass':bool(condition),**data})
    assert condition,(name,data)
cycle=series['force-cycle'];at=lambda t:cycle[round(t/step)]
first=at(14.999)['theta_deg'];released=at(8.999)['theta_deg'];double=cycle[-1]['theta_deg']
check('twice force gives twice equilibrium angle',abs(double/first-2)<.012,first_angle_deg=first,double_angle_deg=double,ratio=double/first)
check('removing force returns toward zero',abs(released)<.1,released_angle_deg=released)
short=series['short-wire'][-1]['theta_deg'];long_arm=series['long-arm'][-1]['theta_deg']
check('half wire length gives half angle at same force',abs(short-18)<.01,angle_deg=short)
check('double arm gives twice angle at same force',abs(long_arm-72)<.01,angle_deg=long_arm)
contact=2*math.asin(.065/1.08)*180/math.pi
for suffix,(_,theta,_,gap) in namespace['SPECS'].items():
    rows=series['pursuit-close-'+suffix];final=rows[-1]
    check(suffix+' final equilibrium',abs(final['theta_deg']-theta)<.003 and abs(final['gap_deg']-gap)<.003,theta_deg=final['theta_deg'],gap_deg=final['gap_deg'])
    mingap=min(x['gap_deg'] for x in rows)
    check(suffix+' spheres never intersect',mingap>contact,minimum_gap_deg=mingap,contact_gap_deg=contact)
    recoil=[rows[i+120]['gap_deg']-r['gap_deg'] for i,r in enumerate(rows[:-120]) if r['phase']=='recoil' and rows[i+120]['phase']=='recoil']
    check(suffix+' distance increases while source stops',max(recoil)>.5,largest_gap_increase_in_quarter_second_deg=max(recoil))
    check(suffix+' source advances monotonically',all(b['source_deg']>=a['source_deg']-1e-12 for a,b in zip(rows,rows[1:])))
rf=namespace['restoring_force']
check('restoring arrow always opposes signed twist',all(r['theta_deg']*rf(r)['direction']<=0 for r in cycle))
check('long arm end forces balance',abs(rf(series['long-arm'][-1])['magnitude_ratio']-1)<.001)
render_root=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v37-renders')
projection_path=render_root/'projection-intuition.json'
if projection_path.exists():
    projections=json.loads(projection_path.read_text(encoding='utf8'))
    outside=[];cross_errors=[];forward=[]
    for name,rows in projections['shots'].items():
        for i,row in enumerate(rows):
            pts=row['points']
            if name.startswith('pursuit-close'):
                a=pts['source_ball'];b=pts['moving_ball'];c=pts['force_tip'];z=pts['force_tail']
                u=(b['x']-a['x'],b['y']-a['y']);v=(c['x']-z['x'],c['y']-z['y'])
                norm=math.hypot(*u)*math.hypot(*v)
                cross_errors.append(abs(u[0]*v[1]-u[1]*v[0])/norm);forward.append(u[0]*v[0]+u[1]*v[1])
            if name!='shield-and-scale':
                outside.extend((name,i,k) for k in ['moving_ball','source_ball','force_tip'] if k in pts and not pts[k]['visible'])
    check('sphere and force arrows stay inside camera',not outside,failures=outside)
    check('repulsion arrows follow actual two-sphere line',max(cross_errors)<.0001 and min(forward)>0,maximum_normalized_cross_error=max(cross_errors))
    if '--renders' in sys.argv:
        from PIL import Image
        failures=[];count=0
        for name,rows in projections['shots'].items():
            for i,row in enumerate(rows):
                file=render_root/name/f'{i:04}.png'
                try:
                    with Image.open(file) as img:img.load();assert img.size==(1920,1080)
                    count+=1
                except Exception as error:failures.append({'path':str(file),'error':str(error)})
        check('every expected render fully decodes',not failures,count=count,failures=failures)
report={'checks':checks,'physics':'Dimensionless RK4, 480 steps per second; Coulomb chord force, geometric tangential component; one calibration per historical equilibrium. These driven illustrative trajectories are not measured history and do not independently test the assumed inverse-square law.','render_note':'force_ratio in pursuit is torque ratio, which is the classroom constant-lever-arm approximation; exact_force_ratio separately contains the geometric correction.','timings':{k:r[-1]['t'] for k,r in series.items()}}
(ROOT/'blender/coulomb-intuition-validation.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))
