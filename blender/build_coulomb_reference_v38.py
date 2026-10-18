"""v3.8: matched true-overhead reference views, preserving the v3.7 film.

The historical upper-driven balance and the teaching lower-driven equivalent
share the final gap and relative twist, not their motion at intermediate times.
"""
from pathlib import Path
import math, json, sys
ROOT=Path(__file__).resolve().parent.parent
PREVIOUS=ROOT/'blender/build_coulomb_intuition.py'
physics={'__file__':str(PREVIOUS)}
exec(compile(PREVIOUS.read_text(encoding='utf8').split('# BLENDER SCENE:')[0],str(PREVIOUS),'exec'),physics)
D=math.pi/180;DT=physics['DT'];rk4=physics['rk4']

def ease(u):
    u=max(0,min(1,u));return u*u*(3-2*u)

def active_upper(t):return -126-441*ease((t-.4)/5.8)

def electric_torque(gap):
    g=gap*D
    return 575.5*D*(math.sin(8.5*D/2)/math.sin(g/2))**2*math.cos(g/2)/math.cos(8.5*D/2)

def simulate_active():
    theta=18*D;speed=0.;rows=[]
    for i in range(round(12/DT)+1):
        t=i*DT;upper=active_upper(t);gap=theta/D;twist=theta-upper*D
        torque=electric_torque(gap)
        rows.append({'t':t,'upper_deg':upper,'lower_deg':theta/D,'theta_deg':theta/D,
            'source_deg':0.,'gap_deg':gap,'twist_deg':twist/D,'torque':torque,
            'restoring_torque':twist,'speed_deg_s':speed/D,'source_speed_deg_s':0.,
            'phase':'upper_turning' if .4<t<6.2 else 'settling','mode':'historical-upper-driven'})
        def acceleration(a,b):return (electric_torque(a/D)-(a-upper*D)-.9*b)/.18
        theta,speed=rk4(theta,speed,DT,acceleration)
    return rows

ACTIVE=simulate_active()
PASSIVE=[{**r,'upper_deg':0.,'lower_deg':r['theta_deg'],'twist_deg':r['theta_deg'],
    'mode':'teaching-lower-driven'} for r in physics['SERIES']['pursuit-close-567']]
SERIES={'active-bottom-top':ACTIVE,'active-top':ACTIVE,'passive-bottom-top':PASSIVE}
COUNTS={'active-bottom-top':96,'active-top':96,'passive-bottom-top':144}

def pose(shot,u):
    rows=SERIES[shot];i=min(len(rows)-1,round(max(0,min(1,u))*rows[-1]['t']/DT))
    return dict(rows[i])

# BLENDER SCENE:
# Load the established model and materials without executing its render loop.
exec(compile(PREVIOUS.read_text(encoding='utf8').rsplit('\nargs=sys.argv',1)[0],str(PREVIOUS),'exec'),globals())
# The import above defines v3.7 names; restore this revision's source paths/data.
ROOT=Path(__file__).resolve().parent.parent
ACTIVE=simulate_active()
PASSIVE=[{**r,'upper_deg':0.,'lower_deg':r['theta_deg'],'twist_deg':r['theta_deg'],
    'mode':'teaching-lower-driven'} for r in physics['SERIES']['pursuit-close-567']]
REFERENCE_SERIES={'active-bottom-top':ACTIVE,'active-top':ACTIVE,'passive-bottom-top':PASSIVE}
IMAGE_OUT=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v38-renders')
IMAGE_OUT.mkdir(parents=True,exist_ok=True)
S.render.image_settings.compression=100

def reference_pose(shot,u):
    rows=REFERENCE_SERIES[shot];i=min(len(rows)-1,round(max(0,min(1,u))*rows[-1]['t']/DT));return dict(rows[i])

