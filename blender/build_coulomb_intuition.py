"""v3.7: a dynamical torsion balance, with an approaching source and a free needle.

All rendered poses come from a dimensionless damped angular equation; only the
hand-controlled source position is prescribed. Historical final angles calibrate
each trial's charge product. Timing/inertia/damping are explanatory, not measured.
"""
from pathlib import Path
import math, json, sys, bisect
D = math.pi / 180
DT = 1 / 480
SPECS = {'0': (0, 36, 72, 36), '126': (36, 144, 36, 18), '567': (144, 575.5, 18, 8.5)}

def rk4(theta, speed, dt, acceleration):
    a1 = speed; b1 = acceleration(theta, speed)
    a2 = speed + dt*b1/2; b2 = acceleration(theta+dt*a1/2, speed+dt*b1/2)
    a3 = speed + dt*b2/2; b3 = acceleration(theta+dt*a2/2, speed+dt*b2/2)
    a4 = speed + dt*b3; b4 = acceleration(theta+dt*a3, speed+dt*b3)
    return theta+dt*(a1+2*a2+2*a3+a4)/6, speed+dt*(b1+2*b2+2*b3+b4)/6

def simulate_force(length_ratio=1, arm_ratio=1, cycle=False):
    theta = speed = 0.; kappa = 1/length_ratio; inertia=.18*arm_ratio**2; damping=.5*arm_ratio
    duration=22 if cycle else 13 if arm_ratio>1 else 8
    rows=[]
    for i in range(round(duration/DT)+1):
        t=i*DT
        force=0 if t<.18 else (1 if t<4 else 0 if t<9 else 1 if t<15 else 2) if cycle else 1
        torque=36*D*force*arm_ratio
        rows.append({'t':t,'theta_deg':theta/D,'speed_deg_s':speed/D,'force_ratio':force,'torque':torque,'restoring_torque':kappa*theta,'length_ratio':length_ratio,'arm_ratio':arm_ratio,'phase':'release' if force==0 and t>1 else 'force2' if force==2 else 'force1'})
        theta,speed=rk4(theta,speed,DT,lambda a,b:(torque-kappa*a-damping*b)/inertia)
    return rows

def simulate_pursuit(suffix):
    start, target, first_gap, final_gap=SPECS[suffix]
    theta=start*D; speed=0.; phi=(start-first_gap)*D; destination=(target-final_gap)*D
    inertia=.18; damping=.9; rows=[]; arrival=None
    def torque(a,p):
        gap=a-p
        # Exact chord-distance and tangential projection for two spheres at R.
        return target*D*(math.sin(final_gap*D/2)/math.sin(gap/2))**2*math.cos(gap/2)/math.cos(final_gap*D/2)
    for i in range(round(45/DT)+1):
        t=i*DT
        advancing=t%2.4<1.4 and phi<destination-1e-12
        previous_phi=phi
        if advancing:
            velocity=(80 if target>500 else 32)*D
            safe_gap=max(8.2,final_gap*.65)*D
            phi=min(destination,max(phi,min(phi+velocity*DT,theta-safe_gap)))
        applied=torque(theta,phi)
        rows.append({'t':t,'theta_deg':theta/D,'source_deg':phi/D,'gap_deg':(theta-phi)/D,'speed_deg_s':speed/D,'source_speed_deg_s':(phi-previous_phi)/DT/D,'torque':applied,'restoring_torque':theta,'force_ratio':applied/(36*D),'torque_ratio':applied/(36*D),'exact_force_ratio':applied/(36*D)/math.cos((theta-phi)/2)*math.cos(36*D/2),'phase':'approach' if advancing else 'recoil' if arrival is None else 'settling','trial':suffix})
        theta,speed=rk4(theta,speed,DT,lambda a,b:(torque(a,phi)-a-damping*b)/inertia)
        if phi>=destination-1e-10 and arrival is None:arrival=t
        if arrival is not None and t>arrival+5:break
    return rows

SERIES={'force-cycle':simulate_force(cycle=True),'short-wire':simulate_force(length_ratio=.5),'long-arm':simulate_force(arm_ratio=2)}
SERIES['force-close']=SERIES['force-cycle']
SERIES['short-wire-close']=SERIES['short-wire']
SERIES['long-arm-close']=SERIES['long-arm']
# The doubled-force insert begins at the first static equilibrium.
def simulate_double():
    theta=36*D;speed=0.;rows=[]
    for i in range(round(6/DT)+1):
        t=i*DT;force=1 if t<.5 else 2;torque=36*D*force
        rows.append({'t':t,'theta_deg':theta/D,'speed_deg_s':speed/D,'force_ratio':force,'torque':torque,'restoring_torque':theta,'length_ratio':1,'arm_ratio':1,'phase':'force1' if force==1 else 'force2'})
        theta,speed=rk4(theta,speed,DT,lambda a,b:(torque-a-.5*b)/.18)
    return rows
