import {FieldScene,THREE} from './scene.js';
import {applyAcademicScene} from './academic-scene.js';
import {createDimensionView} from './dimension-view.js';
import {PATH_SOURCES,makeRoute,routePoint} from './paths-physics.js';
import {POTENTIAL_ENDPOINTS,potentialField,potentialPathExercise,potentialContours} from './potential-path-physics.js';
const fmt=n=>Number(n.toFixed(3)).toString();
export function mountPotentialPaths(container){
 container.classList.add('potential-path-lab');
 container.innerHTML=`<section class="paths-lab"><div class="paths-picture potential-picture"><div class="potential-models" role="group" aria-label="选择电势模型"><button data-potential-model="plates" aria-pressed="true">① 平行板 · 先理解</button><button data-potential-model="spheres" aria-pressed="false">② 双带电球 · 再验证</button></div><div class="potential-readings"><div>A 点电势 <strong id="potential-va"></strong></div><div>B 点电势 <strong id="potential-vb"></strong></div><div class="potential-difference">电势差 U<sub>AB</sub> = V<sub>A</sub> − V<sub>B</sub><strong id="potential-delta"></strong></div></div><div class="potential-stage"><button class="potential-point" data-path-drag="A" disabled aria-label="固定 A 点">A</button><button class="potential-point" data-path-drag="B" disabled aria-label="固定 B 点">B</button><button class="potential-handle" data-path-drag="handle" aria-label="拖动改变路径">↕<span>拖我改变路径</span></button></div><div class="potential-legend"><span class="contour-key">细线：等势线（标值单位 V）</span><span class="straight-key">蓝色虚线：直路</span><span class="curve-key">金色实线：可变路径</span></div><p id="potential-change" role="status">A、B 固定。只拖金色柄，观察三个读数。</p></div><details class="potential-model-note"><summary>模型与进一步核验</summary><p id="potential-model-note"></p><p id="potential-integral"></p><p>等势线是 z=0 截面与等势面的交线，不是电场线。图中位置单位 mm；颜色从蓝到暖色表示电势从低到高，不表示力的大小。定量层先求电势差，做功可再用 W=qU_AB 联系。</p></details></section>`;
 const $=s=>container.querySelector(s),stage=$('.potential-stage'),view=new FieldScene(stage,{extent:6});applyAcademicScene(view);view.scene.fog.near=40;view.scene.fog.far=80;view.controls.enablePan=false;
 view.camera.position.set(4,3,12);view.controls.target.set(0,0,0);view.controls.update();
 const projection=createDimensionView({host:container,stage,getCamera:()=>view.camera,setCamera:c=>view.camera=c,controls:view.controls});
 let model='plates',A=[...POTENTIAL_ENDPOINTS.A],B=[...POTENTIAL_ENDPOINTS.B],handle=[...POTENTIAL_ENDPOINTS.handle],dragging=false,result=null;
 function drawMap(){
  view.clearLayer('potential-map');view.clearLayer('potential-contours');view.clearLayer('potential-sources');
  const mapCanvas=document.createElement('canvas');mapCanvas.width=320;mapCanvas.height=208;const ctx=mapCanvas.getContext('2d'),pixels=ctx.createImageData(320,208);
  for(let y=0;y<208;y++)for(let x=0;x<320;x++){const v=potentialField([-4+8*x/319,2.6-5.2*y/207,0],model).V,t=Math.max(0,Math.min(1,model==='plates'?v/8:(v+1.5)/3)),low=[221,235,244],high=[249,223,188],i=4*(y*320+x);for(let c=0;c<3;c++)pixels.data[i+c]=low[c]+(high[c]-low[c])*t;pixels.data[i+3]=255;}
  ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(mapCanvas);texture.colorSpace=THREE.SRGBColorSpace;
  const map=new THREE.Mesh(new THREE.PlaneGeometry(8,5.2),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));map.position.z=-.04;view.layer('potential-map').add(map);
  const levels=model==='plates'?[1,2,3,4,5,6,7]:[-2,-1.5,-1,-.5,0,.5,1,1.5,2];
  for(const contour of potentialContours(model,levels)){
   const points=contour.segments.flat().map(p=>new THREE.Vector3(p[0],p[1],.005));const geometry=new THREE.BufferGeometry().setFromPoints(points),lines=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:contour.level===0?'#425b69':'#83989b',transparent:true,opacity:.8}));view.layer('potential-contours').add(lines);
   const segment=model==='plates'?null:contour.segments.find(s=>Math.abs(s[0][0])<3.5&&Math.abs(s[0][1])<2.1&&PATH_SOURCES.every(q=>Math.hypot(s[0][0]-q.pos[0],s[0][1]-q.pos[1])>.6));
   if(model==='plates')view.label(contour.level+' V',[4-contour.level,-2.3,.03],'#425b69','potential-contours',.34);
   else if(segment&&[-1,0,1,2].includes(contour.level))view.label(contour.level+' V',[segment[0][0],segment[0][1],.06],'#344f61','potential-contours',.31);
  }
  if(model==='plates'){
   for(const [x,v,color] of [[-4,8,'#b66e42'],[4,0,'#497a9a']]){const plate=new THREE.Mesh(new THREE.BoxGeometry(.09,5.2,1),new THREE.MeshStandardMaterial({color,roughness:.7}));plate.position.set(x,0,-.5);view.layer('potential-sources').add(plate);view.label(v+' V 板',[x,2.85,0],color,'potential-sources',.32);}
  }else PATH_SOURCES.forEach(s=>view.charge({...s,label:s.Q>0?'+0.30 pC':'−0.20 pC'},'potential-sources'));
  container.dataset.contourLevels=JSON.stringify(levels);
 }
 function update(){
  result=potentialPathExercise({A,B,handle,model});view.clearLayer('potential-routes');
  view.dashedLine([A.map((v,i)=>v+(i===2?.06:0)),B.map((v,i)=>v+(i===2?.06:0))],'#2d7895','potential-routes',.95);
  const route=makeRoute(A,B,handle),points=Array.from({length:81},(_,i)=>new THREE.Vector3(...routePoint(route,i/80)).add(new THREE.Vector3(0,0,.08))),curve=new THREE.CatmullRomCurve3(points),tube=new THREE.Mesh(new THREE.TubeGeometry(curve,120,.026,8,false),new THREE.MeshBasicMaterial({color:'#ae701c'}));view.layer('potential-routes').add(tube);
  for(const [name,p,value]of [['A',A,result.values[0]],['B',B,result.values[1]]]){$(`[data-path-drag="${name}"]`).textContent=name;view.label(`${name}：${fmt(value)} V`,[p[0],p[1]-.42,.12],'#273f50','potential-routes',.32);}
  $('#potential-va').textContent=fmt(result.values[0])+' V';$('#potential-vb').textContent=fmt(result.values[1])+' V';$('#potential-delta').textContent=fmt(result.answer)+' V';
  $('#potential-change').textContent=`路径长 ${fmt(result.curvedLength)} mm · A、B 固定，电势差仍为 ${fmt(result.answer)} V`;
  $('#potential-model-note').textContent=model==='plates'?'理想平行板：板间距 8 mm，左板 8 V、右板 0 V，忽略边缘效应。A、B 及路径均在板间；等势线等间隔。':'两颗固定均匀带电绝缘球：+0.30 pC、−0.20 pC，半径 0.32 mm；无穷远取 V=0。等势线由数值采样绘制，在球附近弯曲并变密。';
  $('#potential-integral').textContent=`独立计算 ∫A→B E·dℓ：直路 ${fmt(result.direct)} V；弯路 ${fmt(result.curved)} V。与 V_A−V_B 的差 ${result.error.toExponential(2)} V。`;
  Object.assign(container.dataset,{pathMode:'routes',pathModel:model,pathA:JSON.stringify(A),pathB:JSON.stringify(B),pathHandle:JSON.stringify(handle),pathCharge:'1',pathPotentialA:String(result.values[0]),pathPotentialB:String(result.values[1]),pathDelta:String(result.answer),pathIntegral:String(result.curved),pathLength:String(result.curvedLength)});
 }
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3(),button=$('[data-path-drag="handle"]');
 function move(e){if(!dragging)return;const rect=stage.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),view.camera);if(ray.ray.intersectPlane(plane,hit)){handle=[Math.max(-3,Math.min(3,hit.x)),Math.max(-1.9,Math.min(1.9,hit.y)),0];update();}}
 button.onpointerdown=e=>{dragging=true;view.controls.enabled=false;button.setPointerCapture(e.pointerId);e.stopPropagation();e.preventDefault();};button.onpointermove=move;button.onpointerup=button.onpointercancel=()=>{dragging=false;view.controls.enabled=true;};
 button.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const i=e.key==='ArrowLeft'||e.key==='ArrowRight'?0:1;handle[i]=Math.max(i===0?-3:-1.9,Math.min(i===0?3:1.9,handle[i]+(['ArrowLeft','ArrowDown'].includes(e.key)?-.15:.15)));update();};
 container.querySelectorAll('[data-potential-model]').forEach(b=>b.onclick=()=>{if(b.dataset.potentialModel===model)return;model=b.dataset.potentialModel;handle=[...POTENTIAL_ENDPOINTS.handle];container.querySelectorAll('[data-potential-model]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));drawMap();update();container.dispatchEvent(new CustomEvent('potential-model-changed'));});
 view.frameFn=()=>{projection.update();const r=stage.getBoundingClientRect();for(const [name,p]of [['A',A],['B',B],['handle',handle]]){const v=new THREE.Vector3(...p).project(view.camera),el=$(`[data-path-drag="${name}"]`);el.style.left=(v.x+1)*r.width/2+'px';el.style.top=(1-v.y)*r.height/2+'px';}};
 drawMap();update();
 return()=>{projection.dispose();view.dispose();container.classList.remove('potential-path-lab');};
}
