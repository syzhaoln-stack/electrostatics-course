"""Plate-type dry ESP teaching cutaway, based on EPA/ICAC component diagram.
Illustrative dimensions, not a manufacturer's drawing or certified design.
GLB coordinate convention: metres, Y up, flow +X, collection plates X-Y.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/models';OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def xyz(p):return (p[0],-p[2],p[1])
def mat(name,rgb,metal=0,rough=.45):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
steel=mat('galvanized collecting steel',(.42,.48,.49),.8,.31)
enamel=mat('petrol industrial enamel',(.065,.16,.18),.5,.38)
dark=mat('structural painted steel',(.035,.065,.075),.6,.4)
brass=mat('electrical connection brass',(.55,.33,.08),.75,.25)
ceramic=mat('glazed porcelain insulator',(.79,.74,.6),.1,.23)
red=mat('high voltage warning',(.5,.085,.04),.25,.42)
def finish(o,name,material,bevel=0):
 o.name=name;o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('manufactured edge bevel','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def box(name,p,size,m=steel,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(p));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,m,bevel)
def rod(name,a,b,r,m=steel):
 a,b=Vector(xyz(a)),Vector(xyz(b));d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=d.to_track_quat('Z','Y');return finish(o,name,m)
def taper(name,x0,x1,w0,h0,w1,h1,cy,m):
 # Open rectangular duct with manufactured rim, not a closed airflow obstacle.
 rings=[]
 for x,w,h in [(x0,w0,h0),(x1,w1,h1)]:rings.append([(x,cy-h/2,-w/2),(x,cy-h/2,w/2),(x,cy+h/2,w/2),(x,cy+h/2,-w/2)])
 verts=[xyz(v) for ring in rings for v in ring];faces=[(i,(i+1)%4,(i+1)%4+4,i+4) for i in range(4)];mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);finish(o,name,m)
 for j,ring in enumerate(rings):
  for i in range(4):rod(name+'_flange',ring[i],ring[(i+1)%4],.055,dark)
 return o
box('rear_casing',[0,.25,-1.75],[6.9,3.05,.08],enamel)
box('front_casing',[0,.25,1.75],[6.9,3.05,.08],enamel)
box('roof',[0,1.82,0],[7.05,.1,3.6],enamel)
for z in [-1.5,0,1.5]:
 box('collector_plate',[0,.25,z],[6.5,2.85,.045],steel,.008)
 for x in [-3.1,-2.3,-1.5,-.7,.1,.9,1.7,2.5,3.1]:box('collector_stiffener',[x,.25,z+.035],[.055,2.85,.055],steel,.006)
 rod('collector_earth_bus',[-3.25,1.65,z],[3.25,1.65,z],.045,brass)
 for x in [-2.4,0,2.4]:
  rod('rapper_rod',[x,1.68,z],[x,2.12,z],.04,steel)
  box('rapper_drive',[x,2.2,z],[.22,.24,.25],dark)
for z in [-.75,.75]:
 for x in [-2.4,-.8,.8,2.4]:
  rod('discharge_wire',[x,-1.1,z],[x,1.48,z],.018,dark)
  for y in [-.8,-.3,.2,.7,1.2]:
   for s in [-1,1]:rod('corona_tip',[x,y,z],[x+s*.06,y+.035,z],.008,steel)
  rod('wire_weight',[x,-1.18,z],[x,-1.05,z],.055,dark)
  rod('hv_support',[x,1.5,z],[x,2.05,z],.045,brass)
  for y in [1.9,2,2.1]:
   bpy.ops.mesh.primitive_torus_add(major_radius=.09,minor_radius=.024,major_segments=24,minor_segments=6,location=xyz([x,y,z]));finish(bpy.context.object,'porcelain_insulator',ceramic)
 rod('high_voltage_bus',[-2.7,2.15,z],[2.7,2.15,z],.035,brass)
for side in [-1,1]:
 taper('inlet_duct' if side<0 else 'outlet_duct',side*3.5,side*5,3.4,2.8,1.6,1.4,.25,enamel)
 # Gas distributor at inlet: explicit bars with open flow passages.
 if side<0:
  for y in [-.85,-.45,-.05,.35,.75,1.15]:rod('inlet_distribution',[-3.4,y,-1.6],[-3.4,y,1.6],.025,steel)
for x in [-1.7,1.7]:
 verts=[xyz(p) for p in [(x-1.65,-1.2,-1.7),(x+1.65,-1.2,-1.7),(x+1.65,-1.2,1.7),(x-1.65,-1.2,1.7),(x-.3,-2.65,-.3),(x+.3,-2.65,-.3),(x+.3,-2.65,.3),(x-.3,-2.65,.3)]]
 mesh=bpy.data.meshes.new('hopper');mesh.from_pydata(verts,[],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update();o=bpy.data.objects.new('dust_hopper',mesh);bpy.context.collection.objects.link(o);finish(o,'dust_hopper',enamel)
 box('discharge_valve',[x,-2.8,0],[.7,.27,.7],dark)
for x in [-3.35,3.35]:
 for z in [-1.65,1.65]:box('support_leg',[x,-2.1,z],[.18,1.9,.18],dark);box('foot_plate',[x,-3.05,z],[.45,.09,.45],steel)
box('transformer_rectifier',[0,2.22,-1.25],[.9,.65,.65],enamel)
box('hv_warning',[.46,2.23,-1.25],[.01,.25,.24],red,.002)
bpy.ops.export_scene.gltf(filepath=str(OUT/'esp.glb'),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/esp.blend'))
metadata={'asset':'esp.glb','type':'original Blender teaching reconstruction','coordinates':'metres; Y up; gas +X; plate normals ±Z','sources':['https://www.epa.gov/air-emissions-monitoring-knowledge-base/monitoring-control-technique-electrostatic-precipitators','https://www.babcock.com/home/products/electrostatic-precipitators-dry-esp'],'cutaway_hide':['front_casing','roof'],'dimensions':'illustrative; no manufacturer dimensions inferred','blender_version':bpy.app.version_string,'components':['inlet gas distributor','negative discharge wires','grounded collecting plates','porcelain insulators','transformer rectifier','rappers','dust hoppers','outlet'],'limits':'No corona-plasma or dust resistivity solution; web simulation separately labelled.'}
(OUT/'esp.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2),encoding='utf-8')
