import {FieldScene,THREE} from './scene.js';
import {applyAcademicScene} from './academic-scene.js';
import {pointReading,finiteModel,segmentedRod,ELEMENTARY_CHARGE as e} from './foundation-physics.js';

const fmt=x=>Math.abs(x)>=1000?x.toFixed(0):x.toFixed(2);
const ink='#24434b',teal='#16858b',amber='#b77b18',sourceColor='#c46f59';
const vec=p=>new THREE.Vector3(...p);
// The vertices of a subdivided regular icosahedron sample solid angles evenly.
function directions(){
 const geometry=new THREE.IcosahedronGeometry(1,1),a=geometry.attributes.position,unique=new Map();
 for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).normalize();unique.set(p.toArray().map(n=>n.toFixed(5)).join(','),p);}
 geometry.dispose();return [...unique.values()];
}
function label(view,text,pos,color=ink,layer='labels',size=.42){
 const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='36px Georgia,"Noto Serif SC","Microsoft YaHei",serif';
 c.width=Math.max(96,Math.ceil(ctx.measureText(text).width+24));c.height=64;ctx.font='36px Georgia,"Noto Serif SC","Microsoft YaHei",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,c.width/2,32);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,depthWrite:false,toneMapped:false}));sprite.scale.set(size*c.width/64,size,1);sprite.position.copy(vec(pos));view.layer(layer).add(sprite);return sprite;
}
function arrow(view,pos,direction,length,color=teal,layer='vectors',opacity=1){
 const d=Array.isArray(direction)?vec(direction):direction.clone();if(d.lengthSq()<1e-20||length<=0)return;
 const head=Math.min(.15,length*.28),end=vec(pos).addScaledVector(d.normalize(),length);view.line([pos,end.toArray()],color,layer,opacity);
 const cone=new THREE.Mesh(new THREE.ConeGeometry(Math.min(.05,length*.11),head,10),new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity}));cone.position.copy(end).addScaledVector(d,-head/2);cone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);view.layer(layer).add(cone);
}
function configure(view){applyAcademicScene(view);view.grid.visible=false;view.layer('axes').visible=false;view.controls.enablePan=false;view.controls.minDistance=4;view.controls.maxDistance=23;view.camera.position.set(6,4.6,8.2);view.controls.target.set(0,0,0);view.controls.update();}
function sphere(view,p,r,color,layer){const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,32,24),new THREE.MeshStandardMaterial({color,roughness:.32,metalness:.12}));mesh.position.copy(vec(p));view.layer(layer).add(mesh);return mesh;}

