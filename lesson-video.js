/** Two original student voices, synchronized with the actual Manim film time. */
const MEDIA = new URL('./media/lesson-dialogues/', import.meta.url);
export const LESSON_VIDEOS = Object.freeze({
  foundations: {
    title: '换电荷，场也会变吗？',
    caption: '同一个位置的电场，与放进去的电荷所受的力。',
    file: 'foundations.mp4', timeline: 'foundations.timeline.json', captions: 'foundations.vtt', poster: 'foundations.poster.jpg',
  },
  flux: {
    title: '隔着一个面，能知道里面有什么吗？',
    caption: '看一条场线穿入、穿出，再看整个面的净通量。',
    file: 'flux.mp4', timeline: 'flux.timeline.json', captions: 'flux.vtt', poster: 'flux.poster.jpg',
  },
  field:{title:'两个电场，是把大小相加吗？',caption:'从同一个P比较两个贡献，保留方向再相加。',file:'field.mp4',timeline:'field.timeline.json',captions:'field.vtt',poster:'field.poster.jpg'},
});
const QUESTIONS={foundations:[['同距换方向',4,'directions'],['距离加倍',6,'distance'],['固定 P 换 q',7,'charge'],['比较 F/q',9,'charge']],field:[['分开看每个源',1,'dipole'],['只加大小？',2,'dipole'],['同号与异号',6,'same'],['只换试探 q',8,'same']],flux:[['一进一出？',1,'flux'],['把源放里面',4,'flux'],['改变包围面',6,'flux'],['零等于没有？',8,'flux']]};

function ensureStyle() {
  if (document.querySelector('link[data-lesson-video]')) return;
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./lesson-video.css', import.meta.url).href;
  style.dataset.lessonVideo = 'true';
  document.head.append(style);
}

