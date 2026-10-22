import {fieldAt,CONSTANTS} from './physics.js';
import {makeRoute,routePoint,integrateRoute} from './paths-physics.js';
import {fieldExercise,pathExercise,fluxExercise,calculateSlots,parsePastedNumbers,checkNumeric,gaussEvidence} from './practice-physics.js';

const lessons={
 field:{title:'第一题：电子受力',short:'第一题 · 电子受力',unit:'fN',formula:'A+B',prompt:'两颗正源电荷固定。请拖动电子所在的黄点 P，让金色受力箭头朝上。方向不对，就继续调整。',steps:['先拖动 P，让电子受力朝上。','记录位置，写下观察与判断。','再把两个竖直分力相加，求合力 Fᵧ。'],answer:'记录位置的竖直合力 Fᵧ',explain:'你怎样调整成功的？为什么金色受力箭头与青色电场箭头方向相反？',mount:'mountField',module:'./field-page.js'},
 paths:{title:'第二题：电势差与路径',short:'第二题 · 电势差与路径',unit:'V',formula:'A-B',prompt:'先看平行板间的等势线，固定 A、B，只改变路径。观察电势差是否改变，再换成双带电球验证。',steps:['看 A、B 所在的等势线和电势读数。','拖动金色柄改变路径，保持 A、B 不动。','计算 U_AB=V_A−V_B，再换双球验证。'],answer:'两点电势差 U_AB = V_A − V_B',explain:'路径改变时，为什么两点电势差不变？若移动端点，结论还相同吗？',mount:'mountPotentialPaths',module:'./potential-path-page.js'},
 flux:{title:'高斯定理：从观测归纳关系',short:'第三题 · 通量与电荷',unit:'pC',formula:'A*B*1e12',prompt:'只用闭合面上的电场通量反推内部净电荷。收集不同位置和不同面形的记录，再写出你发现的关系。',steps:['把电荷放在面外、面内，各记录一次。','保持电荷完全在面内，拉动面上的金点改变形状，再记录一次。','计算 Q内 = ε₀Φ，说明零净通量是否意味着表面各处电场为零。'],answer:'由通量推断的内部净电荷',explain:'闭合面变形后，什么量不变？零净通量为什么不能推出电场处处为零？',mount:'mountFlux',module:'./flux-page.js'}
};
const requested=new URLSearchParams(location.search).get('unit'),key=Object.hasOwn(lessons,requested)?requested:'field',lesson=lessons[key];
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number.isFinite(n)?Number(n.toPrecision(7)).toString():'—',pretty=p=>p.map(num).join(', ');
let records=[],active=null,dispose,fluxState,lastCalculation=null,sketchMode='pen',drawing=null;
document.title=lesson.title+' · 静电场';
$('#practice-app').innerHTML=`<header class="work-header"><div><h1>在图中解题</h1><p>静电场 · 观察、取数、计算与解释</p></div><div class="work-links"><a href="chapter.html?unit=${key}">回到正文</a><a href="index.html">教材目录</a><button id="export-readable">导出作业页</button><button id="export-records">导出数据</button></div></header>
<main class="work-main"><nav class="work-tabs" aria-label="选择样题">${Object.entries(lessons).map(([id,l])=>`<a href="practice.html?unit=${id}" ${id===key?'aria-current="page"':''}>${l.short}</a>`).join('')}</nav>
<div class="work-grid"><section class="work-scene" aria-label="可操作的题目插图"><div class="dimension-toolbar" role="group" aria-label="图形维度"><button data-dimension="3d" aria-pressed="true">三维</button><button data-dimension="xy" aria-pressed="false">二维 XY</button><button data-dimension="xz" aria-pressed="false">二维 XZ</button><button data-dimension="yz" aria-pressed="false">二维 YZ</button><span id="dimension-note">三维空间 · 拖动空白旋转</span></div><div id="experience"></div></section><aside class="work-question"><span class="kicker">教学样题 · 可由老师替换</span><h2>${lesson.title}</h2><p>${lesson.prompt}</p><ol>${lesson.steps.map(s=>`<li>${s}</li>`).join('')}</ol><button class="primary work-capture" id="capture" disabled>记录当前图形 ↓</button><p id="snapshot-status" class="snapshot-status" aria-live="polite">图形载入中…</p><p class="status-note" id="task-hint">取数后，在下方实验记录中拖入数据、写算式，也可以粘贴多个数。</p><label for="answer">${lesson.answer}（${lesson.unit}）</label><input id="answer" inputmode="decimal" placeholder="输入数值或算式"><label for="reason">${lesson.explain}</label><textarea id="reason" rows="3" placeholder="用图和计算支持你的解释"></textarea><div class="work-actions"><button id="check-answer">核对数值</button><button id="show-hint">查看提示</button></div><p id="answer-feedback" class="work-message" role="status"></p><small>数值核对采用 1% 相对容差（近零时用绝对容差）。文字解释由教师评阅；操作完成不等于已经理解。</small></aside></div>
<div class="notebook"><section><div class="notebook-title"><h2>实验记录与画图</h2><span class="kicker" id="record-label">尚未取数</span></div><p class="empty-note" id="sketch-caption">下图是记录时的 XY 投影，坐标单位 mm；不是三维剖面。可画辅助线、矢量箭头或文字。</p><svg id="sketch" class="work-sketch" viewBox="0 0 620 350" aria-label="取数图形的 XY 投影和可编辑批注"><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#ae7625"/></marker></defs><g id="sketch-base"></g><g id="sketch-ink"></g></svg><div class="sketch-tools"><button data-draw="pen" aria-pressed="true">画线</button><button data-draw="arrow" aria-pressed="false">画箭头</button><input id="annotation-text" aria-label="批注文字" maxlength="60" placeholder="输入批注文字"><button data-draw="text" aria-pressed="false">点击放文字</button><button id="undo-ink">撤销一笔</button></div><div id="record-detail" class="record-detail"></div><div id="evidence"></div></section>
<section><div class="notebook-title"><h2>把数据放进算式</h2><span class="kicker">取数 → 组式 → 计算</span></div><p class="empty-note">点数据标签可填入对应槽，也可拖到任一槽。下方单位固定，填写时请先换成相应单位。</p><div id="data-chips" class="data-chips"></div><div id="slots" class="slot-grid"></div><details class="paste-box"><summary>一次粘贴多个数</summary><p id="paste-order" class="empty-note">先记录图形。</p><textarea id="paste-values" rows="2" aria-label="批量粘贴数值" placeholder="空格、逗号、制表符或换行分隔"></textarea><button id="apply-paste">填入对应槽</button></details><label for="expression">算式（用上面的字母代入）</label><div class="calc-line"><input id="expression" value="${lesson.formula}" spellcheck="false"><button id="calculate" class="primary">计算</button></div><p class="empty-note">支持 + − × ÷、括号、^ 和科学记数法。${key==='field'?'本题只算竖直合力：Fᵧ=F₁y+F₂y，向上为正。1 fN=10⁻¹⁵ N。':key==='paths'?'A 槽是 V_A，B 槽是 V_B；A−B 得到 U_AB（V）。槽字母只是计算标签。':'ε₀Φ 的单位为 C；乘 10^12 换成 pC。'}</p><output id="calc-result" class="calc-result" aria-live="polite"></output><div><button id="use-result" disabled>把结果填到答案</button></div><p id="calc-feedback" class="work-message" role="status"></p><small>计算槽可自行修改，不会改动原始取数。核对始终以本条记录为依据。</small></section></div>
<footer class="work-footer">所有读数均来自现代静电模型。记录只保存在本页内存中，切换题目或离开前请导出；文件包含图形状态、算式、答案、解释和批注，可交给老师复核。<span id="export-message" role="status"></span></footer></main>`;

