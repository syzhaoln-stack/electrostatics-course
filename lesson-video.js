import {VIDEO_QUESTIONS,questionProgress} from './lesson-questions.js';
/** Two original student voices, synchronized with the actual Manim film time. */
const MEDIA = new URL('./media/lesson-dialogues/', import.meta.url);
export const LESSON_VIDEOS = Object.freeze({
  potential:{title:'不做功，为什么还受力？',caption:'同一个点：看力、位移与功，再比较自由释放。',file:'potential.mp4',timeline:'potential.timeline.json',captions:'potential.vtt',poster:'potential.poster.jpg'},
  paths:{title:'绕远路，会多做功吗？',caption:'改变路线、回到起点、转动一小步。',file:'paths.mp4',timeline:'paths.timeline.json',captions:'paths.vtt',poster:'paths.poster.jpg'},
  conductors:{title:'外场还在，球内为什么是零？',caption:'外场与感应场相消，表面外侧仍可有场。',file:'conductors.mp4',timeline:'conductors.timeline.json',captions:'conductors.vtt',poster:'conductors.poster.jpg'},
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
const QUESTIONS=VIDEO_QUESTIONS;

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
  const asset = file => {const url=new URL(file,MEDIA);url.searchParams.set('v','3.5.0');return url.href;};
  const portraits = new URL('./assets/lesson-characters/students-ai.png', import.meta.url).href;
  host.innerHTML = `<figure class="lesson-film" tabindex="0" aria-keyshortcuts="Space ArrowLeft ArrowRight" aria-label="${config.title}，双人对话视频。空格播放暂停，左右方向键快退快进。">
    <figcaption class="lesson-film-heading"><span class="lesson-film-kicker">同学聊一聊</span><strong>${config.title}</strong><span class="lesson-film-duration"></span></figcaption>
    <div class="lesson-film-layout"><div class="lesson-film-screen">
      <video playsinline preload="metadata" tabindex="0" aria-keyshortcuts="Space ArrowLeft ArrowRight" poster="${asset(config.poster)}" aria-label="${config.title}，Manim 三维动画，豆包双人配音。空格播放暂停，左右方向键快退快进。">
        <source src="${asset(config.file)}" type="video/mp4">
        <track kind="captions" src="${asset(config.captions)}" srclang="zh" label="中文字幕">
        您的浏览器无法直接播放此视频，可通过下面的完整对话阅读内容。
      </video>
    </div>
    <aside class="lesson-film-notebook" aria-label="已经讨论的问题与答案"><div class="lesson-film-notebook-body"><header>我们刚才弄清了什么</header><p class="lesson-film-wait">播放后，问题与答案会逐条留在这里。</p>${QUESTIONS[lesson].map((q,i)=>`<article data-film-card="${i}" hidden><button data-film-question="${i}" data-film-turn="${q.turn}"><small>${String(i+1).padStart(2,'0')}</small>${q.question}</button><p data-film-answer hidden>${q.answer}</p></article>`).join('')}</div></aside></div>
    <div class="lesson-film-controls" aria-label="视频播放控制"><button data-film-play>▶ 播放</button><input data-film-seek type="range" min="0" max="100" step="0.1" value="0" aria-label="播放进度"><output data-film-time>0:00</output><button data-film-rate aria-label="切换视频播放速度">1.0×</button><button data-film-mute aria-label="静音">声音 开</button><button data-film-full aria-label="全屏查看动画">⛶</button></div>
    <nav class="lesson-film-questions" aria-label="接着操作"><span>答案随讨论出现；点问题可以回看。</span><button class="lesson-film-try" data-film-try>在模型里试这一问 ↑</button></nav>
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
  play.onclick=()=>video.paused?video.play().catch(()=>{}):video.pause();seek.oninput=()=>{video.currentTime=Number(seek.value);};mute.onclick=()=>{video.muted=!video.muted;updateControls();};host.querySelector('[data-film-full]').onclick=()=>host.querySelector('.lesson-film').requestFullscreen?.().catch(()=>{});
  const rate=host.querySelector('[data-film-rate]');rate.onclick=()=>{const speeds=[1,.9,1.1];video.playbackRate=speeds[(speeds.indexOf(video.playbackRate)+1)%speeds.length];rate.textContent=video.playbackRate.toFixed(2).replace(/0$/,'')+'×';};
  for(const name of ['timeupdate','loadedmetadata','play','pause','ended'])video.addEventListener(name,updateControls,{signal:controller.signal});
  let timeline = [], disposed = false, lastIndex = -2;
  let currentQuestion=0,furthestTime=0;
  host.querySelectorAll('[data-film-question]').forEach(button=>button.onclick=()=>{const turn=timeline[Number(button.dataset.filmTurn)];if(turn){video.currentTime=turn.start;video.play().catch(()=>{});}});
  host.querySelector('[data-film-try]').onclick=()=>{
    video.pause();const key=QUESTIONS[lesson][currentQuestion].action,lab=document.querySelector('#experience');
    if(lesson==='foundations'){lab?.querySelector('[data-model="point"]')?.click();if(key==='charge')lab?.querySelector('[data-q="1"]')?.click();lab?.dispatchEvent(new CustomEvent('foundation-demonstration',{detail:{kind:key}}));}
    if(lesson==='field')lab?.querySelector(`[data-preset="${key==='same'?'same':'dipole'}"]`)?.click();
    if(lesson==='potential'){
      lab?.querySelector(`[data-potential-step="${key==='release'?0:key==='zero'?3:1}"]`)?.click();
      if(key==='zero')lab?.querySelector('[data-potential-level="0"]')?.click();
      if(key==='charge')lab?.querySelector('[data-probe-sign="-1"]')?.click();
    }
    if(lesson==='paths')lab?.querySelector(`[data-path-mode="${key}"]`)?.click();
    if(lesson==='conductors'){
      lab?.querySelector(`[data-conductor-mode="${key==='charged'?'charged':'induced'}"]`)?.click();
      lab?.querySelector(`#conductor-${key==='surface'?'surface':key==='charged'?'outside':'inside'}`)?.click();
    }
    const target=lab;target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    if(lab){lab.classList.remove('lesson-highlight');requestAnimationFrame(()=>lab.classList.add('lesson-highlight'));}
  };
  const stamp = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const update = () => {
    const index = timeline.findIndex(turn => video.currentTime >= turn.start && video.currentTime < turn.end);
    if (index === lastIndex) return;
    lastIndex = index;
    const turn = timeline[index];
    furthestTime=Math.max(furthestTime,video.currentTime);
    const previousQuestion=currentQuestion,states=questionProgress(QUESTIONS[lesson],timeline,video.currentTime,furthestTime);currentQuestion=0;let revealedAnswer=false;
    states.forEach((state,i)=>{if(state.current)currentQuestion=i;const card=host.querySelector(`[data-film-card="${i}"]`);if(state.answered&&card.dataset.answered!=='true')revealedAnswer=true;card.hidden=!state.visible;card.querySelector('[data-film-answer]').hidden=!state.answered;card.dataset.answered=String(state.answered);});
    host.querySelector('.lesson-film-wait').hidden=states.some(s=>s.visible);
    host.querySelectorAll('[data-film-question]').forEach((button,i)=>button.setAttribute('aria-current',String(i===currentQuestion)));
    if(previousQuestion!==currentQuestion||revealedAnswer){
      const pane=host.querySelector('.lesson-film-notebook-body'),card=host.querySelector(`[data-film-card="${currentQuestion}"]`),p=pane.getBoundingClientRect(),c=card.getBoundingClientRect();
      if(c.bottom>p.bottom)pane.scrollTop+=c.bottom-p.bottom+12;else if(c.top<p.top)pane.scrollTop-=p.top-c.top+12;
    }
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