export function mountLessonVideo(host, { lesson = 'foundations' } = {}) {
  const config = LESSON_VIDEOS[lesson];
  if (!config) throw new Error(`Unknown lesson video: ${lesson}`);
  ensureStyle();
  const asset = file => {const url=new URL(file,MEDIA);url.searchParams.set('v','3.1-discovery');return url.href;};
  const portraits = new URL('./assets/lesson-characters/students-ai.png', import.meta.url).href;
  host.innerHTML = `<figure class="lesson-film" tabindex="0" aria-keyshortcuts="Space ArrowLeft ArrowRight" aria-label="${config.title}，双人对话视频。空格播放暂停，左右方向键快退快进。">
    <figcaption class="lesson-film-heading"><span class="lesson-film-kicker">同学聊一聊</span><strong>${config.title}</strong><span class="lesson-film-duration"></span></figcaption>
    <div class="lesson-film-screen">
      <video playsinline preload="metadata" tabindex="0" aria-keyshortcuts="Space ArrowLeft ArrowRight" poster="${asset(config.poster)}" aria-label="${config.title}，Manim 三维动画，豆包双人配音。空格播放暂停，左右方向键快退快进。">
        <source src="${asset(config.file)}" type="video/mp4">
        <track kind="captions" src="${asset(config.captions)}" srclang="zh" label="中文字幕">
        您的浏览器无法直接播放此视频，可通过下面的完整对话阅读内容。
      </video>
    </div>
    <div class="lesson-film-controls" aria-label="视频播放控制"><button data-film-play>▶ 播放</button><input data-film-seek type="range" min="0" max="100" step="0.1" value="0" aria-label="播放进度"><output data-film-time>0:00</output><button data-film-rate aria-label="切换视频播放速度">1.0×</button><button data-film-mute aria-label="静音">声音 开</button><button data-film-full aria-label="全屏查看动画">⛶</button></div>
    <nav class="lesson-film-questions" aria-label="视频问题链">${QUESTIONS[lesson].map(([text,turn],i)=>`<button data-film-question="${i}" data-film-turn="${turn}"><small>${i+1}</small>${text}</button>`).join('')}<button class="lesson-film-try" data-film-try>在模型里试这一问 ↑</button></nav>
    <div class="lesson-film-conversation" aria-label="两位虚构学生交流">
      <div class="lesson-film-speaker" data-speaker="xia"><img src="${portraits}" alt="小夏，AI 生成的虚构学生形象" width="52" height="52"><div><b>小夏</b></div><i aria-hidden="true"></i></div>
      <p class="lesson-film-current">${config.caption}</p>
      <div class="lesson-film-speaker" data-speaker="che"><img src="${portraits}" alt="阿澈，AI 生成的虚构学生形象" width="52" height="52"><div><b>阿澈</b></div><i aria-hidden="true"></i></div>
    </div>
    <details class="lesson-film-transcript"><summary>完整对话</summary><ol></ol></details>
    <p class="lesson-film-credit">原创三维动画 · AI 生成的虚构学生形象 · 豆包合成语音</p>
  </figure>`;
  const video = host.querySelector('video');
  host.querySelectorAll('.lesson-film-speaker img').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fallback) return;
      img.dataset.fallback = 'true';
      img.src = asset(img.closest('[data-speaker]').dataset.speaker === 'xia' ? 'student-a.svg' : 'student-b.svg');
    });
  });
  const duration = host.querySelector('.lesson-film-duration');
  const utterance = host.querySelector('.lesson-film-current');
  const transcript = host.querySelector('.lesson-film-transcript ol');
  const controller = new AbortController();
  const seek=host.querySelector('[data-film-seek]'),play=host.querySelector('[data-film-play]'),mute=host.querySelector('[data-film-mute]');
  const updateControls=()=>{play.textContent=video.paused?'▶ 播放':'Ⅱ 暂停';if(Number.isFinite(video.duration))seek.max=video.duration;seek.value=video.currentTime;host.querySelector('[data-film-time]').textContent=`${Math.floor(video.currentTime/60)}:${String(Math.floor(video.currentTime%60)).padStart(2,'0')}`;mute.textContent=video.muted?'声音 关':'声音 开';};
  play.onclick=()=>video.paused?video.play().catch(()=>{}):video.pause();seek.oninput=()=>{video.currentTime=Number(seek.value);};mute.onclick=()=>{video.muted=!video.muted;updateControls();};host.querySelector('[data-film-full]').onclick=()=>video.requestFullscreen?.().catch(()=>{});
  const rate=host.querySelector('[data-film-rate]');rate.onclick=()=>{const speeds=[1,1.15,1.3];video.playbackRate=speeds[(speeds.indexOf(video.playbackRate)+1)%speeds.length];rate.textContent=video.playbackRate.toFixed(2).replace(/0$/,'')+'×';};
  for(const name of ['timeupdate','loadedmetadata','play','pause','ended'])video.addEventListener(name,updateControls,{signal:controller.signal});
  let timeline = [], disposed = false, lastIndex = -2;
  let currentQuestion=0;
  host.querySelectorAll('[data-film-question]').forEach(button=>button.onclick=()=>{const turn=timeline[Number(button.dataset.filmTurn)];if(turn){video.currentTime=turn.start;video.play().catch(()=>{});}});
  host.querySelector('[data-film-try]').onclick=()=>{
    video.pause();const key=QUESTIONS[lesson][currentQuestion][2],lab=document.querySelector('#experience');
    if(lesson==='foundations'){lab?.querySelector('[data-model="point"]')?.click();if(key==='charge')lab?.querySelector('[data-q="1"]')?.click();lab?.dispatchEvent(new CustomEvent('foundation-demonstration',{detail:{kind:key}}));}
    if(lesson==='field')lab?.querySelector(`[data-preset="${key==='same'?'same':'dipole'}"]`)?.click();
    const target=lab;target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    if(lab){lab.classList.remove('lesson-highlight');requestAnimationFrame(()=>lab.classList.add('lesson-highlight'));}
  };
  const stamp = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const update = () => {
    const index = timeline.findIndex(turn => video.currentTime >= turn.start && video.currentTime < turn.end);
    if (index === lastIndex) return;
    lastIndex = index;
    const turn = timeline[index];
    const effectiveIndex=index>=0?index:timeline.findLastIndex(item=>item.end<=video.currentTime);currentQuestion=0;QUESTIONS[lesson].forEach((q,i)=>{if(effectiveIndex>=q[1])currentQuestion=i;});host.querySelectorAll('[data-film-question]').forEach((button,i)=>button.setAttribute('aria-current',String(i===currentQuestion)));
    host.querySelectorAll('[data-speaker]').forEach(person => {
      const speaking = !!turn && person.dataset.speaker === turn.speaker && !video.paused;
      person.classList.toggle('is-speaking', speaking);
      person.setAttribute('aria-label', `${person.dataset.speaker === 'xia' ? '小夏' : '阿澈'}${speaking ? '正在说话' : ''}`);
    });
    const preceding = !turn && timeline.filter(item => item.end <= video.currentTime).at(-1);
    utterance.textContent = turn ? turn.text : preceding ? preceding.text : config.caption;
    host.querySelectorAll('[data-turn]').forEach(row => row.classList.toggle('is-current', Number(row.dataset.turn) === index));
  };
  const refresh = () => { lastIndex = -2; update(); };
  video.addEventListener('timeupdate', update);
  video.addEventListener('seeked', refresh);
  video.addEventListener('play', refresh);
  video.addEventListener('pause', refresh);
  video.addEventListener('ended', refresh);
  const frame = host.querySelector('.lesson-film');
  frame.addEventListener('keydown', event => {
    // Leave the browser's own media-control keys alone; handle the figure itself.
    if (event.target !== frame) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Space' || event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (video.paused) video.play().catch(() => {}); else video.pause();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      video.currentTime = Math.max(0, Math.min(Number.isFinite(video.duration) ? video.duration : Infinity,
        video.currentTime + (event.key === 'ArrowRight' ? 5 : -5)));
    }
  });
  video.addEventListener('loadedmetadata', () => { if (Number.isFinite(video.duration)) duration.textContent = stamp(video.duration); });
  video.addEventListener('error', () => {
    utterance.textContent = '视频暂时无法读取；可展开下面的完整对话。';
  });
  fetch(asset(config.timeline), { signal: controller.signal }).then(response => {
    if (!response.ok) throw new Error('Dialogue timeline unavailable');
    return response.json();
  }).then(turns => {
    if (disposed) return;
    timeline = turns;
    timeline.forEach((turn, index) => {
      const li = document.createElement('li');
      li.dataset.turn = String(index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lesson-film-turn';
      button.textContent = `${stamp(turn.start)}  ${turn.name}：${turn.text}`;
      button.setAttribute('aria-label', `跳到 ${stamp(turn.start)}，${turn.name}的这句话`);
      button.addEventListener('click', () => { video.currentTime = turn.start; video.play().catch(() => {}); });
      li.append(button);
      transcript.append(li);
    });
    refresh();
    host.dataset.lessonVideoReady = 'true';
  }).catch(error => {
    if (error.name !== 'AbortError') utterance.textContent = config.caption;
  });
  return () => {
    disposed = true;
    controller.abort();
    video.pause();
    video.removeAttribute('src');
    video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
    video.load();
    host.innerHTML = '';
  };
}
