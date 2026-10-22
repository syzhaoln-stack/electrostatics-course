import {PAPERS, READING_STAGES, buildReadingPrompt} from './paper-reading-content.js';

const STORAGE_PREFIX = 'electrostatics-paper-reading-1:';
let nextMountId = 0;
const text = value => typeof value === 'string' ? value : '';
const markdownText = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = String(content);
  return node;
}

function webLink(label, url) {
  const anchor = element('a', '', label);
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Unsupported link');
    anchor.href = parsed.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  } catch {
    anchor.removeAttribute('href');
    anchor.setAttribute('aria-disabled', 'true');
  }
  return anchor;
}

/** Mount one paper's reading notebook. Returns a cleanup function for rerenders. */
export function mountPaperReading(host, {caseKey} = {}) {
  if (!(host instanceof Element)) throw new TypeError('Paper reading needs a host element.');
  const paper = PAPERS[caseKey];
  if (!paper) {
    host.replaceChildren(element('p', 'paper-reading-status', '尚未配置这篇论文的精读材料。'));
    return () => {};
  }
  const controller = new AbortController();
  const listen = (node, event, callback) => node.addEventListener(event, callback, {signal: controller.signal});
  const prefix = `paper-reading-${++nextMountId}`;
  const stageIds = new Set(READING_STAGES.map(stage => stage.id));
  const baseFigures = Array.isArray(paper.figures) ? paper.figures : [];
  const defaultFigure = baseFigures.find(figure => figure.id === paper.defaultFigure) || baseFigures[0];
  if (!defaultFigure) {
    host.replaceChildren(element('p', 'paper-reading-status', '这篇论文尚未指定阅读图。'));
    return () => {};
  }
  let stored;
  try { stored = JSON.parse(localStorage.getItem(STORAGE_PREFIX + caseKey) || '{}'); } catch { stored = {}; }
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) stored = {};
  const customFigures = Array.isArray(stored.customFigures) ? stored.customFigures.filter(item => item && typeof item.id === 'string' && item.id.startsWith('custom:') && typeof item.label === 'string').map(item => ({id: item.id, label: item.label, custom: true, url: paper.openUrl || paper.url, question: '先核实这张图在原文中的位置，再解释图中呈现了什么。'})) : [];
  const figures = [...baseFigures, ...customFigures];
  let selected = figures.some(figure => figure.id === stored.selectedFigure) ? stored.selectedFigure : defaultFigure.id;
  const notes = new Map();
  if (stored.notes && typeof stored.notes === 'object' && !Array.isArray(stored.notes)) {
    for (const [id, source] of Object.entries(stored.notes)) {
      if (!source || typeof source !== 'object') continue;
      notes.set(id, {
        figureLabel: text(source.figureLabel), location: text(source.location), observation: text(source.observation),
        evidence: text(source.evidence), goal: text(source.goal), stage: stageIds.has(source.stage) ? source.stage : 'figure',
        updatedAt: text(source.updatedAt), copiedAt: text(source.copiedAt), custom: Boolean(source.custom),
      });
    }
  }
  let storageAvailable = true;
  let disposed = false;
  const currentFigure = () => figures.find(figure => figure.id === selected) || defaultFigure;
  const currentNote = () => {
    if (!notes.has(selected)) notes.set(selected, {figureLabel: currentFigure().label, location: '', observation: '', evidence: '', goal: '', stage: 'figure', updatedAt: '', copiedAt: '', custom: Boolean(currentFigure().custom)});
    return notes.get(selected);
  };
  function persist() {
    if (disposed) return;
    const payload = {format: 'paper-reading-notes-1', caseKey, paperTitle: paper.title, selectedFigure: selected, customFigures: figures.filter(figure => figure.custom).map(({id, label}) => ({id, label})), notes: Object.fromEntries(notes)};
    try { localStorage.setItem(STORAGE_PREFIX + caseKey, JSON.stringify(payload)); storageAvailable = true; }
    catch { storageAvailable = false; }
  }

  const root = element('section', 'paper-reading');
  root.dataset.case = caseKey;
  root.setAttribute('aria-labelledby', `${prefix}-title`);
  const heading = element('div', 'paper-reading-heading');
  const title = element('h3', '', '一次读一张图');
  title.id = `${prefix}-title`;
  heading.append(title, element('span', 'paper-reading-mode', '精读笔记'));
  root.append(heading);
  const intro = element('p', 'paper-reading-intro', '先写自己的观察，再把本步提示复制到你的 AI 对话中使用。本页不调用远程 AI。');
  root.append(intro);
  const scope = element('p', 'paper-reading-scope');
  scope.append(element('b', '', '阅读范围　'), document.createTextNode(text(paper.scope)));
  root.append(scope);

  const selectors = element('div', 'paper-reading-selectors');
  function labeledControl(labelText, input, id, className = '') {
    const wrapper = element('div', `paper-reading-field ${className}`.trim());
    const label = element('label', '', labelText);
    label.htmlFor = id;
    input.id = id;
    wrapper.append(label, input);
    return wrapper;
  }
  const figureSelect = element('select', 'paper-reading-figure');
  const stageSelect = element('select', 'paper-reading-stage');
  for (const stage of READING_STAGES) {
    const option = element('option', '', stage.label);
    option.value = stage.id;
    stageSelect.append(option);
  }
  function refreshFigures() {
    figureSelect.replaceChildren();
    for (const figure of figures) {
      const option = element('option', '', figure.custom ? `自选 · ${figure.label}` : figure.label);
      option.value = figure.id;
      figureSelect.append(option);
    }
    figureSelect.value = selected;
  }
  selectors.append(labeledControl('当前图', figureSelect, `${prefix}-figure`), labeledControl('本次只做这一步', stageSelect, `${prefix}-stage`));
  root.append(selectors);
  const links = element('nav', 'paper-reading-links');
  links.setAttribute('aria-label', '原论文与当前图');
  root.append(links);
  const task = element('p', 'paper-reading-task');
  task.setAttribute('aria-live', 'polite');
  root.append(task);

  const locationDetails = element('details', 'paper-reading-location-details');
  locationDetails.append(element('summary', '', '再定位到分图，或自行选择另一张图'));
  const location = element('input', 'paper-reading-location');
  location.type = 'text';
  location.maxLength = 500;
  location.placeholder = '例如 Fig.2D；图注 D 对应句；Results 段落首句……';
  locationDetails.append(labeledControl('当前图中的具体位置（选填）', location, `${prefix}-location`));
  const customRow = element('div', 'paper-reading-custom-row');
  const customName = element('input', 'paper-reading-custom-name');
  customName.type = 'text';
  customName.maxLength = 120;
  customName.placeholder = '例如 Supplementary Fig.3B';
  const customField = labeledControl('自选图号（选填，将单独保存）', customName, `${prefix}-custom`);
  const addFigure = element('button', 'paper-reading-add', '使用这张图');
  addFigure.type = 'button';
  customRow.append(customField, addFigure);
  locationDetails.append(customRow, element('p', 'paper-reading-note', '自选图号与定位由你提供，先在原文核实。这里不会自动判定图号存在。'));
  root.append(locationDetails);

  const goal = element('textarea', 'paper-reading-goal');
  goal.rows = 2;
  goal.maxLength = 1000;
  goal.placeholder = '目标：……；指标：……；条件：……；资源：……';
  const goalField = labeledControl('我的目标、验收条件与可用资源（选填）', goal, `${prefix}-goal`, 'paper-reading-goal-field');
  goalField.hidden = true;
  root.append(goalField);

  const noteGrid = element('div', 'paper-reading-note-grid');
  const observation = element('textarea', 'paper-reading-observation');
  observation.rows = 3;
  observation.placeholder = '我先看到……我猜……我还不明白……';
  const evidence = element('textarea', 'paper-reading-evidence');
  evidence.rows = 3;
  evidence.placeholder = '图号/分图/章节段落：……支持我的解释……仍不确定……';
  noteGrid.append(labeledControl('我先看到了什么 / 我的疑问', observation, `${prefix}-observation`), labeledControl('核对原文后：证据位置与我的解释', evidence, `${prefix}-evidence`));
  root.append(noteGrid);

  const actions = element('div', 'paper-reading-actions');
  const copy = element('button', 'primary paper-reading-copy', '复制本步精读提示');
  copy.type = 'button';
  const exportButton = element('button', 'paper-reading-export', '导出本篇读图记录');
  exportButton.type = 'button';
  actions.append(copy, exportButton);
  root.append(actions);
  const status = element('p', 'paper-reading-status');
  status.setAttribute('role', 'status');
  root.append(status);
  const preview = element('details', 'paper-reading-preview');
  preview.append(element('summary', '', '预览将要复制的提示词'));
  const promptArea = element('textarea', 'paper-reading-prompt');
  promptArea.rows = 11;
  promptArea.readOnly = true;
  promptArea.setAttribute('aria-label', '本步精读提示词预览');
  preview.append(promptArea);
  root.append(preview);
  root.append(element('p', 'paper-reading-note', '每张图的笔记独立保存在当前浏览器。换图、换案例不会覆盖；导出的 Markdown 可另存。AI 的解释需回到原文核对。'));
  host.replaceChildren(root);

  function updatePrompt() {
    const note = currentNote();
    const figure = currentFigure();
    const stage = stageSelect.value;
    const prompt = buildReadingPrompt({caseKey, stage, figure: figure.custom ? figure.label : figure.id, goal: ['goal', 'topics'].includes(stage) ? note.goal : ''});
    const additions = ['\n\n【我的阅读笔记：下列内容是个人观察与待核实判断，不是已经证实的论文结论】'];
    if (note.location.trim()) additions.push(`图中具体位置：${note.location.trim()}`);
    if (note.observation.trim()) additions.push(`我先看到的现象 / 疑问：\n${note.observation.trim()}`);
    else if (['figure', 'results'].includes(stage)) additions.push('我还没有写下初步观察。请先用一个短问题引导我看图和作判断，不要直接替我完成整篇解读。');
    else if (['goal', 'topics'].includes(stage)) additions.push('我还没有写下个人理解。请按本步任务先确认我的目标、指标、条件与资源；缺项时先集中询问并等待回答，不自行编造，也不急着给出选题。');
    else additions.push('我还没有写下初步理解。请按本步任务先用一个简短问题引导我表达判断，再结合原文核对，不直接替我完成解读。');
    if (note.evidence.trim()) additions.push(`我已记下的证据位置与解释（请协助核对）：\n${note.evidence.trim()}`);
    additions.push('请以当前论文和本步任务为范围，指出我的理解中有依据、缺少依据和仍待核实的部分。需要详细读图时，一次只处理一张图或一个分图；不要一次展开所有精读步骤或逐张解析全篇图。');
    promptArea.value = String(prompt) + additions.join('\n\n');
  }
  function announceSaved() {
    status.textContent = storageAvailable ? '笔记已在本机保存。复制提示后，到你自己的 AI 对话继续。' : '浏览器未能保存笔记。请先导出本篇记录，避免离开后丢失。';
  }
  function capture() {
    const note = currentNote();
    Object.assign(note, {location: location.value, observation: observation.value, evidence: evidence.value, goal: goal.value, stage: stageSelect.value, updatedAt: new Date().toISOString()});
    persist();
    updatePrompt();
  }
  function showSelected() {
    refreshFigures();
    const figure = currentFigure();
    const note = currentNote();
    stageSelect.value = stageIds.has(note.stage) ? note.stage : 'figure';
    location.value = note.location;
    observation.value = note.observation;
    evidence.value = note.evidence;
    goal.value = note.goal;
    goalField.hidden = !['goal', 'topics'].includes(stageSelect.value);
    const stage = READING_STAGES.find(item => item.id === stageSelect.value);
    task.textContent = stageSelect.value === 'figure' ? `${stage?.hint || ''}${stage?.hint && figure.question ? '　' : ''}${figure.question || ''}` : stage?.hint || '';
    links.replaceChildren(webLink('原论文', paper.url));
    if (paper.openUrl && paper.openUrl !== paper.url) links.append(webLink('可读全文', paper.openUrl));
    links.append(webLink(figure.custom ? '打开原文核实自选图' : '打开图所在页', figure.url || paper.openUrl || paper.url));
    if (figure.custom) links.append(element('span', '', '自选图号尚未核实'));
    updatePrompt();
    status.textContent = note.updatedAt ? '已恢复这张图的笔记。可以继续观察或核对。' : '先看原图，写一句观察；也可以直接复制提示，让 AI 带你读图。';
    root.dataset.figure = selected;
    root.dataset.stage = stageSelect.value;
  }
  listen(figureSelect, 'change', () => {
    capture();
    selected = figureSelect.value;
    persist();
    showSelected();
  });
  listen(stageSelect, 'change', () => {
    capture();
    goalField.hidden = !['goal', 'topics'].includes(stageSelect.value);
    const stage = READING_STAGES.find(item => item.id === stageSelect.value);
    task.textContent = stageSelect.value === 'figure' ? `${stage?.hint || ''} ${currentFigure().question || ''}` : stage?.hint || '';
    root.dataset.stage = stageSelect.value;
    announceSaved();
  });
  for (const field of [location, observation, evidence, goal]) listen(field, 'input', () => { capture(); announceSaved(); });
  listen(addFigure, 'click', () => {
    const label = customName.value.trim();
    if (!label) { status.textContent = '先填写一个图号或分图名，例如 Fig.3B。'; customName.focus(); return; }
    capture();
    let figure = figures.find(item => item.custom && item.label === label);
    if (!figure) {
      figure = {id: `custom:${Date.now()}:${figures.length}`, label, custom: true, url: paper.openUrl || paper.url, question: '先在原文核实图号、分图和图注，再开始本步解读。'};
      figures.push(figure);
    }
    selected = figure.id;
    customName.value = '';
    persist();
    showSelected();
    status.textContent = '已为自选图建立独立笔记。请先核实图号与原文位置。';
    figureSelect.focus();
  });
  listen(copy, 'click', async () => {
    capture();
    const value = promptArea.value;
    const copiedNote = currentNote();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      if (disposed) return;
      copiedNote.copiedAt = new Date().toISOString();
      persist();
      status.textContent = '已复制本步提示。粘贴到你自己的 AI 对话；对方无法读原文时，再提供对应图与图注。';
    } catch {
      if (disposed) return;
      preview.open = true;
      promptArea.focus();
      promptArea.select();
      status.textContent = '未能自动复制，已选中提示词。请按 Ctrl+C 复制，再粘贴到你自己的 AI 对话。';
    }
  });
  listen(exportButton, 'click', () => {
    capture();
    const lines = ['# 我的逐图精读记录', '', `论文：${markdownText(paper.title)}`, '', `原文：${paper.url}`, '', `阅读范围：${markdownText(paper.scope)}`, '', `导出时间：${new Date().toISOString()}`, '', '> 以下为学生读图记录与待核实解释，不是论文的原始实验数据。', ''];
    for (const figure of figures) {
      const note = notes.get(figure.id);
      if (!note || ![note.observation, note.evidence, note.location, note.goal].some(value => value.trim())) continue;
      const stage = READING_STAGES.find(item => item.id === note.stage);
      lines.push(`## ${markdownText(figure.label)}${figure.custom ? '（自选，图号待核实）' : ''}`, '', `阅读阶段：${markdownText(stage?.label || note.stage)}`, '', `图或全文：${figure.url || paper.openUrl || paper.url}`, '');
      if (note.location) lines.push(`图中定位：${markdownText(note.location)}`, '');
      if (note.goal) lines.push(`我的目标：${markdownText(note.goal)}`, '');
      lines.push('### 我先看到了什么 / 我的疑问', '', markdownText(note.observation || '（尚未记录）'), '', '### 核对原文后：证据位置与我的解释', '', markdownText(note.evidence || '（尚未记录）'), '', `最后记录：${note.updatedAt || '未记录'}`, '');
    }
    if (!lines.some(line => line.startsWith('## '))) lines.push('尚未填写个人读图笔记。');
    const blob = new Blob([lines.join('\n')], {type: 'text/markdown;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const anchor = element('a');
    anchor.href = url;
    anchor.download = `逐图精读-${caseKey}.md`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = '已导出本篇论文各张图的读图记录。';
  });
  listen(window, 'pagehide', capture);
  showSelected();
  root.dataset.ready = 'true';
  return () => {
    if (disposed) return;
    capture();
    disposed = true;
    controller.abort();
  };
}
