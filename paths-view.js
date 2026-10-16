import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {fieldAt} from './physics.js';
import {PATH_SOURCES,routeState} from './paths-physics.js';

const C={field:'#43878b',direct:'#267b85',detour:'#b1853e',force:'#a86f20',step:'#775e9d',positive:'#d47767',negative:'#527fa5',ink:'#354855'};
const vector=p=>new THREE.Vector3(...p);

/** A self-contained scientific figure: every path, source, probe and arrow
 * shares one metric three-dimensional coordinate system (millimetres). */
export function createPathsView(host,{onFrame,onProject}={}){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#fbfaf6');
 const camera=new THREE.PerspectiveCamera(38,1,.1,100);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.dataset.pathsWebgl='true';renderer.domElement.setAttribute('aria-label','三维静电场与路径；拖动空白旋转，滚轮缩放');host.append(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.target.set(0,.65,0);controls.minDistance=6;controls.maxDistance=36;controls.enablePan=false;
 scene.add(new THREE.HemisphereLight('#ffffff','#c7c9c4',2.2));
 const key=new THREE.DirectionalLight('#fffaf1',2.3);key.position.set(-3,7,9);scene.add(key);
 const fill=new THREE.DirectionalLight('#c3dce3',1.1);fill.position.set(4,2,-6);scene.add(fill);
 const staticGroup=new THREE.Group(),routesGroup=new THREE.Group(),localGroup=new THREE.Group(),motionGroup=new THREE.Group();scene.add(staticGroup,routesGroup,localGroup,motionGroup);
 let state=null,signature='',disposed=false,raf,lastTime=null,currentView='space';

 function clear(group){group.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){m?.map?.dispose();m?.dispose();}});group.clear();}
 function line(points,color,group,{opacity=1,dashed=false}={}){
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(vector));
  const material=dashed?new THREE.LineDashedMaterial({color,dashSize:.13,gapSize:.1,transparent:true,opacity}):new THREE.LineBasicMaterial({color,transparent:true,opacity});
  const object=new THREE.Line(geometry,material);if(dashed)object.computeLineDistances();group.add(object);return object;
 }
 function tube(points,color,group,radius=.024,opacity=1){
  if(points.length<2)return;
  const curve=new THREE.CatmullRomCurve3(points.map(vector));
  const object=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.min(180,points.length),radius,6,false),new THREE.MeshStandardMaterial({color,roughness:.65,transparent:opacity<1,opacity}));group.add(object);return object;
 }
 function label(text,p,color,group,size=.25){
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font='italic 38px Georgia, "Times New Roman", serif';canvas.width=Math.max(96,ctx.measureText(text).width+28);canvas.height=64;
  ctx.font='italic 38px Georgia, "Times New Roman", serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,canvas.width/2,32);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const object=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));object.position.copy(vector(p));object.scale.set(size*canvas.width/64,size,1);group.add(object);return object;
 }
 function sphere(p,color,group,radius=.09){const object=new THREE.Mesh(new THREE.SphereGeometry(radius,28,20),new THREE.MeshStandardMaterial({color,roughness:.28,metalness:.06}));object.position.copy(vector(p));group.add(object);return object;}
 function arrow(p,d,color,length,group,opacity=1){
  const v=vector(d);if(v.length()<1e-10)return null;
  const object=new THREE.ArrowHelper(v.normalize(),vector(p),length,color,Math.min(.13,length*.3),Math.min(.075,length*.18));
  for(const m of [object.line.material,object.cone.material]){m.transparent=opacity<1;m.opacity=opacity;}group.add(object);return object;
 }
 function moveArrow(object,p,d,length){object.position.copy(vector(p));object.setDirection(vector(d).normalize());object.setLength(length,Math.min(.16,length*.27),Math.min(.09,length*.16));}

 // A quiet XY section and a short XYZ triad make depth explicit without
 // confusing the field with a Cartesian box or a dense cloud of glyphs.
 const plane=new THREE.Mesh(new THREE.PlaneGeometry(10,6.5),new THREE.MeshBasicMaterial({color:'#dce8e6',transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false}));plane.position.set(0,.55,0);staticGroup.add(plane);
 line([[-5,-2.7,0],[5,-2.7,0],[5,3.8,0],[-5,3.8,0],[-5,-2.7,0]],'#b5c8c7',staticGroup,{opacity:.38});
 label('z = 0',[4.35,-2.4,0],'#8fa5a7',staticGroup,.2);
 const origin=[-4.6,-2.2,-1.65];for(const [d,name]of[[[1,0,0],'x'],[[0,1,0],'y'],[[0,0,1],'z']]){arrow(origin,d,'#8c9b9e',.7,staticGroup,.8);label(name,origin.map((v,i)=>v+d[i]*.9),'#6e8085',staticGroup,.24);}
 for(const source of PATH_SOURCES){sphere(source.pos,source.Q>0?C.positive:C.negative,staticGroup,source.radius);label(source.Q>0?'+':'−',[source.pos[0],source.pos[1],source.pos[2]+.36],'#ffffff',staticGroup,.35);label(source.label,[source.pos[0],source.pos[1]-.62,source.pos[2]],source.Q>0?C.positive:C.negative,staticGroup,.23);}
 const fieldGroup=new THREE.Group();scene.add(fieldGroup);
 for(const z of[-1.7,0,1.7])for(let y=-1.8;y<=3.4;y+=1.3)for(let x=-4.4;x<=4.5;x+=1.3){
  const p=[x,y,z];if(PATH_SOURCES.some(s=>vector(p).distanceTo(vector(s.pos))<.82))continue;
  const E=fieldAt(p,PATH_SOURCES).E,m=Math.hypot(...E);arrow(p,E,C.field,.16+.33*m/(m+340),fieldGroup,z===0?.62:.34);
 }
 const directParticle=sphere([0,0,0],C.direct,motionGroup,.105),detourParticle=sphere([0,0,0],C.detour,motionGroup,.105);
 const forceArrow=arrow([0,0,0],[1,0,0],C.force,.8,motionGroup),fieldArrow=arrow([0,0,0],[1,0,0],C.direct,1.2,motionGroup),stepArrow=arrow([0,0,0],[1,0,0],C.step,.6,motionGroup);
 const forceLabel=label('F',[0,0,0],C.force,motionGroup,.28),fieldLabel=label('E',[0,0,0],C.direct,motionGroup,.29),stepLabel=label('dℓ',[0,0,0],C.step,motionGroup,.26);
 let localEnd=null;
 function geometry(){
  const next=JSON.stringify([state.mode,state.A,state.B,state.handle,state.P,state.direction,state.step]);if(next===signature)return;signature=next;clear(routesGroup);clear(localGroup);localEnd=null;
  if(state.mode==='local'){
   const p=state.P,end=state.local.end,d=state.local.direction,E=state.local.E,n=vector(E).normalize();
   tube([p,end],C.step,localGroup,.035);localEnd=sphere(end,C.step,localGroup,.06);
   line([p,p.map((v,i)=>v+1.15*d[i])],C.step,localGroup,{opacity:.5,dashed:true});
   // A tangent disk is orthogonal to E. Its normal and the probe remain
   // anchored at P even after moving P out of the original XY section.
   const disk=new THREE.Mesh(new THREE.CircleGeometry(.8,64),new THREE.MeshBasicMaterial({color:'#7ca99c',transparent:true,opacity:.11,side:THREE.DoubleSide,depthWrite:false}));disk.position.copy(vector(p));disk.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);localGroup.add(disk);
   const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:64},(_,i)=>new THREE.Vector3(.8*Math.cos(i*Math.PI/32),.8*Math.sin(i*Math.PI/32),0))),new THREE.LineBasicMaterial({color:'#7fa99b',transparent:true,opacity:.45}));ring.position.copy(vector(p));ring.quaternion.copy(disk.quaternion);localGroup.add(ring);
   label('Δs',end.map((v,i)=>v+(i===1?.18:0)),C.step,localGroup,.25);
  }else{
   for(const [route,color]of[[state.results.direct,C.direct],[state.results.detour,C.detour]])tube(route.samples.map(s=>s.p),color,routesGroup,.025,.56);
   line([state.A,state.handle,state.B],'#8d999e',routesGroup,{opacity:.32,dashed:true});
  }
 }
 function motion(){if(!state)return;
  const local=state.mode==='local',r=local?{p:state.P,E:state.local.E,tangent:state.direction}:routeState(state.results.detour,state.progress),m=Math.hypot(...r.E),n=r.E.map(v=>v/(m||1)),force=n.map(v=>v*Math.sign(state.q));
  directParticle.visible=!local;detourParticle.position.copy(vector(r.p));if(!local)directParticle.position.copy(vector(routeState(state.results.direct,state.progress).p));
  const fLength=.6+.3*Math.abs(state.q)*m/(m+600);moveArrow(forceArrow,r.p,force,fLength);moveArrow(fieldArrow,r.p,n,1.13);moveArrow(stepArrow,r.p,r.tangent,.55);
  fieldArrow.visible=local;fieldLabel.visible=local;stepArrow.visible=!local;stepLabel.visible=!local;
  forceLabel.position.copy(vector(r.p.map((v,i)=>v+force[i]*(fLength+.18))));fieldLabel.position.copy(vector(r.p.map((v,i)=>v+n[i]*1.34)));stepLabel.position.copy(vector(r.p.map((v,i)=>v+r.tangent[i]*.76)));
 }
 function setView(mode='space'){
  currentView=mode;const distance=Math.max(11,5.4/(Math.tan(19*Math.PI/180)*Math.max(camera.aspect,.45)));
  const p=mode==='front'?[0,.65,distance]:mode==='top'?[0,distance,.001]:[distance*.43,.65+distance*.32,distance*.844];camera.position.set(...p);camera.up.set(0,1,0);controls.target.set(0,.65,0);controls.update();
 }
 function resize(){const r=host.getBoundingClientRect();renderer.setSize(Math.max(r.width,1),Math.max(r.height,1),false);camera.aspect=r.width/Math.max(r.height,1);camera.updateProjectionMatrix();setView(currentView);}
 function project(p){const r=host.getBoundingClientRect(),v=vector(p).project(camera);return {x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2,visible:v.z<1};}
 function rayPoint(event,p){const rect=renderer.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const normal=camera.getWorldDirection(new THREE.Vector3()),plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,vector(p)),hit=new THREE.Vector3();return ray.ray.intersectPlane(plane,hit)?hit.toArray():[...p];}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function frame(t){if(disposed)return;onFrame?.(t,lastTime);lastTime=t;controls.update();motion();renderer.render(scene,camera);onProject?.(project);host.dataset.pathCamera=camera.position.toArray().map(v=>v.toFixed(3)).join(',');raf=requestAnimationFrame(frame);}raf=requestAnimationFrame(frame);
 return {update(next){state=next;geometry();motion();},project,rayPoint,setView,controls,field(value){fieldGroup.visible=value;},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();controls.dispose();for(const g of[staticGroup,routesGroup,localGroup,motionGroup,fieldGroup])clear(g);renderer.dispose();renderer.domElement.remove();}};
}