# Sparse, co-planar instructional geometry, distinct from the historical scale.
guide=torus('v38 fixed rotation guide',1.35,.0022,1.64,cyan)
angle_arc=line('v38 between-ball angle',[(.84,0,1.64)]*33,.004,cyan)
torque_arc=line('v38 elastic return moment',[(.42,0,1.665)]*33,.005,cyan)
bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.027,radius2=0,depth=.09)
torque_head=finish(bpy.context.object,'v38 elastic return moment arrow',cyan)
radials=[rod('v38 reference radial',(0,0,0),(0,0,1),.0023,gold) for _ in range(2)]

def set_segment(obj,a,b):
    a,b=Vector(a),Vector(b);obj.location=(a+b)/2;obj.scale.z=(b-a).length
    obj.rotation_quaternion=(b-a).to_track_quat('Z','Y')

def set_curve(obj,points):
    for p,co in zip(obj.data.splines[0].points,points):p.co=(*co,1)

def reference_setup(shot,u):
    state=reference_pose(shot,u);a=state['lower_deg']*D;b=state['upper_deg']*D;p=state['source_deg']*D
    base_setup('wire',0)
    for obj in macro:obj.hide_render=True
    for obj,_ in wind_paths:obj.hide_render=True
    for obj in wind_dots:hide_group(obj,True)
    for obj in links:obj.hide_render=True
    for obj in zero_ray:obj.hide_render=False
    moving.rotation_euler.z=a;upper_clamp.rotation_euler.z=b;dial.rotation_euler.z=b
    wire.scale=(1.3,1.3,1);wire.location=(0,0,5.42)
    for obj in moving.children:
        loc,scale=child_defaults[obj.name];obj.location=loc.copy();obj.scale=scale.copy();obj.hide_render=False
    mb=Vector((1.08*math.cos(a),1.08*math.sin(a),1.64))
    sb=Vector((1.08*math.cos(p),1.08*math.sin(p),1.64))
    source.location=(sb.x,sb.y,0);hide_group(source,False)
    direction=(mb-sb).normalized()
    applied_arrow.location=mb+direction*.085
    applied_arrow.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    applied_arrow.scale=(.75,.75,.30/.82);hide_group(applied_arrow,False)
    hide_group(restore_arrow,True)
    for obj in [guide,angle_arc,torque_arc,torque_head,*radials]:obj.hide_render=False
    # The fixed zero is horizontal in BOTH bottom views. Arc is the small
    # source-to-suspended angle, never the accumulated number of full turns.
    arc=[(.84*math.cos(p+(a-p)*i/32),.84*math.sin(p+(a-p)*i/32),1.64) for i in range(33)]
    set_curve(angle_arc,arc)
    for obj,angle in zip(radials,[p,a]):
        set_segment(obj,(.70*math.cos(angle),.70*math.sin(angle),1.64),
            (1.02*math.cos(angle),1.02*math.sin(angle),1.64))
    torque_angles=[a+(65-100*i/32)*D for i in range(33)]
    set_curve(torque_arc,[(.42*math.cos(v),.42*math.sin(v),1.665) for v in torque_angles])
    end=torque_angles[-1];cw=Vector((math.sin(end),-math.cos(end),0))
    torque_head.location=(.42*math.cos(end),.42*math.sin(end),1.665)
    torque_head.rotation_euler=cw.to_track_quat('Z','Y').to_euler()
    # Exact vertical camera: a world circle remains a circle and screen angles
    # are exactly physical angles; there is no perspective enlargement error.
    camera_at((0,0,12),(0,0,1.64));d.ortho_scale=5.45
    for obj in [upper_clamp,*upper_clamp.children,wire]:obj.hide_render=True
    if shot=='active-top':
        for obj in moving.children:obj.hide_render=True
        hide_group(source,True);hide_group(applied_arrow,True)
        for obj in [guide,angle_arc,torque_arc,torque_head,*radials,*zero_ray]:obj.hide_render=True
        for obj in bpy.data.objects:
            if obj.name.startswith(('fixed graduated','fixed micrometer','fixed zero','top housing','upper adjustment')):obj.hide_render=False
        for obj in [dial,*dial.children]:obj.hide_render=False
        # Remove only the tall grip so it cannot occlude the rotating index.
        for obj in dial.children:
            if obj.name.startswith(('top thumb grip','fine grip groove')):obj.hide_render=True
        for obj in zero_ray:obj.hide_render=True
        camera_at((0,0,12),(0,0,10));d.ortho_scale=1.70
    bpy.context.view_layer.update()
    pts={'needle_center':(0,0,1.64),'moving_ball':mb,'source_ball':sb,
        'zero':(1.35,0,1.64),'force_tail':mb+direction*.085,'force_tip':mb+direction*.385,
        'arm_end':(-1.03*math.cos(a),-1.03*math.sin(a),1.64),
        'torque_arrow':torque_head.location,'dial_center':(0,0,10.025),
        'dial_pointer':(.36*math.cos(b),.36*math.sin(b),10.035),'dial_zero':(.39,0,10.025)}
    pts.update({f'gap_arc_{i:02}':v for i,v in enumerate(arc)})
    return {**state,'u':u,'alpha_deg':state['lower_deg'],'beta_deg':-state['upper_deg'],
        'separation_deg':state['gap_deg'],'upper_modulo_deg':state['upper_deg']%360,
        'lower_modulo_deg':state['lower_deg']%360,'accumulated_turns':state['twist_deg']/360,
        'restoring_torque_signed':-state['restoring_torque'],
        'points':{k:pixels(v) for k,v in pts.items()}}

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
COUNTS={'active-bottom-top':96,'active-top':96,'passive-bottom-top':144}
SHOT_NAMES=args[args.index('--shots')+1].split(',') if '--shots' in args else list(COUNTS)
preview='--preview' in args;projection_only='--projection-only' in args
if '--samples' in args:S.eevee.taa_render_samples=int(args[args.index('--samples')+1])
else:S.eevee.taa_render_samples=48
output={};audit=[]
for shot in SHOT_NAMES:
    output[shot]=[]
    values=[1.] if preview else [i/(COUNTS[shot]-1) for i in range(COUNTS[shot])]
    folder=IMAGE_OUT/shot;folder.mkdir(exist_ok=True)
    for i,u in enumerate(values):
        output[shot].append(reference_setup(shot,u))
        dest=IMAGE_OUT/(shot+'-preview.png') if preview else folder/f'{i:04}.png'
        if projection_only or (dest.exists() and '--force' not in args):continue
        S.render.filepath=str(dest);start=time.time();bpy.ops.render.render(write_still=True)
        audit.append({'shot':shot,'frame':i,'seconds':round(time.time()-start,3)})
    payload={'size':[1920,1080],'coordinate_origin':'top-left pixels','shots':output,
        'durations':{k:v[-1]['t'] for k,v in REFERENCE_SERIES.items()},
        'recommended_crop':{'active-bottom-top':[420,0,1500,1080],'passive-bottom-top':[420,0,1500,1080],'active-top':[420,0,1500,1080]},
        'angle_convention':'CCW positive in world XY. upper_deg is signed; twist_deg=lower_deg-upper_deg. Small cyan arc is gap_deg; full-turn count must not be drawn as an 8.5-degree wedge.',
        'physics':'Two distinct damped RK4 simulations. Final 8.5-degree gap calibrates Coulomb chord force. Passive source advances and stops independently of the free suspended ball. Equivalence is final relative twist/geometry/torque, not intermediate trajectories.',
        'arrows':'Red: true repulsion direction at suspended ball. Cyan curved arrow: restoring torque, clockwise for positive relative twist. Arrow lengths are direction markers.',
        'camera':'True orthographic view along negative world Z; same bottom scale 5.45.'}
    path=IMAGE_OUT/('projection-reference-preview.json' if preview else 'projection-reference.json')
    if path.exists():
        old=json.loads(path.read_text(encoding='utf8'));old['shots'].update(output);payload['shots']=old['shots']
    path.write_text(json.dumps(payload,indent=2),encoding='utf8')
    print('REFERENCE_SHOT_DONE '+shot,flush=True)
reference_setup('passive-bottom-top',1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/coulomb-reference-v38.blend'))
(IMAGE_OUT/'render-reference-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
print('REFERENCE_DONE',flush=True)
