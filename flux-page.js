import {createDimensionView} from './dimension-view.js';
import {FieldScene,THREE} from './scene.js';
import {CONSTANTS,fieldAt} from './physics.js';
import {buildFluxLine} from './flux-journey.js';
import {fluxSurfacePoint,fluxSurfacePatch,fluxSurfaceReading} from './flux-surface-physics.js';

const Q=.1,BALL=.42,UNIT=Q*1e-12/CONSTANTS.epsilon0;
const CYAN='#76ccd8',GOLD='#f2c98c',BLUE='#8bd8ff';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(v,n=3)=>(Math.abs(v)<.5*10**-n?0:v).toFixed(n);
const signed=(v,n=3)=>Math.abs(v)<.5*10**-n?fmt(0,n):(v>0?'+':'')+fmt(v,n);

export function mountFlux(container,{dimensions=false}={}){
 document.body.classList.add('intuitive-edition');
 if(!document.querySelector('[data-flux-style]')){const s=document.createElement('link');s.rel='stylesheet';s.href=new URL('./flux.css',import.meta.url).href;s.dataset.fluxStyle='';document.head.append(s);}
 container.innerHTML=`<section class="flux-experience flux-intuitive">
  <div class="fx-problem"><strong>看不见里面，能知道净电荷吗？</strong><span>把红球拖进包围面，再拖出来。看整张面上的电场怎样相加。</span></div>
  <div class="fx-plate">
   <div class="stage fx-stage" aria-label="可直接拖动电荷与包围面的三维电通量模型"></div>
   <div class="fx-heading"><span>假想的测量面 · 不挡住电场</span><div class="fx-tools"><button id="flux-sign" aria-label="切换正负电荷">电荷 ＋</button><button id="flux-hide" aria-pressed="false">遮住内部</button><button id="flux-reset" aria-label="恢复电荷位置与空间视角">↺</button></div></div>
   <div class="fx-live" aria-live="polite"><div><span id="flux-enclosed-label">面内净电荷</span><strong id="flux-enclosed">0.000</strong><small>pC</small></div><div class="fx-equals">=</div><div><span>ε₀ × 整个面净通量</span><strong id="flux-inferred">0.000</strong><small>pC</small></div></div>
   <div class="fx-crossings"><span class="fx-entry">● 穿入 −</span><span class="fx-exit">● 穿出 ＋</span><b id="flux-line-summary">同一条场线：穿入，再穿出</b></div>
   <div class="fx-observation"><strong id="flux-status"></strong><span id="flux-line-note"></span></div>
   <div class="fx-gesture"><span><i class="fx-source-dot"></i>拖红球：改变面内电荷</span><span><i class="fx-handle-dot"></i>拖面上金点：拉大 / 压扁</span><small>拖空白旋转 · 滚轮缩放</small></div>
  </div>
  <div class="fx-balance"><div><span>整个面：向外的贡献</span><strong class="fx-exit" id="flux-outward"></strong></div><b>＋</b><div><span>整个面：向内的贡献</span><strong class="fx-entry" id="flux-inward"></strong></div><b>＝</b><div><span>净通量 Φ</span><strong id="flux-total"></strong><small>V·m</small></div></div>
  <p class="fx-meaning" id="flux-meaning">测量整个闭合面上的电场，就能推断内部净电荷。只看某一根线、某一块面，都不够。</p>
  <details class="fx-details"><summary>通量怎么算？模型和数值核验</summary><div class="fx-formula">Φ = ∮ E · n dA = Q<sub>内</sub> / ε₀</div><p>每一小片取电场垂直穿过它的分量，乘这片面积；向外为正，向内为负。对完整闭合面相加，结果只由内部净电荷决定。亮点只是所选场线的交点，不是电荷，也不用于计数。</p><p>红球是半径 0.42 mm、总电荷 ±0.10 pC 的均匀带电绝缘球。包围面是可变形的椭球；拖动在比较一组静电状态。箭头长度随实际 |E| 单调增大，采用压缩尺度以便同时看清强场和弱场。</p><p id="flux-numerics"></p><p>总通量给出净电荷，不能唯一确定里面每颗电荷的位置；零净通量也可能对应等量正、负电荷。高斯定理对任意闭合面成立；由它进一步直接求局部 E，还需利用对称性。</p></details>
 </section>`;
 const $=s=>container.querySelector(s),stage=$('.stage'),scene=new FieldScene(stage,{extent:6});
 scene.academic=false;scene.scene.background.set('#060e18');scene.scene.fog.color.set('#060e18');scene.renderer.setClearColor('#060e18');scene.grid.visible=false;scene.layer('axes').visible=false;scene.controls.enablePan=false;scene.controls.minDistance=7;scene.controls.maxDistance=27;
 const state={pos:[-3.35,.1,0],radii:[2.1,2.1,2.1],sign:1,hidden:false};
 let disposed=false,pending=0,drag=null,reading=null,linePlan=null,handles={},sourceMesh=null,lastDrag=0,inView=true;
 const canvas=scene.renderer.domElement,ray=new THREE.Raycaster(),plane=new THREE.Plane();ray.params.Line.threshold=.1;
 const source=()=>({pos:[...state.pos],Q:Q*state.sign,radius:BALL,id:'Q',label:''});
 function resetView(){scene.cameraMove=null;const mobile=stage.clientWidth<600;scene.camera.fov=mobile?47:38;scene.camera.position.set(mobile?-6.7:-5.7,mobile?4.1:3.7,mobile?12:10.5);scene.camera.up.set(0,1,0);scene.controls.target.set(-.5,.45,0);scene.camera.updateProjectionMatrix();scene.controls.enabled=true;scene.controls.update();}
 function mesh(geometry,color,opacity,pos,layer='surface'){const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1}));m.position.set(...pos);scene.layer(layer).add(m);return m;}
 function vector(p,E,color=CYAN,reference=400,layer='vectors'){
  const mag=Math.hypot(...E);if(!Number.isFinite(mag)||mag<1e-9)return;
  const t=2/Math.PI*Math.atan(mag/reference),length=.19+.65*t,a=scene.arrow(p,E,color,length,layer);a?.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.43+.5*t;}});return a;
 }
 function surfaceGeometry(){
  const [a,b,c]=state.radii,geometry=new THREE.SphereGeometry(1,64,40);geometry.scale(a,b,c);const shell=mesh(geometry,CYAN,.055,[0,0,0]);shell.userData={surface:true};
  for(const u of [-.65,0,.65])scene.line(Array.from({length:97},(_,i)=>fluxSurfacePoint(u,i*Math.PI/48,state.radii)),CYAN,'surface-wire',.27);
  for(let j=0;j<6;j++){const phi=j*Math.PI/6;scene.line(Array.from({length:97},(_,i)=>{const t=i*Math.PI/48;return [a*Math.sin(t)*Math.cos(phi),b*Math.cos(t),c*Math.sin(t)*Math.sin(phi)];}),CYAN,'surface-wire',.23);}
  handles={radius:[a,0,0],shape:[0,b,0]};
  for(const [kind,p] of Object.entries(handles)){const h=mesh(new THREE.SphereGeometry(.11,20,14),GOLD,1,p,'handles');h.userData={handle:kind};const ring=mesh(new THREE.TorusGeometry(.17,.014,6,40),GOLD,.6,p,'handles');ring.quaternion.copy(scene.camera.quaternion);scene.label(kind==='radius'?'拉大 / 缩小':'拉长 / 压扁',p.map((v,i)=>v+(i===1?.36:0)),GOLD,'labels',.25);}
 }
 function fieldGeometry(s){
  for(const u of [-.75,-.25,.25,.75])for(let j=0;j<10;j++){const p=fluxSurfacePatch(u,j*Math.PI/5+(u>.0?.13:0),state.radii,[s]);vector(p.pos,p.E);}
  if(!state.hidden)for(let j=0;j<14;j++){const u=1-2*(j+.5)/14,phi=j*Math.PI*(3-Math.sqrt(5)),v=[Math.sqrt(1-u*u)*Math.cos(phi),u,Math.sqrt(1-u*u)*Math.sin(phi)],p=s.pos.map((x,i)=>x+.68*v[i]);vector(p,fieldAt(p,[s]).E,'#9fdbe1',1800,'near-source');}
 }
 function selectedLine(s){
  if(state.hidden){linePlan=buildFluxLine(s.pos,BALL,state.radii,state.sign);$('#flux-line-summary').textContent='只测表面电场，推断内部净电荷';$('.fx-entry').parentElement.classList.add('is-hidden-source');stage.dataset.lineCrossings=JSON.stringify(linePlan.crossings.map(h=>h.sign));return;}
  $('.fx-entry').parentElement.classList.remove('is-hidden-source');
  linePlan=buildFluxLine(s.pos,BALL,state.radii,state.sign);const at=t=>linePlan.origin.map((x,i)=>x+linePlan.direction[i]*t),line=scene.line([at(linePlan.start),at(linePlan.end)],'#ffe2a9','field-line',.9);line.material.depthTest=false;line.renderOrder=10;
  const direction=linePlan.direction.map(x=>x*state.sign);for(const f of [.18,.48,.79]){const a=scene.arrow(at(linePlan.start+(linePlan.end-linePlan.start)*f),direction,'#ffe2a9',.29,'field-line');a?.traverse(o=>{if(o.material)o.material.depthTest=false;});}
  for(const hit of linePlan.crossings){const color=hit.sign<0?BLUE:GOLD,m=mesh(new THREE.SphereGeometry(.1,20,12),color,1,hit.point,'crossings');m.material.depthTest=false;m.renderOrder=15;m.userData={crossing:hit};scene.label(hit.sign<0?'穿入 −':'穿出 ＋',hit.point.map((x,i)=>x+(i===1?.35:0)),color,'crossings',.27).renderOrder=16;const n=scene.arrow(hit.point,hit.normal,'#a8b9c3',.45,'crossings');n?.traverse(o=>{if(o.material){o.material.depthTest=false;o.material.transparent=true;o.material.opacity=.65;}});scene.label('n',hit.point.map((x,i)=>x+hit.normal[i]*.58),'#a8b9c3','crossings',.23);}
  const signs=linePlan.crossings.map(h=>h.sign);$('#flux-line-summary').textContent=signs.length===2?'同一条场线：穿入，再穿出':signs.length===1?state.sign>0?'内部正电荷：只有穿出':'内部负电荷：只有穿入':'这条线没有穿过测量面';stage.dataset.lineCrossings=JSON.stringify(signs);
 }
 function updateReadings(){
  const enclosed=reading.enclosedPC,inferred=reading.total*CONSTANTS.epsilon0*1e12,fraction=Math.abs(enclosed/Q),inside=fraction>1-1e-5,outside=fraction<1e-5;
  $('#flux-sign').textContent=state.sign>0?'电荷 ＋':'电荷 −';$('#flux-hide').textContent=state.hidden?'显示内部':inside?'遮住内部':'先移入再遮住';$('#flux-hide').disabled=!inside;$('#flux-hide').setAttribute('aria-pressed',String(state.hidden));
  $('#flux-enclosed-label').textContent=state.hidden?'内部暂时隐藏':'面内净电荷';$('#flux-enclosed').textContent=state.hidden?'?':signed(enclosed);$('#flux-inferred').textContent=signed(inferred);
  $('#flux-outward').textContent=signed(reading.positive,5);$('#flux-inward').textContent=signed(reading.negative,5);$('#flux-total').textContent=signed(reading.total,5);
  $('#flux-status').textContent=outside?'面外电荷改变局部电场，总通量仍为 0':inside?`内部净电荷 ${state.sign>0?'+':'−'}0.10 pC，净通量 ${signed(reading.total,5)} V·m`:`带电球跨过边界，已有 ${fmt(fraction*100,0)}% 的电荷在面内`;
  $('#flux-line-note').textContent=outside?'整张面的穿入、穿出贡献相互抵消。不是每一条线都经过这个面。':inside?'在面内挪动电荷、拉动测量面；只要包住的电荷不变，总和就不变。':'分界不是实体墙；净通量随包住的电荷连续改变。';
  $('#flux-meaning').textContent=state.hidden?`仅测外面的电场积分，就能推断内部净电荷约为 ${signed(inferred)} pC。点“显示内部”核对。`:'测量整个闭合面上的电场，就能推断内部净电荷。只看某一根线、某一块面，都不够。';
  $('#flux-numerics').textContent=`独立曲面积分：${reading.total.toExponential(5)} V·m；独立包围体积得到 Q内/ε₀：${reading.expected.toExponential(5)} V·m；绝对差 ${reading.error.toExponential(2)} V·m。完整球面时包围电荷使用球体相交体积的精确式，椭球时使用独立体积分；穿越边界时存在离散误差。`;
  const detail={unit:'flux',lab:'flux',sourcePosition:[...state.pos],sourceQ:Q*state.sign,radii:[...state.radii],enclosedQ:enclosed,enclosedPC:enclosed,flux:reading.total,expectedFlux:reading.expected,normalizedFlux:reading.total/UNIT,integralError:reading.error,crossings:linePlan.crossings.map(h=>h.sign),inside,outside,hidden:state.hidden};
  Object.assign(container.dataset,{fluxSourcePosition:JSON.stringify(state.pos),fluxEnclosed:String(enclosed),fluxValue:String(reading.total),fluxExpected:String(reading.expected),fluxError:String(reading.error),fluxRadii:JSON.stringify(state.radii),fluxInside:String(inside),fluxOutside:String(outside)});
  Object.assign(stage.dataset,{sourceX:String(state.pos[0]),sourcePosition:JSON.stringify(state.pos),flux:String(reading.total/UNIT),enclosedPC:String(enclosed),radii:JSON.stringify(state.radii)});
  const matched=outside&&linePlan.crossings.length===2&&Math.abs(reading.total/UNIT)<.01;stage.dataset.fluxGoalMatched=String(matched);container.dispatchEvent(new CustomEvent('lab-state',{bubbles:true,detail}));
 }
 function draw(){if(disposed)return;for(const name of ['charges','source-label','surface','surface-wire','handles','labels','vectors','near-source','field-line','crossings','patch'])scene.clearLayer(name);const s=source();surfaceGeometry();fieldGeometry(s);
  if(!state.hidden){sourceMesh=scene.charge(s);const oldLabel=scene.layer('charges').children.at(-1);scene.layer('charges').remove(oldLabel);oldLabel.material.map?.dispose();oldLabel.material.dispose();scene.label(state.sign>0?'+0.10 pC':'−0.10 pC',s.pos.map((v,i)=>v+(i===1?.69:0)),state.sign>0?'#ffab91':'#96dcff','source-label',.29);sourceMesh.userData.dragSource=true;}else{sourceMesh=null;mesh(new THREE.SphereGeometry(1,48,32),'#10283a',.9,[0,0,0],'patch').scale.set(...state.radii);}
  scene.layer('handles').visible=!state.hidden;scene.layer('labels').visible=!state.hidden;
  selectedLine(s);reading=fluxSurfaceReading(state.radii,[s],{nu:64,np:128});updateReadings();
 }
 function setRay(e){const r=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),scene.camera);}
 function start(e){if(e.button>0||state.hidden)return;setRay(e);const hit=ray.intersectObjects([...scene.layer('charges').children,...scene.layer('handles').children],true).find(h=>h.object.userData.dragSource||h.object.userData.handle);if(!hit)return;
  const kind=hit.object.userData.dragSource?'source':hit.object.userData.handle,anchor=kind==='source'?new THREE.Vector3(...state.pos):new THREE.Vector3(...handles[kind]);plane.setFromNormalAndCoplanarPoint(scene.camera.getWorldDirection(new THREE.Vector3()),anchor);const p=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,p))return;
  drag={kind,offset:anchor.clone().sub(p),id:e.pointerId};scene.cameraMove=null;scene.controls.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.preventDefault();e.stopImmediatePropagation();
 }
 function move(e){setRay(e);if(!drag){const hit=ray.intersectObjects([...scene.layer('charges').children,...scene.layer('handles').children],true).some(h=>h.object.userData.dragSource||h.object.userData.handle);canvas.style.cursor=hit?'grab':'default';return;}const p=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,p))return;p.add(drag.offset);
  if(drag.kind==='source')state.pos=p.toArray().map(v=>clamp(v,-4.2,4.2));else if(drag.kind==='radius'){const next=clamp(Math.abs(p.x),1,3.1),factor=next/state.radii[0];state.radii=state.radii.map(v=>clamp(v*factor,.9,3.3));}else state.radii[1]=clamp(Math.abs(p.y),.9,3.3);
  if(performance.now()-lastDrag>45){draw();lastDrag=performance.now();}e.preventDefault();e.stopImmediatePropagation();
 }
 function end(e){if(!drag)return;drag=null;canvas.releasePointerCapture?.(e.pointerId);canvas.style.cursor='grab';scene.controls.enabled=true;draw();e.preventDefault();e.stopImmediatePropagation();}
 canvas.addEventListener('pointerdown',start,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',end,true);canvas.addEventListener('pointercancel',end,true);
 $('#flux-sign').onclick=()=>{state.sign*=-1;draw();};$('#flux-hide').onclick=()=>{state.hidden=!state.hidden;draw();};$('#flux-reset').onclick=()=>{Object.assign(state,{pos:[-3.35,.1,0],radii:[2.1,2.1,2.1],sign:1,hidden:false});resetView();draw();};
 const viewport=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{threshold:0});viewport.observe(stage);
 scene.frameFn=()=>{if(!inView||disposed)return;const rect=canvas.getBoundingClientRect(),project=p=>{const v=new THREE.Vector3(...p).project(scene.camera);return [rect.left+(v.x+1)*rect.width/2,rect.top+(1-v.y)*rect.height/2];};stage.dataset.sourceScreen=JSON.stringify(project(state.pos));stage.dataset.centerScreen=JSON.stringify(project([0,0,0]));stage.dataset.radiusHandleScreen=JSON.stringify(project(handles.radius||[2.1,0,0]));stage.dataset.shapeHandleScreen=JSON.stringify(project(handles.shape||[0,2.1,0]));stage.dataset.camera=JSON.stringify(scene.camera.position.toArray());};
 const sizeObserver=new ResizeObserver(()=>{if(!drag){scene.camera.fov=stage.clientWidth<600?47:38;scene.camera.updateProjectionMatrix();}});sizeObserver.observe(stage);
 resetView();draw();
 const projection=dimensions?createDimensionView({host:container,stage,getCamera:()=>scene.camera,setCamera:camera=>scene.camera=camera,controls:scene.controls}):null;
 const frameBeforeProjection=scene.frameFn;scene.frameFn=t=>{projection?.update();frameBeforeProjection(t);};
 return()=>{projection?.dispose();disposed=true;cancelAnimationFrame(pending);viewport.disconnect();sizeObserver.disconnect();canvas.removeEventListener('pointerdown',start,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',end,true);canvas.removeEventListener('pointercancel',end,true);scene.dispose();container.innerHTML='';};
}
