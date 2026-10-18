import { DEG, R, KAPPA, reading, distance, lever } from './coulomb-physics.js';

// A modern, explicitly labelled model calibrated to the THIRD historical reading.
// It does not replace the other two historical observations with simulated values.
export const ACTIVE_TARGET = Object.freeze({ alphaDegrees: 8.5, betaDegrees: 567 });
const targetReading = reading(ACTIVE_TARGET.betaDegrees, ACTIVE_TARGET.alphaDegrees);
export const ACTIVE_MODEL = Object.freeze({
  forceAtTargetNewtons: targetReading.force,
  distanceAtTargetMetres: targetReading.d,
  power: 2,
  inertiaKgM2: 2e-8,
  dampingNmSecondsPerRadian: 5.5e-7,
  presentationTimeScale: 2.5,
  minAlphaDegrees: 3.2,
  maxBetaDegrees: 720,
  provenance: 'Modern inverse-square model calibrated to the third 1785 observation (567 degrees, 8.5 degrees). Inertia, damping and animation timing are illustrative, not measured historical values.'
});

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export function activeTorques(alphaDegrees, betaDegrees) {
  if (!Number.isFinite(alphaDegrees) || alphaDegrees <= 0 || alphaDegrees >= 175 || !Number.isFinite(betaDegrees) || betaDegrees < 0 || betaDegrees > ACTIVE_MODEL.maxBetaDegrees) throw new RangeError('Invalid balance angles.');
  const r = distance(alphaDegrees);
  const force = ACTIVE_MODEL.forceAtTargetNewtons * (ACTIVE_MODEL.distanceAtTargetMetres / r) ** 2;
  const electric = force * lever(alphaDegrees), restoring = KAPPA * (alphaDegrees + betaDegrees) * DEG;
  return { electric, restoring, net: electric - restoring, force, distance: r, twistDegrees: alphaDegrees + betaDegrees };
}

export function activeEquilibrium(betaDegrees) {
  if (!Number.isFinite(betaDegrees) || betaDegrees < 0 || betaDegrees > ACTIVE_MODEL.maxBetaDegrees) throw new RangeError('Invalid upper angle.');
  let low = ACTIVE_MODEL.minAlphaDegrees, high = 174;
  for (let i = 0; i < 70; i++) { const mid = (low + high) / 2; if (activeTorques(mid, betaDegrees).net > 0) low = mid; else high = mid; }
  return (low + high) / 2;
}

/** Semi-implicit integration, fixed substeps <= 1/480 s. dt is model time, not video time. */
export function advanceActiveBalance(state, dt) {
  if (!Number.isFinite(dt) || dt < 0 || dt > 2 || !Number.isFinite(state.alphaDegrees) || !Number.isFinite(state.velocityDegreesPerSecond)) throw new RangeError('Invalid integration input.');
  let alpha = state.alphaDegrees * DEG, velocity = state.velocityDegreesPerSecond * DEG;
  const count = Math.max(1, Math.ceil(dt * 480)), step = dt / count;
  for (let i = 0; i < count; i++) {
    const t = activeTorques(alpha / DEG, state.betaDegrees);
    velocity += (t.net - ACTIVE_MODEL.dampingNmSecondsPerRadian * velocity) / ACTIVE_MODEL.inertiaKgM2 * step;
    alpha += velocity * step;
    if (alpha < ACTIVE_MODEL.minAlphaDegrees * DEG) { alpha = ACTIVE_MODEL.minAlphaDegrees * DEG; velocity = Math.max(velocity, 0); }
    if (alpha > 174 * DEG) { alpha = 174 * DEG; velocity = Math.min(velocity, 0); }
  }
  return { ...state, alphaDegrees: alpha / DEG, velocityDegreesPerSecond: velocity / DEG };
}

export function activeTargetReached(state) {
  const t = activeTorques(state.alphaDegrees, state.betaDegrees);
  return Math.abs(state.alphaDegrees - ACTIVE_TARGET.alphaDegrees) <= .12 && Math.abs(state.velocityDegreesPerSecond) < .08 && Math.abs(t.net) / Math.max(t.electric, t.restoring) < .006;
}

export function equivalentTorsion(alphaDegrees, betaDegrees) {
  if (!Number.isFinite(alphaDegrees) || !Number.isFinite(betaDegrees)) throw new RangeError('Angles must be finite.');
  const theta = alphaDegrees + betaDegrees;
  return { passive: { top: 0, bottom: theta }, active: { top: -betaDegrees, bottom: alphaDegrees }, twistDegrees: theta, restoringTorque: KAPPA * theta * DEG };
}

