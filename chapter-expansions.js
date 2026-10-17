/** Experiments are part of the reading flow, never hidden in accordions. */
const experiments={
 foundations:{title:'把 100 个电子送进接收孔',copy:'先发射一批。拖动图里的电场手柄，把下一批的落点移进绿色孔；灰线保留上一批轨迹。',url:'beam.html'},
 field:{title:'这次用点电荷，再换无限长线',copy:'同一束电子、同一个接收孔。只调源的电荷量，看看弯曲的位置和程度怎样改变。',url:'beam.html?source=point'},
 potential:{title:'电势差也能用来加速',copy:'前两关依次比较横向偏转和纵向加速。看电子动能增加多少，再把加速后的束流送进孔。',url:'beam.html'},
 paths:{title:'靶也在电场里：该瞄哪里？',copy:'同一时刻发射粒子、释放靶。调整发射方向，实际击中它；先比较两者的 q/m。',url:'aim.html'},
 conductors:{title:'把这一束粒子收集到壁面',copy:'调场，把粒子送到亮起的收集区。再比较教学收集器与下一节真实除尘器的电极和气流。',url:'wall.html'},
};
export function mountChapterExpansions(article,id){
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./chapter-expansions.css',import.meta.url).href;document.head.append(sheet);
 const abort=new AbortController(),frames=[];let dead=false;
 const section=(title,copy)=>{const el=document.createElement('section');el.className='chapter-expansion';const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=copy;el.append(h,p);return el;};
 function frameInto(parent,url,title){const frame=document.createElement('iframe'),u=new URL(url,location.href);u.searchParams.set('embed','1');u.searchParams.set('v','3.4.0');frame.dataset.src=u.href;frame.title=title;frame.className='chapter-experiment-frame';frame.style.height=url.startsWith('coulomb')?'2600px':'1100px';frame.allow='fullscreen';parent.append(frame);frames.push(frame);const link=document.createElement('a');link.className='chapter-expand-link';link.href=url;link.textContent='单独展开这个实验 ↗';parent.append(link);observer.observe(frame);}
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting&&entry.target.dataset.src){entry.target.src=entry.target.dataset.src;delete entry.target.dataset.src;observer.unobserve(entry.target);}}),{rootMargin:'500px'});
 const exp=experiments[id];
 if(exp){const block=section(exp.title,exp.copy);block.dataset.inlineExperiment=id;block.id='particle-experiment';const before=article.querySelector('#lesson-video');if(before&&['foundations','field'].includes(id))before.before(block);else if(before)before.after(block);else article.append(block);frameInto(block,exp.url,exp.title);}
 const history=section(id==='foundations'?'1785：用一根银丝量出微小的电力':'这个问题，曾经放进什么装置里？','');history.classList.add('chapter-history');history.id='history-experiment';article.append(history);
 if(id==='foundations'){
  history.querySelector('p').textContent='先看库仑论文的原图，再转动电秤。改变丝径，比较微小力的分辨能力与测量窗口；最后核对他的三次读数。';
  history.insertAdjacentHTML('beforeend','<div class="chapter-coulomb-person"><img src="assets/coulomb/coulomb-portrait.png" alt="库仑历史肖像，后世摹绘"><p><strong>夏尔—奥古斯坦·库仑 · 1736–1806</strong><br>工程师与实验物理学家。先研究金属丝扭转，再把微弱电力变成可读的角度。<br><a href="coulomb.html#translation">论文全文译文与原图</a> · <a href="coulomb.html#legacy">其他建树、纪念邮票与电荷单位</a></p></div>');
  frameInto(history,'coulomb.html','库仑原图、测量分辨率、三维电秤与三次实验读数');
 }else{
  const indexes={field:[1],flux:[2],symmetry:[2],potential:[4],paths:[4],conductors:[3],applications:[5]};
  fetch(new URL('./history.html',import.meta.url),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('历史资料暂未载入');return r.text();}).then(html=>{if(dead)return;const doc=new DOMParser().parseFromString(html,'text/html'),part=[...doc.querySelectorAll('.history-section')].find(s=>s.querySelector('h2')?.textContent.includes('把知识点'));for(const i of indexes[id]||[]){const card=part?.querySelectorAll('.history-card')[i];if(card){const clone=document.importNode(card,true);if([1,2,4].includes(i)){clone.querySelectorAll('b').forEach(b=>{if(b.textContent==='网页任务：')b.textContent='装置中的操作问题：';});}clone.querySelectorAll('a').forEach(a=>{if(a.getAttribute('href')?.startsWith('chapter.html'))a.remove();});history.append(clone);}}}).catch(e=>{if(e.name!=='AbortError')history.querySelector('p').textContent='历史资料暂未载入。可在“历史实验档案”中阅读。';});
 }
 function resize(event){if(event.origin!==location.origin||event.data?.type!=='course-embed-size')return;const frame=frames.find(f=>f.contentWindow===event.source);if(frame&&Number.isFinite(event.data.height))frame.style.height=Math.max(600,Math.min(60000,event.data.height))+'px';}
 window.addEventListener('message',resize);
 return()=>{dead=true;abort.abort();observer.disconnect();window.removeEventListener('message',resize);frames.forEach(f=>f.remove());sheet.remove();};
}
