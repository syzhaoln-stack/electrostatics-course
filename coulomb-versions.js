(() => {
  'use strict';

  const versions = {
    dialogue: { name: '年轻男女对话', prefix: './media/lesson-dialogues/coulomb-v41-dialogue' },
    solo: { name: '单人讲述', prefix: './media/lesson-dialogues/coulomb-v39-solo' },
  };
  const video = document.getElementById('film');
  const captions = document.getElementById('film-captions');
  const buttons = [...document.querySelectorAll('[data-version]')];
  const list = document.getElementById('chapter-list');
  const help = document.getElementById('chapter-help');
  const message = document.getElementById('load-message');
  const messageText = document.getElementById('load-message-text');
  const retry = document.getElementById('retry');
  const durationLabel = document.getElementById('film-duration');
  const questionLabel = document.getElementById('chapter-question');
  const numberLabel = document.getElementById('chapter-number');
  let selectedVersion = 'dialogue';
  let chapters = [];
  let chapterIndex = 0;
  let requestedChapter = { index: 0, key: null };
  let requestNumber = 0;
  let controller = null;
  let metadataDuration = null;
  let pendingSeek = null;
  let loading = true;
  let mediaError = false;
  let chapterError = false;
  let captionError = false;

  function clock(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
  }

  function showStatus() {
    const notes = [];
    if (mediaError) notes.push('影片暂时无法播放。请重新加载，或使用下方链接下载观看。');
    if (chapterError) notes.push('章节暂时没有读到，仍可用影片的进度条观看。');
    if (captionError) notes.push('可选字幕暂时没有读到；影片中的字幕仍可观看。');
    if (loading && !notes.length) notes.push('正在读取影片与章节…');
    message.hidden = notes.length === 0;
    messageText.textContent = notes.join(' ');
    retry.hidden = !(mediaError || chapterError || captionError);
  }

  function updateDuration() {
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : metadataDuration;
    durationLabel.textContent = duration ? clock(Math.round(duration)) : (loading ? '读取中' : '待影片载入');
  }

  function updateCurrent(index) {
    if (!chapters.length) return;
    chapterIndex = Math.max(0, Math.min(index, chapters.length - 1));
    const chapter = chapters[chapterIndex];
    requestedChapter = { index: chapterIndex, key: chapter.key };
    numberLabel.textContent = `第 ${(chapterIndex + 1).toString().padStart(2, '0')} 章`;
    questionLabel.textContent = chapter.question;
    for (const button of list.querySelectorAll('button')) {
      if (Number(button.dataset.chapter) === chapterIndex) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
  }

  function seekWhenReady() {
    if (pendingSeek === null || video.readyState < 1) return;
    if (video.currentSrc !== new URL(`${versions[selectedVersion].prefix}.mp4`, document.baseURI).href) return;
    const target = Number.isFinite(video.duration) ? Math.min(pendingSeek, Math.max(0, video.duration - .05)) : pendingSeek;
    try {
      video.currentTime = target;
      pendingSeek = null;
    } catch (_) {
      // Some browsers wait for data beyond the metadata before accepting a seek.
    }
  }

  function selectChapter(index) {
    video.pause();
    updateCurrent(index);
    pendingSeek = chapters[chapterIndex].start;
    seekWhenReady();
  }

  function renderChapters() {
    const fragment = document.createDocumentFragment();
    chapters.forEach((chapter, index) => {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.chapter = index;
      button.setAttribute('aria-label', `第 ${index + 1} 章，${chapter.question}，从 ${clock(chapter.start)} 开始`);
      const order = document.createElement('span');
      order.className = 'chapter-order';
      order.textContent = (index + 1).toString().padStart(2, '0');
      order.setAttribute('aria-hidden', 'true');
      const title = document.createElement('span');
      title.className = 'chapter-title';
      title.textContent = chapter.question;
      const time = document.createElement('span');
      time.className = 'chapter-time';
      time.textContent = `${clock(chapter.start)} – ${clock(chapter.end)}`;
      time.setAttribute('aria-hidden', 'true');
      button.append(order, title, time);
      button.addEventListener('click', () => selectChapter(index));
      row.append(button);
      fragment.append(row);
    });
    list.replaceChildren(fragment);
    list.setAttribute('aria-busy', 'false');
    help.textContent = '点击问题，从这一章的开头看起。';
  }

  async function readJSON(url, signal) {
    const response = await fetch(url, { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error('File unavailable');
    return response.json();
  }

  function cleanChapters(payload) {
    const rows = Array.isArray(payload) ? payload : payload.chapters;
    if (!Array.isArray(rows) || rows.length !== 10) throw new Error('Chapter list incomplete');
    const clean = rows.map((row, index) => {
      if (typeof row.question !== 'string' || !row.question.trim() ||
          !Number.isFinite(row.start) || !Number.isFinite(row.end) || row.start < 0 || row.end <= row.start) {
        throw new Error('Invalid chapter');
      }
      return { question: row.question, start: row.start, end: row.end, key: row.base_id || row.id || String(index) };
    });
    if (clean.some((row, index) => index > 0 && row.start < clean[index - 1].end)) throw new Error('Invalid chapter order');
    return clean;
  }

  async function loadVersion(key, force = false) {
    if (!versions[key] || (key === selectedVersion && requestNumber && !force)) return;
    video.pause();
    if (chapters.length) requestedChapter = { index: chapterIndex, key: chapters[chapterIndex].key };
    const preserve = { ...requestedChapter };
    const number = ++requestNumber;
    controller?.abort();
    controller = new AbortController();
    const activeController = controller;
    const timeout = setTimeout(() => activeController.abort(), 12000);
    selectedVersion = key;
    const version = versions[key];
    chapters = [];
    pendingSeek = null;
    metadataDuration = null;
    loading = true;
    mediaError = chapterError = captionError = false;
    list.replaceChildren();
    list.setAttribute('aria-busy', 'true');
    help.textContent = '正在读取这一版本的章节…';
    document.getElementById('version-name').textContent = version.name;
    buttons.forEach(button => {
      const selected = button.dataset.version === key;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    video.setAttribute('aria-label', `这么小的力，怎样测量？${version.name}`);
    video.poster = `${version.prefix}.poster.jpg`;
    video.src = `${version.prefix}.mp4`;
    captions.src = `${version.prefix}.vtt`;
    video.load();
    showStatus();
    updateDuration();
    const results = await Promise.allSettled([
      readJSON(`${version.prefix}.chapters.json`, activeController.signal),
      readJSON(`${version.prefix}.manifest.json`, activeController.signal),
    ]);
    clearTimeout(timeout);
    if (number !== requestNumber) return;
    loading = false;
    if (results[1].status === 'fulfilled' && Number.isFinite(results[1].value.duration) && results[1].value.duration > 0) {
      metadataDuration = results[1].value.duration;
    }
    try {
      if (results[0].status !== 'fulfilled') throw new Error('Chapters unavailable');
      chapters = cleanChapters(results[0].value);
      const match = preserve.key ? chapters.findIndex(chapter => chapter.key === preserve.key) : -1;
      chapterIndex = match >= 0 ? match : Math.min(preserve.index, chapters.length - 1);
      renderChapters();
      updateCurrent(chapterIndex);
      pendingSeek = chapters[chapterIndex].start;
      seekWhenReady();
    } catch (_) {
      chapterError = true;
      list.setAttribute('aria-busy', 'false');
      help.textContent = '章节暂时无法显示。请重新加载，或使用影片进度条。';
      questionLabel.textContent = '这么小的力，怎样测量？';
      numberLabel.textContent = '章节待载入';
    }
    updateDuration();
    showStatus();
  }

  buttons.forEach(button => button.addEventListener('click', () => loadVersion(button.dataset.version)));
  retry.addEventListener('click', () => loadVersion(selectedVersion, true));
  video.addEventListener('loadedmetadata', () => {
    mediaError = false;
    updateDuration();
    seekWhenReady();
    showStatus();
  });
  video.addEventListener('canplay', seekWhenReady);
  video.addEventListener('durationchange', updateDuration);
  video.addEventListener('error', () => { mediaError = true; showStatus(); });
  captions.addEventListener('error', () => { captionError = true; showStatus(); });
  captions.addEventListener('load', () => { captionError = false; showStatus(); });
  video.addEventListener('timeupdate', () => {
    if (!chapters.length || pendingSeek !== null) return;
    let index = 0;
    for (let i = 1; i < chapters.length; i++) {
      // Media seeks may round down to microseconds; keep an exact chapter seek
      // from briefly selecting the preceding chapter because of that rounding.
      if (video.currentTime + 0.001 >= chapters[i].start) index = i;
      else break;
    }
    if (index !== chapterIndex) updateCurrent(index);
  });
  window.addEventListener('pagehide', () => { video.pause(); controller?.abort(); });
  loadVersion('dialogue');
})();
