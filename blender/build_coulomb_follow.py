"""Following source ball: an explicitly timed mechanical/electrostatic illustration.

Uses the v3.6 apparatus without changing its existing renders or projections.
The source is held by a movable insulating stem, below the ball for visibility.
The supplied timing is demonstrative, not a reconstructed experimental record.
"""
from pathlib import Path
import sys

BASE = Path(__file__).with_name('build_coulomb_film.py')
exec(compile(BASE.read_text(encoding='utf-8').split('args=sys.argv')[0], str(BASE), 'exec'), globals())
base_setup = setup
base_projection = projection

source_material = material('slightly warmer source pith', (.88,.65,.34), 0, .86, .20)
source = empty('following source assembly', (0,0,0))
source_ball = sphere('following source ball', (0,0,1.64), .065, source_material)
parent(source_ball, source)
parent(rod('following source insulating stem', (0,0,1.08), (0,0,1.64), .018, wax), source)
parent(cyl('following source handle', .035, .18, .99, brass), source)

# Neutral dashed line locates the actual centre-to-centre force direction.
connection = [rod('source to moving ball centre line', (0,0,0), (0,0,1), .003, gold) for _ in range(6)]
push = empty('repulsive force teaching arrow', (0,0,0))
parent(cyl('repulsive force arrow shaft', .009, .25, .125, coral), push)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=.029, radius2=0, depth=.115, location=(0,0,.29))
parent(finish(bpy.context.object, 'repulsive force arrow head', coral), push)
# Fixed zero ray is an annotation, not an additional mechanical arm.
for i in range(8):
 rod('stationary zero ray', (.10+i*.135,0,1.605), (.17+i*.135,0,1.605), .003, cyan)

specs = {'0': (0,36,72,36), '126': (36,144,36,18), '567': (144,575.5,18,8.5)}
APPROACH_END=.16
FOLLOW_END=.86

def pose(suffix, u):
 start, end, initial_gap, final_gap = specs[suffix]
 if u < APPROACH_END:
  theta=start; gap=initial_gap+(final_gap-initial_gap)*smooth(u/APPROACH_END);phase='approach'
 else:
  theta=start+(end-start)*smooth((u-APPROACH_END)/(FOLLOW_END-APPROACH_END));gap=final_gap
  phase='following' if u<FOLLOW_END else 'equilibrium'
 return theta, theta-gap, gap, phase

def point_pixels(pt):
 v=world_to_camera_view(S,camera,Vector(pt))
 return {'x':round(v.x*1920,3),'y':round((1-v.y)*1080,3),'visible':0<=v.x<=1 and 0<=v.y<=1 and v.z>0}

