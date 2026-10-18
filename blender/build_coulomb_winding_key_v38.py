"""A standalone winding-key analogy insert: load 0 -> 60 degrees, then hold.

No watch internals and no release/reverse animation are shown. The following
straight-silver-wire shot demonstrates the actual release response.
"""
from pathlib import Path
import bpy, math, json, sys, time, shutil
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parent.parent
OUT=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v38-renders/winding-key-v38')
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
S=bpy.context.scene;S.render.engine='BLENDER_EEVEE_NEXT';S.eevee.taa_render_samples=48
S.render.resolution_x=1920;S.render.resolution_y=1080;S.render.resolution_percentage=100
S.render.image_settings.file_format='PNG';S.render.image_settings.compression=15
S.render.image_settings.color_mode='RGBA';S.view_settings.view_transform='AgX'
S.world.use_nodes=True
S.world.node_tree.nodes['Background'].inputs[0].default_value=(.065,.075,.085,1)
S.world.node_tree.nodes['Background'].inputs[1].default_value=.34

def material(name,color,metallic,roughness):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metallic;p.inputs['Roughness'].default_value=roughness
    return m
brass=material('satin warm brass key',(.48,.29,.11),.82,.32)
steel=material('satin steel spindle',(.35,.40,.44),.9,.35)
copper=material('fixed aged bronze socket',(.22,.13,.064),.8,.43)
dark=material('engraved screw slots',(.012,.013,.014),.6,.55)
wood=material('dark walnut studio',(.037,.019,.011),0,.57)

def finish(obj,name,mat,bevel=.0):
    obj.name=name;obj.data.materials.append(mat)
    if bevel:
        m=obj.modifiers.new('soft machined rim','BEVEL');m.width=bevel;m.segments=3
        obj.modifiers.new('weighted metal normals','WEIGHTED_NORMAL')
    return obj
def cylinder(name,radius,depth,loc,mat,bevel=.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=radius,depth=depth,location=loc)
    o=finish(bpy.context.object,name,mat,bevel)
    for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
    return o
def cube(name,loc,scale,mat,bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat,bevel)
def empty(name):
    o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);return o
key=empty('independent double-eared winding key')
shaft=cylinder('steel winding shaft',.073,1.55,(0,0,1.04),steel,.006);shaft.parent=key
barrel=cylinder('hollow brass key barrel',.155,.56,(0,0,1.77),brass,.018);barrel.parent=key
shoulder=cylinder('key shoulder',.21,.12,(0,0,2.04),brass,.023);shoulder.parent=key
for z in [1.53,1.58]:
    bpy.ops.mesh.primitive_torus_add(major_radius=.155,minor_radius=.003,major_segments=96,minor_segments=8,location=(0,0,z))
    o=finish(bpy.context.object,'fine barrel engraving',copper);o.parent=key

def oval_ear(x):
    n=96;verts=[];z=2.14;depth=.14
    for height,rx,ry in [(z-depth/2,.69,.45),(z+depth/2,.69,.45),(z-depth/2,.43,.265),(z+depth/2,.43,.265)]:
        verts.extend((x+rx*math.cos(i*math.tau/n),ry*math.sin(i*math.tau/n),height) for i in range(n))
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+j,2*n+i,3*n+i,3*n+j),
                      (n+i,n+j,3*n+j,3*n+i),(j,i,2*n+i,2*n+j)])
    mesh=bpy.data.meshes.new('cast oval key bow');mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new('brass open ear '+str(x),mesh);bpy.context.collection.objects.link(o)
    finish(o,o.name,brass,.035);o.parent=key
    for i,f in enumerate(mesh.polygons):f.use_smooth=i%4 in [0,1]