SERIES['force-double-close']=simulate_double()
for key in SPECS: SERIES['pursuit-close-'+key]=simulate_pursuit(key)
combined=[];cursor=0
for key in SPECS:
    source=SERIES['pursuit-close-'+key]
    for r in source:combined.append({**r,'t':r['t']+cursor})
    cursor+=source[-1]['t']+DT
SERIES['pursuit-wire']=combined
SERIES['shield-and-scale']=[{'t':i*DT,'theta_deg':36,'phase':'shield'} for i in range(round(5/DT)+1)]

def sample_series(name,u):
    rows=SERIES[name];t=max(0,min(1,u))*rows[-1]['t'];i=min(len(rows)-1,round(t/DT))
    return dict(rows[i])

def restoring_force(state):
    torque=state.get('restoring_torque',state['theta_deg']*D)
    return {'direction':-1 if torque>=0 else 1,'magnitude_ratio':abs(torque)/(36*D)/state.get('arm_ratio',1)}

# BLENDER SCENE: keep the established authentic materials and lightweight arm.
BASE=Path(__file__).with_name('build_coulomb_film.py')
exec(compile(BASE.read_text(encoding='utf-8').split('args=sys.argv')[0],str(BASE),'exec'),globals())
base_setup=setup
S.eevee.taa_render_samples=40
IMAGE_OUT=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v37-renders')
IMAGE_OUT.mkdir(parents=True,exist_ok=True)
source_material=material('warm pith source ball v37',(.87,.61,.28),0,.84,.2)
source=empty('operator source assembly v37',(0,0,0))
source_ball=sphere('operator source pith ball v37',(0,0,1.64),.065,source_material);parent(source_ball,source)
source_stem=rod('operator source shellac stem v37',(0,0,1.09),(0,0,1.64),.016,wax);parent(source_stem,source)
source_handle=cyl('operator source brass handle v37',.028,.14,1.02,brass);parent(source_handle,source)

def arrow(name,mat):
    e=empty(name,(0,0,0));shaft=cyl(name+' shaft',.009,.7,.35,mat);parent(shaft,e)
    bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.034,radius2=0,depth=.12,location=(0,0,.76));parent(finish(bpy.context.object,name+' head',mat),e)
    return e
applied_arrow=arrow('applied force v37',coral)
restore_arrow=arrow('elastic restoring v37',cyan)
links=[rod('centre line v37',(0,0,0),(0,0,1),.0025,gold) for i in range(7)]
zero_ray=[rod('fixed zero v37',(.10+i*.14,0,1.61),(.17+i*.14,0,1.61),.0024,cyan) for i in range(8)]
# Every mark stays on a straight silver axis; orientation varies along the wire.
child_defaults={o.name:(o.location.copy(),o.scale.copy()) for o in moving.children}
wind_material=material('quiet exterior airflow',(.13,.42,.46),0,.65)
wind_paths=[];wind_dots=[]
for j,(side,z) in enumerate([(-1,1.0),(-1,2.3),(1,1.7)]):
    pts=[]
    for i in range(81):
        x=-3.2+6.4*i/80
        y=side*(1.05+1.0*math.exp(-(x/1.65)**4))
        pts.append((x,y,z))
    curve=line('exterior wind path v37',pts,.004,wind_material);wind_paths.append((curve,pts))
    dot=arrow('exterior wind tracer v37',wind_material);dot.scale=(.6,.6,.45);wind_dots.append(dot)


def pixels(point):
    v=world_to_camera_view(S,camera,Vector(point));return {'x':round(v.x*1920,3),'y':round((1-v.y)*1080,3),'visible':0<=v.x<=1 and 0<=v.y<=1 and v.z>0}

def hide_group(obj,hide):
    obj.hide_render=hide
    for c in obj.children:hide_group(c,hide)

