/** Progressive disclosure for the three worked examples; existing lab state stays mounted. */
export function mountPracticeFlow(key){
 const $=selector=>document.querySelector(selector),make=(tag,cls,html='')=>{const el=document.createElement(tag);el.className=cls;el.innerHTML=html;return el;};
 document.body.classList.add('guided-practice');
 const aside=$('.work-question'),scene=$('.work-scene'),notebook=$('.notebook');
 const question=aside.querySelector('h2'),intro=question.nextElementSibling,steps=aside.querySelector('ol');
 const stepbar=make('div','flow-steps','<span data-flow-step="0">1　操作图形</span><span data-flow-step="1">2　取数计算</span><span data-flow-step="2">3　解释结论</span>');$('.work-grid').before(stepbar);
 const observe=make('section','flow-panel'),compute=make('section','flow-panel'),explain=make('section','flow-panel');
 aside.append(observe,compute,explain);
 const instruction=make('p','flow-instruction',({field:'目标：让金色箭头朝上 ↑。只拖黄点 P；方向不对就再试，暂时不用计算。',paths:'先拖动金色绕路柄，改变 A 到 B 的路线。选好路径后，记录这一组数据。',flux:'先把红球从面外拖到面内，观察通量变化。每换一种状态，记录一组数据。'})[key]);
 observe.append(instruction,$('#capture'),$('#snapshot-status'));
 const help=make('details','flow-help','<summary>这道题怎么做？</summary>');help.append(steps,$('#show-hint'),$('#task-hint'));observe.append(help);
 const calculator=notebook.children[1];compute.append(...calculator.childNodes);
 compute.querySelector('.notebook-title').remove();
 const tools=make('details','flow-help flow-extra-tools','<summary>粘贴、拖入数据与计算提示</summary>');
 compute.querySelectorAll('.empty-note,small').forEach(el=>tools.append(el));tools.append($('#data-chips'),$('.paste-box'));compute.append(tools);
 $('#use-result').hidden=true;$('#calculate').textContent='计算并核对';
 const next=make('button','primary flow-next','写出解释 →');next.id='flow-next';next.hidden=true;compute.append(next);
 const back=make('button','flow-back','← 重新操作图形');compute.prepend(back);
 const answerLabel=aside.querySelector('label[for=answer]'),reasonLabel=aside.querySelector('label[for=reason]');
 explain.append(answerLabel,$('#answer'),reasonLabel,$('#reason'),$('#answer-feedback'));
 const returnCalc=make('button','flow-back','← 修改算式');explain.prepend(returnCalc);
 const explanationNote=make('p','empty-note','数值核对通过后，还需要用物理条件解释结果。文字由老师评阅。');explain.append(explanationNote,$('#export-readable'));
 $('#export-readable').classList.add('primary');$('#export-readable').textContent='导出这次作业';
 const again=make('button','flow-back','再记录一组 →');explain.append(again);
 const allData=make('details','flow-help','<summary>完整数据文件</summary>');allData.append($('#export-records'));explain.append(allData);
 $('#check-answer').hidden=true;aside.append(observe,compute,explain);
 aside.querySelectorAll(':scope > .work-actions,:scope > small').forEach(el=>el.hidden=true);
 const detail=make('details','flow-records','<summary>查看取数记录与数值核验</summary>');detail.append($('#record-detail'),$('#evidence'));$('.work-grid').after(detail);
 const drawing=notebook.children[0];drawing.classList.add('flow-drawing');drawing.querySelector('.notebook-title h2').textContent='本条记录';
 const inkTools=$('.sketch-tools'),inkDetail=make('details','flow-ink-tools','<summary>画辅助线或添加批注</summary>');inkDetail.append(inkTools);drawing.append(inkDetail);
 const drawSelect=make('select','flow-draw-select','<option value="pen">画线</option><option value="arrow">画箭头</option><option value="text">放置文字</option>');drawSelect.setAttribute('aria-label','批注方式');inkTools.prepend(drawSelect);inkTools.querySelectorAll('[data-draw]').forEach(b=>b.hidden=true);drawSelect.onchange=()=>{document.querySelector(`[data-draw="${drawSelect.value}"]`).click();$('#annotation-text').hidden=drawSelect.value!=='text';};$('#annotation-text').hidden=true;
 scene.append(drawing);notebook.remove();
 // Keep one live diagram. Secondary lab controls remain available in one disclosure.
 const lab=$('#experience'),wrapper=key==='paths'?lab.querySelector('.paths-lab'):key==='flux'?lab.querySelector('.flux-experience'):lab;
 const figure=wrapper.querySelector(key==='field'?'.stage-wrap':key==='paths'?'.paths-picture':'.fx-plate');
 const labTools=make('details','flow-lab-tools','<summary>更多参数与读数</summary>');
 [...wrapper.children].filter(el=>el!==figure).forEach(el=>labTools.append(el));wrapper.append(labTools);
 // Unified camera control: one switch, optional projection plane selection.
 const dimension=$('.dimension-toolbar');dimension.querySelectorAll('button').forEach(button=>button.hidden=true);
 const toggle=make('button','flow-dimension-toggle','切到二维');toggle.id='flow-dimension';dimension.prepend(toggle);
 const planes=make('select','flow-plane-select','<option value="xy">XY 正投影</option><option value="xz">XZ 正投影</option><option value="yz">YZ 正投影</option>');planes.setAttribute('aria-label','二维投影方向');planes.hidden=true;const advancedView=make('details','flow-view-options','<summary>进阶方向</summary>');advancedView.append(planes);toggle.after(advancedView);advancedView.hidden=true;
 toggle.onclick=()=>lab.dispatchEvent(new CustomEvent('set-dimension',{detail:{mode:lab.dataset.dimension==='3d'?planes.value:'3d'}}));planes.onchange=()=>lab.dispatchEvent(new CustomEvent('set-dimension',{detail:{mode:planes.value}}));
 lab.addEventListener('dimension-changed',event=>{const mode=event.detail.mode;toggle.textContent=mode==='3d'?'切到二维':'回到三维';planes.hidden=mode==='3d';advancedView.hidden=mode==='3d'||key==='field';if(key==='field')lab.querySelector('#field-gesture').textContent=mode==='3d'?'拖空白旋转 · 拖动黄点 P':'拖动黄点 P · 滚轮缩放';if(mode!=='3d')planes.value=mode;});

 const tasks={
  field:{title:'第一题：电子受力',intro:'两颗正电荷固定。黄点 P 是电子，图中金色箭头只表示它当前的受力。',action:'拖动黄点 P，让当前受力朝上。方向不对就换个位置再试。',reason:'你把 P 调到了哪里？金色受力箭头的方向怎样变化？',quant:'沿竖直方向求合力 Fᵧ：把两颗源电荷各自的力 F₁y、F₂y 带符号相加。向上为正，单位 fN。',explain:'合力的正负号是否符合刚才观察的方向？为什么电子受力与电场反向？'},
  paths:{title:'第二题：电势差与路径',intro:'先看平行板，再换双球。细线是等势线；A、B 固定，三个读数显示两点电势与它们的差。',action:'只拖金色柄，把路径拉弯。路径变了，V_A、V_B 和电势差变了吗？',reason:'路径改变时，两个端点所在的等势线是否改变？电势差是否改变？',quant:'从图中取两点电势，计算 U_AB = V_A − V_B（单位 V）。先验证端点的电势差，再联系做功。',explain:'计算怎样验证第一层观察？为什么路径改变不影响电势差，而改变端点可能影响？'},
  flux:{title:'第三题：通量与电荷',intro:'红球是正电荷，蓝色曲面是假想的闭合面。先观察电荷在面外和面内两种情况。',action:'把红球从面外拖到面内，比较场线的穿入和穿出。先不套公式。',reason:'电荷在面外和面内时，穿入与穿出有什么不同？净通量为零时，表面电场也为零吗？',quant:'用当前记录的净通量 Φ 反推 Q内=ε₀Φ。算出 C 后乘 10¹²，换成 pC。',explain:'结果与第一层观察是否一致？净通量和表面某一点的电场有什么区别？'}
 }[key];
 question.textContent=tasks.title;intro.textContent=tasks.intro;instruction.textContent=tasks.action;
 stepbar.innerHTML='<span data-level="qualitative">第一层 · 定性观察</span><span aria-hidden="true">→</span><span data-level="quantitative">第二层 · 定量验证</span>';
 const phase=make('p','flow-phase');phase.id='flow-phase';question.before(phase);
 const target=key==='field'?make('div','flow-target','<span class="target-icon" aria-hidden="true">↑</span><div><strong>目标方向：朝上</strong><small>这是目标提示。图中金色箭头是当前受力。</small></div>'):null;
 if(target){target.id='force-target';instruction.before(target);}
 const feedback=make('p','trial-feedback');feedback.id='trial-feedback';feedback.setAttribute('role','status');instruction.after(feedback);
 const quantIntro=make('p','flow-quant-intro',tasks.quant);compute.prepend(quantIntro);
 const toQuant=make('button','primary flow-to-quant','继续第二层：计算验证 →');toQuant.id='begin-quantitative';explanationNote.after(toQuant);
 const quantReason=tasks.explain;
 let step=0,level='qualitative',capturing=false,changedPath=false,seenInside=false,seenOutside=false;
 let baselineHandle=lab.dataset.pathHandle,baselineA=lab.dataset.pathA,baselineB=lab.dataset.pathB;
 lab.addEventListener('potential-model-changed',()=>{baselineHandle=lab.dataset.pathHandle;changedPath=false;updateTrial();});
 function setStep(value,nextLevel=level){
  step=value;level=nextLevel;document.body.dataset.flowStep=String(step);document.body.dataset.practiceLevel=level;lab.dataset.practiceLevel=level;
  [observe,compute,explain].forEach((panel,i)=>panel.hidden=i!==step);
  stepbar.querySelectorAll('[data-level]').forEach(item=>item.setAttribute('aria-current',item.dataset.level===level?'step':'false'));
  phase.textContent=level==='qualitative'?(step===0?'第一层 / 先动手观察':'第一层 / 写下判断'):(step===1?'第二层 / 用计算验证':'第二层 / 完成解释');
  lab.hidden=step!==0;dimension.hidden=step!==0;drawing.hidden=step===0;intro.hidden=step!==0;
  const qualitative=level==='qualitative';answerLabel.hidden=qualitative;$('#answer').hidden=qualitative;returnCalc.hidden=qualitative;toQuant.hidden=!qualitative;
  reasonLabel.textContent=qualitative?tasks.reason:quantReason;
  $('#reason').placeholder=qualitative?'我观察到……，因此我认为……':'计算结果是……，与刚才的判断……，原因是……';
  explanationNote.textContent=qualitative?'先把判断留下来，下一层用同一张图的数据验证。':'数值核对与文字解释分别保存；文字由老师评阅。';
  $('#export-readable').textContent=qualitative?'先保存第一层作业':'导出两层作业';$('#export-readable').classList.toggle('primary',!qualitative);
  again.textContent='重新操作，记录另一组 →';
  if(step===0)requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  $('.work-grid').scrollIntoView({block:'start',behavior:'instant'});
 }
 function startTrial(){
  changedPath=false;seenInside=false;seenOutside=false;baselineHandle=lab.dataset.pathHandle;baselineA=lab.dataset.pathA;baselineB=lab.dataset.pathB;
  setStep(0,'qualitative');
  if(key==='paths')lab.dispatchEvent(new CustomEvent('set-dimension',{detail:{mode:'xy'}}));
  if(key==='field'){
   lab.querySelector('#field-challenge-start').click();const z=lab.querySelector('#probe-z');z.value=0;z.dispatchEvent(new Event('input',{bubbles:true}));z.disabled=true;
   lab.dispatchEvent(new CustomEvent('set-dimension',{detail:{mode:'xy'}}));
   lab.querySelector('.scene-label strong').textContent='拖动黄点 P';lab.querySelector('.scene-label span').textContent='只看金色箭头：电子当前的受力';
  }
 }
 function updateTrial(){
  const d=lab.dataset;let ready=false,message='';
  if(key==='field'){
   const match=d.challengeCurrentMatch==='true',done=d.challengeCompleted==='true',angle=d.challengeAngle===''?NaN:Number(d.challengeAngle);
   ready=match&&done;message=ready?'做到了：当前受力朝上。现在记录位置，写下你的观察。':match?'方向对了，停稳一下。':!Number.isFinite(angle)?'拖动黄点 P，观察金色箭头。':angle>90?'当前受力朝下。移动 P，试着把它调成朝上。':angle>30?'当前受力偏向一侧。继续调整 P。':'已经接近朝上，再小幅调整 P。';
  }else if(key==='paths'){
   if(d.pathA!==baselineA||d.pathB!==baselineB){baselineA=d.pathA;baselineB=d.pathB;baselineHandle=d.pathHandle;changedPath=false;}
   changedPath=changedPath||d.pathHandle!==baselineHandle;ready=changedPath;
   message=ready?'路径已改变；请比较两点电势与电势差，然后记录判断。':'拖动金色路径柄，A、B 固定在原来的等势线上。';
  }else{
   seenInside=seenInside||d.fluxInside==='true';seenOutside=seenOutside||d.fluxOutside==='true';ready=seenInside&&seenOutside;
   message=ready?'已观察面外和面内。记录当前图形，先写下两者的区别。':seenOutside?'已观察面外；请把红球拖到闭合面内部。':'再把红球拖到闭合面外，比较穿入和穿出。';
  }
  lab.dataset.qualitativeEvidence=JSON.stringify({changedPath,seenInside,seenOutside});
  $('#capture').disabled=!ready||capturing;$('#capture').textContent=ready?'记录图形，写下判断 →':key==='field'?'先把受力调成朝上':key==='paths'?'先拖动路径柄':'先比较面内与面外';
  if(feedback.textContent!==message)feedback.textContent=message;feedback.dataset.matched=String(ready);
 }
 const capture=$('#capture').onclick;$('#capture').onclick=async()=>{
  if(capturing||$('#capture').disabled)return;capturing=true;
  try{lab.dispatchEvent(new CustomEvent('set-dimension',{detail:{mode:'xy'}}));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const before=$('#record-label').textContent;capture();if($('#record-label').textContent!==before){document.querySelectorAll('[data-value-index]').forEach(chip=>chip.click());next.hidden=true;$('#calculate').classList.add('primary');$('#answer-feedback').textContent='';setStep(2,'qualitative');}
  }finally{capturing=false;}
 };
 toQuant.onclick=()=>{if(!$('#reason').value.trim()){$('#answer-feedback').textContent='先用一句话留下你的观察与判断，再进入计算。';$('#reason').focus();return;}lab.dispatchEvent(new CustomEvent('begin-quantitative'));setStep(1,'quantitative');};
 const calculate=$('#calculate').onclick;$('#calculate').onclick=()=>{calculate();if(!$('#use-result').disabled){$('#use-result').click();$('#check-answer').click();$('#calc-feedback').textContent=$('#answer-feedback').textContent;next.hidden=$('#answer-feedback').dataset.correct!=='true';$('#calculate').classList.toggle('primary',next.hidden);}else next.hidden=true;};
 const applyPaste=$('#apply-paste').onclick;$('#apply-paste').onclick=()=>{applyPaste();next.hidden=true;$('#calculate').classList.add('primary');};
 compute.addEventListener('input',()=>{next.hidden=true;$('#calculate').classList.add('primary');});
 next.onclick=()=>setStep(2,'quantitative');back.onclick=again.onclick=startTrial;returnCalc.onclick=()=>setStep(1,'quantitative');
 const exportReadable=$('#export-readable').onclick;$('#export-readable').onclick=()=>{$('#check-answer').click();exportReadable();};
 help.querySelector('ol').innerHTML='<li>'+tasks.action+'</li><li>记录图形，先写下观察与判断。</li><li>进入第二层，用同一条记录的数据计算，再解释结果。</li>';
 $('#task-hint').textContent=key==='field'?'目标提示固定在右侧，图中只有当前受力箭头。左右、上下移动 P，看它怎样转向。':'第一层先观察并留下判断，第二层再验证；不需要一开始就算数。';
 if(key==='paths')lab.querySelectorAll('[data-path-drag="A"],[data-path-drag="B"]').forEach(el=>{el.disabled=true;el.title='本题固定端点，只拖动金色绕路柄';});
 startTrial();updateTrial();const timer=setInterval(updateTrial,120);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