const frontierLink=document.createElement('a');
frontierLink.href=`frontier.html?case=${key==='paths'?'graphene':'droplet'}`;
frontierLink.textContent='从课本再走一步';
document.querySelector('.work-links').append(frontierLink);
const host=$('#experience');host.addEventListener('lab-state',e=>{if(e.detail?.lab==='flux')fluxState=e.detail;});
try{const module=await import(lesson.module);dispose=module[lesson.mount](host,{dimensions:true,practiceTrial:key==='field'});$('#capture').disabled=false;$('#snapshot-status').textContent='拖动图形，准备好后记录。';document.body.dataset.ready='true';}
catch(error){console.error(error);$('#snapshot-status').textContent='图形未载入。请用本地启动器打开，并检查浏览器是否支持 WebGL。';document.body.dataset.ready='error';}
window.addEventListener('pagehide',()=>dispose?.(),{once:true});
document.querySelectorAll('[data-dimension]').forEach(button=>button.onclick=()=>host.dispatchEvent(new CustomEvent('set-dimension',{detail:{mode:button.dataset.dimension}})));
host.addEventListener('dimension-changed',event=>{
 const mode=event.detail.mode;document.querySelectorAll('[data-dimension]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.dimension===mode)));
 $('#dimension-note').textContent=mode==='3d'?'三维空间 · 拖动空白旋转':`${mode.toUpperCase()} 正投影 · ${({xy:'z',xz:'y',yz:'x'})[mode]} 深度保留，未置零 · 滚轮缩放`;
});


function readState(){
 if(key==='field'){
  const d=host.querySelector('canvas').dataset;
  return {quantity:'vertical-force',p:JSON.parse(d.probe),sign:Number(d.forceSign),sources:JSON.parse(d.sources).map((pos,i)=>({pos,Q:Number(host.querySelector('#q'+(i+1)).value),radius:.24}))};
 }
 if(key==='paths'){
  const d=host.dataset;if(d.pathMode!=='routes')throw Error('请先在图上选择“两条路”，再记录完整 A→B 路径。');
  return {model:d.pathModel,A:JSON.parse(d.pathA),B:JSON.parse(d.pathB),handle:JSON.parse(d.pathHandle),q:Number(d.pathCharge)};
 }
 if(!fluxState)throw Error('通量还在计算，请稍后再取数。');
 const s=fluxState,p=[s.radii[0],0,0],E=fieldAt(p,[{pos:s.sourcePosition,Q:s.sourceQ,radius:.42}]).E;
 return {pos:[...s.sourcePosition],radii:[...s.radii],sourceQ:s.sourceQ,flux:s.flux,enclosed:s.enclosedPC,inside:s.inside,outside:s.outside,error:s.integralError,localE:Math.hypot(...E)};
}
function saveWork(){if(!active)return;Object.assign(active,{sketchSVG:$('#sketch').outerHTML,answer:$('#answer').value,reason:$('#reason').value,expression:$('#expression').value,slots:[...document.querySelectorAll('[data-slot]')].map(i=>i.value)});}
$('#answer').oninput=$('#reason').oninput=saveWork;
host.addEventListener('begin-quantitative',()=>{if(!active)return;saveWork();active.qualitative={...active.qualitative,reason:active.reason,goal:active.goal};active.taskType='quantitative';$('#reason').value='';$('#answer-feedback').textContent='';saveWork();});
$('#capture').onclick=()=>{
 try{
  if(records.length>=30)throw Error('本题已记录 30 组。请先导出，再刷新开始新一轮。');
  const state=readState();
  if(key==='field'&&state.sources.some(s=>Math.hypot(...state.p.map((v,i)=>v-s.pos[i]))<=s.radius))throw Error('本题要求球外观察点。请把 P 拖到两颗带电球外，再记录。');
  saveWork();const result=({field:fieldExercise,paths:pathExercise,flux:fluxExercise})[key](state);
  active={id:records.length+1,time:new Date().toISOString(),taskType:'qualitative',qualitative:{prompt:document.querySelector('#reason').labels?.[0]?.textContent||lesson.explain,observations:JSON.parse(host.dataset.qualitativeEvidence||'{}')},goal:key==='field'?{id:'force-direction',matched:host.dataset.challengeCurrentMatch==='true',completed:host.dataset.challengeCompleted==='true',angleDegrees:Number(host.dataset.challengeAngle)}:null,view:host.dataset.dimension==='3d'?'xy':host.dataset.dimension,state,result,ink:[],answer:'',reason:'',checks:[],calculations:[]};records.push(active);
  $('#answer').value='';$('#reason').value='';$('#answer-feedback').textContent='';$('#calc-result').textContent='';$('#calc-feedback').textContent='';$('#use-result').disabled=true;lastCalculation=null;
  $('#expression').value=lesson.formula;$('#snapshot-status').textContent=`已记录第 ${active.id} 组；后续拖动不会改动这组数据。`;
  $('#record-label').textContent=`记录 ${active.id} / ${records.length}`;
  $('#data-chips').innerHTML=result.values.map((v,i)=>`<button class="data-chip" data-value-index="${i}" draggable="true" title="点击填入 ${String.fromCharCode(65+i)} 槽，或拖到另一槽"><span>${result.labels[i]}</span><strong>${num(v)}</strong><small>${result.units[i]}</small></button>`).join('');
  $('#slots').innerHTML=result.values.map((v,i)=>`<label>${String.fromCharCode(65+i)} · ${result.labels[i]} (${result.units[i]})<input data-slot="${i}" aria-label="${String.fromCharCode(65+i)} 槽" placeholder="拖入或粘贴数值" inputmode="decimal"></label>`).join('');
  $('#paste-order').textContent='按 '+result.labels.join('、')+' 的顺序填写 '+result.values.length+' 个数。';
  document.querySelectorAll('[data-value-index]').forEach(b=>{const i=+b.dataset.valueIndex;b.onclick=()=>fillSlot(i,result.values[i]);b.ondragstart=e=>e.dataTransfer.setData('text/plain',num(result.values[i]));});
  document.querySelectorAll('[data-slot]').forEach(input=>{input.oninput=()=>{invalidateCalculation();saveWork();};input.ondragover=e=>e.preventDefault();input.ondrop=e=>{e.preventDefault();input.value=e.dataTransfer.getData('text/plain');invalidateCalculation();saveWork();};});
  drawBase();drawInk();showEvidence();saveWork();
 }catch(error){$('#snapshot-status').textContent=error.message;}
};
function fillSlot(i,value){$(`[data-slot="${i}"]`).value=num(value);invalidateCalculation();saveWork();}
function invalidateCalculation(){lastCalculation=null;$('#use-result').disabled=true;$('#calc-result').textContent='';}
$('#expression').oninput=()=>{invalidateCalculation();saveWork();};
$('#apply-paste').onclick=()=>{try{if(!active)throw Error('先记录当前图形。');const values=parsePastedNumbers($('#paste-values').value,active.result.values.length);values.forEach((v,i)=>fillSlot(i,Number(v)));$('#calc-feedback').textContent='已填入；请核对顺序和单位。';}catch(e){$('#calc-feedback').textContent=e.message;}};
$('#calculate').onclick=()=>{try{if(!active)throw Error('先记录当前图形。');saveWork();lastCalculation=calculateSlots(active.expression,active.slots);$('#calc-result').textContent=num(lastCalculation);$('#calc-feedback').textContent='已按你填写的算式计算，请确认结果对应所问题目。';$('#use-result').disabled=false;active.calculations.push({expression:active.expression,slots:[...active.slots],result:lastCalculation});}catch(e){invalidateCalculation();$('#calc-feedback').textContent=e.message;}};
$('#use-result').onclick=()=>{if(lastCalculation!==null){$('#answer').value=num(lastCalculation);saveWork();$('#answer').focus();}};
$('#check-answer').onclick=()=>{
 if(!active){$('#answer-feedback').textContent='请先记录图形。';return;}
 if(active.taskType==='qualitative'){saveWork();$('#answer-feedback').textContent=active.reason.trim()?'已保存你的解释，供老师评阅。':'请用一句话写下你的观察与判断。';return;}
 saveWork();const result=checkNumeric(active.answer,active.result.answer,{absolute:1e-6});active.checks.push(result);
 $('#answer-feedback').textContent=result.message+(result.ok&&!active.reason.trim()?' 解释栏还没有填写。':'');$('#answer-feedback').dataset.correct=String(result.ok);
};
$('#show-hint').onclick=()=>{$('#task-hint').textContent=key==='field'?'先看两颗正电荷对 P 的作用。试着上下移动，再左右微调，观察金色受力箭头是否朝上。电子带负电，受力与电场方向相反。':key==='paths'?'等势线上各点电势相同。固定电场中的 A、B 后，U_AB=V_A−V_B 只由端点决定；改变路线不会改变端点电势。':'Φ 是闭合面上 E·n 的总和，有正也有负。Q内=ε₀Φ；对称性不足时，不能从一个总通量推出每点的 E。';};

function showEvidence(){
 const s=active.state,r=active.result;
 if(key==='field'){
  $('#task-hint').textContent='本条记录已对准朝上的目标。回想你怎样调整 P，再解释电子受力为什么与电场方向相反。';
  $('#record-detail').innerHTML=`<p>P = (${pretty(s.p)}) mm；试探电荷 ${s.sign>0?'+e':'−e'}。</p>${s.sources.map((v,i)=>`<p>Q${i+1} = ${num(v.Q)} pC，位置 (${pretty(v.pos)}) mm。</p>`).join('')}<p>均匀带电球半径 0.24 mm；本题只取球外点。1 pC = 10⁻¹² C。</p>`;
 }else if(key==='paths'){
  $('#record-detail').innerHTML=`<p>模型：${s.model==='plates'?'理想平行板':'双带电球'}；A = (${pretty(s.A)})；B = (${pretty(s.B)}) mm。路径中点 = (${pretty(s.handle)}) mm。</p><p>V_A = ${num(r.values[0])} V；V_B = ${num(r.values[1])} V；U_AB = ${num(r.answer)} V。</p><details><summary>用场积分独立核验电势差</summary><p>∫A→B E·dℓ：直路 ${num(r.direct)} V；弯路 ${num(r.curved)} V。弯路积分减端点电势差：${num(r.error)} V。</p><p>直路长 ${num(r.directLength)} mm；弯路长 ${num(r.curvedLength)} mm。长度不同不代表电势差不同。所有数据来自固定静电模型。</p></details>`;
 }else{
  const e=gaussEvidence(records);$('#task-hint').textContent=`证据收集：${e.outside?'✓':'○'} 完全在面外；${e.inside?'✓':'○'} 完全在面内；${e.changedShape?'✓':'○'} 面内电荷不变而面变形。${e.complete?'已有归纳素材，请写出条件与结论。':'继续拖动并取数。'}`;
  $('#record-detail').innerHTML=`<p>电荷中心 (${pretty(s.pos)}) mm；椭球半轴 (${pretty(s.radii)}) mm。</p><p>球半径 0.42 mm；${s.inside?'带电球完全在面内':s.outside?'带电球完全在面外':'带电球跨过边界，只计包住的电荷部分'}。表面参考点 (${num(s.radii[0])}, 0, 0) mm 的 |E| = ${num(s.localE)} N/C。</p><details><summary>数值核验</summary><p>独立面积积分与包围电荷公式的差：${num(s.error)} N·m²/C。模型真实包围量 ${num(s.enclosed)} pC；靠近边界时留意积分误差。</p></details>`;
 }
 $('#evidence').innerHTML=`<table class="evidence-table"><caption>已记录的实验（导出包含全部状态和作答）</caption><thead><tr><th>组</th><th>${key==='field'?'P / mm':key==='paths'?'A → B / mm':'半轴 / mm'}</th><th>${key==='flux'?'Φ / N·m²/C':'比较量'}</th></tr></thead><tbody>${records.map(v=>`<tr><td>${v.id}</td><td>${key==='field'?pretty(v.state.p):key==='paths'?esc(pretty(v.state.A)+' → '+pretty(v.state.B)):pretty(v.state.radii)}</td><td>${key==='flux'?num(v.state.flux):key==='paths'?'U_AB = '+num(v.result.answer)+' V':'F 目标夹角 '+(v.goal?.angleDegrees==null?'未定义':v.goal.angleDegrees.toFixed(1)+'°')}</td></tr>`).join('')}</tbody></table>`;
}
function drawBase(){
 if(active){
  const canvas=host.querySelector('canvas'),rect=canvas.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height);
  const snapshot=canvas.toDataURL('image/png');$('#sketch').setAttribute('viewBox',`0 0 ${w} ${h+(key==='paths'?60:0)}`);
  let overlay='';
  if(key==='paths'){
   for(const name of ['A','B','handle']){const button=host.querySelector(`[data-path-drag="${name}"]`),r=button.getBoundingClientRect(),x=r.left+r.width/2-rect.left,y=r.top+r.height/2-rect.top;overlay+=`<circle cx="${x}" cy="${y}" r="15" fill="#fffefa" stroke="#286455"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" fill="#286455">${name==='handle'?'↕':name}</text>`;}
   overlay+=`<rect x="0" y="${h}" width="${w}" height="60" fill="#fffefa"/><text x="24" y="${h+36}" fill="#286455" font-size="18">V_A = ${num(active.result.values[0])} V</text><text x="${w/3}" y="${h+36}" fill="#286455" font-size="18">V_B = ${num(active.result.values[1])} V</text><text x="${w*2/3}" y="${h+36}" fill="#286455" font-size="18">U_AB = ${num(active.result.answer)} V</text>`;
  }else if(key==='flux'){overlay+=`<text x="22" y="30" fill="#d7e8ef" font-size="15">净通量 Φ = ${num(active.state.flux)} N·m²/C</text>`;}
  $('#sketch-base').innerHTML=`<image href="${snapshot}" x="0" y="0" width="${w}" height="${h}"/>${overlay}`;
  $('#sketch-caption').textContent=`原模型的 ${active.view.toUpperCase()} 放大正投影 · ${key==='field'?'保留电荷与当前受力':key==='paths'?'保留等势线、端点与路径':'保留电荷、闭合面与场线'}；已冻结为本条记录，可在图上标注。`;
  active.figureSource='original-model-orthographic-render';return;
 }
 let html='<path d="M20 175H600M310 20V330" stroke="#d9dfd5"/><text x="590" y="168" fill="#66756d" font-size="12">x</text><text x="318" y="25" fill="#66756d" font-size="12">y</text>';
 if(!active){$('#sketch-base').innerHTML=html+'<text x="28" y="45" fill="#66756d" font-size="14">记录当前图形后，在这里画辅助线。</text>';return;}

}
function drawInk(){
 $('#sketch-ink').innerHTML=(active?.ink||[]).map(mark=>mark.type==='text'?`<text x="${mark.points[0][0]}" y="${mark.points[0][1]}" fill="#ae7625" font-size="16">${esc(mark.text)}</text>`:`<polyline points="${mark.points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#ae7625" stroke-width="2.5" stroke-linecap="round" ${mark.type==='arrow'?'marker-end="url(#arrowhead)"':''}/>`).join('');
}
document.querySelectorAll('[data-draw]').forEach(b=>b.onclick=()=>{sketchMode=b.dataset.draw;document.querySelectorAll('[data-draw]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
const sketch=$('#sketch'),position=e=>{const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(sketch.getScreenCTM().inverse());return [Math.round(p.x),Math.round(p.y)];};
sketch.onpointerdown=e=>{
 if(!active){$('#snapshot-status').textContent='先记录图形，再画辅助线。';return;}
 if(sketchMode==='text'&&!$('#annotation-text').value.trim())return;
 drawing={type:sketchMode,points:[position(e)],text:sketchMode==='text'?$('#annotation-text').value.trim():''};active.ink.push(drawing);sketch.setPointerCapture(e.pointerId);drawInk();
};
sketch.onpointermove=e=>{if(!drawing||drawing.type==='text')return;if(drawing.type==='arrow')drawing.points[1]=position(e);else drawing.points.push(position(e));drawInk();};
sketch.onpointerup=sketch.onpointercancel=()=>{drawing=null;};$('#undo-ink').onclick=()=>{active?.ink.pop();drawInk();};drawBase();
$('#export-records').onclick=()=>{
 saveWork();if(!records.length){$('#export-message').textContent=' 请先记录至少一组数据。';return;}
 const documentData={format:'electrostatics-practice-1',lesson:key,title:lesson.title,exportedAt:new Date().toISOString(),units:{position:'mm',sourceCharge:'pC',field:'N/C',potential:'V',work:'eV',flux:'N m²/C'},records};
 const blob=new Blob([JSON.stringify(documentData,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`静电场-${key}-学习记录.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#export-message').textContent=` 已导出 ${records.length} 组记录。`;
};

$('#export-readable').onclick=()=>{
 saveWork();if(!records.length){$('#export-message').textContent=' 请先记录至少一组数据。';return;}
 const content=records.map(record=>`<article><h2>记录 ${record.id}</h2><p>${esc(record.time)}</p>${record.sketchSVG||''}<h3>第一层 · 定性观察</h3><p>${esc(record.qualitative?.prompt||'观察与判断')}</p><p>${esc(record.qualitative?.reason||record.reason)}</p>${record.taskType==='qualitative'?'<p>已保存第一层观察，第二层计算尚未开始。</p>':`<h3>第二层 · 定量计算</h3><p>算式：${esc(record.expression)}；代入值：${esc((record.slots||[]).join(', '))}</p><p>答案：${esc(record.answer)} ${lesson.unit}</p>`}<p>解释：${esc(record.reason)}</p><p>${record.taskType==='qualitative'?'第一层不要求数值计算':`数值核对：${record.checks.length?(record.checks.at(-1).ok?'在容差内':'尚不一致'):'未核对'}`}。文字解释请教师评阅。</p><details><summary>完整图形状态与计算过程</summary><pre>${esc(JSON.stringify({...record,sketchSVG:undefined},null,2))}</pre></details></article>`).join('');
 const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${lesson.title} · 学习记录</title><style>body{max-width:900px;margin:40px auto;padding:0 24px;color:#243c33;font:16px/1.8 'Microsoft YaHei',sans-serif}article{border-top:1px solid #d9dfd5;padding:24px 0}svg{display:block;max-width:900px;width:100%;background:#f8faf6}pre{white-space:pre-wrap;overflow-wrap:anywhere}p{white-space:pre-wrap}</style><h1>${lesson.title}</h1><p>教学模拟记录；图形投影方向见各条记录的 view 字段，位置单位 mm。数值正确不代替概念解释。</p>${content}</html>`;
 const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download=`静电场-${key}-作业页.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('#export-message').textContent=' 已导出可直接打开的作业页。';
};

const {mountPracticeFlow}=await import('./practice-flow.js');mountPracticeFlow(key);