export function mountFoundations(container){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='./foundations.css';document.head.append(sheet);container.classList.add('foundations-lab');
 container.innerHTML=`<div class="foundation-tabs" role="tablist" aria-label="基础实验"><button data-mode="force" class="active" role="tab" aria-selected="true">场与力</button><button data-mode="models" role="tab" aria-selected="false">有限物体与理想模型</button></div>
 <section class="foundation-force"><div class="foundation-stage-wrap"><div class="foundation-stage" aria-label="三维点电荷场，可旋转并拖动观察点 P"></div><div class="foundation-top"><div class="foundation-scene-name"><strong>点电荷的空间场</strong><small>拖动 P：在当前高度移动 · 拖动空白：旋转</small></div><button class="foundation-camera" data-camera="force">复位视角</button></div><div class="foundation-legend"><span><i style="background:${teal}"></i>电场 E</span><span><i style="background:${amber}"></i>受力 F</span><span>淡圈：P 所在的拖动平面</span></div></div>
 <div class="foundation-readings"><span>这里的场 E <strong id="foundation-E"></strong><small id="foundation-E-direction"></small></span><span>试探电荷受力 F <strong id="foundation-F"></strong><small id="foundation-F-direction"></small></span></div>
 <div class="foundation-inline"><label>源电荷 Q <output id="foundation-Q-value"></output><input id="foundation-Q" type="range" min="-.8" max=".8" step=".1" value=".4"></label><label>到源的距离 r <output id="foundation-r-value"></output><input id="foundation-r" type="range" min=".6" max="5" step=".05" value="2"></label><label>观察点高度 z <output id="foundation-z-value"></output><input id="foundation-z" type="range" min="-4.5" max="4.5" step=".01" value=".6"></label><div class="foundation-probes" aria-label="试探电荷"><span>试探电荷 q</span><button data-q="1" class="active">＋e</button><button data-q="2">＋2e</button><button data-q="-1">−e</button></div></div>
 <div class="foundation-actions"><button id="foundation-double-r">距离 ×2</button><button id="foundation-double-Q">源电量 ×2</button><button id="foundation-reset">恢复参数</button><output id="foundation-change" aria-live="polite">换试探电荷，比较同一位置的 E 与 F。</output></div><p class="foundation-caption">E 的方向是正试探电荷的受力方向。F = qE；负电荷的 F 与 E 反向。矢量长度压缩显示，大小以读数为准。</p></section>
 <section class="foundation-models" hidden><div class="foundation-model-buttons"><button data-model="point" class="active">小物体的点电荷近似</button><button data-model="line">长直线近似</button><button data-model="plane">大平面近似</button></div><div class="foundation-model-figure"><div class="foundation-model-stage" aria-label="三维有限带电体及轴线上的观察点"></div><div class="foundation-top"><div class="foundation-scene-name"><strong id="foundation-model-name">均匀带电线段</strong><small id="foundation-model-source">Q = 1 pC</small></div><div><button class="foundation-camera" id="foundation-model-focus">靠近 P</button><button class="foundation-camera" data-camera="model">完整物体</button></div></div><div class="foundation-model-scale"><output id="foundation-model-scale"></output><span>拖动旋转 · 滚轮缩放</span></div></div>
 <div class="foundation-model-numbers"><span>有限物体的 E <strong id="foundation-finite"></strong></span><span>理想模型的 E <strong id="foundation-ideal"></strong></span><span>相对差异 <strong id="foundation-error"></strong></span></div>
 <div class="foundation-model-controls"><label class="foundation-size">物体尺寸 <output id="foundation-size-value"></output><input id="foundation-size" type="range" min="-1.5" max="1.7" step=".025" value="0"></label><label class="foundation-distance">观察距离 r <output id="foundation-model-r-value"></output><input id="foundation-model-r" type="range" min=".5" max="5" step=".05" value="2"></label></div><p id="foundation-model-note"></p><div class="foundation-segments"><label>把线源分成 <select id="foundation-N"><option>4</option><option>16</option><option selected>64</option><option>256</option></select> 段，逐段相加</label><output id="foundation-sum"></output></div><p class="foundation-caption">青色箭头示方向，读数为 P 点的场强。几何尺寸与距离按同一比例显示，镜头随尺寸取景。线段在中垂线上观察，圆盘在中心轴线上观察。线径和观察点大小仅为辨认而夸张。</p></section>`;
 const $=s=>container.querySelector(s),view=new FieldScene($('.foundation-stage'),{extent:6}),modelView=new FieldScene($('.foundation-model-stage'),{extent:6});configure(view);configure(modelView);
 let Q=.4,r=2,q=1,azimuth=.25,z=.6,mode='force',model='point',drag=false,modelProbe=[0,2,0];const unitDirections=directions();
 const P=()=>{const rho=Math.sqrt(Math.max(0,r*r-z*z));return [rho*Math.cos(azimuth),rho*Math.sin(azimuth),z];};
 function home(target){target.camera.position.set(...(target===modelView?[4.8,6.6,7.2]:[6,4.6,8.2]));target.controls.target.set(0,target===modelView?.5:0,0);target.controls.update();}
 function draw(){
  ['source','arrows','probe','guides'].forEach(n=>view.clearLayer(n));const color=Q>0?sourceColor:Q<0?'#4c95b4':'#8b9a9c';sphere(view,[0,0,0],.3,color,'source');label(view,Q>0?'Q +':Q<0?'Q −':'Q = 0',[0,.7,0],color,'source',.5);
  for(const rr of [1.45,3.8])for(const d of unitDirections){const p=d.clone().multiplyScalar(rr),m=pointReading(Q*1e-12,rr*1e-3,e).E;const length=.19+.43*Math.abs(m)/(Math.abs(m)+400);if(m)arrow(view,p.toArray(),d.clone().multiplyScalar(Math.sign(m)),length,teal,'arrows',rr===3.8?.32:.78);}
  const p=P(),reading=pointReading(Q*1e-12,r*1e-3,q*e),mesh=sphere(view,p,.15,amber,'probe');mesh.userData.probe=true;view.dashedLine([[0,0,0],p],'#8ca3a5','guides',.65);label(view,'P',[p[0],p[1]+.5,p[2]],amber,'probe',.48);
  const circle=Array.from({length:97},(_,i)=>{const a=i/96*Math.PI*2;return [Math.sqrt(Math.max(.36,r*r-z*z))*Math.cos(a),Math.sqrt(Math.max(.36,r*r-z*z))*Math.sin(a),z];});view.line(circle,'#bccdcc','guides',.55);
  const dir=vec(p).normalize(),side=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,0,1));if(side.lengthSq()<.01)side.set(1,0,0);side.normalize();const length=.25+.95*Math.abs(reading.E)/(Math.abs(reading.E)+400),Epos=vec(p).addScaledVector(side,.11),Fpos=vec(p).addScaledVector(side,-.11);
  if(reading.E){arrow(view,Epos.toArray(),dir.clone().multiplyScalar(Math.sign(reading.E)),length,teal,'probe');arrow(view,Fpos.toArray(),dir.clone().multiplyScalar(Math.sign(reading.F)),length*.8*Math.abs(q),amber,'probe');const Etip=Epos.clone().addScaledVector(dir,Math.sign(reading.E)*(length+.17)),Ftip=Fpos.clone().addScaledVector(dir,Math.sign(reading.F)*(length*.8*Math.abs(q)+.17));Etip.addScaledVector(side,.15);Ftip.addScaledVector(side,-.15);label(view,'E',Etip.toArray(),teal,'probe',.4);label(view,'F',Ftip.toArray(),amber,'probe',.4);}
  $('#foundation-Q-value').textContent=Q.toFixed(2)+' pC';$('#foundation-r-value').textContent=r.toFixed(2)+' mm';$('#foundation-z-value').textContent=z.toFixed(2)+' mm';$('#foundation-r').value=r;$('#foundation-z').min=(-r*.97).toFixed(2);$('#foundation-z').max=(r*.97).toFixed(2);$('#foundation-z').value=z;
  $('#foundation-E').textContent=fmt(Math.abs(reading.E))+' V/m';$('#foundation-F').textContent=fmt(Math.abs(reading.F)*1e15)+' fN';$('#foundation-E-direction').textContent=reading.E>0?'从 Q 向外':reading.E<0?'指向 Q':'无电场';$('#foundation-F-direction').textContent=reading.F>0?'从 Q 向外':reading.F<0?'指向 Q':'不受电场力';
  const canvas=view.renderer.domElement;canvas.dataset.reading=JSON.stringify(reading);canvas.dataset.probe=JSON.stringify(p);canvas.dataset.probeCharge=q;const screen=vec(p).project(view.camera);canvas.dataset.probeScreen=JSON.stringify([screen.x,screen.y]);
 }
 function sync(){Q=+$('#foundation-Q').value;const nextR=+$('#foundation-r').value;z=Math.min(Math.abs(z),nextR*.97)*Math.sign(z);r=nextR;draw();}
 $('#foundation-Q').oninput=()=>{sync();$('#foundation-change').textContent='改变源电量，E 与 F 一起改变。';};$('#foundation-r').oninput=()=>{const ratio=+$('#foundation-r').value/r;z*=ratio;sync();$('#foundation-change').textContent='球外距离增大，E 与 F 按 1/r² 减小。';};
 $('#foundation-z').oninput=()=>{z=Math.max(-r*.97,Math.min(r*.97,+$('#foundation-z').value));draw();$('#foundation-change').textContent='保持距离 r，改变 P 的空间方向：E 的大小不变，方向随连线转动。';};
 container.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{q=+b.dataset.q;container.querySelectorAll('[data-q]').forEach(x=>x.classList.toggle('active',x===b));draw();$('#foundation-change').textContent=q<0?'换成负电荷：E 不变，F 反向。':q===2?'试探电量加倍：E 不变，F 加倍。':'同一位置的 E 由源电荷决定。';});
 $('#foundation-double-r').onclick=()=>{if(r>2.5){$('#foundation-change').textContent='请先把 r 调到 2.5 mm 以内。';return;}z*=2;$('#foundation-r').value=r*2;sync();$('#foundation-change').textContent='距离 ×2：E 与 F 均为原来的 1/4。';};
 $('#foundation-double-Q').onclick=()=>{if(Math.abs(Q)>.4){$('#foundation-change').textContent='请先把 |Q| 调到 0.4 pC 以内。';return;}$('#foundation-Q').value=Q*2;sync();$('#foundation-change').textContent=Q?'源电量 ×2：E 与 F 均加倍。':'Q = 0；加倍后仍为零。';};
 $('#foundation-reset').onclick=()=>{$('#foundation-Q').value=.4;$('#foundation-r').value=2;q=1;azimuth=.25;z=.6;container.querySelectorAll('[data-q]').forEach(x=>x.classList.toggle('active',x.dataset.q==='1'));sync();home(view);};
 const canvas=view.renderer.domElement,ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),-z),hit=new THREE.Vector3();
 function cast(ev){const box=canvas.getBoundingClientRect();mouse.set((ev.clientX-box.left)/box.width*2-1,1-(ev.clientY-box.top)/box.height*2);ray.setFromCamera(mouse,view.camera);}
 function down(ev){cast(ev);if(ray.intersectObjects(view.layer('probe').children).some(h=>h.object.userData.probe)){drag=true;plane.constant=-z;canvas.setPointerCapture(ev.pointerId);view.controls.enabled=false;ev.stopImmediatePropagation();canvas.style.cursor='grabbing';}}
 function move(ev){if(!drag){cast(ev);canvas.style.cursor=ray.intersectObjects(view.layer('probe').children).some(h=>h.object.userData.probe)?'grab':'default';return;}cast(ev);if(ray.ray.intersectPlane(plane,hit)){r=Math.min(5,Math.max(.6,Math.hypot(hit.x,hit.y,z)));azimuth=Math.atan2(hit.y,hit.x);if(Math.abs(z)>=r)z=r*.97*Math.sign(z);draw();}}
 function up(){drag=false;view.controls.enabled=true;canvas.style.cursor='default';}
 canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 function drawModel(){
  const sizeMm=2*10**(+$('#foundation-size').value),distanceMm=+$('#foundation-model-r').value,distance=distanceMm/1000,size=sizeMm/1000,ratio=size/distance,strength=model==='point'?1e-12:model==='line'?1e-9:1e-6;
  const result=finiteModel(model,size,distance,strength),N=+$('#foundation-N').value,scale=5.1/Math.max(model==='plane'?sizeMm*1.65:sizeMm,distanceMm*2),L=sizeMm*scale,d=distanceMm*scale;
  ['source','probe','guides','vectors'].forEach(n=>modelView.clearLayer(n));modelProbe=[0,d,0];
  if(model==='plane'){
   const disc=new THREE.Mesh(new THREE.CylinderGeometry(L,L,Math.min(.025,L*.025),96),new THREE.MeshStandardMaterial({color:sourceColor,transparent:true,opacity:.67,roughness:.6,metalness:.05}));modelView.layer('source').add(disc);
   const dots=[];for(let ix=-4;ix<=4;ix++)for(let iz=-4;iz<=4;iz++){const x=ix*L/4,zp=(iz+(ix%2)*.5)*L/4;if(x*x+zp*zp<L*L*.93)dots.push([x,Math.min(.025,L*.025)/2+.004,zp]);}const charges=new THREE.InstancedMesh(new THREE.SphereGeometry(Math.min(.032,L*.03),12,8),new THREE.MeshBasicMaterial({color:'#a95444'}),dots.length),dotMatrix=new THREE.Matrix4();dots.forEach((p,i)=>{dotMatrix.makeTranslation(...p);charges.setMatrixAt(i,dotMatrix);});modelView.layer('source').add(charges);
   for(const rr of [.33,.66,1]){const points=Array.from({length:97},(_,i)=>[L*rr*Math.cos(i/96*Math.PI*2),.014,L*rr*Math.sin(i/96*Math.PI*2)]);modelView.line(points,'#a46452','source',.35);}
   modelView.dashedLine([[0,.02,0],[L,0,0]],'#8ca3a5','guides',.6);label(modelView,'R',[L*.58,.35,0],ink,'guides',.4);
  }else{
   const rod=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,L,24),new THREE.MeshStandardMaterial({color:sourceColor,roughness:.42,transparent:true,opacity:.2}));rod.rotation.z=Math.PI/2;modelView.layer('source').add(rod);
   const segments=new THREE.InstancedMesh(new THREE.CylinderGeometry(.047,.047,L/N*.94,16),new THREE.MeshStandardMaterial({color:sourceColor,roughness:.38,metalness:.12}),N),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);for(let i=0;i<N;i++){matrix.compose(new THREE.Vector3((i+.5)*L/N-L/2,0,0),rotation,new THREE.Vector3(1,1,1));segments.setMatrixAt(i,matrix);}modelView.layer('source').add(segments);
   modelView.dashedLine([[-L/2,-.28,0],[L/2,-.28,0]],'#8ca3a5','guides',.6);label(modelView,'L',[0,-.6,0],ink,'guides',.4);
  }
  modelView.dashedLine([[0,0,0],modelProbe],'#8ca3a5','guides',.7);label(modelView,'r',[.3,d*.5,0],ink,'guides',.4);sphere(modelView,modelProbe,.12,amber,'probe');label(modelView,'P',[.35,d+.22,0],amber,'probe',.45);
  const length=.18+.7*result.ratio;arrow(modelView,modelProbe,[0,1,0],length,teal,'probe');label(modelView,'E',[.3,d+length+.23,0],teal,'probe',.42);
  if(model!=='plane'){
   const totalQ=model==='point'?strength:strength*size;
   for(let i=0;i<12;i++){const a=i*Math.PI/6,rad=Math.max(d,.3),pos=[0,rad*Math.cos(a),rad*Math.sin(a)];if(i===0)continue;arrow(modelView,pos,[0,Math.cos(a),Math.sin(a)],.22+.2*result.ratio,teal,'vectors',.53);}
   const numeric=segmentedRod(totalQ,size,distance,N);$('#foundation-sum').textContent=`Σ ΔE = ${fmt(numeric[1])} V/m；与有限线段解析值相差 ${Math.abs(numeric[1]/result.finite-1)*100<.005?'< 0.005':(Math.abs(numeric[1]/result.finite-1)*100).toFixed(3)} %`;
  }else{
   // Off-axis directions are a quadrature of a uniform disk, not decorative arrows.
   const samples=192,phi=Math.PI*(3-Math.sqrt(5));
   for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const sign of [-1,1]){const pos=[L*.45*Math.cos(a),sign*Math.max(d,.45),L*.45*Math.sin(a)],E=new THREE.Vector3();for(let j=0;j<samples;j++){const rr=L*Math.sqrt((j+.5)/samples),t=j*phi,v=new THREE.Vector3(pos[0]-rr*Math.cos(t),pos[1],pos[2]-rr*Math.sin(t));E.addScaledVector(v,1/v.length()**3);}arrow(modelView,pos,E,.32,teal,'vectors',.5);}
  }
  $('#foundation-model-name').textContent=model==='plane'?'均匀带电圆盘':'均匀带电线段';$('#foundation-model-source').textContent=model==='point'?'总电量 Q = 1 pC':model==='line'?'线密度 λ = 1 nC/m':'面密度 σ = 1 μC/m²';$('#foundation-model-scale').textContent=(model==='plane'?'R / r = ':'L / r = ')+ratio.toFixed(2)+' · 尺寸同比例';
  $('#foundation-size-value').textContent=(model==='plane'?'R = ':'L = ')+sizeMm.toFixed(2)+' mm';$('#foundation-model-r-value').textContent=distanceMm.toFixed(2)+' mm';$('#foundation-finite').textContent=fmt(result.finite)+' V/m';$('#foundation-ideal').textContent=fmt(result.ideal)+' V/m';$('#foundation-error').textContent=((1-result.ratio)*100).toFixed(2)+' %';
  $('#foundation-model-note').textContent=model==='point'?`Q = 1 pC 固定。L/r = ${ratio.toFixed(2)}；当物体比观察距离小得多，远处的场接近点电荷。`:model==='line'?`λ = 1 nC/m 固定。L/r = ${ratio.toFixed(2)}；在长线中部且远离两端，场接近无限长直线的场。`:`σ = 1 μC/m² 固定。R/r = ${ratio.toFixed(2)}；靠近大圆盘中心时，场接近无限大平面的场。`;
  $('.foundation-segments').hidden=model==='plane';$('.foundation-model-figure').dataset.values=JSON.stringify({...result,sizeRatio:ratio,size,distance});modelView.renderer.domElement.dataset.modelKind=model;modelView.renderer.domElement.dataset.geometry=JSON.stringify({sizeMm,distanceMm,scale,N});
 }
 container.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;container.querySelectorAll('[data-mode]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});$('.foundation-force').hidden=mode!=='force';$('.foundation-models').hidden=mode!=='models';if(mode==='force')view.resize();else{modelView.resize();drawModel();}});
 container.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{model=b.dataset.model;container.querySelectorAll('[data-model]').forEach(x=>x.classList.toggle('active',x===b));home(modelView);drawModel();});
 container.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>home(b.dataset.camera==='force'?view:modelView));$('#foundation-model-focus').onclick=()=>{modelView.controls.target.set(...modelProbe);modelView.camera.position.copy(vec(modelProbe).add(new THREE.Vector3(2,1.4,3.8)));modelView.controls.update();};
 $('#foundation-size').oninput=drawModel;$('#foundation-model-r').oninput=drawModel;$('#foundation-N').onchange=drawModel;home(modelView);draw();drawModel();
 view.frameFn=()=>{if(mode==='force'){const p=vec(P()).project(view.camera);canvas.dataset.probeScreen=JSON.stringify([p.x,p.y]);canvas.dataset.camera=JSON.stringify(view.camera.position.toArray());}};
 return()=>{canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);view.dispose();modelView.dispose();sheet.remove();container.classList.remove('foundations-lab');};
}