def setup_follow(name,u):
 suffix=name.split('-')[-1];close='close' in name
 theta,phi,gap,phase=pose(suffix,u)
 base_setup('wire',0)
 moving.rotation_euler.z=math.radians(theta)
 macro_lower.rotation_euler.z=math.radians(theta)
 for g in section_marks:
  t=(g.location.z-1.64)/7.56;g.rotation_euler.z=math.radians(theta*(1-t))
 source.location=(1.08*math.cos(math.radians(phi)),1.08*math.sin(math.radians(phi)),0)
 mb=Vector((1.08*math.cos(math.radians(theta)),1.08*math.sin(math.radians(theta)),1.64))
 sb=source.location+Vector((0,0,1.64));direction=(mb-sb).normalized()
 # Draw the dashed centre line only outside the two finite spheres.
 start=sb+direction*.068;end=mb-direction*.068;delta=end-start
 for i,o in enumerate(connection):
  a=start+delta*(i/6);b=start+delta*((i+.48)/6)
  o.location=(a+b)*.5;o.scale.z=(b-a).length;o.rotation_quaternion=(b-a).to_track_quat('Z','Y')
 push.location=mb+direction*.085;push.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
 if close:
  for o in macro:o.hide_render=True
  d.ortho_scale=4.2;camera_at((0,-2,7.5),(0,0,1.58))
 else:
  d.ortho_scale=20.5;camera_at((0,-14,10.2),(0,0,5.42))
 result=base_projection(name,u,theta,0)
 result.update(lower_deg=theta,source_deg=phi,source_angle_deg=phi,gap_deg=gap,separation_deg=gap,theta_deg=theta,phase=phase,
               actual_force_direction=list(direction))
 result['points'].update(source_ball=point_pixels(sb),driving_ball=point_pixels(sb),source_stem=point_pixels(source.location+Vector((0,0,1.25))),
                         quarter_turn=point_pixels((0,1.08,1.64)),
                         force_tail=point_pixels(mb+direction*.085),force_tip=point_pixels(mb+direction*.4325))
 for i in range(17):
  a=math.radians(phi+gap*i/16)
  result['points'][f'gap_arc_{i:02}']=point_pixels((.65*1.08*math.cos(a),.65*1.08*math.sin(a),1.64))
 return result

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
IMAGE_OUT=Path(args[args.index('--output')+1]) if '--output' in args else OUT
IMAGE_OUT.mkdir(parents=True,exist_ok=True)
names=[f'passive-follow-{suffix}' for suffix in specs]+[f'passive-follow-close-{suffix}' for suffix in specs]
wanted=args[args.index('--shot')+1] if '--shot' in args else None
selected=args[args.index('--shots')+1].split(',') if '--shots' in args else [wanted] if wanted else names
assert all(name in names for name in selected),selected
projection_data={};audit=[]

def save():
 payload={'size':[1920,1080],'coordinate_origin':'top-left pixels',
          'timing':{'approach_end':APPROACH_END,'follow_end':FOLLOW_END,'final_hold':1-FOLLOW_END},
          'interpretation':'Moving source and timing illustrate an equivalent way of tightening the wire; not claimed as a historical measured trajectory or an ODE solution. The force arrow has a fixed display length and follows the exact centre-to-centre repulsive direction.',
          'angle_convention':'upper=0; lower_deg=theta_deg=twist_deg; source_deg=lower_deg-gap_deg. Legacy alpha_deg is the absolute lower needle angle here, not the separation angle.',
          'shots':projection_data}
 out=OUT/('projection-follow-preview.json' if '--preview' in args else 'projection-follow.json')
 if out.exists():
  old=json.loads(out.read_text(encoding='utf-8'));old['shots'].update(projection_data);payload['shots']=old['shots']
 temporary=out.with_suffix('.tmp');temporary.write_text(json.dumps(payload,indent=2),encoding='utf-8');temporary.replace(out)

for name in selected:
 projection_data[name]=[]
 if '--preview' in args:
  for label,u in [('mid',.51),('end',1)]:
   projection_data[name].append(setup_follow(name,u));S.render.filepath=str(IMAGE_OUT/f'{name}-{label}-preview.png');bpy.ops.render.render(write_still=True)
 else:
  folder=IMAGE_OUT/name
  if '--projection-only' not in args:folder.mkdir(exist_ok=True)
  count=128 if name=='passive-follow-close-567' else 64
  hold=math.ceil(FOLLOW_END*(count-1))
  for i in range(count):
   dest=folder/f'{i:04}.png';projection_data[name].append(setup_follow(name,i/(count-1)))
   if '--projection-only' in args:continue
   if dest.exists() and '--force' not in args:continue
   if i>hold:shutil.copy2(folder/f'{hold:04}.png',dest);continue
   S.render.filepath=str(dest);before=time.time();bpy.ops.render.render(write_still=True);audit.append({'shot':name,'frame':i,'seconds':round(time.time()-before,2)})
 save();print('FOLLOW_SHOT_DONE '+name,flush=True)

setup_follow('passive-follow-567',1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/coulomb-follow-v36.blend'))
if '--preview' not in args and '--projection-only' not in args:
 (OUT/'render-follow.json').write_text(json.dumps({'timing':audit},indent=2),encoding='utf-8')
print('FOLLOW_DONE',flush=True)
