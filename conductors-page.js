import {applyAcademicScene} from './academic-scene.js';
import {FieldScene,THREE} from './scene.js';
import {conductorOptions,conductorAt,conductorSigma,conductorProfile} from './conductor-physics.js';

const norm=a=>Math.hypot(...a),unit=a=>{const n=norm(a);return n?a.map(v=>v/n):[0,1,0];},clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const number=(v,d=2)=>Math.abs(v)<.5*10**-d?(0).toFixed(d):v.toFixed(d);
export function mountConductors(container){
 if(!document.querySelector('link[data-conductors-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./conductors.css',import.meta.url).href;link.dataset.conductorsStyle='';document.head.append(link);}
 container.innerHTML=`<section class="conductor-lab">
  <div class="conductor-modes" aria-label="导体球模型"><button class="active" data-conductor-mode="induced" aria-pressed="true">外场中的中性球</button><button data-conductor-mode="charged" aria-pressed="false">带净电荷的孤立球</button></div>
  <div class="conductor-stage-wrap">
   <div class="conductor-stage" aria-label="可拖拽探针的三维导体球"></div>
   <div class="conductor-stage-title"><span>静电平衡</span><strong id="conductor-title">外场仍在，球内合场为零</strong><small id="conductor-net-charge">球的总电荷 Q = 0</small></div>
   <div class="conductor-readout" aria-live="polite"><div class="conductor-region" id="conductor-region">球内</div><div><span>合电场 |E|</span><strong id="conductor-field">0.0</strong><small>V/m</small></div><div><span>电势 V</span><strong id="conductor-potential">0.000</strong><small>V</small></div><p id="conductor-local-note"></p></div>
   <button class="conductor-direction" id="conductor-direction" aria-label="拖动改变外场方向，方向键也可调整"><svg viewBox="0 0 68 68" aria-hidden="true"><circle cx="34" cy="34" r="29"/><g id="conductor-direction-arrow"><path d="M34 54V14M27 22l7-9 7 9"/></g></svg><span>拖动外场方向</span></button>
   <div class="conductor-picture-controls"><label><input type="checkbox" id="conductor-cut" checked>剖开金属球</label><label id="conductor-parts-label"><input type="checkbox" id="conductor-parts" checked>分开看外场与感应场</label><label><input type="checkbox" id="conductor-background" checked>周围电场</label></div>
   <div class="conductor-probe-controls"><button id="conductor-inside" class="active" aria-pressed="true">探针放进球内</button><button id="conductor-surface" aria-pressed="false">沿表面拖动</button><button id="conductor-outside" aria-pressed="false">球外取点</button></div>
   <div class="conductor-legend"><span><i class="total"></i>合场 E</span><span class="conductor-component-key"><i class="external"></i>外场 E₀</span><span class="conductor-component-key"><i class="induced"></i>感应场</span><span><i class="point"></i>探针 P</span><span><i class="positive"></i>表面＋</span><span><i class="negative"></i>表面−</span></div>
   <div class="conductor-gesture">拖动金色 P 测量 · 拖空白旋转 · 滚轮缩放</div>
  </div>
  <div class="conductor-adjustments"><label id="conductor-e-control">外场强度 E₀ <output id="conductor-e-value">180 V/m</output><input id="conductor-e" type="range" min="0" max="600" value="180" step="10"></label><label id="conductor-q-control" hidden>净电荷 Q <output id="conductor-q-value">+0.12 pC</output><input id="conductor-q" type="range" min="-.3" max=".3" value=".12" step=".01"></label><label>球半径 R <output id="conductor-r-value">1.5 mm</output><input id="conductor-r" type="range" min="1" max="2.2" value="1.5" step=".1"></label><button id="conductor-reset">复位视角</button></div>
  <div class="conductor-observation" id="conductor-observation" aria-live="polite"></div>
  <div class="conductor-plots"><figure><figcaption><strong>同一射线上的场强</strong><span>球心 → P 的方向</span></figcaption><canvas id="conductor-e-plot" aria-label="从球心沿探针方向的电场大小曲线"></canvas></figure><figure><figcaption><strong>同一射线上的电势</strong><span>金点对应探针 P</span></figcaption><canvas id="conductor-v-plot" aria-label="从球心沿探针方向的电势曲线"></canvas></figure></div>
  <div class="conductor-formula"><div id="conductor-formula-main"></div><div id="conductor-formula-extra"></div></div>
  <div class="conductor-reading"><p><b>静电感应：</b>导体中的自由电荷重新分布，形成感应电场；本页显示重新分布后的平衡结果。</p><p><b>静电平衡：</b>导体材料内部 E = 0；整个导体等势。表面若有切向电场，自由电荷就还会继续移动。</p><p><b>在表面拖动 P：</b>沿面位移与表面外侧的电场垂直，电场做功为零；这不等于表面没有电场。</p></div>
  <details class="conductor-notes"><summary>孤立、接地，以及电势的零点</summary><p>孤立导体不能与大地交换电荷：带电球保持给定净电荷 Q；中性球的正、负感应电荷等量，总电荷始终为零。接地则把导体电势约束到大地的参考电势，净电荷可以改变，不能把“接地”一概当作“Q = 0”。</p><p id="conductor-reference"></p><p>球面色点仅示意表面电荷的正负与疏密，点数不是电子数量。模型为理想导体、静电平衡、无介质；表面读数取紧邻金属的外侧。球内是导体材料，不能据此直接推断含内部电荷的空腔也没有电场。</p><a href="charge.html#spark">双金属球充电与火花放电 →</a></details>
 </section>`;
 const $=s=>container.querySelector(s),scene=new FieldScene($('.conductor-stage'),{extent:5.5}),canvas=scene.renderer.domElement;
 const advanced=document.createElement('details');advanced.className='conductor-optional';advanced.innerHTML='<summary>调整外场、电量与球的尺寸</summary>';const adjustments=$('.conductor-adjustments');adjustments.before(advanced);advanced.append(adjustments);
 applyAcademicScene(scene);scene.grid.visible=false;scene.layer('axes').visible=false;scene.controls.enablePan=false;scene.controls.minDistance=6;scene.controls.maxDistance=24;scene.renderer.localClippingEnabled=true;
 const clipPlane=new THREE.Plane(new THREE.Vector3(0,0,-1),0),ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),dragPlane=new THREE.Plane();
 let options=conductorOptions(),p=[.45,.35,.65],probeMode='inside',angle=0,cut=true,parts=true,background=true,dragging=false,directionDrag=false,disposed=false,probeMesh=null,probeHalo=null,resizeObserver,stageObserver,plotTimer;
 // A neutral studio reflection gives the metal a readable curved surface on
 // paper. It is an appearance texture only; no field values depend on it.
 const studio=document.createElement('canvas');studio.width=256;studio.height=128;const studioContext=studio.getContext('2d'),studioGradient=studioContext.createLinearGradient(0,0,0,128);for(const [p,c] of [[0,'#fafcf9'],[.32,'#d4dcd7'],[.5,'#8b9a95'],[.68,'#e1e7e2'],[1,'#fafcf9']])studioGradient.addColorStop(p,c);studioContext.fillStyle=studioGradient;studioContext.fillRect(0,0,256,128);studioContext.fillStyle='#ffffff';studioContext.fillRect(50,0,24,128);studioContext.fillStyle='#c4ceca';studioContext.fillRect(180,0,30,128);
 const studioTexture=new THREE.CanvasTexture(studio);studioTexture.mapping=THREE.EquirectangularReflectionMapping;studioTexture.colorSpace=THREE.SRGBColorSpace;const reflectionGenerator=new THREE.PMREMGenerator(scene.renderer),studioReflection=reflectionGenerator.fromEquirectangular(studioTexture);scene.scene.environment=studioReflection.texture;studioTexture.dispose();reflectionGenerator.dispose();
 const pointMaterials=[],metalMaterial=new THREE.MeshPhysicalMaterial({color:'#bbc6c0',metalness:.85,roughness:.25,clearcoat:.28,clearcoatRoughness:.22,envMapIntensity:.8,side:THREE.DoubleSide,clippingPlanes:[clipPlane]});
 const metal=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),metalMaterial);scene.layer('metal').add(metal);
 const sectionMaterial=new THREE.MeshStandardMaterial({color:'#d5dfd5',metalness:.12,roughness:.88,side:THREE.DoubleSide});
 const section=new THREE.Mesh(new THREE.CircleGeometry(1,96),sectionMaterial);section.position.z=.003;scene.layer('metal').add(section);
 const sectionRim=new THREE.Mesh(new THREE.TorusGeometry(1,.012,10,128),new THREE.MeshStandardMaterial({color:'#899e91',metalness:.65,roughness:.32}));sectionRim.position.z=.008;scene.layer('metal').add(sectionRim);
 const surfaceMarkers=scene.layer('surface-charges');
 function setCamera(){const aspect=scene.camera.aspect,d=Math.max(10.4,3.2/(Math.tan(19*Math.PI/180)*Math.max(aspect,.5)));scene.controls.target.set(0,0,0);scene.camera.up.set(0,1,0);scene.camera.position.set(d*.75,d*.28,d*.60);scene.controls.update();}
 setCamera();
 function readModel(){options.R=+$('#conductor-r').value;options.Q=+$('#conductor-q').value;options.E0=+$('#conductor-e').value;options.direction=[Math.sin(angle),Math.cos(angle),0];}
 function updateLabels(){
  const induced=options.mode==='induced';$('#conductor-e-control').hidden=!induced;$('#conductor-q-control').hidden=induced;$('#conductor-parts-label').hidden=!induced;$('#conductor-direction').hidden=!induced;
  $('.conductor-lab').classList.toggle('is-charged',!induced);$('.conductor-lab').classList.toggle('parts-hidden',!parts);
  $('#conductor-e-value').textContent=options.E0+' V/m';$('#conductor-q-value').textContent=(options.Q>0?'+':'')+number(options.Q)+' pC';$('#conductor-r-value').textContent=number(options.R,1)+' mm';
  $('#conductor-title').textContent=induced?'外场仍在，球内合场为零':'球内没有电场，电势仍可不为零';$('#conductor-net-charge').textContent=induced?'中性孤立球 · 总电荷 Q = 0':'孤立球 · Q = '+(options.Q>0?'+':'')+number(options.Q)+' pC';
  $('#conductor-direction-arrow').setAttribute('transform',`rotate(${angle*180/Math.PI} 34 34)`);
  $('#conductor-formula-main').innerHTML=induced?'<span>球内</span><strong>E = E₀ + E<sub>感应</sub> = 0</strong><small>V = 0，整个导体等势</small>':'<span>球内 r &lt; R</span><strong>E = 0　 V = kQ/R</strong><small>球外 r ≥ R：E = kQ/r² · r̂，V = kQ/r</small>';
  $('#conductor-formula-extra').innerHTML=induced?'<span>球面</span><strong>σ = 3ε₀E₀ cos θ</strong><small>θ 从外场方向量起；E<sub>切向</sub> = 0</small>':'<span>球面</span><strong>σ = Q/(4πR²)</strong><small>表面外侧 E<sub>法向</sub> = σ/ε₀</small>';
  $('#conductor-reference').textContent=induced?'本模型的均匀外场沿箭头方向延伸到无限远，不能把所有无限远方向都定成零电势。这里选穿过球心且垂直外场的中面为 V = 0，导体球也处于这个电势；球外 V = −E₀ r cosθ (1 − R³/r³)。':'本模型只有孤立球的净电荷，采用 V(∞) = 0。因此球内 V = kQ/R 可以不为零；改变电势零点不改变 E、力或两点间的电势差。';
 }
 function updateMetal(){
  metal.scale.setScalar(options.R);section.scale.setScalar(options.R);sectionRim.scale.setScalar(options.R);section.visible=cut;sectionRim.visible=cut;metalMaterial.clippingPlanes=cut?[clipPlane]:[];
  scene.clearLayer('section-edge');if(cut){const ring=Array.from({length:129},(_,i)=>[options.R*Math.cos(i*Math.PI/64),options.R*Math.sin(i*Math.PI/64),.012]);scene.line(ring,'#718c7c','section-edge',.65);for(let offset=-options.R+.16;offset<options.R;offset+=.25){const half=Math.sqrt(options.R*options.R-offset*offset),s=Math.SQRT1_2;scene.line([[(-offset-half)*s,(offset-half)*s,.017],[(-offset+half)*s,(offset+half)*s,.017]],'#91a594','section-edge',.18);}}
  scene.clearLayer('surface-charges');pointMaterials.length=0;
  const points=[];for(let i=0;i<48;i++){const z=(i+.5)/48,a=i*2.3999632297,n=[Math.sqrt(1-z*z)*Math.cos(a),Math.sqrt(1-z*z)*Math.sin(a),z];points.push(n,n.map(v=>-v));}
  const matPlus=new THREE.MeshBasicMaterial({color:'#bc6a54',clippingPlanes:cut?[clipPlane]:[]}),matMinus=new THREE.MeshBasicMaterial({color:'#527c9b',clippingPlanes:cut?[clipPlane]:[]});pointMaterials.push(matPlus,matMinus);
  const maxSigma=options.mode==='induced'?3*8.8541878128e-12*Math.abs(options.E0):Math.abs(conductorSigma([0,1,0],options));
  for(const n of points){const sigma=conductorSigma(n,options),f=maxSigma?Math.abs(sigma)/maxSigma:0;if(f<.08)continue;const dot=new THREE.Mesh(new THREE.SphereGeometry(.026+.026*Math.sqrt(f),10,8),sigma>0?matPlus:matMinus);dot.position.fromArray(n).multiplyScalar(options.R*1.012);surfaceMarkers.add(dot);}
 }
 function drawBackground(){
  scene.clearLayer('background-field');if(!background)return;
  const locations=[];for(let x=-4;x<=4;x+=1)for(let y=-3;y<=3;y+=1)locations.push([x,y,0]);for(const x of [-3.6,3.6])for(const y of [-1.8,0,1.8])for(const z of [-2.1,2.1])locations.push([x,y,z]);
  const scale=options.mode==='induced'?Math.max(options.E0,1):Math.max(Math.abs(conductorAt([0,options.R*1.15,0],options).magnitude),1);
  for(const pos of locations){if(norm(pos)<options.R*1.06)continue;const f=conductorAt(pos,options),m=f.magnitude;if(m<.01)continue;const arrow=scene.arrow(pos,f.E,'#477d78',.12+.40*Math.tanh(m/scale*.8),'background-field');if(arrow)arrow.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.45+.26*Math.min(1,m/scale);}});}
 }
 function setProbeMode(mode){
  probeMode=mode;for(const name of ['inside','surface','outside']){const on=name===mode;$('#conductor-'+name).classList.toggle('active',on);$('#conductor-'+name).setAttribute('aria-pressed',String(on));}
  if(mode==='inside'){p=[options.R*.30,options.R*.23,options.R*.43];if(!cut){cut=true;$('#conductor-cut').checked=true;updateMetal();}}
  if(mode==='surface'){const n=unit([.65,.42,.63]);p=n.map(v=>v*options.R);cut=false;$('#conductor-cut').checked=false;updateMetal();}
  if(mode==='outside')p=[options.R*1.5,options.R*1.05,options.R*.5];
  updateProbe();
 }
 function updateProbe(){
  if(disposed)return;scene.clearLayer('probe');scene.clearLayer('probe-guide');const f=conductorAt(p,options),inside=f.inside,onSurface=probeMode==='surface';
  probeMesh=new THREE.Mesh(new THREE.SphereGeometry(.10,24,16),new THREE.MeshStandardMaterial({color:'#b3892c',roughness:.4,depthTest:false}));probeMesh.position.fromArray(p);probeMesh.userData.conductorProbe=true;probeMesh.renderOrder=20;scene.layer('probe').add(probeMesh);
  probeHalo=new THREE.Mesh(new THREE.RingGeometry(.16,.18,48),new THREE.MeshBasicMaterial({color:'#b3892c',side:THREE.DoubleSide,transparent:true,opacity:.7,depthTest:false,depthWrite:false}));probeHalo.position.fromArray(p);probeHalo.quaternion.copy(scene.camera.quaternion);probeHalo.renderOrder=21;scene.layer('probe').add(probeHalo);
  const hit=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.fromArray(p);hit.userData.conductorProbe=true;scene.layer('probe').add(hit);
  scene.label('P',[p[0]+.24,p[1]+.21,p[2]],'#936d1c','probe',.28);
  scene.dashedLine([[0,0,0],p],'#829687','probe-guide',.40);
  const magnitude=Math.max(f.magnitude,norm(f.external),norm(f.induced),1),scale=1.05/magnitude;
  if(options.mode==='induced'&&parts){
   if(norm(f.external)>.01)scene.arrow(p,f.external,'#627f93',norm(f.external)*scale,'probe');
   if(norm(f.induced)>.01)scene.arrow(p,f.induced,'#b7804d',norm(f.induced)*scale,'probe');
  }
  if(f.magnitude>.01){const offset=options.mode==='induced'&&parts?[.09,0,.08]:[0,0,0];scene.arrow(p.map((v,i)=>v+offset[i]),f.E,'#286f7c',f.magnitude*scale,'probe');}
  if(onSurface){
   const n=new THREE.Vector3(...f.normal),u=new THREE.Vector3(0,1,0).cross(n);if(u.length()<.1)u.set(1,0,0).cross(n);u.normalize();const v=n.clone().cross(u).normalize();
   const ring=Array.from({length:65},(_,i)=>new THREE.Vector3(...p).addScaledVector(u,.36*Math.cos(i*Math.PI/32)).addScaledVector(v,.36*Math.sin(i*Math.PI/32)).toArray());scene.line(ring,'#a68742','probe-guide',.65);
   const normalEnd=new THREE.Vector3(...p).addScaledVector(n,.45),corner=normalEnd.clone().addScaledVector(u,.13);scene.line([normalEnd.toArray(),corner.toArray(),corner.clone().addScaledVector(n,-.13).toArray()],'#a68742','probe-guide',.8);
  }
  $('#conductor-region').textContent=onSurface?'球面外侧':inside?'导体材料内部':'球外';$('#conductor-field').textContent=number(f.magnitude,1);$('#conductor-potential').textContent=number(f.V,3);
  $('#conductor-local-note').textContent=onSurface?'切向 E = '+number(norm(f.tangent),1)+' V/m':inside&&options.mode==='induced'?`外场 ${number(norm(f.external),0)} + 反向感应场 ${number(norm(f.induced),0)}`:inside?'电势处处相同':'距球心 r = '+number(f.r,2)+' mm';
  $('#conductor-observation').textContent=onSurface?'沿表面拖动 P：V 保持不变。球面外侧的 E 沿法线，沿面不做功。':inside?options.mode==='induced'?'金属内部的外场没有消失：感应场与它反向、等大，合场为零。':'P 已在金属材料内部：E = 0，但 V = kQ/R；零电场并不等于零电势。':'把 P 拖近或拖远：场强和电势同时变化。曲线沿着球心—P 这条射线取样。';
  container.dataset.conductorMode=options.mode;container.dataset.conductorProbe=JSON.stringify(p);container.dataset.conductorE=JSON.stringify(f.E);container.dataset.conductorExternal=JSON.stringify(f.external);container.dataset.conductorInduced=JSON.stringify(f.induced);container.dataset.conductorV=String(f.V);container.dataset.conductorInside=String(inside);container.dataset.conductorSurface=String(onSurface);container.dataset.conductorTangential=String(norm(f.tangent));container.dataset.conductorNetQ=String(options.mode==='induced'?0:options.Q);container.dataset.conductorDirection=JSON.stringify(options.direction);container.dataset.conductorRadius=String(options.R);
  drawPlots();
 }
 function drawPlots(){
  const samples=conductorProfile(p,options),f=conductorAt(p,options);
  for(const [id,key,label,color] of [['conductor-e-plot','magnitude','|E| / V·m⁻¹','#286f7c'],['conductor-v-plot','V','V / V','#9e742c']]){
   const c=$('#'+id),rect=c.getBoundingClientRect(),w=Math.max(260,rect.width),h=180,dpr=Math.min(devicePixelRatio,2);c.width=Math.round(w*dpr);c.height=h*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
   const left=48,right=w-24,top=28,bottom=145,x=r=>left+r/(options.R*3)*(right-left);let lo=Math.min(0,...samples.map(v=>v[key])),hi=Math.max(0,...samples.map(v=>v[key]));if(hi-lo<1e-9){lo=0;hi=1;}const pad=(hi-lo)*.12;lo-=pad;hi+=pad;const y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top);
   ctx.fillStyle='#edf2e9';ctx.fillRect(left,top,x(options.R)-left,bottom-top);ctx.font='11px Cambria,"Songti SC",SimSun,serif';ctx.fillStyle='#7d8e7b';ctx.fillText('导体内',left+8,top+15);ctx.fillStyle='#526d57';ctx.fillText(label,left,16);
   ctx.strokeStyle='#bdcbb9';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(x(options.R),top);ctx.lineTo(x(options.R),bottom);if(lo<0&&hi>0){ctx.moveTo(left,y(0));ctx.lineTo(right,y(0));}ctx.stroke();ctx.setLineDash([]);
   for(const value of [0,options.R,options.R*2,options.R*3]){ctx.fillStyle='#70856d';ctx.fillText(number(value,1),x(value)-8,bottom+16);}ctx.fillText('r / mm',right-32,bottom+31);ctx.fillText('R',x(options.R)-4,top-5);
   for(const value of [Math.max(lo,0),hi-pad,lo+pad]){const ty=y(value);ctx.fillStyle='#70856d';ctx.fillText(number(value,Math.abs(value)>10?0:2),3,ty+4);}
   ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath();samples.forEach((s,i)=>{if(!i)ctx.moveTo(x(s.r),y(s[key]));else ctx.lineTo(x(s.r),y(s[key]));});ctx.stroke();
   if(f.r<=options.R*3){ctx.fillStyle='#b3892c';ctx.beginPath();ctx.arc(x(f.r),y(f[key]),4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#b3892c66';ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x(f.r),y(f[key]));ctx.lineTo(x(f.r),bottom);ctx.stroke();ctx.setLineDash([]);}
  }
 }
 function rebuild(){readModel();updateLabels();updateMetal();drawBackground();updateProbe();}
 container.querySelectorAll('[data-conductor-mode]').forEach(b=>b.onclick=()=>{options.mode=b.dataset.conductorMode;container.querySelectorAll('[data-conductor-mode]').forEach(c=>{const active=c===b;c.classList.toggle('active',active);c.setAttribute('aria-pressed',String(active));});setProbeMode(options.mode==='induced'?'inside':'outside');rebuild();});
 for(const name of ['inside','surface','outside'])$('#conductor-'+name).onclick=()=>setProbeMode(name);
 $('#conductor-e').oninput=rebuild;$('#conductor-q').oninput=rebuild;$('#conductor-r').oninput=()=>{const ratio=+$('#conductor-r').value/options.R;p=p.map(v=>v*ratio);rebuild();};
 $('#conductor-cut').onchange=e=>{cut=e.target.checked;updateMetal();};$('#conductor-parts').onchange=e=>{parts=e.target.checked;updateLabels();updateProbe();};$('#conductor-background').onchange=e=>{background=e.target.checked;drawBackground();};$('#conductor-reset').onclick=setCamera;
 function setRay(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,scene.camera);}
 function down(e){if(e.button!==0)return;setRay(e);const hit=ray.intersectObjects(scene.layer('probe').children,true).find(h=>h.object.userData.conductorProbe);if(!hit)return;dragging=true;scene.controls.enabled=false;dragPlane.setFromNormalAndCoplanarPoint(scene.camera.getWorldDirection(new THREE.Vector3()),new THREE.Vector3(...p));canvas.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();canvas.classList.add('is-dragging');}
 function move(e){
  if(!dragging){setRay(e);const hover=ray.intersectObjects(scene.layer('probe').children,true).some(h=>h.object.userData.conductorProbe);canvas.style.cursor=hover?'grab':'';return;}
  setRay(e);const next=new THREE.Vector3();
  if(probeMode==='surface'){
   const sphere=new THREE.Sphere(new THREE.Vector3(),options.R),hit=ray.ray.intersectSphere(sphere,next);if(!hit){ray.ray.closestPointToPoint(new THREE.Vector3(),next);if(next.length()>0)next.normalize().multiplyScalar(options.R);else return;}
  }else{if(!ray.ray.intersectPlane(dragPlane,next))return;if(probeMode==='inside'&&next.length()>options.R*.92)next.normalize().multiplyScalar(options.R*.92);if(next.length()>options.R*3)next.normalize().multiplyScalar(options.R*3);}
  p=next.toArray();updateProbe();e.preventDefault();
 }
 function up(e){if(!dragging)return;dragging=false;scene.controls.enabled=true;canvas.classList.remove('is-dragging');if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);}
 canvas.addEventListener('pointerdown',down,{capture:true});canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 const direction=$('#conductor-direction');
 function setDirection(e){const r=direction.querySelector('svg').getBoundingClientRect();angle=Math.atan2(e.clientX-r.left-r.width/2,-(e.clientY-r.top-r.height/2));rebuild();}
 direction.onpointerdown=e=>{directionDrag=true;direction.setPointerCapture(e.pointerId);setDirection(e);e.preventDefault();};direction.onpointermove=e=>{if(directionDrag)setDirection(e);};direction.onpointerup=e=>{directionDrag=false;if(direction.hasPointerCapture(e.pointerId))direction.releasePointerCapture(e.pointerId);};direction.onpointercancel=()=>directionDrag=false;
 direction.onkeydown=e=>{if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(e.key)){angle+=(e.key==='ArrowLeft'||e.key==='ArrowDown'?-1:1)*Math.PI/18;rebuild();e.preventDefault();}};
 canvas.tabIndex=0;canvas.setAttribute('aria-label','拖动金色探针，或用方向键移动探针；PageUp 和 PageDown 调节深度');
 function key(e){const delta={ArrowLeft:[-.12,0,0],ArrowRight:[.12,0,0],ArrowUp:[0,.12,0],ArrowDown:[0,-.12,0],PageUp:[0,0,.12],PageDown:[0,0,-.12]}[e.key];if(!delta)return;p=p.map((v,i)=>v+delta[i]);if(probeMode==='surface')p=unit(p).map(v=>v*options.R);else if(probeMode==='inside'&&norm(p)>options.R*.92)p=unit(p).map(v=>v*options.R*.92);else if(norm(p)>options.R*3)p=unit(p).map(v=>v*options.R*3);updateProbe();e.preventDefault();}
 canvas.addEventListener('keydown',key);
 scene.frameFn=()=>{if(probeHalo)probeHalo.quaternion.copy(scene.camera.quaternion);const pos=new THREE.Vector3(...p).project(scene.camera),rect=canvas.getBoundingClientRect();container.dataset.conductorScreenPoint=JSON.stringify([rect.left+(pos.x+1)*rect.width/2,rect.top+(1-pos.y)*rect.height/2]);};
 resizeObserver=new ResizeObserver(()=>{clearTimeout(plotTimer);plotTimer=setTimeout(()=>{if(!disposed)drawPlots();},60);});resizeObserver.observe($('.conductor-plots'));
 stageObserver=new ResizeObserver(()=>{if(!disposed){scene.resize();setCamera();}});stageObserver.observe($('.conductor-stage'));
 rebuild();
 return ()=>{disposed=true;clearTimeout(plotTimer);resizeObserver.disconnect();stageObserver.disconnect();canvas.removeEventListener('pointerdown',down,{capture:true});canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('keydown',key);scene.scene.environment=null;studioReflection.dispose();scene.dispose();};
}
