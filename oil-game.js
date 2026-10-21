import {OIL_CONSTANTS as C,createDrop,equilibriumVoltage,forces,advanceDrop,inferDropFromFallSpeed,inferCharge,insideCapture} from './oil-physics.js';
import {oilMascot} from './oil-art.js';
import {evaluateScientific,formatScientific,scientificInput} from './oil-calculator.js';

const LEVELS=[
  {title:'接住它',sub:'找到受力平衡',goal:'把阿滴接进绿带，稳住 3 秒。',copy:'先释放油滴，再调电压。让它到达目标高度，并把速度降到接近零。',start:2.42,targets:[1.50],drop:createDrop(),insight:'你用电场力托住了油滴。悬浮时，电场力与浮力共同平衡重力；各个力并没有消失。'},
  {title:'换个高度',sub:'连续停靠两站',goal:'同一颗油滴，依次停稳两站。',copy:'先停在低处，再把它送到高处。上一关的近似悬浮电压已记在旋钮旁。',start:2.42,targets:[.90,2.0],drop:createDrop(),insight:'均匀电场中，同一油滴的理想平衡电压与高度无关。本次捕获允许少量漂移，两站的近似悬浮电压可能有控制误差。'},
  {title:'换一颗油滴',sub:'电荷量变成两倍',goal:'同样大小，电荷量加倍，再接住它。',copy:'新油滴的质量不变，负电荷量变成两倍。沿用原来的电压，观察并调整。',start:1.0,targets:[1.75],drop:createDrop({charge:-20*C.elementaryCharge}),insight:'同样的有效重力，电荷量加倍，所需的悬浮电压减半。你改变电场，就能补偿电荷量的变化。'},
  {title:'测出身份',sub:'由运动求电荷',goal:'测速度、找悬浮电压，算出未知电荷。',copy:'先关闭电场，测油滴经过两条刻线的时间；再接住它，记录悬浮电压。',start:2.45,targets:[1.15],drop:createDrop({radius:1.35e-6,charge:-7*C.elementaryCharge}),insight:'你把位置与时间变成速度，再把受力平衡变成电荷量。这是模拟测量；电荷量子化还需真实的多次测量证据。'},
];
const DIFFICULTIES={gentle:{label:'轻松练习',tolerance:.18,speed:.025},standard:{label:'标准挑战',tolerance:.12,speed:.015},precise:{label:'精密挑战',tolerance:.08,speed:.008}};
const STORAGE='oil-drop-progress-v1', mm=x=>x*1000,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),fixed=(x,n=2)=>Number(x).toFixed(n);
let saved={done:[],suspension:223};
try{const data=JSON.parse(localStorage.getItem(STORAGE)||'null');if(data&&Array.isArray(data.done)){saved.done=data.done.filter(n=>Number.isInteger(n)&&n>=0&&n<4);if(Number.isFinite(data.suspension)&&data.suspension>0&&data.suspension<=500)saved.suspension=data.suspension;}}catch{}
const app=document.querySelector('#oil-app');
app.innerHTML=`<div class="oil-shell">
  <header class="oil-nav"><a href="index.html"><span class="oil-nav-mark" aria-hidden="true"></span>大学物理（A） / 静电场</a><nav aria-label="返回教材"><a href="chapter.html?unit=foundations#oil-drop-challenge">返回第 1 节</a><a href="beam.html">电子束挑战 ↗</a></nav></header>
  <div class="oil-heading"><div><p class="oil-eyebrow">MILLIKAN LAB / PLAY & DISCOVER</p><h1>油滴捕获<span>用电场，接住一滴小可爱。</span></h1></div><div class="oil-preferences"><label>挑战<select id="oil-difficulty"><option value="gentle">轻松练习</option><option value="standard">标准挑战</option><option value="precise">精密挑战</option></select></label><label>伙伴<select id="oil-costume"><option value="goggles">护目镜阿滴</option><option value="blob">搞怪小团子</option><option value="nerd">眼镜研究员</option></select></label></div></div>
  <nav class="oil-levels" aria-label="四个关卡">${LEVELS.map((l,i)=>`<button class="oil-level" data-level="${i}" ${i?'disabled':''}><span>${String(i+1).padStart(2,'0')}</span><span><b>${l.title}</b><small>${l.sub}</small></span></button>`).join('')}</nav>
  <main class="oil-game" id="oil-game" data-level="0" data-phase="ready">
    <section class="oil-instrument" aria-label="油滴实验台">
      <div class="oil-stage-head"><b><i class="oil-led" aria-hidden="true"></i>显微观察窗</b><span id="oil-drop-label">同一颗油滴 · 负电荷</span></div>
      <div class="oil-stage-wrap">
        <svg class="oil-stage" viewBox="0 0 760 510" role="img" aria-labelledby="oil-stage-title oil-stage-desc">
          <title id="oil-stage-title">油滴在两块水平极板之间升降</title><desc id="oil-stage-desc">调节右侧电压，使油滴进入绿色目标带并保持静止。油滴向上或向下的速度同时显示在下方。</desc>
          <defs><linearGradient id="oil-chamber" x2="0" y2="1"><stop stop-color="#eef7fb"/><stop offset="1" stop-color="#fbfdfe"/></linearGradient><pattern id="oil-grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#bfd3de" opacity=".45"/></pattern><linearGradient id="oil-metal"><stop stop-color="#91b5c7"/><stop offset=".4" stop-color="#d3e5ed"/><stop offset="1" stop-color="#759caf"/></linearGradient><marker id="oil-arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#3986ac"/></marker><marker id="oil-arrow-coral" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#c67960"/></marker><marker id="oil-arrow-mint" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10z" fill="#44846b"/></marker></defs>
          <rect x="61" y="45" width="623" height="399" rx="20" fill="url(#oil-chamber)" stroke="#d1e2ea"/>
          <rect x="72" y="55" width="601" height="379" rx="15" fill="url(#oil-grid)"/>
          <path d="M82 70V420M653 70V420" fill="none" stroke="#d1e0e8" stroke-width="2"/>
          <g id="oil-field-lines" opacity=".18">${[140,220,300,460,540,620].map(x=>`<path d="M${x} 100V392" stroke="#3986ac" stroke-dasharray="5 9" marker-end="url(#oil-arrow-blue)"/>`).join('')}</g>
          <rect x="94" y="51" width="560" height="16" rx="6" fill="url(#oil-metal)" stroke="#779eaf"/>
          <rect x="94" y="422" width="560" height="16" rx="6" fill="url(#oil-metal)" stroke="#779eaf"/>
          <text x="98" y="36" class="oil-plate-label" id="oil-top-plate">上极板 ＋</text><text x="98" y="461" class="oil-plate-label" id="oil-bottom-plate">下极板 −</text>
          <text x="650" y="36" text-anchor="end" class="oil-small-label">两板间距 d = 3.00 mm</text>
          <g id="oil-axis">${[0,.5,1,1.5,2,2.5,3].map(y=>`<path d="M657 ${430-y/3*370}h7" stroke="#9db8c7"/><text x="676" y="${434-y/3*370}" class="oil-tick">${y.toFixed(1)}</text>`).join('')}<text x="681" y="461" class="oil-tick">mm</text></g>
          <g id="oil-target"><rect id="oil-target-band" x="108" width="530" height="44" rx="10" fill="#c8ead8" opacity=".72"/><line id="oil-target-center" x1="111" x2="638" stroke="#5c9d7f" stroke-dasharray="7 7"/><path id="oil-target-bracket" stroke="#44846b" stroke-width="2" fill="none"/><text x="485" id="oil-target-caption" class="oil-target-label">停靠区</text><text x="485" id="oil-target-height" class="oil-small-label">1.50 mm</text></g>
          <g id="oil-measure-lines" hidden><path d="M110 171H636M110 233H636" fill="none" stroke="#a494bc" stroke-width="2" stroke-dasharray="6 6"/><text x="470" y="161" class="oil-small-label">开始计时</text><text x="470" y="253" class="oil-small-label">结束计时 · Δh = 5.00 × 10⁻⁴ m</text></g>
          <g id="oil-trail"></g><g id="oil-force-arrows" hidden></g>
          <g id="oil-character" transform="translate(340 100)"></g>
          <g id="oil-speech"><rect x="104" y="91" width="210" height="40" rx="13" fill="#fff" stroke="#d4e3eb"/><path d="m289 131 8 9v-9" fill="#fff" stroke="#d4e3eb"/><text x="120" y="116" id="oil-bubble" class="oil-bubble-text">准备好，就放我下来吧！</text></g>
          <g class="oil-spark" stroke="#d6a32c" stroke-width="2" fill="none"><path d="m315 210-7-8m9 30h-12m110-14 8-8m-9 33h12m-60-95v12"/></g>
        </svg>
        <div class="oil-stage-status" id="oil-stage-status"><i aria-hidden="true"></i><span id="oil-motion-status">准备释放</span></div><span class="oil-time" id="oil-time">t = 0.0 s</span>
      </div>
      <div class="oil-stage-tools"><label><input type="checkbox" id="oil-forces">受力放大图</label><span>角色已放大 · 外观不改变物理量</span><button id="oil-reset">同一颗，重试 ↺</button></div>
      <div class="oil-telemetry" aria-label="实时读数"><div><span>高度 y</span><b id="oil-height">2.42</b><small>mm</small></div><div><span>速度 v · 向上为正</span><b id="oil-speed">0.000</b><small>mm/s</small></div><div><span>连续停稳</span><b id="oil-hold">0.0</b><small>/ 3 s</small></div></div>
      <div class="oil-speed-chart"><div><strong>速度记录</strong>实线：本轮<br><span class="old">虚线：上轮</span></div><svg id="oil-chart" viewBox="0 0 560 38" preserveAspectRatio="none" aria-label="本轮与上轮速度变化"><path d="M0 19H560" stroke="#d8e4ea" stroke-dasharray="3 4"/><path id="oil-chart-old" stroke="#a69bb8" stroke-dasharray="4 4" fill="none"/><path id="oil-chart-now" stroke="#367c9e" stroke-width="2" fill="none"/></svg></div>
    </section>
    <aside class="oil-panel" aria-label="任务与控制">
      <section class="oil-mission"><div class="oil-mission-top"><b id="oil-mission-number">任务 01 / 04</b><span id="oil-difficulty-badge">轻松练习</span></div><h2 id="oil-goal"></h2><p id="oil-goal-copy"></p><div class="oil-checks"><span class="oil-check" id="oil-position-check"><i>1</i>进入目标带</span><span class="oil-check" id="oil-speed-check"><i>2</i>速度接近零</span><span class="oil-check" id="oil-time-check"><i>3</i>保持 3 秒</span></div><div class="oil-hold-track"><span id="oil-hold-bar"></span></div></section>
      <section class="oil-measure" id="oil-measure" hidden><h3 id="oil-measure-title">① 关场，测下降速度</h3><p id="oil-measure-copy">油滴通过两条刻线时自动计时，先取得尺寸和有效重力的线索。</p><div class="oil-measure-data" id="oil-measure-data"></div><button id="oil-measure-fall">开始无电场测量</button>
        <section id="oil-calculator" class="oil-calculator" aria-label="科学计算器" hidden>
          <div class="oil-calc-heading"><h4>科学计算器</h4><span>SI · 结果单位 C</span></div>
          <p class="oil-calc-formula">|q| = W × d ÷ |U|</p>
          <label for="oil-calc-expression">已代入本次数据，也可直接编辑算式</label>
          <input id="oil-calc-expression" type="text" inputmode="text" autocomplete="off" spellcheck="false" aria-describedby="oil-calc-notation">
          <div class="oil-calc-keys" aria-label="输入运算符"><button type="button" data-calc-insert=" × ">×</button><button type="button" data-calc-insert=" ÷ ">÷</button><button type="button" data-calc-insert="(">(</button><button type="button" data-calc-insert=")">)</button><button type="button" data-calc-insert="e" aria-label="输入科学计数法指数 e">×10ⁿ</button><button type="button" id="oil-calc-reset">重新代入</button></div>
          <p id="oil-calc-notation" class="oil-calc-notation">e 表示“乘 10 的幂”：1e-18 = 1 × 10⁻¹⁸。</p>
          <div class="oil-calc-result-row"><output id="oil-calc-result" aria-live="polite">点击“计算”得出结果</output><button id="oil-calc-evaluate" class="primary" type="button">计算 =</button></div>
          <p id="oil-calc-error" class="oil-error" role="status" hidden></p><button id="oil-calc-use" class="oil-calc-use" type="button" disabled>填入下面的答案 ↓</button>
        </section>
        <form class="oil-charge-form" id="oil-charge-form" hidden><label for="oil-charge-answer">我的 |q| =</label><input id="oil-charge-answer" type="text" inputmode="text" autocomplete="off" spellcheck="false" placeholder="如 1.2e-18" required aria-label="电荷量大小，单位库仑，支持科学计数法"><span>C</span><button class="primary" type="submit">核对电荷</button></form><p id="oil-charge-feedback" role="status"></p><details id="oil-calculation" hidden><summary>查看公式与测量原理</summary><p id="oil-calculation-copy"></p></details></section>
      <section class="oil-controls"><div class="oil-voltage-label"><label for="oil-voltage">极板电压 U</label><button id="oil-power" aria-pressed="true">电场已开启</button></div><div class="oil-voltage-number"><input id="oil-voltage-number" type="number" min="0" max="500" step="0.5" value="0" aria-label="电压数值"><span>V</span><small id="oil-voltage-memory">0—500 V</small></div><input class="oil-voltage-range" id="oil-voltage" type="range" min="0" max="500" step="0.5" value="0"><div class="oil-range-label"><span>0 V</span><span>250</span><span>500 V</span></div><div class="oil-nudge" aria-label="微调电压"><button data-nudge="-10">−10 V</button><button data-nudge="-1">−1 V</button><button data-nudge="1">+1 V</button><button data-nudge="10">+10 V</button></div><p class="oil-control-copy" id="oil-control-copy">先点击“释放油滴”，再向右调电压，观察下落速度。</p><p class="oil-causal-chain">调电压 → 电场力改变 → 加速度改变 → 速度随时间变化</p><details class="oil-response-note"><summary>为什么看起来很快就变速？</summary><p id="oil-response-copy"></p></details><div class="oil-actions"><button class="primary" id="oil-release">释放油滴 ↓</button><button id="oil-pause" disabled>暂停</button></div><div class="oil-polarity"><span id="oil-polarity-label">上＋ / 下− · 负油滴受电场力向上</span><button id="oil-polarity" hidden>反转极性 ⇅</button></div></section>
      <section class="oil-completion" id="oil-completion" hidden aria-live="polite"><span class="oil-complete-kicker" id="oil-complete-kicker">CAPTURED / 捕获成功</span><h3 id="oil-complete-title"></h3><p id="oil-complete-copy"></p><button id="oil-next" class="yellow">下一关 →</button><a href="chapter.html?unit=foundations#oil-drop-challenge" id="oil-return" hidden>返回教材，解释实验中的受力 →</a></section>
      <div class="oil-coach"><p id="oil-coach-copy"><b>阿滴的小提示</b><span id="oil-live-guidance">你可以慢慢调，随时暂停。出界后也能重新开始。</span></p><button id="oil-hint">给点提示</button></div><p id="oil-hint-copy" class="oil-hint-copy" hidden></p>
    </aside>
  </main>
  <footer class="oil-footer"><details><summary>实验原理、模型范围与资料</summary><p>向上为正。U = V上 − V下，Eᵧ = −U/d；m a = qEᵧ − mg + ρ空气 V滴 g − 6πηrv。悬浮时速度为零，电场力与浮力共同平衡重力。均匀场中的平衡电压不取决于高度。绿带是目标标记，不提供额外的力。</p><p>采用球形油滴、均匀电场和 Stokes 线性阻力，按真实弛豫时间计算；角色尺寸、护目镜与表情只是显示。未包含滑移修正、布朗运动、蒸发及测量噪声。观察窗不展示微秒级加速细节；受力图中的浮力被单独放大标注。第四关由模拟的过线时间与悬浮电压推算电荷，不是历史实验数据，也不构成电荷量子化的独立证据。</p><p>ρ油 = ${C.oilDensity} kg/m³；ρ空气 = ${C.airDensity} kg/m³；η = ${C.viscosity} Pa·s；g = ${C.g} m/s²。参考：<a href="https://www.physics.wisc.edu/courses/home/spring2018/407/experiments/millikan/millikan_html.html" target="_blank" rel="noopener">威斯康星大学 · 密立根油滴实验</a>。角色与页面为原创教学设计；外观可切换，物理量保持不变。</p></details><span>JC05 / OIL DROP LAB</span></footer>
  <div class="oil-notice" id="oil-notice" hidden role="status"></div>
</div>`;
const $=s=>app.querySelector(s), $$=s=>[...app.querySelectorAll(s)];
// Completion stays beside the goal, so learners see the next action immediately.
$('.oil-mission').after($('#oil-completion'));
let level=0,difficulty='gentle',costume='goggles',drop=LEVELS[0].drop,state={y:.00242,v:0,a:0},voltage=0,polarity=1,power=true,running=false,started=false,complete=false,checkpoint=false,phase='ready',targetIndex=0,hold=0,holdVoltage=0,elapsed=0,hints=0,lastTimestamp=null,lastPlot=0,series=[],previousSeries=[],trail=[],fallReading=null,fallStartTime=null,hoverReading=null,lastAppearance='',firstStop=null,noticeTimer;
const getTarget=()=>LEVELS[level].targets[targetIndex]/1000;
const effectiveU=()=>power?polarity*voltage:0;
const tolerance=()=>DIFFICULTIES[difficulty].tolerance/1000*(level===2?.85:1);
const speedLimit=()=>Math.min(DIFFICULTIES[difficulty].speed,level===3?.006:Infinity)/1000;
const stageY=y=>430-y/C.gap*370;
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));}catch{}}
function announce(copy){$('#oil-notice').textContent=copy;$('#oil-notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('#oil-notice').hidden=true;},4200);}
function setVoltage(value){if(!Number.isFinite(value))return;voltage=clamp(value,0,500);$('#oil-voltage').value=voltage;$('#oil-voltage-number').value=Number(voltage.toFixed(2));updateControls();draw();}
function updateControls(){
  const measuring=phase==='measuring',finished=complete||checkpoint||phase==='charge';
  const locked=measuring||finished||(level===3&&!fallReading);
  $('.oil-controls').hidden=finished;
  for(const el of [$('#oil-voltage'),$('#oil-voltage-number'),$('#oil-power'),$('#oil-polarity'),...$$('[data-nudge]')])el.disabled=locked;
  $('#oil-power').setAttribute('aria-pressed',String(power));$('#oil-power').textContent=power?'电场已开启':'电场已关闭';
  $('#oil-pause').disabled=!started||finished||phase==='fall-done'||phase==='lost';$('#oil-pause').textContent=running?'暂停':'继续';
  $('#oil-release').disabled=finished||(level===3&&!fallReading);
  $('#oil-release').textContent=level===3&&!fallReading?'先完成下降测量':started?'重新释放 ↓':'释放油滴 ↓';
  $('#oil-polarity').hidden=level<2;
  $('#oil-polarity-label').textContent=polarity===1?'上＋ / 下− · 负油滴受电场力向上':'上− / 下＋ · 负油滴受电场力向下';
  $('#oil-control-copy').textContent=measuring?'正在关场测量。通过两条刻线后，会自动记录时间。':level===3&&!fallReading?'先点击上方“开始无电场测量”，取得下降速度。':!power?'电场已关闭，旋钮保留你的设置。重新开启后才会施加电场力。':polarity<0?'当前电场力朝下。反转极性后，才能用向上的电场力托住负油滴。':!started?'释放后看速度：电压增大，向上的电场力就增强。':Math.abs(state.v)<speedLimit()?'速度已很小。还要确认油滴位于绿带内，并连续保持 3 秒。':state.v>0?'正在上升。接近目标时减小电压，让速度接近零。':'正在下降。接近目标时增大电压，让速度接近零。';
  $('#oil-top-plate').textContent=!power||voltage===0?'上极板 · 电场为零':polarity===1?'上极板 ＋':'上极板 −';
  $('#oil-bottom-plate').textContent=!power||voltage===0?'下极板 · 电场为零':polarity===1?'下极板 −':'下极板 ＋';
  $('#oil-field-lines').style.opacity=effectiveU()!==0?String(.08+.24*voltage/500):'0';
  $('#oil-field-lines').setAttribute('transform',polarity<0?'translate(0 492) scale(1 -1)':'');
}
function drawChart(){const path=values=>values.map((p,i)=>`${i?'L':'M'}${fixed((100-values.length+i)/99*560,1)},${fixed(19-clamp(p.v*1000,-.6,.6)/.6*17,1)}`).join(' ');$('#oil-chart-now').setAttribute('d',path(series.slice(-100)));$('#oil-chart-old').setAttribute('d',path(previousSeries.slice(-100)));}
function draw(){
  $('#oil-game').dataset.level=String(level);$('#oil-game').dataset.phase=phase;$('#oil-game').dataset.complete=String(complete);
  const inside=Math.abs(state.y-getTarget())<=tolerance(),slow=Math.abs(state.v)<=speedLimit();
  $('#oil-height').textContent=fixed(mm(state.y));$('#oil-speed').textContent=(state.v>5e-7?'+':'')+fixed(mm(state.v),3);$('#oil-hold').textContent=fixed(hold,1);$('#oil-time').textContent=`t = ${fixed(elapsed,1)} s`;
  for(const [id,ok] of [['position',inside&&started],['speed',slow&&started],['time',hold>=3]]){$(`#oil-${id}-check`).dataset.done=String(ok);$(`#oil-${id}-check i`).textContent=ok?'✓':({position:'1',speed:'2',time:'3'})[id];}
  $('#oil-hold-bar').style.width=`${Math.min(100,hold/3*100)}%`;
  const ty=stageY(getTarget()),th=tolerance()/C.gap*370;
  $('#oil-target').style.display=phase==='measuring'?'none':'';$('#oil-target-band').setAttribute('y',ty-th);$('#oil-target-band').setAttribute('height',2*th);
  $('#oil-target-center').setAttribute('y1',ty);$('#oil-target-center').setAttribute('y2',ty);$('#oil-target-bracket').setAttribute('d',`M119 ${ty-th}h-10v${2*th}h10M626 ${ty-th}h10v${2*th}h-10`);
  $('#oil-target-caption').setAttribute('y',ty-8);$('#oil-target-height').setAttribute('y',ty+14);$('#oil-target-caption').textContent=level===1?`第 ${targetIndex+1} 站 · 停稳`:'停靠区 · 保持 3 秒';$('#oil-target-height').textContent=`${fixed(mm(getTarget()))} ± ${fixed(mm(tolerance()))} mm`;
  $('#oil-measure-lines').toggleAttribute('hidden',phase!=='measuring');
  const py=stageY(state.y),mood=complete||checkpoint?'success':phase==='lost'?'surprised':!started?'idle':slow?'steady':state.v>0?'rising':'falling';
  $('#oil-character').setAttribute('transform',`translate(340 ${py-44})`);
  if(lastAppearance!==mood+costume){$('#oil-character').innerHTML=oilMascot({mood,style:costume,id:'stage'}).replace('<svg ','<svg width="80" height="90" ');lastAppearance=mood+costume;}
  $('#oil-bubble').textContent=complete?'接住了！你很懂我的电量。':checkpoint?'低处停稳了，再去高处吧！':phase==='lost'?'没关系，我们再来一次！':phase==='measuring'?'嘘，正在量我的下降速度。':phase==='fall-done'?'速度记下啦，现在接住我。':phase==='charge'?'最后一步：算算我的电荷。':!started?'准备好，就放我下来吧！':!running?'暂停啦，想好再继续。':inside&&slow?'就是这里，稳稳保持！':slow?'停住了，再看看目标在哪。':state.v>0?'慢慢向上，我在靠近吗？':'我在下降，看看电压吧。';
  $('#oil-motion-status').textContent=complete?'本关完成':checkpoint?'第一站完成':phase==='lost'?'油滴离开观察区 · 可重试':!started?'准备释放':!running?'已暂停':phase==='measuring'?'自动计时中':inside&&slow?'目标内停稳 · 正在累计':Math.abs(state.v)<speedLimit()?'速度接近零':state.v>0?'向上运动':'向下运动';
  $('#oil-stage-status').dataset.active=String(running&&inside&&slow);
  const f=forces(drop,effectiveU(),state.v);
  if($('#oil-forces').checked){const scale=90/Math.max(drop.effectiveWeight,Math.abs(f.electric),Math.abs(f.drag));const arrow=(x,force,color,label)=>{const len=Math.sign(force)*Math.min(110,Math.abs(force)*scale);if(!force)return'';return`<path d="M${x} ${py}v${-len}" stroke="${color}" stroke-width="3" marker-end="url(#oil-arrow-${color==='#3986ac'?'blue':color==='#44846b'?'mint':'coral'})"/><text x="${x+7}" y="${py-len+(len>0?-7:15)}" class="oil-force-label">${label}</text>`;};$('#oil-force-arrows').innerHTML=arrow(306,f.electric,'#3986ac','电场力')+arrow(426,f.gravity,'#c67960','重力')+arrow(520,f.drag,'#44846b','阻力')+arrow(248,f.buoyancy*200,'#44846b','浮力 ×200')+`<text x="113" y="404" class="oil-small-label">${Math.abs(f.acceleration)<.001?'a ≈ 0 · 稳定运动或悬浮':`a = ${fixed(f.acceleration,2)} m/s² · 调压瞬间`}</text>`;}
  $('#oil-trail').innerHTML=trail.slice(-18).map((y,i)=>`<circle cx="380" cy="${stageY(y)}" r="2.2" fill="#9ebac9" opacity="${.1+i*.025}"/>`).join('');
}
function refreshLevels(){let unlocked=0;while(saved.done.includes(unlocked)&&unlocked<3)unlocked++;$$('.oil-level[data-level]').forEach((b,i)=>{b.disabled=i>unlocked;b.classList.toggle('done',saved.done.includes(i));b.toggleAttribute('aria-current',i===level);if(i===level)b.setAttribute('aria-current','step');b.querySelector('span').textContent=saved.done.includes(i)&&i!==level?'✓':String(i+1).padStart(2,'0');});}
function resetHints(){hints=0;$('#oil-hint-copy').hidden=true;$('#oil-hint').textContent='给我一点提示';}
function resetMotion(preserve=true){resetHints();if(preserve&&series.length)previousSeries=[...series];state={y:LEVELS[level].start/1000,v:0,a:0};elapsed=0;hold=0;holdVoltage=0;running=false;started=false;complete=false;checkpoint=false;targetIndex=0;series=[];trail=[];lastPlot=0;fallStartTime=null;firstStop=null;hoverReading=null;phase='ready';$('#oil-goal').textContent=LEVELS[level].goal;$('#oil-completion').hidden=true;$('#oil-return').hidden=true;$('#oil-charge-form').hidden=true;$('#oil-charge-feedback').textContent='';resetCalculator();if(level===3){if(fallReading)updateMeasurement();else{$('#oil-measure-title').textContent='① 关场，测下降速度';$('#oil-measure-copy').textContent='油滴通过两条刻线时自动计时，先取得尺寸和有效重力的线索。';$('#oil-measure-data').textContent='';$('#oil-calculation').hidden=true;}}drawChart();}
function loadLevel(index){level=index;drop=LEVELS[level].drop;$('#oil-response-copy').textContent=`电压先改变电场力、合力与加速度，速度连续变化，不会跳变。本组油滴的速度弛豫时间 τ ≈ ${sci(drop.tau,2)} s，比屏幕刷新间隔短得多。强空气阻力使油滴很快接近新的终端速度；稳定升降时加速度又接近零。`; fallReading=null;previousSeries=[];resetMotion(false);hints=0;polarity=1;power=true;$('#oil-hint-copy').hidden=true;$('#oil-measure').hidden=level!==3;$('#oil-measure-fall').hidden=false;$('#oil-measure-data').innerHTML='';$('#oil-calculation').hidden=true;$('#oil-measure-title').textContent='① 关场，测下降速度';$('#oil-measure-copy').textContent='通过两条刻线时自动计时，先取得尺寸和有效重力的线索。';$('#oil-charge-answer').value='';$('#oil-goal').textContent=LEVELS[level].goal;$('#oil-goal-copy').textContent=LEVELS[level].copy;$('#oil-mission-number').textContent=`任务 ${String(level+1).padStart(2,'0')} / 04`;$('#oil-drop-label').textContent=level===3?'未知油滴 · 负电荷':level===2?'同样大小 · 负电荷量 ×2':'阿滴 · 同一颗负油滴';$('#oil-voltage-memory').textContent=level===1||level===2?`上次近似 ${fixed(saved.suspension,1)} V`:'0—500 V';$('#oil-live-guidance').textContent=level===0?'你可以慢慢调，随时暂停。出界后也能重新开始。':level===1?'第一站捕获后再去第二站，油滴的质量和电荷始终不变。':level===2?'电荷量翻倍后，同一电场产生的电场力也会翻倍。': '先测下降速度，再记录悬浮电压；两份数据一起才能求电荷。';setVoltage(level===1||level===2?saved.suspension:0);refreshLevels();updateControls();draw();}
function release(){if(complete||checkpoint||phase==='charge'||level===3&&!fallReading)return;resetMotion();running=true;started=true;phase='moving';if(level===3){power=true;updateMeasurement();}updateControls();draw();}
function pause(){if(!started||complete||checkpoint||phase==='charge'||phase==='lost'||phase==='fall-done')return;running=!running;updateControls();draw();}
function completeLevel(){resetHints();document.querySelector('#oil-charge-form').hidden=true;complete=true;running=false;phase='complete';hold=3;if(!saved.done.includes(level))saved.done.push(level);if(level===0)saved.suspension=hoverReading;save();refreshLevels();$('#oil-completion').hidden=false;$('#oil-complete-kicker').textContent=level===3?'ALL CLEAR / 四关完成':'CAPTURED / 捕获成功';$('#oil-complete-title').textContent=level===3?'小小油滴，身份揭晓！':'稳稳接住了！';$('#oil-complete-copy').textContent=LEVELS[level].insight;$('#oil-next').textContent=level===3?'换个难度，再挑战一次 ↺':`下一关：${LEVELS[level+1].title} →`;$('#oil-return').hidden=level!==3;$('#oil-live-guidance').textContent=level===3?'你已经完成捕获、迁移和测量。可以回教材说明每个阶段有哪些力。':`记录：近似悬浮电压 ${fixed(hoverReading,1)} V；${DIFFICULTIES[difficulty].label}。`;updateControls();draw();}
function onCapture(){resetHints();hoverReading=holdVoltage/hold;running=false;hold=3;if(level===1&&targetIndex===0){checkpoint=true;firstStop=hoverReading;phase='checkpoint';$('#oil-completion').hidden=false;$('#oil-complete-kicker').textContent='STOP 01 / 第一站完成';$('#oil-complete-title').textContent='低处停稳了，向高处出发。';$('#oil-complete-copy').textContent=`已记录第一站电压 ${fixed(firstStop,1)} V。先让油滴上升，再尝试用同一个电压停稳。`;$('#oil-next').textContent='前往第二站 ↑';}else if(level===3){phase='charge';updateMeasurement();$('#oil-charge-form').hidden=false;$('#oil-calc-evaluate').focus({preventScroll:true});$('#oil-live-guidance').textContent='点击“计算”，再点“填入下面的答案”，最后核对电荷。结果直接用 C，允许 5% 的计算误差。';}else completeLevel();updateControls();draw();}
let calculatorResult=null;
const sci=(value,digits=4)=>formatScientific(value,digits);
function clearCalculatorResult(){calculatorResult=null;$('#oil-calc-result').textContent='点击“计算”得出结果';$('#oil-calc-use').disabled=true;$('#oil-calc-error').hidden=true;}
function resetCalculator(){clearCalculatorResult();$('#oil-calculator').hidden=true;$('#oil-calc-expression').value='';$('#oil-charge-answer').value='';}
function fillCalculator(){
  if(!fallReading||!hoverReading)return;
  const measured=inferDropFromFallSpeed(fallReading.speed);
  $('#oil-calc-expression').value=`${scientificInput(measured.effectiveWeight,5)} × ${scientificInput(C.gap,3)} ÷ ${fixed(Math.abs(hoverReading),2)}`;
  clearCalculatorResult();
}
function calculate(){
  try{const value=evaluateScientific($('#oil-calc-expression').value);if(value<=0)throw Error('这里计算电荷量的大小，结果应大于 0。');calculatorResult=value;$('#oil-calc-result').textContent=`${sci(value)} C`;$('#oil-calc-error').hidden=true;$('#oil-calc-use').disabled=phase!=='charge';}
  catch(error){calculatorResult=null;$('#oil-calc-result').textContent='请检查算式';$('#oil-calc-use').disabled=true;$('#oil-calc-error').textContent=error.message;$('#oil-calc-error').hidden=false;}
}
function updateMeasurement(){
  if(!fallReading)return;
  const measured=inferDropFromFallSpeed(fallReading.speed),row=(name,value)=>`<div><dt>${name}</dt><dd>${value}</dd></div>`;
  const observations=`<dl class="oil-si-readings">${row('刻线间距 Δh',`${sci(.0005,2)} m`)}${row('下降时间 Δt',`${fixed(fallReading.time,3)} s`)}${row('下降速率 v',`${sci(fallReading.speed)} m/s`)}${row('估计半径 r',`${sci(measured.radius,3)} m`)}</dl>`;
  $('#oil-measure-title').textContent=hoverReading?'③ 用计算器求电荷量':'② 调电压，把油滴接住';
  $('#oil-measure-copy').textContent=hoverReading?'数值已统一为 SI 单位。点击“计算”→“填入下面的答案”→“核对电荷”。填写大小，单位直接用 C。':'已由下降速度估计尺寸与有效重力。数据统一用 SI 单位。释放油滴，找到能让它停稳的电压。';
  $('#oil-measure-data').innerHTML=hoverReading?`<dl class="oil-si-readings oil-si-required">${row('有效重力 W',`${sci(measured.effectiveWeight)} N`)}${row('极板间距 d',`${sci(C.gap,3)} m`)}${row('近似悬浮电压 |U|',`${fixed(Math.abs(hoverReading),2)} V`)}</dl><details><summary>查看下降测量与半径（SI）</summary>${observations}</details>`:`${observations}<dl class="oil-si-readings">${row('有效重力 W',`${sci(measured.effectiveWeight)} N`)}</dl>`;
  $('#oil-measure-fall').textContent='重测下降速度';$('#oil-measure-fall').hidden=!!hoverReading;
  $('#oil-calculation').hidden=false;
  $('#oil-calculation-copy').innerHTML=`r = √[9ηv / (2(ρ油−ρ空气)g)]，W = (ρ油−ρ空气)·(4πr³/3)g。<br>悬浮时 |q| = Wd / |U|。用 N、m、V 代入，结果直接是 C（N·m/V = C），不需要再换算数量级。<br>ρ油 = ${C.oilDensity} kg/m³，ρ空气 = ${C.airDensity} kg/m³，η = ${sci(C.viscosity,2)} Pa·s，g = ${C.g} m/s²。<br>由负油滴的受力方向判断 q 为负；上方计算的是大小 |q|。`;
  $('#oil-calculator').hidden=!hoverReading;if(hoverReading)fillCalculator();
}
function measureFall(){fallReading=null;resetMotion();power=false;voltage=0;$('#oil-voltage').value=0;$('#oil-voltage-number').value=0;running=true;started=true;phase='measuring';$('#oil-measure-data').innerHTML='等待通过第一条刻线…';$('#oil-measure-title').textContent='① 正在测量下降速度';$('#oil-measure-copy').textContent='电场已关闭。刻线间距离 5.00 × 10⁻⁴ m，经过时自动计时。';$('#oil-measure-fall').hidden=true;$('#oil-calculation').hidden=true;updateControls();draw();}
function step(dt){if(!running||dt<=0)return;const before={...state},oldTime=elapsed;state=advanceDrop(state,drop,effectiveU(),dt);elapsed+=dt;
  if(phase==='measuring'){
    const crossing=y=>oldTime+dt*(before.y-y)/(before.y-state.y);
    if(fallStartTime===null&&before.y>=.00210&&state.y<=.00210)fallStartTime=crossing(.00210);
    if(fallStartTime!==null){$('#oil-measure-data').textContent=`计时中：${fixed(elapsed-fallStartTime,2)} s`;
      if(before.y>=.00160&&state.y<=.00160){const duration=crossing(.00160)-fallStartTime;fallReading={time:duration,speed:.00050/duration};running=false;phase='fall-done';resetHints();updateMeasurement();$('#oil-live-guidance').textContent='下降速度已记录。现在开启电场，重新释放油滴并找到悬浮电压。';updateControls();}}
  }else if(phase==='moving'){
    // Require both endpoints in the band, as well as low speed: a fast crossing
    // never earns a frame of hold time. No target attraction or position snap.
    if(insideCapture(state,getTarget(),tolerance(),speedLimit())&&insideCapture(before,getTarget(),tolerance(),speedLimit())){hold+=dt;holdVoltage+=effectiveU()*dt;if(hold>=3)onCapture();}else{hold=0;holdVoltage=0;}
  }
  if(state.y<.00012||state.y>.00288){state.y=clamp(state.y,.00012,.00288);running=false;phase='lost';hold=0;$('#oil-live-guidance').textContent='油滴离开了观察区。按“同一颗，重试”，保留电压设置重新尝试。';if(level===3&&!fallReading){$('#oil-measure-fall').hidden=false;$('#oil-measure-fall').textContent='重新开始测量';}updateControls();}
  if(elapsed-lastPlot>=.1){series.push({t:elapsed,v:state.v});trail.push(state.y);if(series.length>800)series.shift();if(trail.length>25)trail.shift();lastPlot=elapsed;drawChart();updateControls();}draw();
}
function hint(){hints++;const eq=fixed(equilibriumVoltage(drop),1),currentY=mm(state.y),goalY=mm(getTarget());let messages;
  if(level===3&&!fallReading)messages=['先点击“开始无电场测量”，油滴越过两条刻线时会自动计时。','下降速率等于 5.00 × 10⁻⁴ m 除以两条刻线间的用时，单位为 m/s。稳定下降并不表示没有受力。','取得下降速度后，模型会估计半径和有效重力；还要测悬浮电压才能求电荷。'];
  else if(level===3&&hoverReading)messages=['点击上方科学计算器的“计算”：本次的 W × d ÷ |U| 已经代入。','点击“填入下面的答案”，再点“核对电荷”。结果直接用 C；e-18 就表示乘 10⁻¹⁸。',`按本次测量计算，|q| ≈ ${sci(Math.abs(inferCharge(fallReading.speed,hoverReading)))} C。负号由受力方向判断，这里只填大小。`];
  else if(level===3)messages=['电荷未知时，先根据运动调电压：下降就适当增大，上升就适当减小。','分别记住一个让它缓慢下降、一个让它缓慢上升的电压；平衡值在两者之间。','把两次电压取中间值，观察升降，再缩小范围。接近目标时，用 ±1 V 精细调整。'];
  else messages=[level===2?'同样大小，电荷量加倍。要提供同样的向上电力，电场可以减弱。':level===1?'相同油滴在不同高度，平衡电压相同。先让它移动，到目标附近再调回平衡值。':'负油滴在上正下负的极板间受到向上的电场力。向右调电压，看看下降速度是否减小。',currentY>goalY?'油滴在目标上方。保持缓慢下降，接近绿带时增加电压，逐步减小下降速度。':'油滴在目标下方。先增加电压让它上升，再减小电压，让它在绿带内停稳。',`这颗油滴的平衡电压约为 ${eq} V。用略低的电压下降、略高的电压上升，到目标处再调回这个值。`];
  $('#oil-hint-copy').hidden=false;$('#oil-hint-copy').textContent=messages[Math.min(2,hints-1)];$('#oil-hint').textContent=hints>=3?'再看提示':'下一条提示';
}
$('#oil-voltage').addEventListener('input',e=>setVoltage(+e.target.value));$('#oil-voltage-number').addEventListener('change',e=>{if(e.target.value===''){setVoltage(voltage);return;}setVoltage(+e.target.value);});$$('[data-nudge]').forEach(b=>b.onclick=()=>setVoltage(voltage+Number(b.dataset.nudge)));
$('#oil-power').onclick=()=>{power=!power;hold=0;holdVoltage=0;updateControls();draw();};$('#oil-polarity').onclick=()=>{polarity*=-1;hold=0;holdVoltage=0;updateControls();draw();};
$('#oil-release').onclick=release;$('#oil-pause').onclick=pause;$('#oil-reset').onclick=()=>{resetMotion();if(level===3&&!fallReading){$('#oil-measure-fall').hidden=false;$('#oil-measure-fall').textContent='开始无电场测量';}updateControls();draw();};
$('#oil-next').onclick=()=>{if(checkpoint){checkpoint=false;targetIndex=1;hold=0;holdVoltage=0;hoverReading=null;phase='moving';running=true;$('#oil-completion').hidden=true;$('#oil-voltage-memory').textContent=`第一站 ${fixed(firstStop,1)} V`;$('#oil-goal').textContent='第二站：升到高处，再稳住 3 秒。';updateControls();draw();return;}if(complete){loadLevel(level<3?level+1:0);$('#oil-goal').scrollIntoView({block:'nearest',behavior:'instant'});}};
$('#oil-measure-fall').onclick=measureFall;
$('#oil-calc-evaluate').onclick=calculate;$('#oil-calc-reset').onclick=fillCalculator;
$('#oil-calc-expression').oninput=clearCalculatorResult;
$('#oil-calc-expression').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();calculate();}};
$$('[data-calc-insert]').forEach(button=>button.onclick=()=>{const input=$('#oil-calc-expression'),start=input.selectionStart??input.value.length,end=input.selectionEnd??start;input.setRangeText(button.dataset.calcInsert,start,end,'end');input.focus({preventScroll:true});clearCalculatorResult();});
$('#oil-calc-use').onclick=()=>{if(calculatorResult===null||phase!=='charge')return;$('#oil-charge-answer').value=scientificInput(calculatorResult);$('#oil-charge-feedback').className='';$('#oil-charge-feedback').textContent='已填入计算结果，单位为 C。点击“核对电荷”即可。';$('#oil-charge-answer').focus({preventScroll:true});};
$('#oil-charge-form').onsubmit=e=>{
  e.preventDefault();if(!hoverReading||!fallReading||phase!=='charge')return;
  let answer;try{answer=evaluateScientific($('#oil-charge-answer').value);if(answer<=0)throw Error('请填写电荷量的大小，应大于 0。');}
  catch(error){$('#oil-charge-feedback').className='oil-error';$('#oil-charge-feedback').textContent=`${error.message} 例如 1.16e-18，单位已是 C。`;return;}
  const reference=Math.abs(inferCharge(fallReading.speed,hoverReading)),error=Math.abs(answer-reference)/reference;
  if(error<=.05){$('#oil-charge-feedback').className='';$('#oil-charge-feedback').textContent=`核对成功：q ≈ ${sci(-reference)} C，计算偏差 ${fixed(error*100,1)}%。`;completeLevel();}
  else{$('#oil-charge-feedback').className='oil-error';$('#oil-charge-feedback').textContent=`结果偏${answer>reference?'大':'小'}。上方计算器已代入 W × d ÷ |U|；点击“计算”，再把结果直接填入，单位为 C。`;}
};
$('#oil-difficulty').onchange=e=>{difficulty=e.target.value;hold=0;holdVoltage=0;$('#oil-difficulty-badge').textContent=DIFFICULTIES[difficulty].label;announce(`${DIFFICULTIES[difficulty].label}：目标半宽 ${fixed(mm(tolerance()))} mm，速度不超过 ${fixed(mm(speedLimit()),3)} mm/s。`);draw();};
$('#oil-costume').onchange=e=>{costume=e.target.value;lastAppearance='';draw();};$('#oil-forces').onchange=e=>{$('#oil-force-arrows').toggleAttribute('hidden',!e.target.checked);draw();};$('#oil-hint').onclick=hint;
$$('.oil-level[data-level]').forEach(b=>b.onclick=()=>loadLevel(Number(b.dataset.level)));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;updateControls();draw();}});
function frame(now){const dt=lastTimestamp===null?0:Math.min(.05,(now-lastTimestamp)/1000);lastTimestamp=now;step(dt);requestAnimationFrame(frame);}
loadLevel(0);document.body.dataset.ready='true';requestAnimationFrame(frame);
