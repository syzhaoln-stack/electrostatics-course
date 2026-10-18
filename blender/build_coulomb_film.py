"""1785 balance: dimensional reconstruction + explicitly enlarged torsion insert.
Blender units are decimetres. Wood, patina and lighting are interpretive.
Run: blender -b -t 4 -P this.py -- --preview / --render
"""
import bpy, math, sys, json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'media/lesson-dialogues/production/v3-5/coulomb/renders-final';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.render.engine='CYCLES';S.cycles.samples=16;S.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'
S.cycles.device='GPU';S.cycles.transparent_max_bounces=12
S.render.resolution_x=1280;S.render.resolution_y=720;S.render.resolution_percentage=100
S.render.image_settings.file_format='PNG';S.render.fps=24
S.world.use_nodes=True;S.world.node_tree.nodes['Background'].inputs[0].default_value=(.004,.005,.007,1);S.world.node_tree.nodes['Background'].inputs[1].default_value=.25;S.view_settings.view_transform='AgX'
def material(name,color,metal=0,rough=.4,noise=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if noise:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=125;tex.inputs['Detail'].default_value=2
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=noise;bump.inputs['Distance'].default_value=.015;m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 return m
brass=material('warm aged brass',(.42,.245,.075),.78,.31,.16)
silver=material('drawn silver wire',(.78,.83,.88),1,.19,.035)
steel=material('polished steel screw',(.38,.43,.49),1,.24,.045)
wood=material('dark walnut',(.045,.018,.009),0,.38,.3)
paper=material('rag paper',(.68,.59,.4),0,.85,.15)
ink=material('engraved ink',(.025,.019,.013),0,.85)
wax=material('shellac insulation',(.12,.038,.014),0,.3)
pith=material('pith ball',(.75,.66,.46),0,.9,.4)
coral=material('electric torque annotation',(.9,.13,.065),.1,.35)
cyan=material('elastic torque annotation',(.05,.52,.58),.1,.3)
gold=material('teaching tracer',(.95,.55,.12),.45,.3)
glass=material('clear antique glass',(.63,.79,.75),0,.17)
p=glass.node_tree.nodes.get('Principled BSDF');p.inputs['Alpha'].default_value=.12;p.inputs['Transmission Weight'].default_value=.1
glass.surface_render_method='BLENDED';glass.use_transparent_shadow=False
nodes=glass.node_tree.nodes;links=glass.node_tree.links
gloss=nodes.new('ShaderNodeBsdfGlass');gloss.inputs['Color'].default_value=(.93,.98,.96,1);gloss.inputs['Roughness'].default_value=.035;gloss.inputs['IOR'].default_value=1.46;links.new(gloss.outputs[0],nodes.get('Material Output').inputs['Surface'])
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
parent(rod('rotating micrometer index',(.13,0,.055),(.36,0,.055),.012,steel),dial)
text('fixed zero reference','0',(.39,0,10.025),.052,ink,rot=(0,0,0))
parent(cyl('top thumb grip',.13,.24,.14,brass),dial)
for i in range(30):
 a=i*math.tau/30;parent(rod('grip knurl',(.132*math.cos(a),.132*math.sin(a),.04),(.132*math.cos(a),.132*math.sin(a),.24),.006,brass),dial)
wire=rod('silver wire 28 pouces',(0,0,1.64),(0,0,9.20),.0045,silver)
rod('upper clamp',(0,0,9.2),(0,0,9.83),.027,brass)
cyl('lower clamp',.026,.14,1.68,brass)
moving=empty('suspended needle',(0,0,1.64))
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
# Enlarged separate wire demonstrator. Geometry axial, tracer curves ON surface.
before=set(bpy.data.objects)
macro_origin=Vector((7,0,0))
rod('enlarged straight silver wire',(7,0,.8),(7,0,5.7),.115,silver)
for z in [.65,5.85]:
 cyl('macro steel collet',.26,.28,z,steel,7)
 for dz in [-.11,.11]:
  o=torus('turned steel collar',.26,.012,z+dz,silver);o.location.x=7
 screw=rod('slotted clamp screw',(7,-.24,z),(7,-.36,z),.07,steel)
 rod('screw slot',(6.96,-.362,z),(7.04,-.362,z),.009,ink)
macro_lower=empty('lower orientation',(7,0,.7));macro_upper=empty('upper orientation',(7,0,5.8))
bpy.context.view_layer.update()
for o in set(bpy.data.objects)-before:
 if o.name.startswith(('macro steel collet','turned steel collar','slotted clamp screw','screw slot')):
  anchor=macro_lower if o.location.z<3 else macro_upper;o.parent=anchor;o.matrix_parent_inverse=anchor.matrix_world.inverted()
parent(rod('lower radial index',(0,0,0),(1,0,0),.055,coral),macro_lower)
parent(rod('upper radial index',(0,0,0),(1,0,0),.055,gold),macro_upper)
tracer=line('surface paint marks',[(7.12,0,.8+i*4.9/100) for i in range(101)],.014,gold)
macro=set(bpy.data.objects)-before
def light(name,loc,power,size,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='RECTANGLE';d.size=size*.22;d.size_y=size*1.7;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
light('softbox amber',(-5,-6,10),1900,7,(1,.77,.49));light('silver rim',(4,3,8),2200,5,(.51,.73,1));light('large front fill',(0,-8,4),2200,6,(1,.92,.79));light('wire insert fill',(8,-4,6),900,4,(1,.86,.63))
d=bpy.data.cameras.new('Camera');camera=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(camera);S.camera=camera;d.lens=45;d.clip_end=300
def camera_at(p,target):camera.location=p;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
shots={
 'whole':((15,-26,12),(0,0,4.7)),
 'balance':((4.8,-7.4,4.4),(0,0,1.75)),
 'charge':((4.8,-7.4,4.4),(0,0,1.75)),
 'knob':((1.25,-2.1,10.9),(0,0,9.85)),
 'wire':((13,-14,6),(7,0,3.3))}
def setup(shot,u):
 for o in macro:o.hide_render=shot!='wire'
 for o in [vessel,lid,tower]:o.hide_render=shot in ['wire','balance','charge']
 # Nearby vessel panels remain transparent, no invented supports.
 alpha=6.9+29.1*(1-math.exp(-6*max(0,u-.2)/.8)) if shot=='charge' else 60*(u*u*(3-2*u)) if shot=='wire' else 36-18*(u*u*(3-2*u)) if shot=='knob' else 36
 beta=126*(u*u*(3-2*u)) if shot=='knob' else 0
 moving.rotation_euler.z=math.radians(alpha);dial.rotation_euler.z=-math.radians(beta)
 macro_lower.rotation_euler.z=math.radians(alpha);macro_upper.rotation_euler.z=-math.radians(beta)
 for i,p in enumerate(tracer.data.splines[0].points):
  t=i/100;a=math.radians(alpha*(1-t)-beta*t);p.co=(7+.122*math.cos(a),.122*math.sin(a),.8+4.9*t,1)
 for ch in pin.children:ch.hide_render=shot!='charge' or u>.28
 pin.location=(1.1,-.27-min(1,u*6),1.9+u*2)
 p,t=shots[shot];p=Vector(p);t=Vector(t);a=(u-.5)*.12;v=p-t;p=t+Vector((v.x*math.cos(a)-v.y*math.sin(a),v.x*math.sin(a)+v.y*math.cos(a),v.z));camera_at(p,t)
 S.render.filepath=str(OUT/f'{shot}-preview.png')
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if '--render' in args:
 wanted=args[args.index('--shot')+1] if '--shot' in args else None
 for shot in shots:
  if wanted and wanted!=shot:continue
  folder=OUT/shot;folder.mkdir(exist_ok=True)
  for i in range(48):
   dest=folder/f'{i:04}.png'
   if dest.exists():continue
   setup(shot,i/47);S.render.filepath=str(dest);bpy.ops.render.render(write_still=True)
else:
 for shot in ['whole','balance','wire']:
  setup(shot,.6);bpy.ops.render.render(write_still=True)
setup('whole',0);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/coulomb.blend'))
(ROOT/'assets/coulomb/film-model.json').write_text(json.dumps({'source':'1785 memoir, dimensions in historical French pouces converted with 27 mm/pouce','wire_m':.756,'vessel_diameter_m':.324,'vessel_height_m':.324,'tower_height_m':.648,'arm_m':.108,'geometry':'pith balls, shellac tip, waxed needle, damping paper, glass enclosure','interpretation':'wood, patina, lighting; enlarged wire and gold surface tracer are teaching aids; motion transitions are illustrative, not measured oscillations','render':'Blender Cycles OptiX, native 1280x720 shots composited with full-HD explanatory graphics; 48 motion samples per shot with temporal interpolation'},indent=2),encoding='utf-8')