def configure(name,u):
    state=sample_series(name,u);theta=state['theta_deg'];a=theta*D
    for o,_ in wind_paths:o.hide_render=name!='shield-and-scale'
    for o in wind_dots:hide_group(o,name!='shield-and-scale')
    glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.02
    pursuit=name.startswith('pursuit');close='close' in name
    base_setup('wire',0)
    L=7.56*state.get('length_ratio',1);R=1.08*state.get('arm_ratio',1);top=1.64+L
    wire.location=(0,0,1.64+L/2);wire.scale=(1.3,1.3,L/7.56)
    upper_clamp.location.z=top+.05;macro_upper.location.z=top
    moving.rotation_euler.z=a;macro_lower.rotation_euler.z=a
    for o in moving.children:
        location,scale=child_defaults[o.name];o.location=location.copy();o.scale=scale.copy()
        if o.name.startswith(('waxed light needle','shellac tip')):
            o.location.x*=R/1.08;o.scale.z*=R/1.08
        elif o.name.startswith(('moving pith ball','paper damping counterweight')):o.location.x*=R/1.08
    for i,g in enumerate(section_marks):
        fraction=(i+1)/5;g.location.z=1.64+fraction*L;g.rotation_euler.z=a*(1-fraction);g.scale=(.52,.52,1)
    mb=Vector((R*math.cos(a),R*math.sin(a),1.64));force_ratio=state.get('force_ratio',0)
    for o in macro:o.hide_render=close
    hide_group(source,not pursuit)
    for o in links:o.hide_render=not pursuit
    for o in zero_ray:o.hide_render=not close
    tangent=Vector((-math.sin(a),math.cos(a),0))
    if pursuit:
        p=state['source_deg']*D;source.location=(1.08*math.cos(p),1.08*math.sin(p),0);sb=source.location+Vector((0,0,1.64));direction=(mb-sb).normalized()
        start=sb+direction*.071;end=mb-direction*.071;delta=end-start
        for i,o in enumerate(links):
            x=start+delta*(i/7);y=start+delta*((i+.5)/7);o.location=(x+y)/2;o.scale.z=(y-x).length;o.rotation_quaternion=(y-x).to_track_quat('Z','Y')
        arrow_length=.40 # Comparable direction marker: numeric force is overlaid separately.
        hide_group(restore_arrow,True)
    else:
        direction=tangent;arrow_length=.42*max(.01,force_ratio)
        hide_group(restore_arrow,abs(theta)<.03)
        restoring_direction=tangent*restoring_force(state)['direction']
        restore_arrow.location=mb+restoring_direction*.09+Vector((0,0,-.05));restore_arrow.rotation_euler=restoring_direction.to_track_quat('Z','Y').to_euler();restore_arrow.scale.z=.42*restoring_force(state)['magnitude_ratio']/.82
    hide_group(applied_arrow,not pursuit and force_ratio==0)
    applied_arrow.location=mb+direction*.09;applied_arrow.rotation_euler=direction.to_track_quat('Z','Y').to_euler();applied_arrow.scale.z=arrow_length/.82
    if name=='shield-and-scale':
        base_setup('whole',0);moving.rotation_euler.z=36*D
        f=smooth((u-.42)/.46)
        glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.075*(1-f)
        for obj,_ in wind_paths:obj.hide_render=u>.62
        for i,obj in enumerate(wind_dots):
            hide_group(obj,u>.62)
            pts=wind_paths[i][1];n=min(len(pts)-2,int(((u*1.5+i*.27)%1)*(len(pts)-1)));obj.location=pts[n];obj.rotation_euler=(Vector(pts[n+1])-Vector(pts[n])).to_track_quat('Z','Y').to_euler()
        start=Vector((0,-2.5,11));end=Vector((0,-1.2,8));target0=Vector((0,0,1.7));target1=Vector((0,0,1.64))
        camera_at(start.lerp(end,f),target0.lerp(target1,f));d.ortho_scale=8*(1-f)+4.8*f
        for o in macro:o.hide_render=True
        if f>.9:
            for obj in [vessel,lid,tower,band]:obj.hide_render=True
            for obj in bpy.data.objects:
                if obj.name.startswith(('paper band','paper graduation','scale numeral','fixed graduated','fixed micrometer','fixed zero','brass collar','top housing','upper adjustment')):obj.hide_render=True
            for obj in [dial,*dial.children]:obj.hide_render=True
        hide_group(source,True);hide_group(applied_arrow,True);hide_group(restore_arrow,True)
        for obj in links+zero_ray:obj.hide_render=True
    elif close:
        d.ortho_scale=8.4 if name=='long-arm-close' else 5.6 if name in ['force-close','force-double-close'] else 4.8;camera_at((0,-1.2,8),(0,0,1.64))
    else:
        d.ortho_scale=15.3;camera_at((0,-18,8.5),(0,0,5.45))
    bpy.context.view_layer.update()
    pts={'glass_shield':(1.62,-.2,2.4),'scale':(0,-1.63,1.5),'wire_top':(0,0,top),'wire_bottom':(0,0,1.64),'upper_clamp':(0,0,top+.05),'lower_clamp':(0,0,1.665),'needle_center':(0,0,1.64),'moving_ball':mb,'zero':(R,0,1.64),'force_tail':mb+direction*.09,'force_tip':mb+direction*(.09+arrow_length),'arm_midpoint':mb*.5+Vector((0,0,.82)),'restoring_tip':restore_arrow.location+tangent*restoring_force(state)['direction']*(.42*restoring_force(state)['magnitude_ratio'])}
    if pursuit:
        pts.update(source_ball=sb,driving_ball=sb)
        for i in range(17):
            ang=(state['source_deg']+state['gap_deg']*i/16)*D;pts[f'gap_arc_{i:02}']=(.65*R*math.cos(ang),.65*R*math.sin(ang),1.64)
    result={**state,'u':u,'alpha_deg':theta,'beta_deg':0,'twist_deg':theta,'separation_deg':state.get('gap_deg',None),'source_angle_deg':state.get('source_deg',None),'points':{k:pixels(v) for k,v in pts.items()}}
    return result

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
COUNTS={'force-cycle':128,'force-close':0,'force-double-close':160,'short-wire':64,'short-wire-close':160,'long-arm':64,'long-arm-close':192,'pursuit-wire':192,'pursuit-close-0':160,'pursuit-close-126':192,'pursuit-close-567':240,'shield-and-scale':48}
# More samples where the large insert moves; retain exact physical time on every pose.
force_times=set([0.,22.])
for start,end,fps in [(0,3.5,40),(3.5,4,4),(4,7.5,40),(7.5,9,4),(9,12.5,24),(12.5,15,4),(15,18.5,24),(18.5,22,4)]:
    for i in range(round((end-start)*fps)+1):force_times.add(round(start+i/fps,8))
