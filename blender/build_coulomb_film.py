"""1785 balance v3.6: one dimensional model and fixed-axis torsion views.
Blender units are decimetres. Wood, patina and lighting are interpretive.
Run: blender -b -t 4 -P this.py -- --preview / --render
"""
import bpy, math, sys, json, time, shutil
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'media/lesson-dialogues/production/v3-6/coulomb/renders';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.render.engine='BLENDER_EEVEE_NEXT';S.eevee.taa_render_samples=48;S.eevee.use_raytracing=False
S.render.resolution_x=1920;S.render.resolution_y=1080;S.render.resolution_percentage=100
S.render.image_settings.file_format='PNG';S.render.fps=24
S.world.use_nodes=True;S.world.node_tree.nodes['Background'].inputs[0].default_value=(.065,.075,.085,1);S.world.node_tree.nodes['Background'].inputs[1].default_value=.34;S.view_settings.view_transform='AgX'
def material(name,color,metal=0,rough=.4,noise=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if noise:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=125;tex.inputs['Detail'].default_value=2
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=noise;bump.inputs['Distance'].default_value=.0015;m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
brass=material('warm aged brass',(.34,.225,.104),.78,.4,.055)
silver=material('fine satin silver - not chrome',(.61,.65,.69),.9,.39,.018)
steel=material('dark turned steel',(.18,.22,.255),.78,.43,.045)
wood=material('dark walnut',(.037,.019,.011),0,.57,.16)
paper=material('rag paper',(.68,.59,.4),0,.85,.15)
ink=material('engraved ink',(.025,.019,.013),0,.85)
wax=material('shellac insulation',(.12,.038,.014),0,.3)
pith=material('pith ball',(.75,.66,.46),0,.9,.4)
coral=material('electric torque annotation',(.9,.13,.065),.1,.35)
cyan=material('elastic torque annotation',(.05,.52,.58),.1,.3)
gold=material('small teaching section index',(.67,.43,.15),.3,.55)
glass=material('clear antique glass',(.63,.79,.75),0,.17)
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=.02;p.inputs['Transmission Weight'].default_value=0;p.inputs['Specular IOR Level'].default_value=.18
glass.surface_render_method='BLENDED';glass.use_transparent_shadow=False
nodes=glass.node_tree.nodes;links=glass.node_tree.links
# Clear thin-wall appearance is an interpretation, not an optical reconstruction
# of an identified surviving glass specimen. Avoid opaque/reflected black tubes.
def finish(o,name,m):
 o.name=name;o.data.materials.append(m)
 if o.type=='MESH':
  for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 return o
def cyl(name,r,depth,z,m,x=0,y=0):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=(x,y,z));o=finish(bpy.context.object,name,m)
 if m in [brass,steel]:
  b=o.modifiers.new('machined edge bevel','BEVEL');b.width=min(.012,r*.12,depth*.1);b.segments=3
 return o
def tube(name,r,height,z,m):
 verts=[]
 for h in [z-height/2,z+height/2]:
  for i in range(128):a=i*math.tau/128;verts.append((r*math.cos(a),r*math.sin(a),h))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[(i,(i+1)%128,(i+1)%128+128,i+128) for i in range(128)]);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m);mod=o.modifiers.new('real glass wall thickness','SOLIDIFY');mod.thickness=.012;return o
def sphere(name,loc,r,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=r,location=loc);return finish(bpy.context.object,name,m)
def rod(name,a,b,r,m):
 a,b=Vector(a),Vector(b);o=cyl(name,r,(b-a).length,0,m);o.location=(a+b)/2;o.rotation_mode='QUATERNION';o.rotation_quaternion=(b-a).to_track_quat('Z','Y');return o