oval_ear(-.72);oval_ear(.72)
bridge=cube('central bow bridge',(0,0,2.14),(.36,.30,.14),brass,.04);bridge.parent=key
base=cylinder('stationary bronze bearing base',.70,.19,(0,0,.13),copper,.04)
cylinder('stationary bearing collar',.245,.17,(0,0,.30),brass,.02)
cylinder('dark bearing aperture',.089,.01,(0,0,.391),dark,.001)
for a in [45,135,225,315]:
    x=.51*math.cos(math.radians(a));y=.51*math.sin(math.radians(a))
    cylinder('fixed slotted screw',.058,.022,(x,y,.235),steel,.007)
    slot=cube('fixed screw slot',(x,y,.248),(.072,.013,.005),dark,.002);slot.rotation_euler.z=math.radians(a)
cube('walnut studio surface',(0,0,-.035),(200,200,.08),wood)

def area(name,loc,power,size,color,target=(0,0,1.2)):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('warm softbox',(-4,-5,7),850,5,(1,.91,.78))
area('quiet steel rim',(4,1,5),650,4,(.78,.88,1))
area('front bounce',(0,-5,2.5),220,4,(1,.95,.86))
camdata=bpy.data.cameras.new('Winding key camera');camera=bpy.data.objects.new('Winding key camera',camdata)
bpy.context.collection.objects.link(camera);S.camera=camera;camdata.type='ORTHO';camdata.ortho_scale=5.1
camera.location=(4.5,-7,5.6);camera.rotation_euler=(Vector((0,0,1.25))-camera.location).to_track_quat('-Z','Y').to_euler()
def px(v):
    p=world_to_camera_view(S,camera,Vector(v));return {'x':round(p.x*1920,3),'y':round((1-p.y)*1080,3),'visible':0<=p.x<=1 and 0<=p.y<=1 and p.z>0}
def ease(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
def frame(u):
    angle=60*ease((u-.08)/.65);a=math.radians(angle);key.rotation_euler.z=a;bpy.context.view_layer.update()
    def rot(x,y,z):return (x*math.cos(a)-y*math.sin(a),x*math.sin(a)+y*math.cos(a),z)
    points={'axis_top':px((0,0,2.14)),'shaft_midpoint':px((0,0,1.1)),
        'left_ear':px(rot(-.72,0,2.14)),'right_ear':px(rot(.72,0,2.14)),'fixed_base':px((0,0,.13))}
    drive=[px((1.57*math.cos(a+math.radians(-45+100*i/32)),1.57*math.sin(a+math.radians(-45+100*i/32)),2.14)) for i in range(33)]
    restore=[px((.47*math.cos(a+math.radians(55-100*i/32)),.47*math.sin(a+math.radians(55-100*i/32)),1.05)) for i in range(33)]
    return {'u':u,'t':4*u,'angle_deg':angle,'phase':'hold' if u>=.73 else 'winding','points':points,'drive_arc_points':drive,'restoring_tendency_arc_points':restore}
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
preview='--preview' in args;rows=[];count=96;pose_files={}
for i,u in enumerate([.62] if preview else [i/(count-1) for i in range(count)]):
    rows.append(frame(u));path=OUT/'preview.png' if preview else OUT/f'{i:04}.png';pose_key=round(rows[-1]['angle_deg'],8)
    if path.exists() and '--force' not in args:pose_files[pose_key]=path;continue
    if pose_key in pose_files and not preview:
        shutil.copy2(pose_files[pose_key],path);continue
    S.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    pose_files[pose_key]=path
(OUT/('projection-preview.json' if preview else 'projection.json')).write_text(json.dumps({'size':[1920,1080],'duration':4,'frames':rows,'meaning':'Standalone winding-key hand-feel analogy. Positive loading 0 to 60 degrees then hold. No clock internals, no unrestrained reverse and no assertion that a watch spring deforms like a straight wire.','arrow_meaning':'drive_arc_points: active winding; restoring_tendency_arc_points: counter-torque felt by hand, not demonstrated reverse motion.'},indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/coulomb-winding-key-v38.blend'))
print('WINDING_KEY_DONE',flush=True)
