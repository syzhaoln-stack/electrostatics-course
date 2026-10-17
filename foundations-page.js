import {FieldScene,THREE} from './scene.js';
import {sourceField,sourceReading,sourceDistance,fieldGlyph,SOURCE_DEFAULTS,ELEMENTARY_CHARGE as e} from './foundation-physics.js';

const C={ink:'#c4d9e1',dim:'#658492',background:'#081723',teal:'#65c5cc',gold:'#f3ca73',coral:'#ed927c',blue:'#7db6ec'};
const v=p=>new THREE.Vector3(...p),mag=p=>Math.hypot(...p),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const defaults={point:[2,0,0],line:[0,2,0],plane:[1.2,2,.5]};
const magnitude=x=>Math.abs(x)>=1000?Math.abs(x).toLocaleString('en-US',{maximumFractionDigits:0}):Math.abs(x).toFixed(Math.abs(x)<1?3:1);

function label(view,text,pos,color=C.ink,layer='labels',size=.36){
 const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='36px Georgia,"Noto Serif SC","Microsoft YaHei",serif';
 c.width=Math.max(96,Math.ceil(ctx.measureText(text).width+24));c.height=64;ctx.font='36px Georgia,"Noto Serif SC","Microsoft YaHei",serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,c.width/2,32);
 const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,depthWrite:false,toneMapped:false}));s.scale.set(size*c.width/64,size,1);s.position.copy(v(pos));view.layer(layer).add(s);return s;
}
function ball(view,p,r,color,layer='source',kind){
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,32,24),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.13,roughness:.22,metalness:.2}));mesh.position.copy(v(p));if(kind)mesh.userData.drag=kind;view.layer(layer).add(mesh);return mesh;
}
function halo(view,p,r,color,layer='source',kind){
 const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.014,8,72),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65}));ring.position.copy(v(p));if(kind)ring.userData.drag=kind;view.layer(layer).add(ring);return ring;
}
function glyph(view,p,E,color=C.teal,layer='probe',scale=1,opacity=1){
 const strength=mag(E);if(strength<1e-12)return;
 const {length:raw,width}=fieldGlyph(strength),length=Math.min(1.3,raw)*scale,d=v(E).normalize(),head=Math.min(.18,length*.29),shaft=Math.max(0,length-head*.8);
 const group=new THREE.Group();group.position.copy(v(p));group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);
 const material=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1});
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(width,width,shaft,8),material);stem.position.y=shaft/2;
 const tip=new THREE.Mesh(new THREE.ConeGeometry(Math.max(width*2.7,.035),head,10),material);tip.position.y=length-head/2;group.add(stem,tip);view.layer(layer).add(group);return {tip:v(p).addScaledVector(d,length).toArray(),group};
}
function tint(view){
 view.academic=false;view.scene.background.set(C.background);view.renderer.setClearColor(C.background);view.scene.fog.color.set(C.background);view.scene.fog.near=20;view.scene.fog.far=40;view.grid.visible=false;view.floor.visible=false;view.layer('axes').visible=false;
 view.controls.enablePan=false;view.controls.minDistance=6;view.controls.maxDistance=24;
 view.scene.children.filter(o=>o.isHemisphereLight).forEach(o=>{o.color.set('#d9f4ff');o.groundColor.set('#183044');o.intensity=1.6;});view.scene.children.filter(o=>o.isDirectionalLight).forEach((o,i)=>{o.color.set(i?'#93c4d8':'#fff1dd');o.intensity=i?1.1:2.5;});
}

