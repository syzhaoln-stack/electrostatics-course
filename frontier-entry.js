import {VERSION} from './release-version.js';

const examples = {
  droplet: {title:'正电、负电，为什么都能吸引同一滴水？',paper:'Nature Communications · 2024',known:'已经学过：电场中各部分电荷的受力可以叠加。',step:'再走一步：把物体内部正、负电荷的重新分布也算进去，中性物体在非均匀场中也可能受到合力。',action:'换一次场源极性，检验自己的解释'},
  graphene: {title:'隔着绝缘层，电压怎样改变薄膜中的电荷？',paper:'Science · 2004 / 2010 石墨烯诺奖关联',known:'已经学过：在给定的平行板结构中，电势差影响极间电场，电荷会重新分布。',step:'再走一步：把薄膜与栅极看成一个门控结构，用电压调节薄膜中的电荷数量。',action:'改变栅压，追踪电场和感应电荷'},
  storage: {title:'存同样多的能量，能不能用更小的电场？',paper:'Nature · 2026',known:'已经学过：电场与电势差联系着电荷和能量。',step:'补充电容与介质后再走一步：改变介电响应，同时考察损耗、击穿和温度，才接近真实储能研究。',action:'固定储能目标，只改变介电常数'}
};

function card(key) {
  const item=examples[key];
  return `<div class="frontier-entry-example"><p class="frontier-entry-source">${item.paper}</p><h3>${item.title}</h3><p>${item.known}</p><p><strong>${item.step}</strong></p><a class="frontier-entry-link" href="frontier.html?case=${key}&v=${VERSION}">${item.action} →</a></div>`;
}

export function mountFrontierEntryPoints({page,unit}) {
  if(document.querySelector('[data-frontier-entry]')) return;
  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./frontier-entry.css',import.meta.url).href;document.head.append(style);
  const nav=document.querySelector('.book-header nav');
  if(nav&&!nav.querySelector('[href^="frontier.html"]')) {
    const link=document.createElement('a');link.href='frontier.html';link.textContent='前沿小项目';nav.append(link);
  }
  const toc=document.querySelector('.book-toc');
  if(toc){const link=document.createElement('a');link.className='book-toc-map';link.href='frontier.html';link.textContent='从课本再走一步 →';toc.append(link);}
  const section=document.createElement('section');section.className='frontier-entry';section.id='frontier-project';section.dataset.frontierEntry='true';
  if(page==='home') {
    section.innerHTML=`<p class="frontier-entry-kicker">前沿小项目 · 由熟悉的概念出发</p><h2>从课本再走一步</h2><p>我们学过的电场与电势，怎样出现在 Nature、Science 和诺奖相关研究里？每次只抓住一个新问题，先判断，再用小模型验证。</p>${card('droplet')}<p class="frontier-entry-more">也可以从 <a href="frontier.html?case=graphene">电势差与石墨烯门控</a> 或 <a href="frontier.html?case=storage">2026 年介电储能</a> 出发。</p>`;
    document.querySelector('.book-contents')?.after(section);
  } else if(page==='syllabus') {
    section.innerHTML='<p class="frontier-entry-kicker">选做阅读与解释活动</p><h2>前沿研究怎样接到本章？</h2><p>从电场叠加和静电感应理解液滴极化；从电势差理解石墨烯门控。电容、介电质和储能安排为补充知识，不增加 JC05 的必修目标。</p><a class="frontier-entry-link" href="frontier.html">进入“从课本再走一步” →</a>';
    document.querySelector('.book-syllabus')?.append(section);
  } else {
    const key=({field:'droplet',conductors:'droplet',potential:'graphene',paths:'graphene'})[unit];
    if(!key&&unit!=='applications') return;
    section.innerHTML=`<p class="frontier-entry-kicker">本节再走一步 · 选做</p><h2>把刚学的概念，带进真实研究</h2>${unit==='applications'?`<p>先从一个问题进入。认识研究多考虑了什么，再用简化模型检验自己的理解。</p>${card('storage')}<p class="frontier-entry-more"><a href="frontier.html?case=droplet">液滴极化与操控</a> · <a href="frontier.html?case=graphene">石墨烯与诺奖关联</a></p>`:card(key)}`;
    const prose=[...document.querySelectorAll('.book-chapter article > .book-prose')].at(-1);
    if(prose) prose.after(section);
  }
}
