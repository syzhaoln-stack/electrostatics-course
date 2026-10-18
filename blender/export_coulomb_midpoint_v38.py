"""Project a nonphysical observation mark onto existing v3.7 full-wire frames."""
from pathlib import Path
import json, math
ROOT=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904')
old=json.loads((ROOT/'coulomb-v37-renders/projection-intuition.json').read_text(encoding='utf8'))
scale=1920/15.3;length=math.hypot(18,3.05);up_y=3.05/length;up_z=18/length
result={};errors=[]
for shot in ['force-cycle','short-wire']:
    result[shot]=[]
    for i,r in enumerate(old['shots'][shot]):
        bottom=r['points']['wire_bottom'];L=7.56*r.get('length_ratio',1);a=math.radians(r['theta_deg']/2)
        def project(x,y,z):
            px=bottom['x']+x*scale;py=bottom['y']-scale*(up_y*y+up_z*z)
            return {'x':round(px,3),'y':round(py,3),'visible':0<=px<=1920 and 0<=py<=1080}
        def point(angle):return project(.38*math.cos(angle),.38*math.sin(angle),L/2)
        mid=project(0,0,L/2);top=project(0,0,L)
        errors.append(max(abs(top[k]-r['points']['wire_top'][k]) for k in ['x','y']))
        result[shot].append({'frame':i,'t':r['t'],'u':r['u'],'lower_angle_deg':r['theta_deg'],
            'midpoint_angle_deg':r['theta_deg']/2,'upper_segment_twist_deg':r['theta_deg']/2,
            'lower_segment_twist_deg':r['theta_deg']/2,'wire_length_ratio':r.get('length_ratio',1),
            'points':{'wire_top':r['points']['wire_top'],'wire_bottom':bottom,'wire_midpoint':mid,
                'midpoint_zero':point(0),'midpoint_index':point(a),
                'upper_segment_midpoint':project(0,0,L*.75),'lower_segment_midpoint':project(0,0,L*.25)},
            'ring_points':[point(j*math.tau/64) for j in range(65)]})
assert max(errors)<.002,max(errors)
path=ROOT/'coulomb-v38-renders/wire-midpoint-v37.json';path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps({'shots':result,'size':[1920,1080],'coordinate_origin':'top-left pixels',
    'validation':{'maximum_reprojection_error_px':max(errors)},
    'meaning':'Observation overlay only, continuous straight wire. For equal material and diameter under the same torque, each half has half the total relative angle; no bend, cut, or physical radial rod is introduced.'},indent=2),encoding='utf8')
print(json.dumps({'path':str(path),'frames':{k:len(v) for k,v in result.items()},'maximum_reprojection_error_px':max(errors)}))