export function mountFoundations(container){
 const hadIntuitive=document.body.classList.contains('intuitive-edition');document.body.classList.add('intuitive-edition');
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='./foundations.css';document.head.append(sheet);container.classList.add('foundations-lab');
 container.innerHTML=`<div class="foundation-toolbar"><div class="foundation-source-tabs" role="tablist" aria-label="选择带电源"><button data-model="point" role="tab" aria-selected="true" class="active">点电荷</button><button data-model="line" role="tab" aria-selected="false">无限长直线</button><button data-model="plane" role="tab" aria-selected="false">无限大平面</button></div><button class="foundation-finite" aria-pressed="false">看有限物体</button></div>
 <div class="foundation-plate"><div class="foundation-stage" aria-label="可旋转的三维电场"></div><div class="foundation-top"><div><strong class="foundation-instruction">拖动金色 P，测这里的场与力。</strong><span class="foundation-condition">箭头均匀采样于空间位置</span></div><button class="foundation-home" title="恢复三维视角">复位视角</button></div>
 <div class="foundation-source-tag"><span class="foundation-source-value"></span><small>拖红环，改变电量</small><button class="foundation-sign" title="改变源电荷正负">＋ → −</button></div>
 <div class="foundation-probe-tag"><b>试探 q <span class="foundation-q-label">＋e</span></b><span class="foundation-local-E">场强 E <strong></strong></span><span class="foundation-local-F">受力 F <strong></strong></span><small class="foundation-force-note"></small></div>
 <div class="foundation-size-tag" hidden>↔ <span></span><small>拖边缘，改变尺寸</small></div><div class="foundation-distance-tag"><span>拉近 / 拉远</span><small></small></div><div class="foundation-hint"><span>拖空白旋转 · 滚轮缩放</span><span class="foundation-distance"></span></div>
 <div class="foundation-scale-key"><span><i class="foundation-E-key"></i>电场 E</span><span><i class="foundation-F-key"></i>电荷受力 F</span><span>长、粗表示场强大小（压缩尺度）</span></div></div>
 <div class="foundation-bottom"><div class="foundation-charge-switch" aria-label="试探电荷"><span>把 P 换成</span><button data-q="1" class="active" aria-pressed="true">＋e</button><button data-q="2" aria-pressed="false">＋2e</button><button data-q="-1" aria-pressed="false">−e</button></div><button class="foundation-double-distance">距离 ×2</button><button class="foundation-reset">重置</button></div>
 <div class="foundation-comparison" hidden><span>实际场强 <strong id="foundation-finite"></strong></span><span>理想场强 <strong id="foundation-ideal"></strong></span><span>矢量相对差异 <strong id="foundation-error"></strong></span></div>
 <div class="foundation-demonstration" hidden><span></span><button>解除等距约束</button></div><a class="foundation-share" target="_blank" rel="noopener">展开当前实验 ↗</a><small class="foundation-units">1 pC = 10⁻¹² C · 1 fN = 10⁻¹⁵ N · E 的单位 N/C</small><output class="foundation-feedback" aria-live="polite">同一个位置：换试探电荷，电场 E 不变，受力 F 改变。</output>`;
 const $=s=>container.querySelector(s),view=new FieldScene($('.foundation-stage'),{extent:6});tint(view);
 const canvas=view.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','三维电场。拖动金色 P 测场，拖红色圆环改电量，拖空白旋转。方向键移动 P，Shift 加上下方向键改变深度。');
 let lockedRadius=null;let model='point',finite=false,strength=SOURCE_DEFAULTS.point,q=1,probe=[...defaults.point],size=4,drag=null,reading,sourceRing,dragAnchor,initialStrength,initialSize,dragStartedY,initialProbe,distanceAxis,distanceOrigin,initialDistance;
 let fieldSamples=[],sourceHandle=[0,0,0],sizeHandle=[2,0,0],distanceHandle=[1,0,0],pulseStart=performance.now(),lastPublished='';
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),dragPlane=new THREE.Plane(),hit=new THREE.Vector3();
 function home(){view.camera.position.set(7.8,5.4,9.8);view.controls.target.set(0,.15,0);view.camera.lookAt(view.controls.target);view.controls.update();}
 function source(){return {model,finite,strength,size:size*1e-3};}
 function closest(p){return model==='point'?[0,0,0]:model==='line'?[p[0],0,0]:[p[0],0,p[2]];}
 function safeProbe(p){
  p=p.map(n=>clamp(n,-5.4,5.4));
  const distance=sourceDistance(model,p),minimum=model==='plane'?.1:.4;
  if(distance<minimum){if(model==='plane')p[1]=(p[1]>=0?1:-1)*minimum;else if(model==='line'){const a=Math.atan2(p[2],p[1]);p[1]=minimum*Math.cos(a);p[2]=minimum*Math.sin(a);}else{const r=mag(p);if(!r)p[0]=minimum;else p=p.map(n=>n*minimum/r);}}
  if(finite&&model==='point'&&Math.hypot(p[1],p[2])<.35&&Math.abs(p[0])<=size/2+.12)p[1]=.35;
  return p;
 }
 function configureNames(){
  $('.foundation-condition').textContent=finite?(model==='plane'?'均匀带电圆盘 · 半径 R':'均匀带电线段 · 长度 L'):(model==='point'?'点电荷 · E 沿半径方向':model==='line'?'直线向两端无限延伸 · E 垂直直线':'平面无限延伸 · E 垂直平面、处处等强');
  $('.foundation-finite').textContent=finite?'返回理想源':'看有限物体';$('.foundation-finite').setAttribute('aria-pressed',String(finite));
  $('.foundation-comparison').hidden=!finite;$('.foundation-size-tag').hidden=!finite;
 }
 function drawSource(){
  view.clearLayer('source');view.clearLayer('sourceLabels');const color=strength>=0?C.coral:C.blue;
  sourceHandle=[0,0,0];
  if(model==='point'&&!finite){ball(view,[0,0,0],.27,color,'source','strength');sourceRing=halo(view,[0,0,0],.54,color,'source','strength');}
  else if(model!=='plane'){
   const length=finite?size:18,rod=new THREE.Mesh(new THREE.CylinderGeometry(.047,.047,length,24),new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.1,roughness:.3,metalness:.3}));rod.rotation.z=Math.PI/2;rod.userData.drag='strength';view.layer('source').add(rod);
   sourceRing=halo(view,[0,0,0],.35,color,'source','strength');ball(view,[0,0,0],.14,color,'source','strength');
   const interval=finite?Math.max(.3,size/12):1;for(let x=-(finite?size/2:7)+interval/2;x<(finite?size/2:7);x+=interval)label(view,strength>=0?'+':'−',[x,.13,0],color,'sourceLabels',.23);
   if(!finite){for(const sign of [-1,1]){label(view,'∞',[sign*5.2,.34,0],C.dim,'sourceLabels',.5);view.dashedLine([[sign*4,0,0],[sign*8.5,0,0]],color,'source',.5);}}
  }else{
   const geometry=finite?new THREE.CircleGeometry(size,96):new THREE.PlaneGeometry(17,17);
   const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false});const plane=new THREE.Mesh(geometry,material);plane.rotation.x=-Math.PI/2;view.layer('source').add(plane);
   if(finite){const edge=Array.from({length:97},(_,i)=>[size*Math.cos(i/96*Math.PI*2),0,size*Math.sin(i/96*Math.PI*2)]);view.line(edge,color,'source',.65);}
   const limit=finite?Math.min(size,7):7,step=finite?Math.max(.6,size/5):1.5;
   for(let x=-limit;x<=limit;x+=step)for(let z=-limit;z<=limit;z+=step){if(finite&&x*x+z*z>size*size*.95)continue;label(view,strength>=0?'+':'−',[x,.025,z],color,'sourceLabels',.18);}
   if(!finite)for(const x of [-4.5,4.5])for(const z of [-4.5,4.5])label(view,'⋯',[x,.05,z],C.dim,'sourceLabels',.5);
   sourceRing=halo(view,[0,.03,0],.36,color,'source','strength');sourceRing.rotation.x=-Math.PI/2;ball(view,[0,.05,0],.13,color,'source','strength');
  }
  if(finite){
   sizeHandle=model==='plane'?[size,0,0]:[size/2,0,0];ball(view,sizeHandle,.11,C.ink,'source','size');const ring=halo(view,sizeHandle,.21,C.ink,'source','size');ring.userData.billboard=true;
   if(model==='plane')view.dashedLine([[0,.03,0],sizeHandle],C.dim,'source',.65);
  }
 }
 function drawField(){
  view.clearLayer('field');fieldSamples=[];const points=[];
  const coords=[-3.2,-1.6,0,1.6,3.2];
  for(const x of coords)for(const y of coords)for(const z of coords){
   const p=[x,y,z];if(sourceDistance(model,p)<.7)continue;
   if(finite&&model==='point'&&Math.hypot(y,z)<.45&&Math.abs(x)<size/2+.2)continue;
   const E=sourceField(source(),p.map(n=>n*.001),finite&&model==='plane'?{radial:16,angular:64}:undefined),strength=mag(E);if(!Number.isFinite(strength)||!strength)continue;
   points.push({p,E});fieldSamples.push({p:p.map(n=>n*.001),E});
  }
  const count=points.length,stems=new THREE.InstancedMesh(new THREE.CylinderGeometry(1,1,1,7),new THREE.MeshBasicMaterial({color:C.teal,transparent:true,opacity:.54}),count),tips=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,8),new THREE.MeshBasicMaterial({color:C.teal,transparent:true,opacity:.68}),count),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0);
  points.forEach(({p,E},i)=>{
   const direction=v(E).normalize(),{length:raw,width}=fieldGlyph(mag(E)),length=Math.min(.9,raw),head=Math.min(.15,length*.32),stem=length-head*.75,origin=v(p);
   rotation.setFromUnitVectors(Y,direction);matrix.compose(origin.clone().addScaledVector(direction,stem/2),rotation,new THREE.Vector3(width,stem,width));stems.setMatrixAt(i,matrix);
   matrix.compose(origin.clone().addScaledVector(direction,length-head/2),rotation,new THREE.Vector3(Math.max(.033,width*2.9),head,Math.max(.033,width*2.9)));tips.setMatrixAt(i,matrix);
  });view.layer('field').add(stems,tips);canvas.dataset.fieldSamples=JSON.stringify(fieldSamples);canvas.dataset.sampling='regular XYZ';
 }
 function drawProbe(){
  view.clearLayer('probe');view.clearLayer('guides');probe=safeProbe(probe);const pSI=probe.map(n=>n*.001);reading=sourceReading(source(),pSI,q*e);
  const mesh=ball(view,probe,.135,C.gold,'probe','probe');mesh.userData.pickable=true;const ring=halo(view,probe,.23,C.gold,'probe','probe');ring.userData.billboard=true;
  const near=closest(probe);view.dashedLine([near,probe],C.dim,'guides',.7);
  const E=v(reading.E),cameraForward=new THREE.Vector3();view.camera.getWorldDirection(cameraForward);let side=new THREE.Vector3().crossVectors(E,cameraForward);if(side.length()<1e-8)side.set(1,0,0);side.normalize().multiplyScalar(.085);
  const middle=v(near).lerp(v(probe),.5);distanceHandle=middle.clone().add(side.clone().normalize().multiplyScalar(.55)).toArray();
  view.dashedLine([middle.toArray(),distanceHandle],C.dim,'guides',.55);const distanceGrip=halo(view,distanceHandle,.135,C.gold,'guides','distance');distanceGrip.userData.billboard=true;ball(view,distanceHandle,.047,C.gold,'guides','distance');
  const distanceHit=new THREE.Mesh(new THREE.SphereGeometry(.21,16,12),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));distanceHit.position.copy(v(distanceHandle));distanceHit.userData.drag='distance';view.layer('guides').add(distanceHit);
  const Epos=v(probe).add(side),Fpos=v(probe).sub(side),a=glyph(view,Epos.toArray(),reading.E,C.teal,'probe',1,1),b=glyph(view,Fpos.toArray(),reading.F.map(n=>n/e),C.gold,'probe',1,1);
  if(a)label(view,'E',v(a.tip).add(side.clone().multiplyScalar(2)).toArray(),C.teal,'probe',.31);if(b)label(view,'F',v(b.tip).sub(side.clone().multiplyScalar(2)).toArray(),C.gold,'probe',.31);
  $('.foundation-local-E strong').textContent=magnitude(reading.Emag)+' N/C';$('.foundation-local-F strong').textContent=magnitude(reading.Fmag*1e15)+' fN';$('.foundation-q-label').textContent=q<0?'−e':q===2?'＋2e':'＋e';$('.foundation-force-note').textContent=q<0?'负电荷：F 与 E 反向':'正电荷：F 与 E 同向';
  $('.foundation-distance').textContent=(model==='point'?'r':model==='line'?'到直线 ρ':'到平面 d')+' = '+(reading.distance*1000).toFixed(2)+' mm';
  $('.foundation-distance-tag small').textContent=(reading.distance*1000).toFixed(2)+' mm';
  const unit=model==='point'?' pC':model==='line'?' nC/m':' nC/m²',factor=model==='point'?1e12:1e9,symbol=model==='point'?'源 Q':model==='line'?'线密度 λ':'面密度 σ';
  $('.foundation-source-value').textContent=symbol+' = '+(strength*factor).toFixed(model==='plane'?1:2)+unit;$('.foundation-source-tag').classList.toggle('negative',strength<0);$('.foundation-sign').textContent=strength>=0?'＋ → −':'− → ＋';$('.foundation-source-tag small').textContent=strength>=0?'拖红环，改变电量':'拖蓝环，改变电量';
  $('.foundation-size-tag span').textContent=(model==='plane'?'R = ':'L = ')+size.toFixed(2)+' mm';
  if(finite){$('#foundation-finite').textContent=magnitude(reading.Emag)+' V/m';$('#foundation-ideal').textContent=magnitude(mag(reading.ideal))+' V/m';$('#foundation-error').textContent=(100*reading.error).toFixed(1)+' %';}
  const state={unit:'foundations',model,finite,source:source(),Q:model==='point'?strength:null,strength,q:q*e,probe:pSI,distance:reading.distance,E:reading.E,F:reading.F,Emag:reading.Emag,Fmag:reading.Fmag,idealE:reading.ideal,error:reading.error};
  const share=new URL('foundations.html',location.href);for(const [k,value]of Object.entries({model,q,Q:strength,finite:finite?1:0,size,px:probe[0],py:probe[1],pz:probe[2]}))share.searchParams.set(k,String(value));$('.foundation-share').href=share.href;
  canvas.dataset.reading=JSON.stringify(state);canvas.dataset.probe=JSON.stringify(probe);canvas.dataset.probeCharge=q;container.dataset.labState=JSON.stringify(state);
  const serialized=JSON.stringify(state);if(lastPublished!==serialized){container.dispatchEvent(new CustomEvent('lab-state',{bubbles:true,detail:state}));lastPublished=serialized;}
 }
 function draw(){configureNames();drawSource();drawField();drawProbe();}
 function feedback(text){$('.foundation-feedback').textContent=text;}
 function project(p,element,dx=0,dy=0){
  const rect=canvas.getBoundingClientRect(),s=v(p).project(view.camera),width=rect.width,height=rect.height,ew=element.offsetWidth,eh=element.offsetHeight;
  element.style.left=clamp((s.x+1)*width/2+dx,8,Math.max(8,width-ew-8))+'px';element.style.top=clamp((1-s.y)*height/2+dy,70,Math.max(70,height-eh-75))+'px';
 }
 function cast(ev){const rect=canvas.getBoundingClientRect();mouse.set((ev.clientX-rect.left)/rect.width*2-1,1-(ev.clientY-rect.top)/rect.height*2);ray.setFromCamera(mouse,view.camera);}
 function picked(){const list=[...view.layer('probe').children,...view.layer('source').children,...view.layer('guides').children];return ray.intersectObjects(list,true).find(h=>h.object.userData.drag)?.object;}
 function down(ev){
  if(ev.button!==0)return;cast(ev);const object=picked();if(!object)return;
  drag=object.userData.drag;dragStartedY=ev.clientY;initialStrength=strength;initialSize=size;
  const normal=new THREE.Vector3();view.camera.getWorldDirection(normal);dragAnchor=v(drag==='probe'?probe:drag==='size'?sizeHandle:drag==='distance'?distanceHandle:sourceHandle);dragPlane.setFromNormalAndCoplanarPoint(normal,dragAnchor);
  if(drag==='distance'){lockedRadius=null;$('.foundation-demonstration').hidden=true;initialProbe=[...probe];distanceOrigin=v(closest(probe));distanceAxis=v(probe).sub(distanceOrigin).normalize();initialDistance=sourceDistance(model,probe);}
  view.controls.enabled=false;canvas.setPointerCapture(ev.pointerId);ev.stopImmediatePropagation();canvas.style.cursor='grabbing';pulseStart=-Infinity;
 }
 function move(ev){
  cast(ev);if(!drag){canvas.style.cursor=picked()?'grab':'default';return;}
  if(drag==='strength'){
   const factor=Math.exp((dragStartedY-ev.clientY)/105),base=SOURCE_DEFAULTS[model];strength=Math.sign(initialStrength)*clamp(Math.abs(initialStrength)*factor,base*.12,base*4);
   drawSource();drawField();drawProbe();feedback('源电量改变：同一位置的 E 和 F 一起改变。');
  }else if(ray.ray.intersectPlane(dragPlane,hit)){
   if(drag==='probe'){probe=safeProbe(hit.toArray());if(lockedRadius)probe=v(probe).normalize().multiplyScalar(lockedRadius).toArray();drawProbe();feedback(lockedRadius?'r 保持不变：E、F 大小相同，方向跟着源与 P 的连线转动。':finite?'移动 P：比较真实物体和理想模型在这里的电场。':model==='point'?'离点电荷越远，E 越弱；同一半径的场强相同。':model==='line'?'沿线方向移动，E 不变；离直线越远，E 越弱。':'在同一侧任意移动，E 的大小和方向都不变。跨过平面，E 反向。');}
   else if(drag==='distance'){
    const minimum=model==='plane'?.1:.4,distance=clamp(initialDistance+2*hit.clone().sub(dragAnchor).dot(distanceAxis),minimum,5.4);probe=safeProbe(distanceOrigin.clone().addScaledVector(distanceAxis,distance).toArray());drawProbe();feedback(finite?'只改到源的距离，比较实际电场与理想模型的差异。':model==='plane'?'只改垂直距离：同一侧 E 的大小、方向都不变。':'只改到源的距离：方向保持不变，直接比较 E 和 F 的大小。');
   }else{
    size=clamp(Math.abs(hit.x)*(model==='plane'?1:2),.3,14);if(Math.abs(size-initialSize)>.001){probe=safeProbe(probe);drawSource();drawField();drawProbe();feedback(model==='point'?'保持总电量 Q。棒越短，相对观察距离越小，越接近点电荷。':model==='line'?'保持线密度 λ。把线段拉长，P 远离端部后，场趋近垂直直线。':'保持面密度 σ。把圆盘扩大，P 远离边缘后，场趋近垂直平面。');}
   }
  }
 }
 function up(){if(!drag)return;drag=null;view.controls.enabled=true;canvas.style.cursor='default';}
 canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 function key(ev){
  let p=[...probe],step=ev.altKey?.05:.2;
  if(ev.key==='ArrowLeft')p[0]-=step;else if(ev.key==='ArrowRight')p[0]+=step;else if(ev.key==='ArrowUp')p[ev.shiftKey?2:1]+=step;else if(ev.key==='ArrowDown')p[ev.shiftKey?2:1]-=step;else return;
  ev.preventDefault();probe=safeProbe(p);if(lockedRadius)probe=v(probe).normalize().multiplyScalar(lockedRadius).toArray();drawProbe();
 }canvas.addEventListener('keydown',key);
 container.querySelectorAll('[data-model]').forEach(button=>button.onclick=()=>{
  lockedRadius=null;$('.foundation-demonstration').hidden=true;model=button.dataset.model;strength=SOURCE_DEFAULTS[model];probe=[...defaults[model]];finite=false;size=model==='point'?1.4:model==='line'?4:3;
  container.querySelectorAll('[data-model]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-selected',String(b===button));});home();draw();
  feedback(model==='point'?'拖动 P 改变距离；再换电荷，比较 E 和 F。':model==='line'?'沿直线移动 P，或远离直线：哪一种移动会改变 E？':'在平面同一侧移动 P：箭头等长、垂直；换到另一侧，方向反转。');
 });
 container.querySelectorAll('[data-q]').forEach(button=>button.onclick=()=>{q=Number(button.dataset.q);container.querySelectorAll('[data-q]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});drawProbe();feedback(q===2?'P 不动，换成 ＋2e：E 不变，F 加倍。':q<0?'P 不动，换成 −e：E 不变，F 反向。':'P 不动，换回 ＋e：F 与 E 同向。');});
 $('.foundation-finite').onclick=()=>{lockedRadius=null;$('.foundation-demonstration').hidden=true;finite=!finite;size=model==='point'?1.4:model==='line'?4:3;if(finite&&model==='plane')probe=[0,probe[1],0];probe=safeProbe(probe);draw();feedback(finite?(model==='point'?'拖白色端点，把短棒拉长或缩短；总电量不变。':model==='line'?'拖白色端点，改变真实线段长度；观察端部附近的场。':'P 先放在中心轴。拉近 P 或扩大圆盘；也可自由拖 P 看边缘附近的场。'):'回到理想模型，比较距离变化怎样影响 E。');};
 $('.foundation-sign').onclick=()=>{strength=-strength;drawSource();drawField();drawProbe();feedback('源电量变号，整个空间的 E 反向；P 的受力方向随之改变。');};
 $('.foundation-double-distance').onclick=()=>{lockedRadius=null;$('.foundation-demonstration').hidden=true;
  const before=reading.Emag,from=closest(probe),candidate=probe.map((n,i)=>from[i]+2*(n-from[i]));
  if(candidate.some(n=>Math.abs(n)>5.4)){feedback('P 已靠近画面边界。把它拉近，再试距离加倍。');return;}
  probe=safeProbe(candidate);drawProbe();const ratio=before?reading.Emag/before:0;
  feedback('距离加倍：E 为刚才的 '+(finite?ratio.toFixed(3):model==='point'?'1/4':model==='line'?'1/2':'1')+'；F 同比例变化。');
 };
 $('.foundation-reset').onclick=()=>{lockedRadius=null;$('.foundation-demonstration').hidden=true;strength=SOURCE_DEFAULTS[model];probe=[...defaults[model]];q=1;container.querySelectorAll('[data-q]').forEach(b=>{b.classList.toggle('active',b.dataset.q==='1');b.setAttribute('aria-pressed',String(b.dataset.q==='1'));});home();draw();feedback('拖金色 P 改距离，拖源电荷的圆环改电量。');};$('.foundation-home').onclick=home;
 const params=new URLSearchParams(location.search);if(['point','line','plane'].includes(params.get('model'))){model=params.get('model');strength=SOURCE_DEFAULTS[model];const value=Number(params.get('Q'));if(params.has('Q')&&Number.isFinite(value)&&Math.abs(value)<1e-6)strength=value;q=[-1,1,2].includes(Number(params.get('q')))?Number(params.get('q')):1;finite=params.get('finite')==='1';const rawSize=Number(params.get('size'));if(rawSize>=.5&&rawSize<=18)size=rawSize;const p=['px','py','pz'].map(k=>Number(params.get(k)));if(p.every(Number.isFinite)&&p.some(n=>Math.abs(n)>.01))probe=safeProbe(p);container.querySelectorAll('[data-model]').forEach(b=>{b.classList.toggle('active',b.dataset.model===model);b.setAttribute('aria-selected',String(b.dataset.model===model));});container.querySelectorAll('[data-q]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.q)===q);b.setAttribute('aria-pressed',String(Number(b.dataset.q)===q));});}
 const demo=event=>{const kind=event.detail?.kind;if(!['directions','distance','charge'].includes(kind))return;container.querySelector('[data-model=point]').click();container.querySelector('[data-q="1"]').click();if(kind==='directions'){lockedRadius=mag(probe);$('.foundation-demonstration').hidden=false;$('.foundation-demonstration span').textContent='等距约束：拖 P 换方位，r 保持不变';feedback('保持相同距离，拖 P 比较受力大小与方向。这里由外部操作移动，不是自由飞行。');}else feedback(kind==='distance'?'先猜两倍远会怎样，再拖距离环读取 E、F。':'先别移动 P，点击 +2e 或 −e，比较 E 与 F。');};container.addEventListener('foundation-demonstration',demo);$('.foundation-demonstration button').onclick=()=>{lockedRadius=null;$('.foundation-demonstration').hidden=true;feedback('可以自由改变距离和方向。');};
 home();draw();
 view.frameFn=now=>{
  for(const name of ['source','probe','guides'])view.layer(name).children.forEach(object=>{if(object.userData.billboard)object.quaternion.copy(view.camera.quaternion);});
  if(sourceRing&&pulseStart!==-Infinity&&now-pulseStart<6500)sourceRing.material.opacity=.5+.2*Math.sin(now/700);
  project(probe,$('.foundation-probe-tag'),18,-108);project(sourceHandle,$('.foundation-source-tag'),-137,32);project(distanceHandle,$('.foundation-distance-tag'),-84,-38);if(finite)project(sizeHandle,$('.foundation-size-tag'),14,12);
  const screen=v(probe).project(view.camera),handle=v(sizeHandle).project(view.camera),sourceScreen=v(sourceHandle).project(view.camera),distanceScreen=v(distanceHandle).project(view.camera);canvas.dataset.probeScreen=JSON.stringify([screen.x,screen.y]);canvas.dataset.sizeScreen=JSON.stringify([handle.x,handle.y]);canvas.dataset.sourceScreen=JSON.stringify([sourceScreen.x,sourceScreen.y]);canvas.dataset.distanceScreen=JSON.stringify([distanceScreen.x,distanceScreen.y]);canvas.dataset.camera=JSON.stringify(view.camera.position.toArray());
 };
 return()=>{container.removeEventListener('foundation-demonstration',demo);canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('keydown',key);view.dispose();sheet.remove();container.classList.remove('foundations-lab');if(!hadIntuitive)document.body.classList.remove('intuitive-edition');};
}