SAMPLE_US={name:[i/(count-1) for i in range(count)] for name,count in COUNTS.items() if count}
SAMPLE_US['force-close']=[t/22 for t in sorted(force_times) if t<=14.8]
COUNTS['force-close']=len(SAMPLE_US['force-close'])
names=args[args.index('--shots')+1].split(',') if '--shots' in args else list(COUNTS)
preview='--preview' in args;projection_only='--projection-only' in args
if '--samples' in args:S.eevee.taa_render_samples=int(args[args.index('--samples')+1])
projections={};audit=[]
def save():
    path=IMAGE_OUT/('projection-intuition-preview.json' if preview else 'projection-intuition.json')
    payload={'size':[1920,1080],'coordinate_origin':'top-left pixels','render':'Blender Eevee; deterministic ODE poses','physics':'I theta_ddot + c theta_dot + kappa theta = electric torque; source manually approaches in pulses and then stops; no imposed needle angle or constant-gap following','angle_convention':'upper fixed; theta_deg is accumulated lower rotation; gap_deg is instantaneous sphere separation angle','shots':projections,'durations':{k:v[-1]['t'] for k,v in SERIES.items()}}
    if path.exists():
        old=json.loads(path.read_text(encoding='utf8'));old['shots'].update(projections);payload['shots']=old['shots']
    path.write_text(json.dumps(payload,indent=2),encoding='utf8')

for name in names:
    assert name in COUNTS,name
    projections[name]=[]
    if preview:
        values={'force-cycle':14.8/22,'force-close':14.8/22,'force-double-close':1,'short-wire-close':1,'long-arm-close':1,'short-wire':1,'long-arm':1,'pursuit-wire':.98,'pursuit-close-0':.40,'pursuit-close-126':.42,'pursuit-close-567':.98,'shield-and-scale':.2}
        u=values[name];projections[name].append(configure(name,u));S.render.filepath=str(IMAGE_OUT/(name+'-preview.png'));bpy.ops.render.render(write_still=True)
    else:
        folder=IMAGE_OUT/name;folder.mkdir(exist_ok=True)
        for i,u in enumerate(SAMPLE_US[name]):
            projections[name].append(configure(name,u));dest=folder/f'{i:04}.png'
            if projection_only or (dest.exists() and '--force' not in args):continue
            S.render.filepath=str(dest);t=time.time();bpy.ops.render.render(write_still=True);audit.append({'shot':name,'frame':i,'seconds':round(time.time()-t,2)})
    save();print('INTUITION_SHOT_DONE '+name,flush=True)
configure('pursuit-wire',1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/coulomb-intuition-v37.blend'))
(IMAGE_OUT/'render-intuition-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
print('INTUITION_DONE',flush=True)
