import {fieldAt} from './physics.js';
import {DIPOLE_SOURCES,SINGLE_SOURCE} from './potential-surfaces.js';
import {evaluateObservation,numberText} from './lesson-observations.js';

export const LESSONS={
 foundations:{question:'换一颗电荷，这个位置的场会变吗？',why:'同一个位置，电场有多强、粒子受多大力，是两件可以分别测的事。',goals:['用 E = F/q 区分场与力，辨认正、负电荷的受力方向。','拖动测量点，核对点源、长线、平面的方向和距离规律。','比较有限物体与理想模型，给出近似误差。'],codes:[1,2,4],tasks:[
  ['charge','先别挪 P，把 +e 换成 +2e 或 −e。','E 是否不变？F 是否按带符号的 q 成比例变化？'],
  ['point-distance','选点电荷，把 P 到源的距离拉到原来的 2 倍。','允许 ±5% 的距离误差；核对 E 是否约为原来的 1/4。'],
  ['line-distance','选无限长线，把 P 到线的垂直距离拉到 2 倍。','沿线没有场分量；距离加倍时，E 约为原来的 1/2。'],
  ['plane-distance','选无限大平面，把 P 移到同侧更远处。','场始终垂直平面，同侧的 E 不随距离改变。'],
  ['finite','打开有限比较，拉大源，或把 P 靠近中部。','把与无限模型的场强误差降到 5% 以下。']
 ]},
 field:{question:'两个源同时在场，P 点到底向哪边受力？',why:'把两个贡献放在同一个 P 点，方向相加的结果才是当地的场。',goals:['在同一 P 点按 x、y、z 分量叠加 E₁ 与 E₂。','找到同号源的抵消点，比较异号源中点的增强。','保持 P 不动，换电荷符号，区分 E 与 F。'],codes:[1,4],tasks:[
  ['cancel','选两个同号源，把黄点 P 拖到两源中间的抵消位置。','让 |E₁ + E₂| 小于单个分场的 3%。'],
  ['reinforce','换成等量异号源，再把 P 拖到中点。','两个贡献方向相同，|E| 接近 |E₁| + |E₂|。'],
  ['force-sign','P 不动，把试探电荷换一个符号。','E 保持原值，F 反向；虚线仍连接源与这个 P。']
 ]},
 flux:{question:'看不见里面，只测包围面能知道净电荷吗？',why:'单独看一处 E 不够；把整个闭合面朝外、朝内的贡献加起来，才得到内部净电荷的信息。',goals:['用 E·n̂ dA 判断正、负、零通量，追踪同一条线穿入与穿出。','把表面积分与 Q内/ε₀ 独立比较，解释“有源”。','改变面的形状，区分“净通量为零”和“处处无场”。'],codes:[3],tasks:[
  ['outside','在包围面外挪动红球，看一条线怎样进入、离开。','看同一条高亮线的一进一出；外部有场，净通量仍接近零。'],
  ['inside','把红球完整拖进包围面。','独立表面积分给出 ε₀Φ ≈ Q内。'],
  ['reshape','红球留在里面，拖动包围面的边缘手柄。','面积、夹角和局部场改变，包入电量与净通量保持不变。']
 ]},
 symmetry:{question:'知道总通量，什么时候能算出每一点的场？',why:'只有能确定面上场强和方向的关系，才可以把一个 E 从积分中提出来。',goals:['给球、线、平面配同心球、同轴柱、跨面薄盒。','用有效面积求 E，核对 1/r²、1/r 和常量三种规律。','把球源移偏，辨认高斯定理仍成立而 EA 简化失效。'],codes:[2,3,4],tasks:[
  ['center','把球源拖回面心，再拖金点改变半径。','面上 E 等大、沿法向；正源向外、负源向内。核对 E×r² 不变。'],
  ['offset','源仍留在面内，把它移离中心。','总通量不变，面上的最大与最小 E 却开始不同。'],
  ['models','分别看长线与平面，拖动高斯面的尺寸。','找亮起的有效表面；端盖或侧壁上 E·n̂ = 0。']
 ]},
 potential:{question:'粒子明明受力，怎样移动却不让电场做功？',why:'让位移始终垂直当地的力，就能沿等势面移动；受力不为零，电场的功仍可为零。',goals:['用 V = U/q 与 V₁ + V₂ 描述位置的电势。','沿等势面扫出一张面，核对 F·dr = 0；区分受力与做功。','比较自由释放的 W、−ΔU 和 ΔK，理解零点约定。'],codes:[1,5,6],tasks:[
  ['surface','点“沿面扫行”，让粒子扫过选中的等势面。','粒子受力不为零；切向位移与 F 垂直，W ≈ 0。'],
  ['potential-charge','保持这层电势，换成 −e。','同一个位置的 V 不变，U = qV 的符号改变。'],
  ['zero','选 0 V 面，让粒子在两源之间移动。','V₁ 与 V₂ 抵消；V = 0 的位置仍有 E 和 F。'],
  ['energy','切到“释放电荷”，让粒子从静止开始运动。','核对电场做功 W = −ΔU = ΔK，数值不再为零。'],
  ['reference','展开“∞ 零电势参考”，把测量点拖向远处。','有限电荷体系在 r → ∞ 时 V → 0；无穷远不是近处某个零势点。']
 ]},
 paths:{question:'绕一条更长的路，电场会多做功吗？',why:'路线各段的功可能不同；固定起点和终点，看两条路最后的累计值。',goals:['分别用 q∫E·dr 和 q(VA−VB) 计算电场做功。','沿有正功也有负功的闭路走完，核对 ∮E·dr = 0。','转动并缩短一小步，比较 E·û 与 −ΔV/Δs。'],codes:[3,5,6],tasks:[
  ['routes','拖金色柄绕远一些，再让两颗粒子同时走到 B。','比较两条路累计的功与 q(VA−VB)，允许 0.01 eV 误差。'],
  ['loop','选“闭合一圈”，完整走回起点。','中途有正、负功，最后累计功接近 0。'],
  ['gradient','选“转动一小步”，把紫色方向对准 E，再缩短步长。','核对 −ΔV/Δs 逐渐接近 E 在该方向的分量。']
 ]},
 conductors:{question:'外场还在，金属里面为什么可以没有总电场？',why:'剖开金属球，分别看外场与感应场；两者在材料内部相消。',goals:['移动探针，核对中性球内 E外 + E感应 = 0。','沿表面测量，辨认等势与切向场为零。','对孤立带电球分别求球内外 E、V，核对表面势连续。'],codes:[7],tasks:[
  ['inside','在剖开的中性球内部挪动 P，测几个位置。','外场非零、感应场反向，合场约为零。'],
  ['surface','点“沿表面”，再把 P 拖到另一处表面。','V 不变，切向场为零；法向场可随位置变化。'],
  ['charged','选孤立带电球，把 P 从球外拖到球内。','球内 E = 0、V = kQ/R；球外 E 随 1/r²、V 随 1/r。']
 ]},
 applications:{question:'同样是静电，什么时候帮助我们，什么时候引发风险？',why:'先看实物和现场，再追踪电荷积累、局部强场、放电与后果之间的联系。',goals:['从有来源的照片中辨认设备、放电间隙与相关物料。','用 E、F、V、做功及静电平衡解释一个具体过程。','在案例内用 5W2H 检查事实和机制，改变一个防护条件。'],codes:[1,6,7],tasks:[
  ['case','点开一张案例照片，播放过程并打开本案例的 5W2H。','事实、机制和示意分别标注；留意高亮的关注部位。'],
  ['condition','改变案例中的一个防护条件，比较过程。','接地、等电位连接或隔离改变了哪一段过程？']
 ]}
};
const GOAL_DEPENDENCIES={foundations:[['charge'],['point-distance','line-distance','plane-distance'],['finite']],field:[['cancel','reinforce'],['cancel','reinforce'],['force-sign']],flux:[['outside','inside'],['inside'],['outside','reshape']],symmetry:[['center','models'],['center','models'],['offset']],potential:[['potential-charge','zero'],['surface'],['energy','reference']],paths:[['routes'],['loop'],['gradient']],conductors:[['inside'],['surface'],['charged']],applications:[['case'],['case'],['condition']]};
export function briefMarkup(id){const l=LESSONS[id];const photo=id==='foundations'?`<figure class="lesson-context-photo"><a href="charge.html#spark" aria-label="看金属球充电与火花"><img src="assets/cases/spark.jpg" alt="静电发生器两只金属球之间的真实火花照片" width="150" height="100"></a><figcaption>这条火花从哪里来？<br>先测金属球周围不同位置的场。<small>实验实拍，非事故现场 · Moses Nachman Newman · CC BY 4.0</small><a href="https://commons.wikimedia.org/wiki/File:Large_Discharge_Spheres_on_Quadruple_Bonetti_Machine.jpg" target="_blank" rel="noopener">照片来源 ↗</a></figcaption></figure>`:'';return `<section class="lesson-brief" aria-label="本节问题与学习目标"><span class="lesson-eyebrow">这一节的问题</span><h2>${l.question}</h2><p>${l.why}</p>${photo}<details class="lesson-goals" open><summary>本节要学会</summary><ul>${l.goals.map((g,i)=>`<li data-goal="${i}"><span aria-hidden="true">○</span>${g}</li>`).join('')}</ul><a href="syllabus.html">对应大纲 ${l.codes.map(c=>'('+c+')').join('、')} ↗</a></details></section>`;}
const json=(v,f=[])=>{try{return JSON.parse(v)}catch{return f}};
const n=v=>Number(v),norm=v=>Math.hypot(...v);
export function readObservation(id,host,eventState){
 const d=host.dataset,c=host.querySelector('canvas')?.dataset||{};
 if(id==='foundations')return eventState||json(d.labState,null);
 if(id==='flux'){const s=eventState||{sourceQ:.1,sourcePosition:json(d.fluxSourcePosition),enclosedPC:n(d.fluxEnclosed),flux:n(d.fluxValue),radii:json(d.fluxRadii)};return{...s,sourceCharge:s.sourceQ*1e-12,enclosedCharge:s.enclosedPC*1e-12};}
 if(id==='symmetry')return eventState||{mode:d.symmetryMode,radius:n(d.symmetryRadius),E:n(d.symmetryE),offset:Math.abs(n(d.symmetryOffset)),spread:n(d.symmetrySpread),fluxRatio:n(d.symmetryFluxRatio)};
 if(id==='field')return {unit:id,E:json(c.vectorE),F:json(c.vectorF),E1:json(c.vectorE1),E2:json(c.vectorE2),P:json(c.probe),sources:json(c.sources),q:n(c.forceSign),preset:host.querySelector('[data-preset].active')?.dataset.preset};
 if(id==='potential'){const P=json(d.potentialProbe),f=P.length?fieldAt(P,d.potentialStep==='3'?DIPOLE_SOURCES:SINGLE_SOURCE):{E:[0,0,0]},far=json(d.potentialFarReference,{});return{unit:id,mode:n(d.potentialStep),q:n(host.querySelector('[data-probe-sign].active')?.dataset.probeSign)||1,progress:n(d.potentialProgress),W:n(d.potentialWork),K:n(d.potentialDeltaK),deltaU:n(d.potentialDeltaU),V:n(d.potentialVoltage),level:n(d.potentialSelectedLevel),E:norm(f.E),tangent:n(d.potentialNormalDotTangent),U:n(d.potentialEnergy),P,farV:far.V,farDistance:far.distance};}
 if(id==='paths')return{unit:id,mode:d.pathMode,progress:n(d.pathProgress),W1:n(d.pathWorkDirect),W2:n(d.pathWorkDetour),endpoint:n(d.pathEndpointWork),slope:n(d.pathLocalSlope),parallel:n(d.pathLocalParallel),step:n(host.querySelector('#paths-step')?.value),handle:json(d.pathHandle)};
 if(id==='conductors')return{unit:id,mode:d.conductorMode,P:json(d.conductorProbe),E:json(d.conductorE),V:n(d.conductorV),inside:d.conductorInside==='true',surface:d.conductorSurface==='true',tangent:n(d.conductorTangential),external:json(d.conductorExternal),induced:json(d.conductorInduced),radius:n(d.conductorRadius),Q:n(d.conductorNetQ)*1e-12};
 return{unit:id,case:new URLSearchParams(location.search).get('case'),analysis:[...host.querySelectorAll('details[open]>summary')].some(el=>el.textContent.includes('5W2H')),stage:n(host.querySelector('[data-step][aria-pressed=true]')?.dataset.step),condition:JSON.stringify([...host.querySelectorAll('input:checked,[data-state].active')].map(el=>el.id||el.dataset.state))};
}
export function mountLessonGuide(host,id,experience){
 const l=LESSONS[id];let index=0,memory={},interaction=0,eventState=null,pendingSince=0,completed=false,disposed=false;
 let saved={};const storageKey='electrostatics-observations-v3-'+id;try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'{}')}catch{}
 host.innerHTML=`<div class="lesson-task-top"><span class="lesson-task-count"></span><strong class="lesson-task-title"></strong><button class="lesson-task-next" hidden>下一件事 →</button></div><p class="lesson-task-instruction"></p><output class="lesson-task-evidence" aria-live="polite"></output>`;
 const $=s=>host.querySelector(s);
 const draw=()=>{const t=l.tasks[index];$('.lesson-task-count').textContent=`动手 ${index+1} / ${l.tasks.length}`;$('.lesson-task-title').textContent=t[1];$('.lesson-task-instruction').textContent=t[2];$('.lesson-task-evidence').textContent='直接操作图中的物体，结果会显示在这里。';host.dataset.task=t[0];host.dataset.complete='false';host.classList.remove('is-complete');$('.lesson-task-next').hidden=true;memory={};interaction=0;pendingSince=0;completed=false;};
 const act=e=>{if(e.isTrusted)interaction++;};for(const type of ['pointerdown','input','keydown','click'])experience.addEventListener(type,act);
 const state=e=>{if((e.detail?.unit||e.detail?.lab)===id)eventState=e.detail;};experience.addEventListener('lab-state',state);
 function update(){if(disposed||completed)return;const value=readObservation(id,experience,eventState);if(!value)return;const result=evaluateObservation(id,l.tasks[index][0],value,memory);$('.lesson-task-evidence').textContent=result.evidence||'等待图中测量值…';
  if(result.pass&&interaction){if(!pendingSince)pendingSince=performance.now();if(performance.now()-pendingSince>450){completed=true;host.dataset.complete='true';host.classList.add('is-complete');$('.lesson-task-evidence').textContent='✓ '+result.evidence;saved[l.tasks[index][0]]=true;try{sessionStorage.setItem(storageKey,JSON.stringify(saved))}catch{};$('.lesson-task-next').hidden=false;$('.lesson-task-next').textContent=index<l.tasks.length-1?'下一件事 →':'本节观察已完成 ✓';$('.lesson-task-next').disabled=index===l.tasks.length-1;document.querySelectorAll('.lesson-goals li').forEach((el,i)=>{if(GOAL_DEPENDENCIES[id][i].every(key=>saved[key])){el.classList.add('observed');el.querySelector('span').textContent='✓';}});}}else pendingSince=0;
 }
 $('.lesson-task-next').onclick=()=>{if(index<l.tasks.length-1){index++;draw();update();}};draw();update();const timer=setInterval(update,180);
 return()=>{disposed=true;clearInterval(timer);experience.removeEventListener('lab-state',state);for(const type of ['pointerdown','input','keydown','click'])experience.removeEventListener(type,act);};
}
