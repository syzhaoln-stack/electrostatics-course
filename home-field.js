import {FieldScene,THREE} from './scene.js';
import {movingChargeAt,movingSource} from './moving-charge-physics.js';
import {applyAcademicScene} from './academic-scene.js';

/** A compact live preview of the same retarded-field model as the full lesson. */
export function mountHomeField(host){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='./home-field.css';document.head.append(sheet);
 host.innerHTML='<section class="home-field"><div class="home-field-stage" aria-label="振荡电荷的三维电场；箭头位于 XZ 观察面，可拖动旋转"></div><div class="home-field-title"><span>振荡的电荷</span><small>XZ 观察面上的三维电场 E</small></div><div class="home-field-scale">箭长压缩显示 · 拖动旋转</div><div class="home-field-actions"><button type="button" id="home-wave-play">暂停</button><a href="charge.html#propagation">拓展实验 ↗</a></div></section>';
 const scene=new FieldScene(host.querySelector('.home-field-stage'),{extent:12});applyAcademicScene(scene);scene.grid.visible=false;scene.floor.visible=false;scene.clearLayer('axes');scene.controls.enablePan=false;scene.controls.enableZoom=false;
 const options={amplitude:1,frequency:10e6},samples=[];
 const compact=matchMedia('(max-width:700px)').matches,spacing=compact?1:.75,xLimit=compact?9:12,zLimit=compact?4:5;
 for(let z=-zLimit;z<=zLimit;z++)for(let x=-xLimit;x<=xLimit;x++){if(x===0&&z===0)continue;samples.push([x*spacing,0,z*spacing]);}
 // The same ordered local sampling exposes the velocity-dependent near field.
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(x||z)samples.push([x*.3,0,z*.3]);}
 const positions=new THREE.Float32BufferAttribute(new Float32Array(samples.length*6),3),colours=new THREE.Float32BufferAttribute(new Float32Array(samples.length*6),3),geometry=new THREE.BufferGeometry();geometry.setAttribute('position',positions);geometry.setAttribute('color',colours);
 scene.layer('wave').add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.88})));
 const heads=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,6),new THREE.MeshBasicMaterial({color:'#ffffff'}),samples.length);heads.frustumCulled=false;scene.layer('wave').add(heads);
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(.18,24,18),new THREE.MeshStandardMaterial({color:'#bc6a54',roughness:.45}));scene.layer('source').add(sphere);
 for(const [a,b] of [[[-9,0,0],[9,0,0]],[[0,0,-4.4],[0,0,4.4]],[[0,-.8,0],[0,1.1,0]]])scene.line([a,b],'#c4cfca','reference-axes',.65);
 scene.label('x',[8.65,0,.22],'#78868b','reference-axes',.21);scene.label('z',[.22,0,4.25],'#78868b','reference-axes',.21);scene.label('y',[.18,1.08,0],'#78868b','reference-axes',.21);
 const pose=new THREE.Object3D(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),colour=new THREE.Color(),base=new THREE.Color('#286f7c'),paper=new THREE.Color('#fbfbf8');
 const preference=matchMedia('(prefers-reduced-motion: reduce)');let time=540e-9,running=!preference.matches,visible=true,last=0,lastDraw=-Infinity;
 const button=host.querySelector('#home-wave-play');function sync(){button.textContent=running?'暂停':'开始振荡';button.setAttribute('aria-pressed',String(running));}
 function draw(){sphere.position.fromArray(movingSource(time,options).position.map(v=>v/10));for(let i=0;i<samples.length;i++){const p=samples[i],E=movingChargeAt(p.map(v=>v*10),time,options).E,m=Math.hypot(...E),strength=Math.tanh(m/.014),length=(i>=samples.length-8?.23:.40)*strength;direction.fromArray(E).normalize();const tip=new THREE.Vector3(...p).addScaledVector(direction,length),h=length*.27;positions.setXYZ(2*i,...p);positions.setXYZ(2*i+1,tip.x,tip.y,tip.z);colour.copy(base).lerp(paper,.65*(1-strength));colours.setXYZ(2*i,colour.r,colour.g,colour.b);colours.setXYZ(2*i+1,colour.r,colour.g,colour.b);pose.position.copy(tip).addScaledVector(direction,-h/2);pose.quaternion.setFromUnitVectors(up,direction);pose.scale.set(length*.075,h,length*.075);pose.updateMatrix();heads.setMatrixAt(i,pose.matrix);heads.setColorAt(i,colour);}positions.needsUpdate=true;colours.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;heads.instanceColor.needsUpdate=true;host.dataset.timeNs=(time*1e9).toFixed(2);host.dataset.vectorSamples=samples.length;host.dataset.fieldModel='retarded-full-E';}
 function camera(){scene.camera.position.set(1.8,5.8,8.2);scene.controls.target.set(0,0,0);scene.camera.lookAt(0,0,0);scene.controls.update();}const resize=scene.resize.bind(scene);scene.resize=()=>{resize();camera();};camera();
 scene.frameFn=now=>{const dt=last?Math.min(.08,(now-last)/1000):0;last=now;if(!visible||!running||document.hidden)return;time+=dt*32e-9;if(now-lastDraw>48){draw();lastDraw=now}};
 button.onclick=()=>{running=!running;sync();draw()};const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting});observer.observe(host);const motion=e=>{if(e.matches){running=false;sync()}};preference.addEventListener('change',motion);draw();sync();
 return()=>{observer.disconnect();preference.removeEventListener('change',motion);scene.dispose();sheet.remove();host.innerHTML=''};
}
