/** Full-width film; questions and annotations are in the picture. */
export async function mountCoulombFilm(host){
 host.innerHTML=`<p class="eyebrow">1785 · 一次微小力的测量</p><h2>一根银丝，怎样称出电力？</h2><div class="cfilm-layout"><video controls playsinline preload="metadata" poster="media/lesson-dialogues/coulomb.poster.jpg?v=3.8.0" aria-label="库仑电秤：银丝扭转、三次测量与距离—力拟合"><source src="media/lesson-dialogues/coulomb.mp4?v=3.8.0" type="video/mp4"><track src="media/lesson-dialogues/coulomb.vtt?v=3.8.0" kind="subtitles" srclang="zh" label="中文"></video></div><div class="cfilm-current" aria-live="polite"><span>正在看</span><b></b><p></p></div><div class="cfilm-actions"><a href="#distance-force" class="cfilm-try">亲手追近小球，把三次读数放到图上 ↓</a></div><details class="cfilm-recap"><summary>回看问题与答案</summary><ol></ol></details><details class="cfilm-sources"><summary>原论文、数据与制作资料</summary><p>影片依据1784、1785年论文写成。旁白为现代讲解，使用豆包成熟男声合成。装置用Blender重建；银丝表面观察标记、局部尺寸和运动时间为观看调整。银丝中心轴保持笔直，上下端绕同一轴转动。</p><p><a href="assets/coulomb/Coulomb_1784_MIT.pdf">1784年金属丝扭转论文 · MIT英译本 ↗</a> · <a href="assets/coulomb/Coulomb_El_1785.pdf">1785年电学第一论文 · 英译本 ↗</a> · <a href="#translation">中文译文与法文原图 ↓</a> · <a href="#original-operation">原装置旋钮操作与读数 ↓</a></p><p>原文材料：极细银丝；涂封蜡的丝线或稻草轻杆；虫胶端段；接骨木髓球；涂松节油的配重纸片；铜或铁夹头；玻璃罩与纸带刻度。银丝28法寸，约0.756m；杆臂4法寸，约0.108m。换算取1法寸≈27mm、1格令≈53mg。</p><p>原始读数为(0°,36°)、(126°,18°)、(567°,8.5°)。第三次总扭转按算术相加为575.5°，论文圆整记为576°。主图采用论文的小角度近似：相对距离为α/36°，相对斥力为(α+β)/36°，第一次均记为1，随后约为4倍、16倍。在对数空间作幂律最小二乘拟合，绘制仍为线性坐标；指数约1.92。第三次保留8.5°与575.5°，没有改成完美的四分之一与16。弦长、垂直力臂和微牛换算留在图下的展开说明。所提供的修订英译第4页给出绝对标定：360°对应1/340格令重，第一次36°对应1/3400格令重，约0.15μN，相当于约16μg物体的重量。第6页第四备注讨论2–3°的零位不确定范围，折合至多约1/40000格令重，约13nN，相当于约1.3μg物体的重量。这里指原文估计的可辨微力水平。</p><p>动态演示固定银丝上端，由施力球分次靠近，悬球受斥力后退开；间距随运动而变。比较的是与原旋钮操作相同的平衡间距和银丝相对扭角。悬杆按带阻尼的扭转运动方程计算，运动速度为讲解调整；三组末态分别用史料读数标定，图上的点始终来自论文。玻璃外的流动线示意挡风用途。</p><p>1785年论文开头提到此前的扭转测力与流体阻力研究；1784年论文提到更早的磁针悬挂研究。现有依据是这些公开论文。<a href="https://www.academie-sciences.fr/pdf/dossiers/Coulomb/Coulomb_pubd1.htm" target="_blank" rel="noopener">法国科学院论文目录 ↗</a> · <a href="https://makingscience.royalsociety.org/items/l-and-p_11_68/paper-experiments-to-determine-the-density-of-the-earth-by-henry-cavendish" target="_blank" rel="noopener">卡文迪许1798年原手稿 ↗</a></p></details>`;
 const video=host.querySelector('video'),list=host.querySelector('ol'),abort=new AbortController();let chapters=[],seen=new Set(),last=-1;
 const currentQuestion=host.querySelector('.cfilm-current b'),currentAnswer=host.querySelector('.cfilm-current p');
 bindOriginalOperationLinks(host.ownerDocument,abort.signal);
 try{const r=await fetch(new URL('./media/lesson-dialogues/coulomb.chapters.json?v=3.8.0',import.meta.url),{signal:abort.signal});if(!r.ok)throw Error('chapters');chapters=await r.json();list.innerHTML=chapters.map((c,i)=>`<li><button data-chapter="${i}"><span>${String(i+1).padStart(2,'0')}</span>${c.question}</button><p hidden>${c.answer}</p></li>`).join('');}catch(e){if(e.name!=='AbortError')list.innerHTML='<li>章节暂未载入，可直接播放视频。</li>';}
 function sync(){const t=video.currentTime;let current=0;for(let i=0;i<chapters.length;i++)if(t>=chapters[i].start)current=i;chapters.forEach((c,i)=>{if(t>=c.start+(c.end-c.start)*.7)seen.add(i);const row=list.children[i];row?.classList.toggle('current',i===current);if(row)row.querySelector('p').hidden=!seen.has(i);});if(chapters[current]){currentQuestion.textContent=chapters[current].question;currentAnswer.textContent=seen.has(current)?chapters[current].answer:'';}if(current!==last){host.dispatchEvent(new CustomEvent('coulomb-film-chapter',{detail:{index:current,time:t},bubbles:true}));last=current;}}
 host.querySelectorAll('.cfilm-try').forEach(a=>a.addEventListener('click',()=>video.pause()));
 list.addEventListener('click',event=>{const button=event.target.closest('[data-chapter]');if(!button)return;video.currentTime=chapters[+button.dataset.chapter].start;sync();video.scrollIntoView({behavior:'smooth',block:'center'});});video.addEventListener('timeupdate',sync);video.addEventListener('seeked',sync);sync();
 return()=>{abort.abort();video.pause();video.removeEventListener('timeupdate',sync);video.removeEventListener('seeked',sync);};
}

/** Old instrument anchors and stamp hotspots remain useful inside the archive. */
function bindOriginalOperationLinks(doc, signal){
 const win=doc.defaultView,archive=doc.getElementById('original-operation');
 if(!archive)return;
 function reveal(target){
  if(!target||(target!==archive&&!archive.contains(target)))return false;
  let changed=false;
  for(let node=target;node;node=node.parentElement)if(node.tagName==='DETAILS'&&!node.open){node.open=true;changed=true;}
  return changed;
 }
 function hashTarget(hash){try{return doc.getElementById(decodeURIComponent(hash.slice(1)));}catch{return null;}}
 function showFragment(){const target=hashTarget(win.location.hash);if(reveal(target))win.requestAnimationFrame(()=>{if(!signal.aborted)target.scrollIntoView({block:'start'});});}
 doc.addEventListener('click',event=>{
  const element=event.target instanceof win.Element?event.target:null;
  if(element?.closest('[data-stamp-view]'))reveal(doc.getElementById('balance'));
  const link=element?.closest('a[href^="#"]');
  if(link)reveal(hashTarget(link.getAttribute('href')));
 },{capture:true,signal});
 win.addEventListener('hashchange',showFragment,{signal});
 showFragment();
}
