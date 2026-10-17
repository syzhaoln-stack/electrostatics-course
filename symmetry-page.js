import {FieldScene,THREE} from './scene.js';
import {symmetryOptions,symmetryField,symmetryReadings,integrateSymmetrySurface} from './symmetry-physics.js';

const CYAN='#80d4dc',GOLD='#f0c58a',MUTED='#7595a8';
const MODE={sphere:{title:'球对称',source:'点电荷',surface:'同心球面',area:'4πr²',law:'E ∝ 1/r²',radius:1.4},line:{title:'柱对称',source:'无限长均匀线电荷',surface:'同轴柱面',area:'2πrL',law:'E ∝ 1/r',radius:1.4},plane:{title:'面对称',source:'无限大均匀带电面',surface:'穿过带电面的薄盒',area:'2A',law:'E 与距离无关',radius:.7}};
const fmt=(x,n=2)=>Math.abs(x)<5e-7?'0':Math.abs(x)>=10000||Math.abs(x)<.001?x.toExponential(2):x.toFixed(n);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function mountSymmetry(container){
  document.body.classList.add('intuitive-edition');
  if(!document.querySelector('[data-symmetry-style]')){const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./symmetry.css',import.meta.url).href;sheet.dataset.symmetryStyle='';document.head.append(sheet);}
  container.innerHTML=`<section class="sy-lab sy-intuitive">
    <div class="sy-problem"><strong>知道总通量，就能求出场强吗？</strong><span>先让测量面上的 E 同大；再用总通量除以有效面积。</span></div>
    <div class="sy-modes" aria-label="带电体系">${Object.entries(MODE).map(([key,m])=>`<button data-sy-mode="${key}" aria-pressed="${key==='sphere'}"><i aria-hidden="true">${key==='sphere'?'◉':key==='line'?'⊙':'▱'}</i><span><b>${m.title}</b><small>${m.source}</small></span></button>`).join('')}</div>
    <div class="sy-canvas-wrap"><div class="sy-stage" aria-label="高斯面与对称电场，可拖动旋转"></div>
      <div class="sy-stage-head"><strong id="sy-title"></strong><span id="sy-caption"></span></div>
      <div class="sy-view"><button id="sy-view-reset" title="恢复空间视角">空间视角 ↺</button></div>
      <div class="sy-patch-tools"><button data-sy-patch="active" aria-pressed="true">看穿过的部分</button><button data-sy-patch="zero" aria-pressed="false">看零贡献部分</button></div>
      <div class="sy-legend"><span><i style="background:${CYAN}"></i>电场 E</span><span><i style="background:${GOLD}"></i>外法向 n</span></div>
      <button id="sy-radius-handle" class="sy-world-handle sy-radius-handle" aria-label="高斯面半径；方向键调整"><span>↔</span><b>r</b></button>
      <button id="sy-source-handle" class="sy-world-handle sy-source-handle" aria-label="源电荷位置；方向键调整"><span>＋</span><b>拖动源</b></button>
      <div class="sy-goal"><strong id="sy-goal-task">把红球拖到面心</strong><span id="sy-goal-feedback">观察球面上的箭头是否同长、沿法向。</span></div>
      <div class="sy-local-readout"><span id="sy-patch-name"></span><strong id="sy-patch-value"></strong></div>
      <div class="sy-formula"><span id="sy-formula-tag">同一大小的 E，提出积分</span><strong id="sy-equation"></strong><small id="sy-equation-note"></small></div>
      <span class="sy-gesture" id="sy-gesture">直接拖红球 · 拖面上金点改变半径 · 拖空白旋转</span>
    </div>
    <div class="sy-readings"><div><span id="sy-e-title">面上的场强 E</span><strong id="sy-e"></strong><small>V/m</small></div><div><span id="sy-area-title">参与穿过的面积</span><strong id="sy-area"></strong><small>mm²</small></div><div><span>包围的净电荷</span><strong id="sy-enclosed"></strong><small>pC</small></div><div><span>完整闭合面通量</span><strong id="sy-flux"></strong><small>V·m</small></div></div>
    <div class="sy-controls"><label for="sy-radius"><span id="sy-radius-label">高斯面半径 r</span><output id="sy-radius-output"></output><input id="sy-radius" type="range" min=".6" max="3.6" step=".02" value="1.4"></label><label for="sy-strength"><span id="sy-strength-label">源电荷 Q</span><output id="sy-strength-output"></output><input id="sy-strength" type="range" min=".5" max="4" step=".05" value="1"></label><div class="sy-direct-actions"><button id="sy-double-r">距离 ×2</button><button id="sy-double-q">源量 ×2</button><button id="sy-offset">把源移偏</button><button id="sy-sign">改为负电</button><button id="sy-reset">恢复</button></div></div>
    <div class="sy-change" id="sy-change" role="status" hidden></div>
    <p class="sy-conclusion" id="sy-conclusion"></p>
    <details class="sy-details"><summary>面积、测量与理想模型</summary><div class="sy-detail-grid"><div><b>逐片积分，不是数箭头</b><p id="sy-integral"></p><p>图中箭头长度经过压缩；数字使用真实场强。高斯面是假想的测量边界，不是导体或实体外壳。</p></div><div><b>无限模型怎样对应实际</b><p>长线、大平面的近中部且远离边缘处，可近似使用无限模型。本页直接采用无限源；画面边缘只是显示范围。无限源的电势应选有限参考点，不能沿用无穷远为零。</p><p id="sy-model"></p></div></div></details>
  </section>`;
  const $=s=>container.querySelector(s),scene=new FieldScene($('.sy-stage'),{extent:6});
  scene.academic=false;scene.scene.background.set('#060e18');scene.scene.fog.color.set('#060e18');scene.renderer.setClearColor('#060e18');scene.grid.visible=false;scene.layer('axes').visible=false;scene.controls.enablePan=false;scene.controls.minDistance=7;scene.controls.maxDistance=30;
  const advanced=document.createElement('details');advanced.className='sy-source-details';advanced.innerHTML='<summary>源量、倍数比较与更多设置</summary>';advanced.append($('.sy-controls'));$('.sy-readings').after(advanced);
  let options=symmetryOptions({radius:1.4,offset:.75}),patch='active',disposed=false,drag=null,comparison=null,drawPending=0,reading=null,integral=null,handlePositions={},inViewport=true;
  function resetView(){scene.cameraMove=null;const distance=options.mode==='sphere'?Math.max($('.sy-stage').clientWidth<600?11:8.8,options.radius*3.5):($('.sy-stage').clientWidth<600?21:16);scene.camera.position.set(distance*.43,distance*.37,distance*.78);scene.camera.up.set(0,1,0);scene.controls.target.set(0,0,0);scene.controls.enabled=true;scene.controls.update();}
  resetView();
  const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false});
  function mesh(geometry,color,opacity,position=[0,0,0],layer='gaussian'){const m=new THREE.Mesh(geometry,material(color,opacity));m.position.set(...position);scene.layer(layer).add(m);return m;}
  function circle(radius,y,color=CYAN,opacity=.35){return scene.line(Array.from({length:97},(_,i)=>[radius*Math.cos(i*Math.PI/48),y,radius*Math.sin(i*Math.PI/48)]),color,'wire',opacity);}
  function arrow(p,e,color=CYAN,length){const magnitude=Math.hypot(...e),t=2/Math.PI*Math.atan(magnitude/200),a=scene.arrow(p,e,color,length??(.15+.72*t),'vectors');a?.traverse(obj=>{if(obj.material){obj.material.transparent=true;obj.material.opacity=length===undefined?.4+.5*t:.9;}});return a;}
  function marker(p){mesh(new THREE.SphereGeometry(.065,14,10),GOLD,1,p,'patch');}
  function normalPatch(p,n){
    const E=symmetryField(p,options),mag=Math.hypot(...E),dot=E.reduce((a,v,i)=>a+v*n[i],0);marker(p);
    arrow(p,E,CYAN,.85);arrow(p,n,GOLD,.52);scene.label('E',p.map((v,i)=>v+E[i]/mag*1.02),CYAN,'labels',.3);scene.label('n',p.map((v,i)=>v+n[i]*.68),GOLD,'labels',.28);
    if(Math.abs(dot/mag)<1e-6){const u=E.map(v=>v/mag*.22),v=n.map(x=>x*.22);scene.line([p.map((x,i)=>x+u[i]),p.map((x,i)=>x+u[i]+v[i]),p.map((x,i)=>x+v[i])],GOLD,'patch',.75);}
    $('#sy-patch-value').textContent=Math.abs(dot)<1e-7?`E ≠ 0，E·n = 0`:`E·n = ${fmt(dot,1)} V/m`;
  }
  function createGeometry(){
    scene.controls.minDistance=options.mode==='sphere'?Math.max(7,options.radius*3.5):7;scene.controls.update();
    for(const layer of ['source','gaussian','wire','vectors','labels','patch','direct-handles'])scene.clearLayer(layer);
    const {radius:r,length:L,halfWidth:w,mode,offset,sign}=options,symmetric=reading.symmetric;
    if(mode==='sphere'){
      mesh(new THREE.SphereGeometry(r,48,32),CYAN,.085);
      for(const u of [-.6,0,.6])circle(r*Math.sqrt(1-u*u),r*u,CYAN,.24);
      for(let j=0;j<4;j++){const phi=j*Math.PI/4;scene.line(Array.from({length:97},(_,i)=>{const t=i*Math.PI/48;return [r*Math.sin(t)*Math.cos(phi),r*Math.cos(t),r*Math.sin(t)*Math.sin(phi)];}),CYAN,'wire',.2);}
      const sourceBall=scene.charge({pos:[offset,0,0],Q:sign,radius:.2,label:''},'source');sourceBall.userData.dragKind='source';
      for(const u of [-.65,0,.65])for(let j=0;j<8;j++){const t=j*Math.PI/4+(u===0?0:.2),rad=r*Math.sqrt(1-u*u),p=[rad*Math.cos(t),r*u,rad*Math.sin(t)],E=symmetryField(p,options);arrow(p,E);}
      scene.dashedLine([[0,0,0],[r,0,0]],GOLD,'wire',.6);scene.label('r',[r*.53,-.25,0],GOLD,'labels',.28);
      if(!symmetric){scene.dashedLine([[0,0,0],[offset,0,0]],'#e59380','wire',.5);mesh(new THREE.SphereGeometry(.036,12,8),MUTED,1,[0,0,0],'patch');scene.label('面心',[0,-.31,0],MUTED,'labels',.24);}
      $('#sy-patch-name').textContent=symmetric?'面上每一点：同大、沿法向':'这一点：E 与外法向不再重合';normalPatch([r*.6,r*.8,0],[.6,.8,0]);
      handlePositions.radius=[r,0,0];handlePositions.source=[offset,0,0];
    }else if(mode==='line'){
      mesh(new THREE.CylinderGeometry(.035,.035,11,16),sign>0?'#ec927e':'#7ebee9',.95,[0,0,0],'source');
      for(const y of [-5,-3.5,0,3.5,5])scene.label(sign>0?'+':'−',[.18,y,0],sign>0?'#eaa58f':'#85caef','labels',.28);
      scene.label('向两端无限延伸',[0,5.6,0],MUTED,'labels',.3);
      for(const y of [-5.25,5.25])arrow([0,y,0],[0,Math.sign(y),0],sign>0?'#ec927e':'#7ebee9',.55);
      mesh(new THREE.CylinderGeometry(r,r,L,64,1,true),CYAN,patch==='active'?.13:.045);
      for(const y of [-L/2,L/2]){const cap=mesh(new THREE.CircleGeometry(r,64),GOLD,patch==='zero'?.17:.035,[0,y,0]);cap.rotation.x=Math.PI/2;circle(r,y,patch==='zero'?GOLD:CYAN,.65);}
      for(let j=0;j<8;j++){const t=j*Math.PI/4;scene.line([[r*Math.cos(t),-L/2,r*Math.sin(t)],[r*Math.cos(t),L/2,r*Math.sin(t)]],CYAN,'wire',.18);}
      for(const y of [-L*.32,0,L*.32])for(let j=0;j<8;j++){const t=j*Math.PI/4,p=[r*Math.cos(t),y,r*Math.sin(t)];arrow(p,symmetryField(p,options));}
      if(patch==='zero'){const p=[r*.62,L/2,r*.2];normalPatch(p,[0,1,0]);$('#sy-patch-name').textContent='端面：电场沿着面，不穿过';}else{normalPatch([r,0,0],[1,0,0]);$('#sy-patch-name').textContent='侧面：每一点 E 同大、沿法向';}
      scene.dashedLine([[0,0,0],[r,0,0]],GOLD,'wire',.55);scene.label('r',[r*.52,-.24,0],GOLD,'labels',.28);
      scene.dashedLine([[-r-.35,-L/2,0],[-r-.35,L/2,0]],MUTED,'wire',.55);scene.label(`L = ${L} mm`,[-r-.8,0,0],MUTED,'labels',.28);
      handlePositions.radius=[r,0,0];
    }else{
      const source=mesh(new THREE.PlaneGeometry(11,11),sign>0?'#d17c70':'#6b9fd2',.12,[0,0,0],'source');source.rotation.x=-Math.PI/2;
      for(const x of [-4,-2,0,2,4])for(const z of [-4,0,4]){scene.label(sign>0?'+':'−',[x,.02,z],sign>0?'#b27569':'#6999bf','labels',.23);}
      scene.label('带电面向四周无限延伸',[-3.6,0,4.8],MUTED,'labels',.27);
      for(const s of [-1,1]){const face=mesh(new THREE.PlaneGeometry(2*w,2*w),CYAN,patch==='active'?.15:.045,[0,s*r,0]);face.rotation.x=Math.PI/2;
        scene.line([[-w,s*r,-w],[w,s*r,-w],[w,s*r,w],[-w,s*r,w],[-w,s*r,-w]],CYAN,'wire',.6);
        for(const x of [-w*.62,0,w*.62])for(const z of [-w*.62,0,w*.62]){const p=[x,s*r,z];arrow(p,symmetryField(p,options));}
        const sideX=mesh(new THREE.PlaneGeometry(2*w,2*r),GOLD,patch==='zero'?.14:.025,[s*w,0,0]);sideX.rotation.y=Math.PI/2;
        mesh(new THREE.PlaneGeometry(2*w,2*r),GOLD,patch==='zero'?.14:.025,[0,0,s*w]);
      }
      for(const x of [-w,w])for(const z of [-w,w])scene.line([[x,-r,z],[x,r,z]],MUTED,'wire',.35);
      if(patch==='zero'){normalPatch([w,r*.48,w*.35],[1,0,0]);$('#sy-patch-name').textContent='侧面：电场沿着面，不穿过';}else{normalPatch([w*.55,r,0],[0,1,0]);$('#sy-patch-name').textContent='上、下面：各有一份 EA';}
      scene.label('A',[0,r,w*.65],CYAN,'labels',.36);scene.label('A',[0,-r,w*.65],CYAN,'labels',.36);
      scene.dashedLine([[w+.5,0,0],[w+.5,r,0]],GOLD,'wire',.7);handlePositions.radius=[w+.5,r,0];
    }
    const knob=mesh(new THREE.SphereGeometry(.11,20,14),GOLD,1,handlePositions.radius,'direct-handles');knob.userData.dragKind='radius';scene.label(mode==='plane'?'拖动高度':'拖动半径',handlePositions.radius.map((v,i)=>v+(i===1?.32:0)),GOLD,'labels',.24);
  }
  function sync(){
    reading=symmetryReadings(options);integral=integrateSymmetrySurface(options,{polar:24,azimuth:72});const m=MODE[options.mode],sphere=options.mode==='sphere',symmetric=reading.symmetric;
    $('#sy-title').textContent=m.surface;$('#sy-caption').textContent=symmetric?'青色部分：E 同大且垂直穿过':'总通量没变；同一个面上，E 已经不同';
    $('#sy-formula-tag').textContent=symmetric?'共同的 E 可以提出积分':'高斯定理仍成立，不能用一个 E 代替全表面';
    $('#sy-equation').textContent=symmetric?`${options.sign<0?'−':''}E · ${m.area} = Q内 / ε₀`:'∮ E · n dA = Q内 / ε₀';
    $('#sy-equation-note').textContent=symmetric?options.mode==='sphere'?'Q内 = Q':options.mode==='line'?'Q内 = λL；两个端面的贡献为 0':'Q内 = σA；四个侧面的贡献为 0':'源仍在球内，Q内不变；局部场强与方向变了';
    $('#sy-e-title').textContent=symmetric?'青色部分的场强 |E|':'球面场强范围 |E|';$('#sy-e').textContent=symmetric?fmt(reading.magnitude,1):`${fmt(reading.range[0],1)}—${fmt(reading.range[1],1)}`;
    $('#sy-area-title').textContent=symmetric?'公式中的面积 '+m.area:'球面积（不能直接乘单一 E）';$('#sy-area').textContent=fmt(reading.effectiveArea*1e6);$('#sy-enclosed').textContent=fmt(reading.enclosed*1e12,4);$('#sy-flux').textContent=fmt(integral.total,5);
    $('#sy-radius-label').textContent=options.mode==='plane'?'上下测量面距带电面 d':'高斯面半径 r';$('#sy-radius').min=options.mode==='plane'?'.4':'.6';$('#sy-radius').value=options.radius;$('#sy-radius-output').textContent=fmt(options.radius)+' mm';
    $('#sy-strength').value=options.strength;$('#sy-strength-label').textContent=sphere?'源电荷 Q':options.mode==='line'?'线电荷密度 λ':'面电荷密度 σ';$('#sy-strength-output').textContent=sphere?fmt(reading.source.Q*1e12,3)+' pC':options.mode==='line'?fmt(reading.source.lambda*1e9,4)+' pC/mm':fmt(reading.source.sigma*1e6,4)+' pC/mm²';
    $('#sy-double-r').disabled=options.radius*2>3.6;$('#sy-double-q').disabled=options.strength*2>4;$('#sy-offset').hidden=!sphere;$('#sy-offset').textContent=symmetric?'把源移偏':'让源回到中心';$('#sy-source-handle').hidden=!sphere;$('#sy-source-handle span').textContent=options.sign>0?'＋':'−';$('#sy-radius-handle b').textContent=options.mode==='plane'?'d':'r';$('#sy-sign').textContent=options.sign>0?'改为负电':'改为正电';
    container.querySelector('[data-sy-patch="zero"]').hidden=sphere;container.querySelector('[data-sy-patch="active"]').hidden=sphere;container.querySelector('[data-sy-patch="active"]').textContent=options.mode==='line'?'侧面：有通量':'上、下面：有通量';container.querySelector('[data-sy-patch="zero"]').textContent=options.mode==='line'?'端面：零通量':'四个侧面：零通量';container.querySelectorAll('[data-sy-patch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.syPatch===patch)));
    $('#sy-goal-task').textContent=sphere?'把红球拖到面心':options.mode==='line'?'拖金点，把柱面拉大':'拖金点，把上下测量面移远';
    $('#sy-goal-feedback').textContent=!symmetric?'E 的大小、方向随位置变化；现在不能用一个 E×面积。':sphere?'✓ 球面上 E 同大且沿法向，可以直接求 E。':options.mode==='line'?'每一层都垂直长直线；半径加倍，E 减半。':'两侧 E 始终垂直带电面；移远，E 的大小不变。';$('.sy-goal').classList.toggle('is-matched',symmetric);
    $('#sy-gesture').textContent=sphere?'直接拖红球 · 拖面上金点改变半径 · 拖空白旋转':options.mode==='line'?'拖金点改变柱面半径 · 点端面看零贡献 · 拖空白旋转':'拖金点改变测量高度 · 点侧面看零贡献 · 拖空白旋转';
    $('#sy-conclusion').textContent=!symmetric?'高斯定理对这个偏心配置依然成立；但面上 E 不再同大，不能直接写成 E×球面积。':options.mode==='sphere'?'扩大同心球面，同一份通量摊在更大的面积上；半径加倍，场强变为四分之一。':options.mode==='line'?'侧面随半径成比例增大，端面不贡献通量；半径加倍，场强减半。': '上、下两面各贡献 EA；把两面移远，包围电荷和面积都没变，场强不变。';
    const names={sphere:'球面',side:'柱侧面',capTop:'上端面',capBottom:'下端面',top:'上面',bottom:'下面',sides:'四个侧面'};
    $('#sy-integral').textContent=Object.entries(integral.parts).map(([key,value])=>`${names[key]} ${fmt(value,5)}`).join(' + ')+` = ${fmt(integral.total,5)} V·m。Q内/ε₀ = ${fmt(reading.expectedFlux,5)} V·m；独立积分误差 ${Math.abs(integral.total-reading.expectedFlux).toExponential(1)} V·m。`;
    $('#sy-model').textContent=sphere?'采用理想点电荷。红球是位置标记；此页不在源点取样，源偏移限制在球内以比较相同包围净电荷。':options.mode==='line'?`柱长 L = ${options.length} mm；线电荷贯穿整个空间。端面 E ≠ 0，而 E·n = 0，零通量不等于零电场。`:`每个盖面 A = ${fmt(reading.faceArea*1e6)} mm²；单独无限带电面的两侧场强均为 |σ|/(2ε₀)。它不是两块带异号电的平行板。`;
    $('#sy-change').hidden=!comparison;if(comparison)$('#sy-change').textContent=`${comparison.label}：${fmt(comparison.E,1)} → ${fmt(reading.magnitude,1)} V/m，变为原来的 ${fmt(reading.magnitude/comparison.E,2)} 倍${symmetric?'':'（此读数取球面右端）'}`;
    container.querySelectorAll('[data-sy-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.syMode===options.mode)));
    createGeometry();const spread=(reading.range[1]-reading.range[0])/((reading.range[1]+reading.range[0])/2),fluxRatio=integral.total/reading.expectedFlux;Object.assign(container.dataset,{symmetryMode:options.mode,symmetryRadius:String(options.radius),symmetryOffset:String(options.offset),symmetryE:String(reading.magnitude),symmetryFlux:String(integral.total),symmetryExpected:String(reading.expectedFlux),symmetryArea:String(reading.effectiveArea),symmetryEnclosed:String(reading.enclosed),symmetryUniform:String(reading.symmetric),symmetryPatch:patch,symmetrySpread:String(spread),symmetryFluxRatio:String(fluxRatio)});container.dispatchEvent(new CustomEvent('lab-state',{bubbles:true,detail:{unit:'symmetry',lab:'symmetry',mode:options.mode,kind:options.mode,radius:options.radius,offset:options.offset,E:reading.magnitude,flux:integral.total,expectedFlux:reading.expectedFlux,enclosedQ:reading.enclosed,effectiveArea:reading.effectiveArea,symmetric:reading.symmetric,spread,fluxRatio,patch,parts:integral.parts}}));
  }
  function change(values,keepComparison=false){Object.assign(options,values);if(options.mode==='sphere'){options.offset=clamp(options.offset,-options.radius*.65,options.radius*.65);if(Math.abs(options.offset)<.05)options.offset=0;}if(!keepComparison)comparison=null;cancelAnimationFrame(drawPending);drawPending=requestAnimationFrame(()=>{drawPending=0;if(!disposed)sync();});}
  container.querySelectorAll('[data-sy-mode]').forEach(b=>b.onclick=()=>{options=symmetryOptions({mode:b.dataset.syMode,radius:MODE[b.dataset.syMode].radius,offset:b.dataset.syMode==='sphere'?.75:0});patch='active';comparison=null;resetView();sync();});
  container.querySelectorAll('[data-sy-patch]').forEach(b=>b.onclick=()=>{patch=b.dataset.syPatch;sync();});
  $('#sy-radius').oninput=e=>change({radius:+e.target.value});$('#sy-strength').oninput=e=>change({strength:+e.target.value});
  $('#sy-double-r').onclick=()=>{comparison={label:'距离 ×2',E:reading.magnitude};change({radius:options.radius*2},true);};$('#sy-double-q').onclick=()=>{comparison={label:'源量 ×2',E:reading.magnitude};change({strength:options.strength*2},true);};
  $('#sy-offset').onclick=()=>change({offset:Math.abs(options.offset)<1e-8?options.radius*.55:0});$('#sy-sign').onclick=()=>change({sign:-options.sign});$('#sy-reset').onclick=()=>{options=symmetryOptions({mode:options.mode,radius:MODE[options.mode].radius});patch='active';comparison=null;sync();};$('#sy-view-reset').onclick=resetView;
  const ray=new THREE.Raycaster(),dragPlane=new THREE.Plane();
  function pointOnDrag(event){const rect=scene.renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),scene.camera);const p=new THREE.Vector3();return ray.ray.intersectPlane(dragPlane,p)?p:null;}
  for(const kind of ['radius','source']){
    const el=$(`#sy-${kind}-handle`);el.onpointerdown=e=>{e.preventDefault();e.stopPropagation();drag={kind,id:e.pointerId,element:el};const p=new THREE.Vector3(...handlePositions[kind]);dragPlane.setFromNormalAndCoplanarPoint(scene.camera.getWorldDirection(new THREE.Vector3()),p);scene.controls.enabled=false;el.setPointerCapture(e.pointerId);el.classList.add('is-dragging');};
    el.onpointermove=e=>{if(!drag||drag.element!==el)return;const p=pointOnDrag(e);if(!p)return;if(kind==='source')change({offset:clamp(p.x,-options.radius*.65,options.radius*.65)});else change({radius:clamp(options.mode==='plane'?p.y:p.x,options.mode==='plane'?.4:.6,3.6)});};
    const end=e=>{if(!drag||drag.element!==el)return;el.releasePointerCapture?.(e.pointerId);el.classList.remove('is-dragging');drag=null;scene.controls.enabled=true;};el.onpointerup=end;el.onpointercancel=end;
    el.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const delta=['ArrowRight','ArrowUp'].includes(e.key)?.08:-.08;change(kind==='source'?{offset:clamp(options.offset+delta,-options.radius*.65,options.radius*.65)}:{radius:clamp(options.radius+delta,options.mode==='plane'?.4:.6,3.6)});};
  }
  const canvas=scene.renderer.domElement;
  function setPointerRay(e){const rect=canvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),scene.camera);}
  function startObjectDrag(e){if(e.button>0)return;setPointerRay(e);const hit=ray.intersectObjects([...scene.layer('source').children,...scene.layer('direct-handles').children],true).find(h=>h.object.userData.dragKind);if(!hit)return;const kind=hit.object.userData.dragKind,p=new THREE.Vector3(...handlePositions[kind]),normal=scene.camera.getWorldDirection(new THREE.Vector3());if(kind==='radius'&&options.mode==='plane')normal.y=0;else normal.x=0;if(normal.lengthSq()<1e-8)return;dragPlane.setFromNormalAndCoplanarPoint(normal.normalize(),p);const intersection=new THREE.Vector3();if(!ray.ray.intersectPlane(dragPlane,intersection))return;drag={kind,id:e.pointerId,offset:p.clone().sub(intersection),element:canvas};scene.cameraMove=null;scene.controls.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.preventDefault();e.stopImmediatePropagation();}
  function moveObjectDrag(e){if(!drag||drag.element!==canvas){setPointerRay(e);canvas.style.cursor=ray.intersectObjects([...scene.layer('source').children,...scene.layer('direct-handles').children],true).some(h=>h.object.userData.dragKind)?'grab':'default';return;}const p=pointOnDrag(e);if(!p)return;p.add(drag.offset);change(drag.kind==='source'?{offset:clamp(p.x,-options.radius*.65,options.radius*.65)}:{radius:clamp(options.mode==='plane'?p.y:p.x,options.mode==='plane'?.4:.6,3.6)});e.preventDefault();e.stopImmediatePropagation();}
  function endObjectDrag(e){if(!drag||drag.element!==canvas)return;drag=null;canvas.releasePointerCapture?.(e.pointerId);canvas.style.cursor='grab';scene.controls.enabled=true;if(drawPending){cancelAnimationFrame(drawPending);drawPending=0;sync();}e.preventDefault();e.stopImmediatePropagation();}
  canvas.addEventListener('pointerdown',startObjectDrag,true);canvas.addEventListener('pointermove',moveObjectDrag,true);canvas.addEventListener('pointerup',endObjectDrag,true);canvas.addEventListener('pointercancel',endObjectDrag,true);
  const viewport=new IntersectionObserver(entries=>{inViewport=entries[0].isIntersecting;},{threshold:0});viewport.observe($('.sy-stage'));
  scene.frameFn=()=>{if(!inViewport||disposed)return;const rect=$('.sy-stage').getBoundingClientRect();for(const [kind,p] of Object.entries(handlePositions)){const projection=new THREE.Vector3(...p).project(scene.camera),el=$(`#sy-${kind}-handle`);el.style.left=(projection.x+1)*rect.width/2+'px';el.style.top=(1-projection.y)*rect.height/2+'px';el.style.visibility=projection.z>1?'hidden':'visible';container.dataset[kind==='radius'?'symmetryRadiusScreen':'symmetrySourceScreen']=JSON.stringify([rect.left+(projection.x+1)*rect.width/2,rect.top+(1-projection.y)*rect.height/2]);}const center=new THREE.Vector3(0,0,0).project(scene.camera);container.dataset.symmetryCenterScreen=JSON.stringify([rect.left+(center.x+1)*rect.width/2,rect.top+(1-center.y)*rect.height/2]);container.dataset.symmetryCamera=JSON.stringify(scene.camera.position.toArray());};
  sync();return()=>{disposed=true;cancelAnimationFrame(drawPending);viewport.disconnect();canvas.removeEventListener('pointerdown',startObjectDrag,true);canvas.removeEventListener('pointermove',moveObjectDrag,true);canvas.removeEventListener('pointerup',endObjectDrag,true);canvas.removeEventListener('pointercancel',endObjectDrag,true);scene.dispose();container.innerHTML='';};
}
