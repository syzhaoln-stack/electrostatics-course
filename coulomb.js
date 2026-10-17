import {RECORDS,reading,equilibrium,historicalPoints,fittedPower} from './coulomb-physics.js';
import {MEMOIR,TRANSLATION_NOTES} from './coulomb-text.js';
import {mountBalance} from './coulomb-scene.js';
import {mountCalibration} from './coulomb-calibration.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
mountCalibration($('#calibration'));
const state={beta:0,alpha:3.18,power:2,charged:false,history:false,chargeFraction:1,contact:false};
let balance;
function render(){
 $('#beta-label').textContent=`${state.beta.toFixed(0)}°`;$('#twist').value=state.beta;$('#dial').setAttribute('aria-valuenow',state.beta.toFixed(0));$('#dial-hand').style.transform=`rotate(${-state.beta}deg)`;
 const r=reading(state.beta,state.alpha);$('#alpha-label').textContent=state.charged?`${state.alpha.toFixed(2).replace(/\.00$/,'')}°`:'—';$('#distance-label').textContent=state.charged?`${(r.d*100).toFixed(2)} cm`:'—';$('#theta-label').textContent=state.charged?`${r.twist.toFixed(1).replace(/\.0$/,'')}°`:'—';
 $('#mode').textContent=!state.charged?'准备充电':state.history?'史料读数':'自行实验 · 模型';
 $('#charge').classList.toggle('primary',!state.charged||state.history&&state.beta===0);$$('[data-trial]').forEach(b=>b.classList.toggle('selected',state.history&&state.beta===RECORDS[+b.dataset.trial].beta));
 if(state.contact)$('#observation').textContent='两球已经接触。此时需要考虑接触力和电荷重新分配，点电荷平衡模型到这里停止。';
 balance?.set(state);document.body.dataset.state=JSON.stringify(state);
}
function model(beta){state.beta=Math.round(beta);state.charged=true;state.history=false;const s=equilibrium(state.beta,{power:state.power,chargeFraction:state.chargeFraction});state.alpha=s.alpha;state.contact=s.contact;$('#observation').textContent=`采用 1/r${state.power===1?'':state.power===2?'²':'³'} 的假设，转动上端后计算新的平衡。越想让两球靠近，需要抵抗的斥力越大。`;render();}
function trial(i){const r=RECORDS[i];Object.assign(state,r,{charged:true,history:true,chargeFraction:1,contact:false});$('#observation').textContent=[`原文第一次：两球转开到 36°。上端没有转动，所以银丝总扭转也是 36°。`,`原文第二次：上端反向转 126°，两球只相隔 18°。银丝总扭转 144°，是第一次的四倍。`,`原文第三次：上端反向转 567°，两球相隔 8.5°。总扭转相加为 575.5°，原文记为 576°。`][i];$('#error-note').textContent='历史按钮显示原文读数；已恢复充电条件。打开漏电示例可对照现代模型的预测。';render();}
$('#charge').onclick=()=>trial(0);$$('[data-trial]').forEach(b=>b.onclick=()=>trial(+b.dataset.trial));$('#reset').onclick=()=>{Object.assign(state,{beta:0,alpha:3.18,charged:false,history:false,chargeFraction:1,contact:false});$('#observation').textContent='先给两球充电。轻杆能自由旋转，银丝会阻止它继续转开。';render();};$('#twist').oninput=e=>model(+e.target.value);
let drag;$('#dial').onpointerdown=e=>{drag={x:e.clientX,beta:state.beta};e.currentTarget.setPointerCapture(e.pointerId);};$('#dial').onpointermove=e=>{if(drag)model(Math.max(0,Math.min(720,drag.beta+(e.clientX-drag.x)*3)));};$('#dial').onpointerup=$('#dial').onpointercancel=()=>{drag=null;};$('#dial').onkeydown=e=>{const d={ArrowRight:5,ArrowUp:5,ArrowLeft:-5,ArrowDown:-5}[e.key];if(d){e.preventDefault();model(Math.max(0,Math.min(720,state.beta+d)));}if(e.key==='Home'||e.key==='End'){e.preventDefault();model(e.key==='Home'?0:720);}};
$$('[data-view]').forEach(b=>b.onclick=()=>{balance?.view(b.dataset.view);$$('[data-view]').forEach(x=>x.classList.toggle('selected',x===b));$('.scene-caption').innerHTML=b.dataset.view==='top'?'俯视 · 玻璃外壳和立管暂时隐藏<br>拖动画面仍可旋转':b.dataset.view==='knob'?'左右拖动三维黄铜旋钮，改变上端转角<br>纸刻度与金属刻度对应不同的读数位置':'拖动画面旋转 · 滚轮缩放<br>金色标签是固定球，红色标签是活动球';});
$('#annotations').onclick=e=>{const enabled=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',String(enabled));e.currentTarget.textContent=enabled?'受力标记：开':'受力标记：关';balance?.annotations(enabled);};
$$('[data-stamp-view]').forEach(b=>b.onclick=()=>{$(`[data-view="${b.dataset.stampView}"]`).click();$('.lab').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});$(`[data-view="${b.dataset.stampView}"]`).focus({preventScroll:true});});
$('#leak').onclick=()=>{state.chargeFraction=.9;model(state.beta);$('#error-note').textContent='两球各保留 90% 的电量，电力乘以 0.9 × 0.9 = 0.81。旋钮不变，小球平衡位置向固定球靠近。';};$('#restore').onclick=()=>{state.chargeFraction=1;model(state.beta);$('#error-note').textContent='已恢复模型的充电条件。'};
function chart(){const exact=$('#geometry').checked,points=historicalPoints(exact),w=480,h=300,pad={l:50,r:24,t:25,b:45},x=d=>pad.l+Math.log(d/.2)/Math.log(5)*(w-pad.l-pad.r),y=f=>h-pad.b-Math.log(f)/Math.log(140)*(h-pad.t-pad.b);
 let svg=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="历史测量点与距离反比假设比较图"><rect width="480" height="300" fill="#f0eee6" rx="6"/>`;
 for(const t of [1,4,16,64])svg+=`<path d="M50 ${y(t)}H456" stroke="#d7dbd3"/><text x="40" y="${y(t)+4}" text-anchor="end" fill="#66746b" font-size="11">${t}</text>`;
 for(const t of [.25,.5,1])svg+=`<path d="M${x(t)} 25V255" stroke="#d7dbd3"/><text x="${x(t)}" y="276" text-anchor="middle" fill="#66746b" font-size="11">${t}</text>`;
 const path=Array.from({length:100},(_,i)=>{const r=.2+i*.8/99;return `${i?'L':'M'}${x(r)},${y(r**-state.power)}`;}).join('');svg+=`<path d="${path}" stroke="#508a91" stroke-width="2" fill="none"/>`;
 points.forEach((p,i)=>{svg+=`<circle cx="${x(p.x)}" cy="${y(p.y)}" r="6" fill="#b48846" stroke="#f7f4ed" stroke-width="2"/><text x="${x(p.x)-12}" y="${y(p.y)-12}" fill="#6c552f" font-size="12">${i+1}</text>`;});
 svg+=`<text x="52" y="17" fill="#52635b" font-size="11">力 / 第一次的力（对数刻度）</text><text x="248" y="296" fill="#52635b" font-size="11" text-anchor="middle">距离 / 第一次的距离（对数刻度）</text></svg>`;$('#chart').innerHTML=svg;$('#fit').textContent=`${exact?'使用弦长与余弦力臂':'沿用小角度近似'}：三点作对数直线拟合，指数约 ${fittedPower(points).toFixed(2)}。只有三次读数；拟合值不是精确的物理常数。`;}
$$('[data-power]').forEach(b=>b.onclick=()=>{state.power=+b.dataset.power;$$('[data-power]').forEach(x=>x.classList.toggle('selected',x===b));chart();if(state.charged&&!state.history)model(state.beta);});$('#geometry').onchange=chart;chart();
$('#translation-notes').innerHTML=`<div class="translation-notes">${TRANSLATION_NOTES}</div>`;
$('#memoir').innerHTML=MEMOIR.map((s,i)=>`<details ${i===0?'open':''}><summary>${String(i+1).padStart(2,'0')}　${s.title}<small>英译本第 ${s.pages} 页</small></summary><div class="translated-body">${s.body}${s.note?`<aside class="editor-note"><b>编者校注</b>　${s.note}</aside>`:''}<a href="assets/coulomb/Coulomb_El_1785.pdf#page=${parseInt(s.pages)}" target="_blank" style="font:12px system-ui">对照这一页原文 ↗</a></div></details>`).join('');
$('#facsimiles').innerHTML=Array.from({length:7},(_,i)=>`<a href="assets/coulomb/english-page-${i+1}.webp" target="_blank"><img src="assets/coulomb/english-page-${i+1}.webp" loading="lazy" alt="提供的英译本原件第${i+1}页">第 ${i+1} 页${i===6?' · 图版':''}</a>`).join('');
$('#expand').onclick=()=>{const open=$$('#memoir details').some(d=>!d.open);$$('#memoir details').forEach(d=>d.open=open);$('#expand').textContent=open?'收起全文':'展开全文';};
window.addEventListener('beforeprint',()=>$$('#memoir details').forEach(d=>d.open=true));
try{balance=mountBalance($('#instrument'),model);balance.view('close');render();document.body.dataset.ready='true';}catch(e){console.error(e);$('#instrument').innerHTML='<p style="padding:80px 25px">浏览器未能启用三维图形。下方仍可阅读原图、实测数据和完整译文。</p>';render();document.body.dataset.ready='partial';}
window.addEventListener('pagehide',()=>balance?.dispose(),{once:true});