function equivalentDiagram() {
  const e = equivalentTorsion(18, 126);
  const wire = (x, state) => `<path d="M ${x} 54 V 205" stroke="#cedad7" stroke-width="2.5"/>${Array.from({ length: 5 }, (_, i) => {
    const fraction = i / 4, y = 58 + fraction * 142, angle = (state.top + (state.bottom - state.top) * fraction) * DEG;
    return `<ellipse cx="${x}" cy="${y}" rx="26" ry="8" fill="#24352f" stroke="#80958b"/><path d="M ${x} ${y} L ${x + 25 * Math.cos(angle)} ${y - 8 * Math.sin(angle)}" stroke="#e8c893" stroke-width="2.7"/><circle cx="${x}" cy="${y}" r="2" fill="#dbe6dd"/>`;
  }).join('')}`;
  return `<details class="ca-equivalent"><summary>先看等效扭转：上端固定扭 144°，与 126° + 18° 有什么相同？</summary><svg viewBox="0 0 1040 255" role="img" aria-label="相同银丝的两种扭法。左边上端固定零度，下端正144度；右边上端负126度，下端正18度。两端相对转角同为144度，所以回复力矩相同。">
    <text x="32" y="29" class="ca-eq-title">先想简单的：上端固定</text><text x="574" y="29" class="ca-eq-title">电秤里：反转上端，再读下端</text>
    ${wire(129, e.passive)}${wire(670, e.active)}
    <text x="181" y="65">上端 0° · 固定</text><text x="181" y="207">下端 +144° · 被力扭转</text>
    <text x="722" y="65">上端 −126°</text><text x="722" y="207">下端 +18°</text>
    <text x="181" y="136" class="ca-eq-result">θ = 144°</text><text x="722" y="136" class="ca-eq-result">θ = 18° − (−126°)</text>
    <text x="505" y="132" text-anchor="middle" class="ca-eq-equal">=</text><text x="505" y="160" text-anchor="middle">同样的相对扭转</text>
    <text x="32" y="244" class="ca-eq-foot">圆圈是放大的截面朝向标记，银丝保持笔直。比较的是同材料、同粗细、同长度的丝。</text>
  </svg><p>相同 θ → 相同回复力矩 κθ。<b>力还要除以垂直力臂</b>；不能只凭扭角相同，就说力一定相同。</p></details>`;
}

export const BALANCE_SPEC_SOURCES = Object.freeze([
  { label: 'OXO 11 lb 厨房秤', capacity: '11 lb（约 5 kg）', readability: '1 g', href: 'https://www.oxo.com/11-lb-stainless-steel-food-scale-w-pull-out-display.html' },
  { label: 'METTLER TOLEDO AT200（历史型号）', capacity: '205 g', readability: '0.1 mg', href: 'https://www.mt.com/dam/P5/labtec/phased-out/1-documents/at-mt-umt-tez-e-703466.pdf' },
  { label: 'METTLER TOLEDO 超微量天平系列', capacity: '最高 6.1 g', readability: '0.1 μg', href: 'https://www.mt.com/us/en/home/products/Laboratory_Weighing_Solutions/microbalances/ultra-micro-balance.html' }
]);

let instance = 0;
const format = value => Number(value.toPrecision(3)).toString();

