import {FieldScene,THREE} from './scene.js';
import {pointReading,finiteModel,segmentedRod,ELEMENTARY_CHARGE as e} from './foundation-physics.js';
const fmt=x=>Math.abs(x)>=1000?x.toFixed(0):x.toFixed(2);
export function mountFoundations(container){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='./foundations.css';document.head.append(sheet);
 container.classList.add('foundations-lab');
 container.innerHTML=`<div class="foundation-tabs"><button data-mode="force" class="active">在同一点测场与力</button><button data-mode="models">有限物体与理想模型</button></div>
 <section class="foundation-force"><div class="foundation-stage-wrap"><div class="foundation-stage"></div><div class="foundation-top">拖动金色 P · 青色是 E，金色是 F</div><div class="foundation-inline"><label>源电荷 Q <output id="foundation-Q-value"></output><input id="foundation-Q" type="range" min="-.8" max=".8" step=".1" value=".4"></label><label>到源的距离 r <output id="foundation-r-value"></output><input id="foundation-r" type="range" min=".6" max="5" step=".05" value="2"></label><div class="foundation-probes" aria-label="试探电荷"><button data-q="1" class="active">＋e</button><button data-q="2">＋2e</button><button data-q="-1">−e</button></div></div><div class="foundation-readings"><span>这里的场 E <strong id="foundation-E"></strong></span><span>试探电荷受力 F <strong id="foundation-F"></strong></span></div></div><div class="foundation-actions"><button id="foundation-double-r">距离 ×2</button><button id="foundation-double-Q">源电量 ×2</button><button id="foundation-reset">恢复</button><output id="foundation-change" aria-live="polite">先换试探电荷，观察 E 是否改变。</output></div><p class="foundation-caption">方向按从源指向 P 为正。F = qE；负试探电荷的受力与 E 反向。背景箭头压缩了长度，场强大小以读数为准。</p></section>
 <section class="foundation-models" hidden><div class="foundation-model-buttons"><button data-model="point" class="active">远看小物体 → 点电荷</button><button data-model="line">长直线 → 无限长线</button><button data-model="plane">大圆盘 → 无限大平面</button></div><div class="foundation-model-figure"><svg id="foundation-diagram" viewBox="0 0 800 360" role="img" aria-label="有限带电体与观察点"></svg><div class="foundation-model-numbers"><span>有限物体的 E <strong id="foundation-finite"></strong></span><span>理想模型的 E <strong id="foundation-ideal"></strong></span><span>相对差异 <strong id="foundation-error"></strong></span></div></div><label class="foundation-size">物体尺寸 / 观察距离 <output id="foundation-size-value"></output><input id="foundation-size" type="range" min="-1.5" max="1.7" step=".025" value="0"></label><p id="foundation-model-note"></p><div class="foundation-segments"><label>把线源分成 <select id="foundation-N"><option>4</option><option>16</option><option selected>64</option><option>256</option></select> 段，逐段相加</label><output id="foundation-sum"></output></div><p class="foundation-caption">固定观察距离 r = 2 mm。尺寸比例按对数调节；超出画面的物体以断口表示。圆盘在轴线上观察，线段在中垂线上观察。</p></section>`;
 const $=s=>container.querySelector(s),view=new FieldScene($('.foundation-stage'),{extent:6});
 view.scene.background.set('#040b12');view.scene.fog.color.set('#040b12');view.grid.visible=false;view.layer('axes').visible=false;view.camera.position.set(1.2,2.1,13);view.controls.target.set(1,0,0);view.controls.enableRotate=false;view.controls.enablePan=false;
 let Q=.4,r=2,q=1,angle=.25,mode='force',model='point',drag=false;
 const P=()=>[r*Math.cos(angle),r*Math.sin(angle),0];
 function draw(){
  ['source','arrows','probe','guides'].forEach(n=>view.clearLayer(n));
  view.charge({pos:[0,0,0],Q,radius:.24,label:'Q'},'source');
  for(const rr of [1,2,3.3,4.8])for(let j=0;j<16;j++){
   const a=j*Math.PI/8,p=[rr*Math.cos(a),rr*Math.sin(a),0],m=pointReading(Q*1e-12,rr*1e-3,e).E;
   view.arrow(p,p.map(v=>v*Math.sign(m)),'#347d91',Math.min(.55,.08+.45*Math.abs(m)/(Math.abs(m)+400)),'arrows');
  }
  const p=P(),reading=pointReading(Q*1e-12,r*1e-3,q*e),mesh=new THREE.Mesh(new THREE.SphereGeometry(.115,24,16),new THREE.MeshBasicMaterial({color:'#ffd684'}));mesh.position.set(...p);mesh.userData.probe=true;view.layer('probe').add(mesh);
  view.dashedLine([[0,0,0],p],'#8d9ca3','guides',.65);view.label('P',[p[0]-.15,p[1]+.5,0],'#ffe1a0','probe',.32);
  const dir=[Math.cos(angle),Math.sin(angle),0],length=.15+1.05*Math.abs(reading.E)/(Math.abs(reading.E)+400);
  if(reading.E!==0){view.arrow(p,dir.map(v=>v*Math.sign(reading.E)),'#6fe0e0',length,'probe');view.arrow([p[0],p[1],.16],dir.map(v=>v*Math.sign(reading.F)),'#ffd684',length*.85*Math.abs(q),'probe');}
  $('#foundation-Q-value').textContent=Q.toFixed(2)+' pC';$('#foundation-r-value').textContent=r.toFixed(2)+' mm';
  $('#foundation-E').textContent=fmt(reading.E)+' V/m';$('#foundation-F').textContent=fmt(reading.F*1e15)+' fN';
  view.renderer.domElement.dataset.reading=JSON.stringify(reading);view.renderer.domElement.dataset.probe=JSON.stringify(p);view.renderer.domElement.dataset.q=q;
 }
 function sync(){Q=+$('#foundation-Q').value;r=+$('#foundation-r').value;draw();}
 $('#foundation-Q').oninput=()=>{sync();$('#foundation-change').textContent='改变源电量，场与力一起改变。';};$('#foundation-r').oninput=()=>{sync();$('#foundation-change').textContent='离源越远，场越弱；球外按 1/r² 衰减。';};
 container.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{q=+b.dataset.q;container.querySelectorAll('[data-q]').forEach(x=>x.classList.toggle('active',x===b));draw();$('#foundation-change').textContent=q<0?'换成负电荷：E 不变，F 反向。':q===2?'试探电量加倍：E 不变，F 加倍。':'同一位置的 E 只由源决定。';});
 $('#foundation-double-r').onclick=()=>{if(r>2.5){$('#foundation-change').textContent='先把 r 调到 2.5 mm 以内，再比较两倍距离。';return;}$('#foundation-r').value=r*2;sync();$('#foundation-change').textContent='距离变为 2 倍：E 与 F 都变为原来的 1/4。';};
 $('#foundation-double-Q').onclick=()=>{if(Math.abs(Q)>.4){$('#foundation-change').textContent='先把 |Q| 调到 0.4 pC 以内，再加倍。';return;}$('#foundation-Q').value=Q*2;sync();$('#foundation-change').textContent=Q?'源电量变为 2 倍：E 与 F 都加倍。':'Q = 0；加倍后仍为零。';};
 $('#foundation-reset').onclick=()=>{$('#foundation-Q').value=.4;$('#foundation-r').value=2;angle=.25;sync();};
 const canvas=view.renderer.domElement,ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3();
 function cast(ev){const box=canvas.getBoundingClientRect();mouse.set((ev.clientX-box.left)/box.width*2-1,1-(ev.clientY-box.top)/box.height*2);ray.setFromCamera(mouse,view.camera);}
 function down(ev){cast(ev);if(ray.intersectObjects(view.layer('probe').children).some(h=>h.object.userData.probe)){drag=true;canvas.setPointerCapture(ev.pointerId);view.controls.enabled=false;}}
 function move(ev){if(!drag)return;cast(ev);if(ray.ray.intersectPlane(plane,hit)){r=Math.min(5,Math.max(.6,Math.hypot(hit.x,hit.y)));angle=Math.atan2(hit.y,hit.x);$('#foundation-r').value=r;draw();}}
 function up(){drag=false;view.controls.enabled=true;}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 function drawModel(){
  const ratio=10**(+$('#foundation-size').value),distance=.002,size=ratio*distance,strength=model==='point'?1e-12:model==='line'?1e-9:1e-6;
  const result=finiteModel(model,size,distance,strength),px=Math.min(280,100*ratio),N=+$('#foundation-N').value;
  $('#foundation-size-value').textContent=(model==='plane'?'R / r = ':'L / r = ')+ratio.toFixed(2);
  $('#foundation-finite').textContent=fmt(result.finite)+' V/m';$('#foundation-ideal').textContent=fmt(result.ideal)+' V/m';$('#foundation-error').textContent=((1-result.ratio)*100).toFixed(2)+' %';
  const isPlane=model==='plane';
  $('#foundation-diagram').innerHTML=`<defs><marker id="foundation-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 8 4 0 8Z" fill="#7ee1de"/></marker></defs><line x1="400" y1="180" x2="400" y2="65" stroke="#6e8795" stroke-dasharray="4 6"/><text x="415" y="125" fill="#adbdc8">r = 2 mm</text>${isPlane?`<ellipse cx="400" cy="215" rx="${px}" ry="${Math.max(3,px*.23)}" fill="#e58a6830" stroke="#e68e6b"/>`:`<line x1="${400-px/2}" y1="215" x2="${400+px/2}" y2="215" stroke="#e68e6b" stroke-width="5"/>`}${!isPlane?Array.from({length:Math.min(N,32)},(_,i)=>`<circle cx="${400-px/2+(i+.5)*px/Math.min(N,32)}" cy="215" r="2" fill="#ffe0b1"/>`).join(''):''}<circle cx="400" cy="65" r="6" fill="#ffd787"/><text x="420" y="70" fill="#ffd787">P</text><line x1="400" y1="57" x2="400" y2="${57-Math.max(5,result.ratio*42)}" stroke="#7ee1de" stroke-width="2" marker-end="url(#foundation-head)"/><text x="400" y="300" text-anchor="middle" fill="#b6c6d2">${isPlane?'均匀带电圆盘 · 半径 R':'均匀带电线段 · 长 L'}${ratio>2.8?'（尺寸超出绘图比例）':''}</text>`;
  $('#foundation-model-note').textContent=model==='point'?'总电量 Q = 1 pC 固定。物体尺寸远小于 r 时，它在这里的场接近点电荷模型。':model==='line'?'线密度 λ = 1 nC/m 固定。在线段中部，r 远小于线长、并远离两端时，无限长线近似才好。':'面密度 σ = 1 μC/m² 固定。在圆盘中心附近，r 远小于圆盘半径时，无限大平面近似才好。';
  $('.foundation-segments').hidden=isPlane;
  const totalQ=model==='point'?strength:strength*size,numeric=segmentedRod(totalQ,size,distance,N);
  $('#foundation-sum').textContent=`Σ ΔE = ${fmt(numeric[1])} V/m；与有限线段解析值相差 ${Math.abs(numeric[1]/result.finite-1)*100<.005?'< 0.005':(Math.abs(numeric[1]/result.finite-1)*100).toFixed(3)} %`;
  $('.foundation-model-figure').dataset.values=JSON.stringify({...result,ratio,size,distance});
 }
 container.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;container.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));$('.foundation-force').hidden=mode!=='force';$('.foundation-models').hidden=mode!=='models';if(mode==='force')view.resize();else drawModel();});
 container.querySelectorAll('[data-model]').forEach(b=>b.onclick=()=>{model=b.dataset.model;container.querySelectorAll('[data-model]').forEach(x=>x.classList.toggle('active',x===b));drawModel();});
 $('#foundation-size').oninput=drawModel;$('#foundation-N').onchange=drawModel;draw();drawModel();
 return()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);view.dispose();sheet.remove();container.classList.remove('foundations-lab');};
}
