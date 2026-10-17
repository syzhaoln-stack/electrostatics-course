"""Generic 14-pin package cutaway for NASA ESD risk interpretation.
Not the dimensions, circuit or damage threshold of a specific NASA test part.
Coordinates match the existing classroom scene, schematic model units.
"""
import bpy,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def xyz(p):return(p[0],-p[2],p[1])
def mat(name,color,metal,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
pcb=mat('dark green solder mask',(.025,.12,.09),.25,.42);gold=mat('bonding gold',(.75,.44,.08),.82,.22);solder=mat('tin plated leads',(.55,.61,.64),.85,.25);plastic=mat('moulded package epoxy',(.017,.024,.028),.05,.65);silicon=mat('silicon die',(.1,.15,.22),.65,.25);copper=mat('copper circuitry',(.48,.25,.09),.75,.35)
def box(name,pos,size,material,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(pos));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('edge radius','BEVEL');mod.width=bevel;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def wire(name,points,r,material):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=12;curve.bevel_depth=r;curve.bevel_resolution=3;sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
 for b,p in zip(sp.bezier_points,points):b.co=xyz(p);b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(material)
box('circuit_board',[-.2,-2.6,0],[5.4,.16,4],pcb)
box('package_base',[0,-2.34,0],[2.15,.2,1.65],plastic)
for x in [-1.02,1.02]:box('package_edge',[x,-2.22,0],[.13,.3,1.65],plastic)
for z in [-.76,.76]:box('package_edge',[0,-2.22,z],[2.15,.3,.13],plastic)
box('silicon_die',[0,-2.16,0],[1.04,.08,.83],silicon,.008)
for x in [-.4,-.2,0,.2,.4]:
 for z in [-.25,0,.25]:box('die_pattern',[x,-2.115,z],[.15,.006,.17],copper,.001)
for side in [-1,1]:
 for i in range(7):
  x=-.85+i*.28;box('pin_'+str(side)+'_'+str(i),[x,-2.32,side*1.05],[.13,.11,.62],solder,.018)
  wire('bond_wire',[(x*.55,-2.1,side*.37),(x*.8,-1.91,side*.61),(x,-2.23,side*.91)],.01,gold)
  wire('pcb_trace',[(x,-2.51,side*1.25),(x,-2.51,side*1.65),(x+.3,-2.51,side*1.85)],.018,copper)
  box('solder_pad',[x,-2.50,side*1.27],[.19,.03,.25],solder,.01)
for x in [-2.25,2.1]:
 for z in [-1.6,1.6]:
  bpy.ops.mesh.primitive_torus_add(major_radius=.11,minor_radius=.026,major_segments=20,minor_segments=8,location=xyz([x,-2.50,z]));bpy.context.object.data.materials.append(solder)
for x in [-2,-1.65,1.7,2.1]:
 box('passive_component',[x,-2.4,.2],[.24,.16,.5],plastic,.02)
 for z in [-.03,.43]:box('component_end',[x,-2.4,z],[.26,.18,.07],solder,.005)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'assets/models/esd.glb'),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/esd.blend'))