/** Mount returns cleanup, with reset(), release(), setBeta(degrees), and getState(). */
export function mountCoulombActive(host, { onChange } = {}) {
  if (!host) throw new TypeError('A host element is required.');
  const doc = host.ownerDocument, win = doc.defaultView, id = `ca-${++instance}`;
  if (!doc.querySelector('link[data-coulomb-active]')) { const css = doc.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./coulomb-active.css', import.meta.url).href; css.dataset.coulombActive = ''; doc.head.append(css); }
  host.innerHTML = `<section class="ca-section" aria-labelledby="${id}-title"><header class="ca-heading"><p>亲手稳住两球</p><h2 id="${id}-title">拧上端，把两球稳在 8.5°。</h2></header>${equivalentDiagram()}
    <div class="ca-stage">
      <div class="ca-scene" data-ca="scene" aria-label="可旋转的三维电秤；拖动空白旋转，滚轮缩放"><p class="ca-loading">正在准备三维电秤…</p></div>
      <div class="ca-dial-panel"><span class="ca-small-label">上端旋钮 · 向右拖增加扭转</span>
        <svg class="ca-dial" data-ca="dial" viewBox="0 0 180 180" role="slider" tabindex="0" aria-label="上端反向转角；左右拖动，方向键每次一度，Shift加速" aria-valuemin="0" aria-valuemax="720" aria-valuenow="0" aria-disabled="true">
          <defs><radialGradient id="${id}-brass"><stop stop-color="#dfc899"/><stop offset=".46" stop-color="#8a774f"/><stop offset=".7" stop-color="#d0b984"/><stop offset=".92" stop-color="#655334"/><stop offset="1" stop-color="#c3a66b"/></radialGradient></defs>
          <circle cx="90" cy="90" r="77" fill="url(#${id}-brass)" stroke="#d4be91" stroke-width="1"/><circle cx="90" cy="90" r="72" fill="none" stroke="#59482d"/>
          ${Array.from({ length: 60 }, (_, i) => { const a = i * Math.PI / 30, r = i % 5 ? 66 : 60; return `<path d="M ${90 + r * Math.cos(a)} ${90 + r * Math.sin(a)} L ${90 + 70 * Math.cos(a)} ${90 + 70 * Math.sin(a)}" stroke="#3b3426" stroke-width="${i % 5 ? 1 : 2}"/>`; }).join('')}
          <circle cx="90" cy="90" r="49" fill="#776748" stroke="#c5ac79"/><g data-ca="dial-hand"><path d="M 90 90 L 155 90" stroke="#eee4c8" stroke-width="3"/><path d="M 151 85 L 161 90 L 151 95" fill="#eee4c8"/><circle cx="90" cy="90" r="34" fill="url(#${id}-brass)" stroke="#dbc59c"/></g>
          <text x="90" y="95" text-anchor="middle" class="ca-dial-symbol">β</text>
        </svg>
        <strong data-ca="beta">0°</strong><span data-ca="turns" class="ca-turns">上端还未反转</span>
      </div>
      <div class="ca-target"><span>目标 · 稳在 8.5°</span><strong><output data-ca="alpha">8.50</output><small>°</small></strong><p data-ca="state-label">暂时托住 · 还没有平衡</p><div class="ca-hold-track"><i data-ca="hold-progress"></i></div></div>
      <div class="ca-message" aria-live="polite"><strong data-ca="message-title">先松手，再试着把它稳住。</strong><p data-ca="message">现在只是把活动球暂放在 8.5°，不是靠银丝保持在那里。</p><button data-ca-action="release" type="button">松手，看它分开</button></div>
      <div class="ca-view-tools" aria-label="三维观察角度"><button type="button" data-ca-view="detail" class="is-current">看两球</button><button type="button" data-ca-view="top">俯视两球</button><button type="button" data-ca-view="knob">看上端</button></div>
      <div class="ca-torques"><div><span>电力矩 · 向外转</span><strong data-ca="electric">—</strong></div><div class="ca-torque-bar"><i data-ca="electric-bar"></i><i data-ca="restoring-bar"></i></div><div><span>银丝回复力矩 · 向内转</span><strong data-ca="restoring">—</strong></div><p data-ca="torque-note">托住时还有手的作用，两个力矩尚不相等。</p></div>
    </div>
    <div class="ca-under"><p>平衡以后，旋钮停着也能保持。想再靠近，就继续增加银丝的回复力矩。</p><button type="button" data-ca-action="reset">重新试一次</button></div>
    <details class="ca-details"><summary>这里模拟了什么？</summary><p>电力沿两球连线，电力矩 τ<sub>电</sub> = F R cos(α/2)。银丝回复力矩 τ<sub>丝</sub> = κ(α + β)，角度用弧度。拧上端改变的是已校准的反作用；不是把原来的电力放大，也不需要手一直转。</p><p>本交互采用现代 F ∝ 1/r² 模型，并用论文第三次读数 β = 567°、α = 8.5° 标定，所以在这一点达到平衡。它不是三次历史测量的逐帧重放。惯量、阻尼与时间缩放用于演示运动过程，没有原始响应时间依据。俯视时暂时隐藏玻璃外壳；材料纹理是依据时代材料的视觉重建。</p><p>平衡点：r ≈ 1.60 cm，F ≈ 2.45 μN，两个力矩均约 264 nN·m。上端相对零位是 −567°，下端是 +8.5°；总相对扭转为 575.5°。<a href="https://web.mit.edu/llbjr/Public/www/Coulomb1785.pdf" target="_blank" rel="noopener noreferrer">库仑 1785 年论文 ↗</a></p>
      <h3>现代天平能测到吗？先看量程和可读性。</h3><table><thead><tr><th>具体例子</th><th>最大称量</th><th>显示可读性</th></tr></thead><tbody>${BALANCE_SPEC_SOURCES.map(s => `<tr><td><a href="${s.href}" target="_blank" rel="noopener noreferrer">${s.label} ↗</a></td><td>${s.capacity}</td><td>${s.readability}</td></tr>`).join('')}</tbody></table><p>厨房秤不适合，不等于现代仪器都测不到。第一次几何换算的 0.161 μN，约等于 16.4 μg 物重；现代微量天平可显示 μg 级变化。但显示末位不是准确度，也不是最小可靠称量——上述超微量天平系列另列最小样品量 30 μg。称重与测横向电力仍需要不同的装置。</p>
    </details></section>`;
  const q = name => host.querySelector(`[data-ca="${name}"]`), sceneHost = q('scene'), dial = q('dial');
  const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let state = { alphaDegrees: 8.5, betaDegrees: 0, velocityDegreesPerSecond: 0 }, held = true, succeeded = false, holdTime = 0, dragging = null, balance = null, disposed = false, visible = true, raf = 0, previous = 0, modelRequested = false, currentView = 'detail', latestMessage = '';
  const emit = () => { const detail = { ...state, held, succeeded, torques: activeTorques(state.alphaDegrees, state.betaDegrees) }; host.dispatchEvent(new win.CustomEvent('coulomb-active:change', { detail })); onChange?.(detail); };
  function updateMessage(title, message) { const signature = title + message; if (signature === latestMessage) return; latestMessage = signature; q('message-title').textContent = title; q('message').textContent = message; }
  function render() {
    const t = activeTorques(state.alphaDegrees, state.betaDegrees), ratio = t.electric / (t.electric + t.restoring);
    q('alpha').textContent = state.alphaDegrees.toFixed(2); q('beta').textContent = `${Math.round(state.betaDegrees)}°`;
    q('turns').textContent = state.betaDegrees > 0 ? `${Math.floor(state.betaDegrees / 360)} 圈 + ${Math.round(state.betaDegrees % 360)}°` : '上端还未反转';
    q('dial-hand').setAttribute('transform', `rotate(${-state.betaDegrees} 90 90)`); dial.setAttribute('aria-valuenow', state.betaDegrees.toFixed(1)); dial.setAttribute('aria-disabled', String(held));
    q('electric').textContent = `${format(t.electric * 1e9)} nN·m`; q('restoring').textContent = `${format(t.restoring * 1e9)} nN·m`;
    q('electric-bar').style.width = `${ratio * 100}%`; q('restoring-bar').style.width = `${(1 - ratio) * 100}%`;
    q('hold-progress').style.width = `${Math.min(100, holdTime * 100)}%`;
    host.querySelector('.ca-target').classList.toggle('is-success', succeeded);
    q('state-label').textContent = held ? '暂时托住 · 还没有平衡' : succeeded ? '已平衡 · 可以停手' : dragging ? '正在拧上端' : Math.abs(state.velocityDegreesPerSecond) > .12 ? '活动球正在移动' : '继续调整上端';
    if (held) q('torque-note').textContent = '托住时还有手的作用，两个力矩尚不相等。';
    else if (succeeded) q('torque-note').textContent = 'τ电 = τ丝。旋钮不动，小球也能稳住。';
    else if (Math.abs(t.net) / Math.max(t.electric, t.restoring) < .008) q('torque-note').textContent = '两个力矩接近相等；再看它能否稳在目标角度。';
    else q('torque-note').textContent = t.net > 0 ? '电力矩更大，小球趋向转开。' : '银丝回复力矩更大，小球趋向靠近。';
    if (!held && !succeeded) updateMessage('左右拖动上端旋钮，把两球拉近。', state.betaDegrees < 30 ? '松手后，它自己转开了。试着增加银丝的回复力矩。' : state.betaDegrees > 585 ? '拧过头了，向左退一点。停手后，等待小球稳定。' : '不用一直转。调整以后松手，看它停在哪儿。');
    if (succeeded) updateMessage('稳住了。现在可以停手。', '两个力矩相等，银丝自己保持反作用。想让两球再近一些，才需要继续拧。');
    balance?.set({ beta: state.betaDegrees, alpha: state.alphaDegrees, charged: true });
  }
  function setBeta(beta) {
    if (!Number.isFinite(beta)) throw new RangeError('Upper angle must be finite.');
    if (held) return;
    state.betaDegrees = clamp(beta, 0, ACTIVE_MODEL.maxBetaDegrees); holdTime = 0; succeeded = false;
    if (reduced) { state.alphaDegrees = activeEquilibrium(state.betaDegrees); state.velocityDegreesPerSecond = 0; }
    render(); emit();
  }
  function release() { if (!held) return; held = false; host.querySelector('[data-ca-action="release"]').hidden = true; if (reduced) state.alphaDegrees = activeEquilibrium(0); render(); emit(); }
  function reset() { held = true; succeeded = false; holdTime = 0; dragging = null; state = { alphaDegrees: 8.5, betaDegrees: 0, velocityDegreesPerSecond: 0 }; host.querySelector('[data-ca-action="release"]').hidden = false; currentView = 'detail'; balance?.view(currentView); host.querySelectorAll('[data-ca-view]').forEach(b => b.classList.toggle('is-current', b.dataset.caView === currentView)); updateMessage('先松手，再试着把它稳住。', '现在只是把活动球暂放在 8.5°，不是靠银丝保持在那里。'); render(); emit(); }
  function frame(now) {
    if (disposed) return; raf = win.requestAnimationFrame(frame);
    const dt = Math.min(.05, previous ? (now - previous) / 1000 : .016); previous = now;
    if (!visible) return;
    if (!held) {
      if (!reduced) state = advanceActiveBalance(state, dt * ACTIVE_MODEL.presentationTimeScale);
      if (!dragging && activeTargetReached(state)) holdTime += dt; else holdTime = 0;
      if (!succeeded && holdTime >= 1) { succeeded = true; emit(); }
    }
    render();
  }
  function down(event) { if (held) return; dragging = { x: event.clientX, beta: state.betaDegrees }; dial.setPointerCapture(event.pointerId); event.preventDefault(); }
  function move(event) { if (dragging) setBeta(dragging.beta + (event.clientX - dragging.x) * 3); }
  function up() { dragging = null; }
  function key(event) { const sign = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]; if (sign) { event.preventDefault(); setBeta(state.betaDegrees + sign * (event.shiftKey ? 10 : 1)); } if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); setBeta(event.key === 'Home' ? 0 : 720); } }
  function click(event) { const b = event.target.closest('button'); if (!b || !host.contains(b)) return; if (b.dataset.caAction === 'release') release(); if (b.dataset.caAction === 'reset') reset(); if (b.dataset.caView) { currentView = b.dataset.caView; balance?.view(currentView); host.querySelectorAll('[data-ca-view]').forEach(el => el.classList.toggle('is-current', el === b)); } }
  async function loadModel() {
    if (modelRequested || disposed) return; modelRequested = true;
    try { const { mountBalance } = await import('./coulomb-scene.js'); if (disposed) return; sceneHost.innerHTML = ''; balance = mountBalance(sceneHost, setBeta); balance.view(currentView); balance.annotations(true); render(); host.dataset.coulombActiveReady = 'true'; }
    catch (error) { if (!disposed) { sceneHost.innerHTML = '<p class="ca-loading">三维显示未能启动。旋钮、角度和力矩读数仍可操作。</p>'; host.dataset.coulombActiveReady = 'fallback'; console.error(error); } }
  }
  const observer = new win.IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) loadModel(); }, { rootMargin: '100px' }); observer.observe(host);
  dial.addEventListener('pointerdown', down); dial.addEventListener('pointermove', move); dial.addEventListener('pointerup', up); dial.addEventListener('pointercancel', up); dial.addEventListener('keydown', key); host.addEventListener('click', click);
  reset(); raf = win.requestAnimationFrame(frame);
  const cleanup = () => { disposed = true; win.cancelAnimationFrame(raf); observer.disconnect(); balance?.dispose(); dial.removeEventListener('pointerdown', down); dial.removeEventListener('pointermove', move); dial.removeEventListener('pointerup', up); dial.removeEventListener('pointercancel', up); dial.removeEventListener('keydown', key); host.removeEventListener('click', click); host.innerHTML = ''; };
  Object.assign(cleanup, { reset, release, setBeta, getState: () => ({ ...state, held, succeeded, holdTime, torques: activeTorques(state.alphaDegrees, state.betaDegrees) }) });
  return cleanup;
}
