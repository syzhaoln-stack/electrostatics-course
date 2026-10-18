import {COLLECTION,makeCollection,setCollectionField,stepCollection,collectionSummary,collectionSnapshot,airflow} from './collection-physics.js';
import {createCollectionView} from './collection-view.js';
const $=id=>document.getElementById(id);
let state=makeCollection(),running=false,started=false,previous=null,lastTime=0,lastSummary=-1,animation;
const stage=$('collection-stage'),play=$('collection-play'),result=$('collection-result');
let view;
try{view=createCollectionView($('collection-canvas'),{onFieldChange(value){setCollectionField(state,value);view.setField(state.field);update();}});}catch(error){$('play-hint').textContent='三维显示未启动。请在支持 WebGL 的桌面浏览器中打开。';play.disabled=true;throw error;}
function update(){
  const summary=collectionSummary(state);$('wind-value').textContent=summary.wind.toFixed(2);$('wind-bar').style.width=`${Math.min(100,summary.wind/.44*100)}%`;
  const delta=airflow(state.time+.08)-summary.wind;$('wind-direction').textContent=Math.abs(delta)<.001?'→':delta>0?'↗':'↘';
  $('hit-count').textContent=summary.hits;$('miss-count').textContent=summary.misses;$('escape-count').textContent=summary.escaped;$('escape-count').dataset.nonzero=String(summary.escaped>0);
  $('particle-speed').textContent=summary.speed===null?'—':summary.speed.toFixed(2);$('emitted-count').textContent=started?`已释放 ${summary.emitted} / 100`:'等待释放';
  stage.dataset.time=state.time.toFixed(3);stage.dataset.hits=String(summary.hits);stage.dataset.escaped=String(summary.escaped);stage.dataset.field=String(state.field);stage.dataset.state=state.done?'done':running?'running':started?'paused':'ready';
  if(started&&!state.done){
    $('play-hint').textContent=running?(summary.wind>.37?'风较快：增强向亮区的偏转，别让粉尘冲过出口。':summary.wind<.24?'风较慢：适当减弱偏转，别过早撞壁。':'金色把手可随时调节；轨迹不断继续，不会重置。'):'已暂停。可以调整电场或旋转观察，再继续。';
  }
  if(state.done&&lastSummary!==state.time){
    running=false;result.hidden=false;result.classList.toggle('win',summary.passed);result.querySelector('.result-mark').textContent=summary.passed?'✓':'↗';
    $('result-title').textContent=summary.passed?'全部留下，亮区达标。':`${summary.hits} 颗落在亮区`;
    $('result-copy').textContent=summary.passed?`${summary.hits} 颗进入亮区，零逃逸。你让电场的偏转赶上了变化的气流。`:`${summary.misses} 颗撞在亮区外，${summary.escaped} 颗穿过出口。${summary.escaped>0?'偏转不足时，先增强收集力。':'看上一轮轨迹：撞得太早就减弱，太晚就增强。'}`;
    play.textContent='再挑战一次';$('play-hint').textContent='上一轮轨迹会留在下一轮的画面中，方便比较。';lastSummary=state.time;
  }
}
function reset(){
  if(started){previous=collectionSnapshot(state);view.remember(previous);$('show-history').disabled=false;}
  const field=state.field;state=makeCollection();setCollectionField(state,field);running=false;started=false;result.hidden=true;lastSummary=-1;view.setField(field);play.innerHTML='释放 100 颗粉尘 <span>→</span>';$('collection-reset').disabled=true;$('play-hint').innerHTML='<span class="hint-dot"></span>上一轮是灰色轨迹。调一调，再把这轮留在亮区。';update();
}
play.addEventListener('click',()=>{if(state.done)reset();running=!running;started=true;result.hidden=true;play.textContent=running?'暂停观察':'继续释放 →';$('collection-reset').disabled=false;update();});
$('collection-reset').addEventListener('click',reset);$('retry-result').addEventListener('click',()=>{reset();play.focus();});
for(const mode of ['space','front'])$('view-'+mode).addEventListener('click',()=>{view.view(mode);for(const item of ['space','front']){$('view-'+item).classList.toggle('selected',item===mode);$('view-'+item).setAttribute('aria-pressed',String(item===mode));}});
$('show-history').addEventListener('click',event=>{const shown=event.currentTarget.getAttribute('aria-pressed')!=='true';event.currentTarget.setAttribute('aria-pressed',String(shown));view.showHistory(shown);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){running=false;play.textContent='继续释放 →';update();}});
function frame(now){const elapsed=lastTime?Math.min(.08,(now-lastTime)/1000):0;lastTime=now;if(running&&!state.done)stepCollection(state,elapsed/3);update();view.draw(state,now/1000);animation=requestAnimationFrame(frame);}
update();animation=requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{cancelAnimationFrame(animation);view.dispose();},{once:true});
// Embedded textbook experiments use the same document and report their content height.
const embedded=new URLSearchParams(location.search).has('embed');
if(embedded){document.body.classList.add('embedded');const report=()=>parent.postMessage({type:'course-embed-size',height:document.documentElement.scrollHeight},location.origin);new ResizeObserver(report).observe(document.body);report();}