def torus(name,r,t,z,m):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=96,minor_segments=10,location=(0,0,z));return finish(bpy.context.object,name,m)
def box(name,loc,size,m):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m)
def line(name,pts,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;sp=c.splines.new('POLY');sp.points.add(len(pts)-1)
 for p,co in zip(sp.points,pts):p.co=(*co,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def empty(name,loc):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;return o
def parent(o,p):o.parent=p
def text(name,body,loc,size,m,rot=(math.pi/2,0,0)):
 c=bpy.data.curves.new(name,'FONT');c.body=body;c.size=size;c.align_x='CENTER';o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;o.data.materials.append(m);return o
box('walnut bench',(0,0,-.22),(200,200,.4),wood)
for z,r in [(0,1.65),(3.24,1.68)]:
 torus('glass rim',r,.027,z,glass)
vessel=tube('glass vessel diameter 12 pouces',1.62,3.24,1.62,glass)
lid=cyl('glass lid diameter 13 pouces',1.755,.06,3.28,glass)
tower=tube('24 pouces glass tower',.22,6.48,6.55,glass)
for z in [3.34,9.79]:torus('brass collar',.23,.035,z,brass)
cyl('top housing',.29,.12,9.86,brass)
dial=empty('micrometer rotating top',(0,0,9.98))
cyl('fixed graduated brass disc',.42,.07,9.98,brass)
for i in range(72):
 a=i*math.tau/72;r=.36;length=.058 if i%6==0 else .028
 rod('fixed micrometer graduation',(r*math.cos(a),r*math.sin(a),10.02),((r-length)*math.cos(a),(r-length)*math.sin(a),10.02),.004,ink)
parent(rod('rotating micrometer index',(.13,0,.055),(.36,0,.055),.007,steel),dial)
text('fixed zero reference','0',(.39,0,10.025),.052,ink,rot=(0,0,0))
for angle in range(30,360,30):
 a=-math.radians(angle);text('fixed micrometer numeral',str(angle),(.265*math.cos(a),.265*math.sin(a),10.025),.039,ink,rot=(0,0,0))
parent(cyl('top thumb grip',.13,.24,.14,brass),dial)
for z in [.04,.13,.23]:parent(torus('fine grip groove',.13,.0017,z,ink),dial)
wire=rod('fine straight silver wire 28 pouces',(0,0,1.64),(0,0,9.20),.0032,silver)
rod('upper adjustment shaft',(0,0,9.3),(0,0,9.83),.019,brass)
upper_clamp=empty('rotating upper silver-wire clamp',(0,0,9.25))
parent(cyl('upper clamp collet',.029,.14,0,steel),upper_clamp)
parent(cyl('upper clamp shoulder',.046,.045,0,steel),upper_clamp)
parent(rod('upper clamp screw',(0,-.035,0),(0,-.052,0),.011,steel),upper_clamp)
moving=empty('suspended needle',(0,0,1.64))
parent(cyl('lower clamp collet',.028,.14,.025,steel),moving)
parent(cyl('lower clamp shoulder',.044,.045,.025,steel),moving)
parent(rod('lower clamp screw',(0,-.035,.025),(0,-.052,.025),.011,steel),moving)
parent(rod('waxed light needle',(-1.03,0,0),(.59,0,0),.012,paper),moving)
parent(rod('shellac tip',(.59,0,0),(1.08,0,0),.014,wax),moving)
parent(sphere('moving pith ball',(1.08,0,0),.065,pith),moving)
parent(box('paper damping counterweight',(-.92,0,.035),(.26,.012,.24),paper),moving)
sphere('fixed pith ball',(1.08,0,1.64),.065,pith)
rod('fixed insulating stem',(1.08,0,1.64),(1.08,0,3.5),.025,wax)
cyl('fixed stem handle',.045,.2,3.52,brass,1.08)
# Individual scale ticks leave the moving needle visible through the glass.
for i in range(180):
 a=i*math.tau/180;r=1.636;z=1.49;length=.075 if i%5==0 else .035
 rod('paper band graduation',(r*math.cos(a),r*math.sin(a),z),(r*math.cos(a),r*math.sin(a),z+length),.005,ink)
for i in range(0,360,30):
 a=i*math.pi/180;o=text('scale numeral',str(i),(1.65*math.cos(a),1.65*math.sin(a),1.40),.075,ink);o.rotation_euler=(math.pi/2,0,a+math.pi/2)
# A narrow translucent cream ribbon carries the authentic circumference scale.
verts=[]
for z in [1.37,1.61]:
 for i in range(180):a=i*math.tau/180;verts.append((1.63*math.cos(a),1.63*math.sin(a),z))
mesh=bpy.data.meshes.new('open paper strip');mesh.from_pydata(verts,[],[(i,(i+1)%180,(i+1)%180+180,i+180) for i in range(180)]);mesh.update();band=bpy.data.objects.new('paper graduation strip',mesh);bpy.context.collection.objects.link(band);finish(band,'paper graduation strip',paper)
pin=empty('charging pin assembly',(1.1,-1,2.3))
parent(rod('wax charging handle',(0,-.7,.6),(0,0,0),.035,wax),pin);parent(rod('charging needle',(0,0,0),(0,.24,-.23),.009,brass),pin)
pin.hide_render=True
for ch in pin.children:ch.hide_render=True
# Same thin wire, fixed straight axis. Small sectional index marks are teaching
# aids; no second thick cylinder or free-standing helical tracer is introduced.
before=set(bpy.data.objects)
section_marks=[]
for z in [2.15,4.15,6.15,8.15]:
 g=empty('section orientation teaching aid',(0,0,z))
 parent(rod('small section index',(0,0,0),(.35,0,0),.007,gold),g)
 parent(sphere('section index endpoint',(.35,0,0),.013,gold),g)
 parent(torus('section orientation guide',.35,.002,0,cyan),g)
 section_marks.append(g)
macro_lower=empty('lower orientation',(0,0,1.64));macro_upper=empty('upper orientation',(0,0,9.2))
parent(rod('lower radial index',(0,0,0),(.3,0,0),.009,coral),macro_lower)
parent(rod('upper radial index',(0,0,0),(.3,0,0),.009,gold),macro_upper)
macro=set(bpy.data.objects)-before
def light(name,loc,power,size,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
light('broad warm window',(-6,-8,11),1450,9,(1,.91,.78));light('broad cool fill',(5,1,8),850,8,(.79,.88,1));light('quiet front bounce',(0,-8,3),600,7,(1,.95,.87))
d=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(camera);S.camera=camera;d.lens=55;d.clip_end=300;d.type='ORTHO';d.dof.use_dof=False
def camera_at(p,target):camera.location=p;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
shots={
 'whole':((11,-24,8.8),(0,0,4.65),25.8),
 'materials':((2.7,-4.8,4.5),(0,0,1.8),7.55),
 'charge':((3.9,-6.6,4.1),(.15,0,1.85),7.72),
 'knob':((1.15,-2.25,11),(0,0,9.93),2.67),
 'knob-0':((1.15,-2.25,11),(0,0,9.93),2.67),
 'knob-126':((1.15,-2.25,11),(0,0,9.93),2.67),
 'knob-567':((1.15,-2.25,11),(0,0,9.93),2.67),
 'wire':((0,-14,10.2),(0,0,5.42),20.5),
 'measure-0':((0,1.6,7),(0,0,1.64),6.93),
 'measure-126':((0,1.6,7),(0,0,1.64),6.93),
 'measure-567':((0,1.6,7),(0,0,1.64),6.93),
 'active':((0,1.6,7),(0,0,1.64),6.93),
 'knob-active':((1.15,-2.25,11),(0,0,9.93),2.67),
 'equiv-passive':((0,-14,10.2),(0,0,5.42),20.5),
 'equiv-active':((0,-14,10.2),(0,0,5.42),20.5),
 'passive-readout':((0,-14,10.2),(0,0,5.42),20.5)}

def smooth(u):u=max(0,min(1,u));return u*u*(3-2*u)

def projection(shot,u,alpha,beta):
 bpy.context.view_layer.update()
 pa=math.radians(alpha);pb=-math.radians(beta)
 points={'wire_top':(0,0,9.2),'wire_bottom':(0,0,1.64),'upper_clamp':(0,0,9.25),'lower_clamp':(0,0,1.665),'fixed_ball':(1.08,0,1.64),'moving_ball':(1.08*math.cos(pa),1.08*math.sin(pa),1.64),'zero':(1.08,0,1.64),'needle_center':(0,0,1.64),'paper_counterweight':(-.92*math.cos(pa),-.92*math.sin(pa),1.675),'shellac_tip':(.84*math.cos(pa),.84*math.sin(pa),1.64),'knob':(0,0,10.12),'pointer':(.36*math.cos(pb),.36*math.sin(pb),10.035),'dial_zero':(.39,0,10.025),'fixed_stem':(1.08,0,2.65)}
 # These fixed-length arrows illustrate moment direction, not force magnitude.
 # Project a world-space tangent; a screen-space perpendicular is wrong for an
 # obliquely viewed horizontal plane. Restoration opposes the relative twist.
 twist_sign=1 if alpha+beta>=0 else -1
 for name,sign in [('applied_tangent',twist_sign),('restoring_tangent',-twist_sign)]:
  points[name]=(1.08*math.cos(pa)-sign*.4*math.sin(pa),1.08*math.sin(pa)+sign*.4*math.cos(pa),1.64)
 out={}
 for name,pt in points.items():
  v=world_to_camera_view(S,camera,Vector(pt));out[name]={'x':round(v.x*1920,3),'y':round((1-v.y)*1080,3),'visible':0<=v.x<=1 and 0<=v.y<=1 and v.z>0}
 return {'u':u,'alpha_deg':alpha,'beta_deg':beta,'twist_deg':alpha+beta,'points':out}
def setup(shot,u):
 measure=shot.startswith('measure') or shot=='active'
 equivalent=shot.startswith('equiv-');wire_view=shot in ['wire','passive-readout'] or equivalent
 for o in macro:o.hide_render=not wire_view
 for o in [vessel,lid,tower]:o.hide_render=wire_view or shot in ['materials','charge'] or measure
 for o in bpy.data.objects:
  if o.name.startswith('glass rim'):o.hide_render=shot!='whole'
  if o.name.startswith(('paper band','paper graduation','scale numeral','fixed insulating','fixed stem','fixed pith')):o.hide_render=wire_view
  if o.name.startswith(('waxed light needle','shellac tip','moving pith ball','paper damping counterweight')):o.hide_render=equivalent
 for o in bpy.data.objects:
  if o.name.startswith(('fixed graduated','fixed micrometer','fixed zero','brass collar','top housing','upper adjustment')):o.hide_render=measure or wire_view
 for o in [dial,*dial.children]:o.hide_render=measure or wire_view
 for o in [upper_clamp,*upper_clamp.children,wire]:o.hide_render=measure
 # The frame is stationary. Recorded readings are reached within the first 30%
 # of each measurement shot, then held for exact narration/graph association.
 f=smooth(u/.30);alpha,beta=36,0
 if shot=='materials':alpha=36
 elif shot=='charge':alpha=6.9+29.1*smooth((u-.12)/.18)
 elif shot=='wire':
  alpha=72*smooth(u/.30) if u<=.30 else 72 if u<.5 else 72*math.exp(-7*(u-.5))*math.cos(18*(u-.5))
  if u>.90:alpha*=1-smooth((u-.90)/.10)
 elif shot in ['active','knob-active']:
  # Deliberate manipulation through historical equilibrium readings. This is
  # an illustrative sequence, not a measured time record or dynamic solution.
  if u<.12:alpha,beta=8.5,0
  elif u<.32:alpha,beta=8.5+27.5*smooth((u-.12)/.20),0
  elif u<.40:alpha,beta=36,0
  elif u<.85:
   g=smooth((u-.40)/.45);alpha,beta=36-27.5*g,567*g
  else:alpha,beta=8.5,567
 elif shot=='equiv-passive':alpha,beta=575.5*smooth(u),0
 elif shot=='equiv-active':alpha,beta=8.5*smooth(u),567*smooth(u)
 elif shot=='passive-readout':
  # Exact keyframes at i=0,21,42,63 allow the reader to select the three
  # measured torque-equivalent twists without inventing a force-distance model.
  if u<=1/3:alpha=36*smooth(3*u)
  elif u<=2/3:alpha=36+108*smooth(3*u-1)
  else:alpha=144+431.5*smooth(3*u-2)
  beta=0
 elif shot in ['knob','knob-126']:alpha=36-18*f;beta=126*f
 elif shot=='knob-0':alpha=6.9+29.1*f
 elif shot=='knob-567':alpha=18-9.5*f;beta=126+441*f
 elif shot=='measure-0':alpha=6.9+29.1*f
 elif shot=='measure-126':alpha=36-18*f;beta=126*f
 elif shot=='measure-567':alpha=18-9.5*f;beta=126+441*f
 moving.rotation_euler.z=math.radians(alpha);dial.rotation_euler.z=-math.radians(beta);upper_clamp.rotation_euler.z=-math.radians(beta)
 macro_lower.rotation_euler.z=math.radians(alpha);macro_upper.rotation_euler.z=-math.radians(beta)
 for g in section_marks:
  t=(g.location.z-1.64)/7.56;g.rotation_euler.z=math.radians(alpha*(1-t)-beta*t)
 pin.hide_render=shot!='charge' or u>.30
 for ch in pin.children:ch.hide_render=shot!='charge' or u>.30
 # Local pin tip is (0,.24,-.23); offset it onto the fixed ball, then withdraw.
 pin.location=(1.08,-.305-.9*smooth((u-.10)/.2),1.87+.7*smooth((u-.10)/.2))
 wire.scale.x=wire.scale.y=2.2 if wire_view else 1
 p,t,scale=shots[shot];d.ortho_scale=scale;camera_at(p,t)
 S.render.filepath=str(OUT/f'{shot}-preview.png')
 return projection(shot,u,alpha,beta)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
projection_data={};audit=[];projections_only='--projection-only' in args
sampling='knob-0/126/567 and knob: 64 poses uniformly over u=0..0.30, then hold last pose; active/knob-active: 96 poses over u=0..1; other shots: 64 poses over u=0..1, measurement readings reached at u=.30'
def save_projections(suffix):
 payload={'size':[1920,1080],'coordinate_origin':'top-left pixels','sampling':sampling,'shots':projection_data}
 (OUT/f'projection-{suffix}.json').write_text(json.dumps(payload,indent=2),encoding='utf-8')
 if suffix!='all' and '--render' in args and (OUT/'projection.json').exists():
  merged=json.loads((OUT/'projection.json').read_text(encoding='utf-8'));merged['shots'].update(projection_data);payload=merged
 if suffix=='all' or '--render' in args:
  temporary=OUT/f'.projection-{suffix}.tmp';temporary.write_text(json.dumps(payload,indent=2),encoding='utf-8');temporary.replace(OUT/'projection.json')
if '--render' in args or projections_only:
 wanted=args[args.index('--shot')+1] if '--shot' in args else None
 for shot in shots:
  if wanted and wanted!=shot:continue
  folder=OUT/shot;folder.mkdir(exist_ok=True)
  projection_data[shot]=[]
  active=shot in ['active','knob-active'];count=96 if active else 64
  for i in range(count):
   dest=folder/f'{i:04}.png'
   sample_u=(i/(count-1))*.30 if shot.startswith('knob') and not active else i/(count-1)
   projection_data[shot].append(setup(shot,sample_u))
   if projections_only:continue
   if dest.exists() and '--force' not in args:continue
   S.render.filepath=str(dest)
   if shot in ['whole','materials','knob-0'] and i>0:shutil.copy2(folder/'0000.png',dest);continue
   if shot=='knob-126' and (OUT/'knob'/f'{i:04}.png').exists():shutil.copy2(OUT/'knob'/f'{i:04}.png',dest);continue
   if i>19 and shot not in ['wire','passive-readout'] and not shot.startswith(('knob','equiv-')) and not active:shutil.copy2(folder/'0019.png',dest);continue
   if active:
    if 0<i<=11:shutil.copy2(folder/'0000.png',dest);continue
    if 32<=i<=38:shutil.copy2(folder/'0031.png',dest);continue
    if i>81:shutil.copy2(folder/'0081.png',dest);continue
   before=time.time();bpy.ops.render.render(write_still=True);audit.append({'shot':shot,'frame':i,'seconds':round(time.time()-before,2)})
  save_projections(wanted or 'all')
  print('V36_SHOT_DONE '+shot,flush=True)
else:
 wanted=args[args.index('--shot')+1] if '--shot' in args else None
 for shot in shots:
  if wanted and wanted!=shot:continue
  projection_data[shot]=[setup(shot,.4)];before=time.time();bpy.ops.render.render(write_still=True);audit.append({'shot':shot,'preview_seconds':round(time.time()-before,2)})
setup('whole',0);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/coulomb-v36.blend'))
suffix=wanted or 'all'
save_projections(suffix)
if not projections_only:
 (OUT/f'render-{suffix}.json').write_text(json.dumps({'source':'1785 memoir; 27 mm per historical French pouce','wire_m':.756,'vessel_diameter_m':.324,'vessel_height_m':.324,'tower_height_m':.648,'arm_m':.108,'display_wire_diameter_m':.00064,'wire_detail_diameter_factor':2.2,'interpretation':'surfaces and small section indices are modern teaching reconstruction; all cameras fixed, wire axis straight; animation timing illustrative, not a measured dynamic record','render':'Blender Eevee, native 1920x1080','sampling':sampling,'timing':audit},indent=2),encoding='utf-8')
print('V36_DONE '+str(OUT),flush=True)
