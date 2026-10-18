/** Source images remain intact. Colored boxes are separate, modern HTML annotations. */
export function mountBeamApplications(host){
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./beam-applications.css',import.meta.url).href;document.head.append(sheet);
  const section=document.createElement('section');section.className='beam-applications';section.setAttribute('aria-label','束流控制的两种实际用途');
  section.innerHTML=`<header><p>真实装置里的同一个问题</p><h2>怎样把带电粒子送到指定位置？</h2></header>
  <div class="beam-applications-grid">
    <article class="beam-application beam-thomson"><div class="beam-app-heading"><span>01 · 测量</span><h3>把电子的性质，变成一段位移。</h3></div>
      <figure><div class="beam-source-stage"><div class="beam-source-picture"><img src="./assets/beam/thomson-1897-fig2.jpg" alt="汤姆孙1897年论文图2：阴极C、狭缝阳极A及金属塞B、偏转板D和E、管端荧光读数位置"><span class="beam-source-highlight" aria-hidden="true"></span></div></div><figcaption>J. J. Thomson, <i>Cathode Rays</i>（1897），p. 296，Fig. 2。原图裁切并转正；色框为现代注释。</figcaption></figure>
      <div class="beam-app-stages" role="group" aria-label="找到阴极射线管中的三个过程"><button type="button" data-stage="accelerate" aria-pressed="false">① 加速</button><button type="button" data-stage="deflect" aria-pressed="true">② 偏转</button><button type="button" data-stage="read" aria-pressed="false">③ 读出</button></div>
      <p class="beam-app-caption" aria-live="polite"></p>
      <p class="beam-app-copy">汤姆孙先结合电场与磁场确定电子速度，再用单独电场造成的偏转，求出电荷量与质量之比 <b>|e|/m</b>。这里量的是低压管中的电子束；原图只画电偏转装置，磁场测速另行完成。</p>
      <div class="beam-app-links"><a href="https://www.ub.edu/hcub/hfq/sites/default/files/thomson%2C%201897.pdf#page=3" target="_blank" rel="noopener">1897 原论文 ↗</a><a href="https://www.nobelprize.org/uploads/2018/06/thomson-lecture.pdf#page=3" target="_blank" rel="noopener">1906 诺奖讲演 · pp. 147–148 ↗</a></div>
    </article>
    <article class="beam-application beam-esp"><div class="beam-app-heading"><span>02 · 收集</span><h3>让烟气走，把粉尘留在壁上。</h3></div>
      <figure><div class="beam-source-stage"><img class="beam-esp-original" src="./assets/cases/esp-components-epa.jpg" alt="ICAC静电除尘器原始结构图，美国环保署收录，可见气体入口、放电极、收集面和灰斗" loading="lazy"></div><figcaption>ICAC / U.S. EPA · 原始设备示意图，未重绘。<a href="https://www.epa.gov/air-emissions-monitoring-knowledge-base/monitoring-control-technique-electrostatic-precipitators" target="_blank" rel="noopener">原始来源 ↗</a></figcaption></figure>
      <div class="beam-esp-sequence" aria-label="静电除尘过程"><span>粉尘带电</span><b>→</b><span>电场偏转</span><b>→</b><span>收集极捕集</span></div>
      <p class="beam-app-caption">原图右侧的 <b>COLLECTING SURFACE</b> 指向收集面。放电极使粉尘带电，电场让粉尘偏离气流，沉积在收集极上。</p>
      <p class="beam-app-copy">这里运动的是空气中的带电粉尘。气流与阻力持续影响它的速度，不能照搬真空电子束的轨迹。新关卡保留这种区别：风速变了，你要实时调电场，把粉尘收进指定的壁面区域。</p>
      <div class="beam-app-links"><a class="beam-app-challenge" href="./collection.html">挑战：变速气流，侧壁截获 →</a><a href="./cases.html?case=esp">设备照片与剖面 ↗</a></div>
    </article>
  </div>`;
  host.append(section);
  const stages={
    accelerate:{left:5,top:25,width:29,height:62,text:'C 阴极 → A 阳极：电势差让电子加速；A、B 的狭缝选出一束细射线。'},
    deflect:{left:44,top:25,width:23,height:51,text:'D、E 两块平行铝板：电场施加横向力，带负电的电子偏向正板。'},
    read:{left:91,top:20,width:7,height:66,text:'管端荧光斑 + 外贴刻度：把偏转读成位移，再结合速度与电场求 |e|/m。'},
  };
  const caption=section.querySelector('.beam-thomson .beam-app-caption'),highlight=section.querySelector('.beam-source-highlight');
  function select(name){const stage=stages[name];caption.textContent=stage.text;for(const [property,value]of Object.entries(stage))if(property!=='text')highlight.style[property]=`${value}%`;section.querySelectorAll('[data-stage]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.stage===name)));}
  const abort=new AbortController();for(const button of section.querySelectorAll('[data-stage]'))button.addEventListener('click',()=>select(button.dataset.stage),{signal:abort.signal});select('deflect');
  return()=>{abort.abort();section.remove();sheet.remove();};
}
