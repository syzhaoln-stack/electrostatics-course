import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const DEG=Math.PI/180,R=1.08,Y=1.64;
export function mountBalance(host,onKnob){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0c1215);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.01,100);camera.position.set(4,4.5,6.7);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.9,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=24;controls.maxPolarAngle=Math.PI*.83;
 scene.add(new THREE.HemisphereLight(0xc8e7ec,0x342719,2.3));const key=new THREE.DirectionalLight(0xffe4bd,4);key.position.set(-4,9,6);scene.add(key);const rim=new THREE.DirectionalLight(0x7ac9e1,3);rim.position.set(4,4,-4);scene.add(rim);
 const brass=new THREE.MeshStandardMaterial({color:0xa98d55,metalness:.78,roughness:.31}),dark=new THREE.MeshStandardMaterial({color:0x27333a,metalness:.6,roughness:.42}),shellac=new THREE.MeshStandardMaterial({color:0x75452c,roughness:.38}),silver=new THREE.MeshStandardMaterial({color:0xc5d0ce,metalness:.75,roughness:.3});
 const glass=new THREE.MeshPhysicalMaterial({color:0x92bfca,transparent:true,opacity:.055,roughness:.12,metalness:0,side:THREE.DoubleSide,depthWrite:false});
 const amber=new THREE.MeshStandardMaterial({color:0xe8ba71,roughness:.7}),coral=new THREE.MeshStandardMaterial({color:0xe78068,roughness:.65});
 const mesh=(geo,mat,pos,parent=scene)=>{const o=new THREE.Mesh(geo,mat);o.position.set(...pos);parent.add(o);return o;};
 const cylinder=(r,h,y,mat,x=0,z=0,parent=scene)=>mesh(new THREE.CylinderGeometry(r,r,h,72,1,mat===glass),mat,[x,y,z],parent);
 const ring=(r,y,mat,t=.012)=>{const o=mesh(new THREE.TorusGeometry(r,t,8,100),mat,[0,y,0]);o.rotation.x=Math.PI/2;return o;};
 function segment(a,b,mat,r=.012,parent=scene){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const o=mesh(new THREE.CylinderGeometry(r,r,v.length(),12),mat,av.clone().add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;}
 function line(points,color=0x7bbbc2,opacity=1,parent=scene){const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));parent.add(o);return o;}
 cylinder(1.68,.12,.02,dark);ring(1.65,.1,brass,.025);cylinder(1.62,3.24,1.74,glass);ring(1.62,3.36,silver,.014);ring(1.62,.12,silver,.014);
 const topHidden=[cylinder(1.755,.035,3.39,glass),ring(1.755,3.39,silver,.008)];
 // Thin glass tower; main lengths follow the memoir. Clamp is recessed in the tube.
 topHidden.push(cylinder(.22,6.48,6.65,glass),ring(.22,3.42,brass,.018),ring(.22,9.89,brass,.022));
 const knob=new THREE.Group();knob.position.y=9.99;scene.add(knob);cylinder(.34,.085,0,brass,0,0,knob);cylinder(.12,.23,.15,brass,0,0,knob);segment([0,.2,0],[.38,.2,0],brass,.025,knob);
 topHidden.push(knob,segment([0,1.64,0],[0,9.2,0],silver,.005),cylinder(.05,.15,9.22,brass));cylinder(.035,.12,Y,silver);
 // Stationary sphere and insulating support through the second opening.
 topHidden.push(segment([R,Y,0],[R,3.5,0],shellac,.022),cylinder(.115,.07,3.5,brass,R));mesh(new THREE.SphereGeometry(.065,32,24),amber,[R,Y,0]);
 const moving=new THREE.Group();moving.position.y=Y;scene.add(moving);segment([-1.02,0,0],[R,0,0],shellac,.014,moving);mesh(new THREE.SphereGeometry(.065,32,24),coral,[R,0,0],moving);const paper=mesh(new THREE.BoxGeometry(.27,.23,.012),new THREE.MeshStandardMaterial({color:0xe0cfaa,roughness:1,side:THREE.DoubleSide}),[-.92,-.02,0],moving);paper.rotation.y=.25;
 // A measuring circle at needle height, with a dark unobtrusive scale.
 ring(1.64,Y-.13,new THREE.MeshStandardMaterial({color:0xb0b7ac,roughness:.85}),.006);
 for(let i=0;i<360;i+=2){const a=i*DEG,r1=1.64,r2=i%10===0?1.73:1.68;line([[r1*Math.cos(a),Y-.13,r1*Math.sin(a)],[r2*Math.cos(a),Y-.13,r2*Math.sin(a)]],i%10===0?0x8a9e9c:0x465b5b,.6);}
 const labelNodes=[];function label(text,color){const el=document.createElement('span');el.textContent=text;Object.assign(el.style,{position:'absolute',fontSize:'12px',color,whiteSpace:'nowrap',pointerEvents:'none',padding:'3px 7px',borderRadius:'3px',background:'#0c1215b8'});host.append(el);labelNodes.push(el);return el;}
 const fixedLabel=label('固定球','#eac786'),movingLabel=label('活动球','#f3a18e'),angleLabel=label('α','#7ccbd0'),wireLabel=label('银丝','#aebcbd');
 const force=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),.7,0xf39880,.13,.055);scene.add(force);
 const alphaLine=line([[0,Y+.02,0],[1,Y+.02,0]],0x78bdc4,.85),chord=line([[0,Y,0],[1,Y,0]],0xe8ba71,.75),arc=line([[0,Y,0],[1,Y,0]],0x78bdc4,.9),restoring=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),.2,0x7dbbc5,.09,.045);scene.add(restoring);
 let targetAlpha=3.18,alpha=3.18,beta=0,charged=false,targetCamera=null,targetLook=null,drag=null,disposed=false,visible=true,view='close';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function setLine(obj,pts){obj.geometry.dispose();obj.geometry=new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(...p)));}
 function project(el,p){const v=new THREE.Vector3(...p).project(camera);el.style.left=`${(v.x*.5+.5)*host.clientWidth}px`;el.style.top=`${(-v.y*.5+.5)*host.clientHeight}px`;el.style.transform='translate(-50%,-50%)';el.style.display=v.z<1&&v.z>-1&&Math.abs(v.x)<.95&&Math.abs(v.y)<.95?'block':'none';}
 let prev=0;function frame(ms){if(disposed)return;requestAnimationFrame(frame);if(!visible)return;const dt=Math.min((ms-prev)/1000||.016,.05);prev=ms;alpha+=(targetAlpha-alpha)*(reduced?1:1-Math.exp(-7*dt));
 if(targetCamera){camera.position.lerp(targetCamera,1-Math.exp(-6*dt));controls.target.lerp(targetLook,1-Math.exp(-6*dt));if(camera.position.distanceTo(targetCamera)<.01){targetCamera=null;}}
 const a=alpha*DEG;moving.rotation.y=-a;knob.rotation.y=beta*DEG;const p=[R*Math.cos(a),Y,R*Math.sin(a)],q=[R,Y,0];
 setLine(chord,[q,p]);setLine(alphaLine,[[0,Y+.02,0],[R,Y+.02,0],[0,Y+.02,0],p]);setLine(arc,Array.from({length:33},(_,i)=>{const u=(a+.45)*(1-i/32);return [.48*Math.cos(u),Y+.04,.48*Math.sin(u)];}));
 const dir=new THREE.Vector3(p[0]-q[0],0,p[2]-q[2]).normalize();force.position.set(...p);force.setDirection(dir);force.setLength(.58,.13,.055);force.visible=charged;restoring.position.set(.48,Y+.04,0);restoring.setDirection(new THREE.Vector3(0,0,-1));restoring.visible=charged;arc.visible=charged;chord.visible=charged;alphaLine.visible=charged;
 controls.update();renderer.render(scene,camera);project(fixedLabel,[R+.3,Y-.18,-.15]);project(movingLabel,[p[0],Y+.48,p[2]+.22]);project(angleLabel,[.34*Math.cos(a/2),Y+.05,.34*Math.sin(a/2)]);project(wireLabel,[.12,2.65,0]);if(view!=='top')angleLabel.style.display='none';else wireLabel.style.display='none';if(view==='whole'){movingLabel.style.display='none';fixedLabel.style.display='none';}}
 const resize=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();});resize.observe(host);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'100px'});observer.observe(host);
 const ray=new THREE.Raycaster();renderer.domElement.addEventListener('pointerdown',e=>{const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);if(ray.intersectObjects(knob.children,true).length){drag={x:e.clientX,beta};controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();}else targetCamera=null;},true);
 renderer.domElement.addEventListener('pointermove',e=>{if(drag)onKnob(Math.max(0,Math.min(720,drag.beta+(e.clientX-drag.x)*3)));});
 const end=()=>{drag=null;controls.enabled=true;};renderer.domElement.addEventListener('pointerup',end);renderer.domElement.addEventListener('pointercancel',end);
 requestAnimationFrame(frame);
 return {set(s){targetAlpha=s.alpha;beta=s.beta;charged=s.charged;},view(name){view=name;topHidden.forEach(o=>o.visible=name!=='top');const mobile=host.clientWidth<600;const config={whole:[[11,8.5,19],[0,5,0]],top:[[.001,8,.001],[0,Y,0]],close:[mobile?[4.8,5.3,8.3]:[4,4.5,6.7],[0,1.75,0]]}[name];targetCamera=new THREE.Vector3(...config[0]);targetLook=new THREE.Vector3(...config[1]);},dispose(){disposed=true;resize.disconnect();observer.disconnect();controls.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});renderer.dispose();renderer.domElement.remove();labelNodes.forEach(n=>n.remove());}};
}
