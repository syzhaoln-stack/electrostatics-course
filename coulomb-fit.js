import { DEG, R, GRAIN_KG, G, KAPPA, RECORDS, reading } from './coulomb-physics.js';

/** The memoir's observations remain separate from the modern SI conversion and regression. */
export const COULOMB_MEASUREMENTS = Object.freeze(RECORDS.map((record, index) => {
  const value = reading(record.beta, record.alpha);
  return Object.freeze({
    number: index + 1, alphaDegrees: record.alpha, betaMagnitudeDegrees: record.beta,
    upperSignedDegrees: record.beta === 0 ? 0 : -record.beta, lowerSignedDegrees: record.alpha,
    twistDegrees: value.twist, reportedTwistDegrees: record.reportedTwist,
    distanceCm: value.d * 100, effectiveArmCm: value.arm * 100,
    torqueNm: value.torque, forceMicroN: value.force * 1e6,
    arcDistanceCm: R * record.alpha * DEG * 100,
    constantArmForceMicroN: value.torque / R * 1e6
  });
}));

/** Unweighted least squares in log(distance), log(force); output is plotted on LINEAR axes. */
export function fitPowerLaw(points) {
  if (!Array.isArray(points) || points.length < 2 || points.some(p => !Number.isFinite(p.distanceCm) || !Number.isFinite(p.forceMicroN) || p.distanceCm <= 0 || p.forceMicroN <= 0)) {
    throw new RangeError('At least two positive, finite distance/force observations are required.');
  }
  const xs = points.map(p => Math.log(p.distanceCm)), ys = points.map(p => Math.log(p.forceMicroN));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const variance = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  if (variance < 1e-20) throw new RangeError('Distances must not all be equal.');
  const exponent = -xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / variance;
  const coefficient = Math.exp(my + exponent * mx);
  const predictedMicroN = points.map(p => coefficient / p.distanceCm ** exponent);
  const relativeResiduals = points.map((p, i) => (p.forceMicroN - predictedMicroN[i]) / p.forceMicroN);
  return Object.freeze({ exponent, coefficient, distanceUnit: 'cm', forceUnit: 'μN', method: 'unweighted-log-least-squares', predictedMicroN: Object.freeze(predictedMicroN), relativeResiduals: Object.freeze(relativeResiduals) });
}

export const COULOMB_POWER_FIT = fitPowerLaw(COULOMB_MEASUREMENTS);

/** The memoir's first comparison: angle ratios approximate distance and force ratios. */
export const COULOMB_RELATIVE_SERIES = Object.freeze(COULOMB_MEASUREMENTS.map((point, index) => Object.freeze({
  number: point.number,
  alphaDegrees: point.alphaDegrees,
  betaMagnitudeDegrees: point.betaMagnitudeDegrees,
  twistDegrees: point.twistDegrees,
  reportedTwistDegrees: point.reportedTwistDegrees,
  distanceRatio: point.alphaDegrees / COULOMB_MEASUREMENTS[0].alphaDegrees,
  forceRatio: point.twistDegrees / COULOMB_MEASUREMENTS[0].twistDegrees,
  forceLabel: ['1倍', '4倍', '约16倍'][index]
})));

export function fitRelativePowerLaw(points) {
  if (!Array.isArray(points)) throw new RangeError('Relative observations are required.');
  // The regression is unit-independent; only the relative fields are exposed here.
  const fit = fitPowerLaw(points.map(p => ({ distanceCm: p.distanceRatio, forceMicroN: p.forceRatio })));
  return Object.freeze({ exponent: fit.exponent, coefficient: fit.coefficient,
    distanceUnit: 'first-distance', forceUnit: 'first-force', method: fit.method,
    predictedForceRatios: fit.predictedMicroN, relativeResiduals: fit.relativeResiduals });
}

export const COULOMB_RELATIVE_FIT = fitRelativePowerLaw(COULOMB_RELATIVE_SERIES);
export const COULOMB_FIT_DATA = Object.freeze({
  provenance: '1785 memoir observations; modern SI conversion with chord distance and perpendicular moment arm',
  source: 'https://web.mit.edu/llbjr/Public/www/Coulomb1785.pdf',
  frenchSource: 'https://webusers.imj-prg.fr/~david.aubin/cours/Textes/Coulomb.pdf',
  assumptions: Object.freeze({ radiusMetres: R, grainKilograms: GRAIN_KG, gravityMetresPerSecondSquared: G, torsionStiffnessNmPerRadian: KAPPA, calibration: '360 degrees corresponds to the weight of 1/340 grain at a 4-pouce arm', unitConversionsAreRounded: true }),
  points: COULOMB_MEASUREMENTS, fit: COULOMB_POWER_FIT,
  relativeComparison: Object.freeze({ method: 'memoir-small-angle-comparison',
    distanceReferenceAlphaDegrees: 36, forceReferenceTwistDegrees: 36,
    points: COULOMB_RELATIVE_SERIES, fit: COULOMB_RELATIVE_FIT })
});

export const COULOMB_FIT_TIMING = Object.freeze({ leadIn: .4, readingDuration: 12, twistAt: 1.8, followAt: 3, followDuration: 5.2, forceAt: 8.2, pointAt: 9.8, fitStart: 36.4, fitDuration: 2.2, duration: 39 });
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Deterministic frames allow a video or model to drive the same sequence without timers. */
export function coulombFitFrameAt(seconds) {
  if (!Number.isFinite(seconds)) throw new RangeError('Timeline time must be finite.');
  const timing = COULOMB_FIT_TIMING, time = clamp(seconds, 0, timing.duration);
  if (time < timing.leadIn) return { time, recordIndex: 0, visibleCount: 0, phase: 'ready', curveProgress: 0 };
  if (time >= timing.fitStart) return { time, recordIndex: 2, visibleCount: 3, phase: 'fit', curveProgress: clamp((time - timing.fitStart) / timing.fitDuration, 0, 1) };
  const recordIndex = Math.min(2, Math.floor((time - timing.leadIn) / timing.readingDuration));
  const local = time - timing.leadIn - recordIndex * timing.readingDuration;
  const phase = local < timing.twistAt ? 'distance' : local < timing.forceAt ? 'twist' : local < timing.pointAt ? 'force' : 'point';
  return { time, recordIndex, visibleCount: recordIndex + (phase === 'point' ? 1 : 0), phase, curveProgress: 0 };
}

/** Match passive-follow video: approach first, then add torsion to the previous observation. */
export function coulombDisplayedTwistAt(seconds) {
  const frame = coulombFitFrameAt(seconds);
  if (frame.phase === 'ready' || frame.phase === 'distance') return null;
  const total = COULOMB_MEASUREMENTS[frame.recordIndex].twistDegrees;
  if (frame.phase !== 'twist') return total;
  const previous = frame.recordIndex === 0 ? 0 : COULOMB_MEASUREMENTS[frame.recordIndex - 1].twistDegrees;
  const local = frame.time - COULOMB_FIT_TIMING.leadIn - frame.recordIndex * COULOMB_FIT_TIMING.readingDuration;
  const progress = clamp((local - COULOMB_FIT_TIMING.followAt) / COULOMB_FIT_TIMING.followDuration, 0, 1);
  return previous + (total - previous) * progress * progress * (3 - 2 * progress);
}

/** Match the visible source approach before the two spheres turn together. */
export function coulombDisplayedSeparationAt(seconds) {
  const frame = coulombFitFrameAt(seconds);
  if (frame.phase === 'ready') return null;
  const target = COULOMB_MEASUREMENTS[frame.recordIndex].alphaDegrees;
  const previous = frame.recordIndex === 0 ? 72 : COULOMB_MEASUREMENTS[frame.recordIndex - 1].alphaDegrees;
  const timing = COULOMB_FIT_TIMING;
  const local = frame.time - timing.leadIn - frame.recordIndex * timing.readingDuration;
  const progress = clamp((local - timing.twistAt) / (timing.followAt - timing.twistAt), 0, 1);
  return previous + (target - previous) * progress * progress * (3 - 2 * progress);
}

const short = (number, digits = 3) => Number(number.toPrecision(digits)).toString();
const colors = ['#8fced1', '#e4c386', '#f0a18c'];
let serial = 0;

/** A duration endpoint has no displayable video frame; seek to its final frame instead. */
export function coulombReadoutVideoTime(seconds, duration = COULOMB_FIT_TIMING.duration) {
  if (!Number.isFinite(seconds)) throw new RangeError('Video time must be finite.');
  const end = Number.isFinite(duration) && duration > 0 ? Math.min(duration, COULOMB_FIT_TIMING.duration) : COULOMB_FIT_TIMING.duration;
  return clamp(seconds, 0, Math.max(0, end - .001));
}

/**
 * const dispose = mountCoulombFit(host);
 * dispose.setStep(1..3) reveals an observed point; .setStep(4) reveals the fit.
 * .setTime(seconds) is deterministic, .play()/.pause() control the 39 s sequence.
 * host accepts CustomEvent('coulomb-fit:seek', {detail:{time:...}}) or {step:...}.
 * host emits 'coulomb-fit:change' with frame, currentReading and fit (only after all points).
 */
export function mountCoulombFit(host, { initialStep = 0, autoplay = false, onChange } = {}) {
  if (!host) throw new TypeError('A host element is required.');
  const doc = host.ownerDocument, win = doc.defaultView;
  if (!doc.querySelector('link[data-coulomb-fit]')) {
    const sheet = doc.createElement('link');
    sheet.rel = 'stylesheet'; sheet.href = new URL('./coulomb-fit.css', import.meta.url).href;
    sheet.dataset.coulombFit = ''; doc.head.append(sheet);
  }
  const id = `cf-${++serial}`, plot = { x: 62, y: 70, width: 584, height: 328, xmax: 1.1, ymax: 20 };
  const px = r => plot.x + r / plot.xmax * plot.width;
  const py = f => plot.y + plot.height - f / plot.ymax * plot.height;
  const fit = COULOMB_RELATIVE_FIT;
  host.innerHTML = `<section class="cf-section" aria-labelledby="${id}-title">
    <header class="cf-heading"><p class="cf-eyebrow">1785 · 按论文近似比较</p><h2 id="${id}-title">两球越靠近，斥力怎样变大？</h2></header>
    <div class="cf-instrument">
      <div class="cf-toolbar"><div class="cf-sequence" aria-label="读数与拟合步骤">${['第一次', '第二次', '第三次', '拟合'].map((name, i) => `<button type="button" data-step="${i + 1}" aria-label="显示${name}${i < 3 ? '测量' : '曲线'}"><span>${i < 3 ? '0' + (i + 1) : '↗'}</span>${name}</button>`).join('')}</div><span class="cf-phase" data-part="phase" aria-live="polite">把读数放到图上</span></div>
      <div class="cf-media-plot">
        <div class="cf-video-panel">
          <video class="cf-readout-video" data-part="readout-video" src="${new URL('./media/lesson-dialogues/coulomb-readout.mp4', import.meta.url).href}" poster="${new URL('./media/lesson-dialogues/coulomb-readout.poster.jpg', import.meta.url).href}" muted playsinline preload="metadata" aria-label="三维读数动画：施力球靠近并跟随活动球，银丝累计扭紧；上端固定的等效示意"></video>
          <p class="cf-video-message" data-part="video-message" hidden>三维动画暂时无法加载</p>
        </div>
      <svg class="cf-visual" viewBox="0 0 700 480" role="img" aria-label="按论文近似比较的线性坐标：横轴为分离角除以第一次分离角，表示相对距离；纵轴为总扭转除以第一次总扭转，表示相对斥力。">
        <text x="62" y="39" class="cf-label">斥力 / 第一次斥力</text>
        ${[0, 4, 8, 12, 16, 20].map(v => `<path d="M ${plot.x} ${py(v)} H ${plot.x + plot.width}" stroke="${v === 0 ? '#9badac' : '#35464b'}" stroke-width="${v === 0 ? 1.3 : .7}"/><text x="47" y="${py(v) + 4}" text-anchor="end" class="cf-tick">${v}</text>`).join('')}
        ${[0, .25, .5, .75, 1].map(v => `<path d="M ${px(v)} ${plot.y} V ${plot.y + plot.height}" stroke="${v === 0 ? '#9badac' : '#35464b'}" stroke-width="${v === 0 ? 1.3 : .7}"/><text x="${px(v)}" y="424" text-anchor="middle" class="cf-tick">${v}</text>`).join('')}
        <text x="646" y="458" text-anchor="end" class="cf-label">距离 / 第一次距离</text>
        <path data-part="curve" fill="none" stroke="#dce6d5" stroke-width="2"/>
        <g data-part="guides"/>
        ${COULOMB_RELATIVE_SERIES.map((p, i) => `<g data-dot="${i}" class="cf-point" style="color:${colors[i]}" opacity="0"><circle cx="${px(p.distanceRatio)}" cy="${py(p.forceRatio)}" r="11" fill="${colors[i]}" fill-opacity=".1"/><circle cx="${px(p.distanceRatio)}" cy="${py(p.forceRatio)}" r="4.5" fill="${colors[i]}" stroke="#16242a" stroke-width="1.5"/><text x="${px(p.distanceRatio) + (i === 0 ? -10 : 12)}" y="${py(p.forceRatio) - 12}" text-anchor="${i === 0 ? 'end' : 'start'}" class="cf-dot-label">${p.forceLabel}</text></g>`).join('')}
        <g data-part="fit-label" opacity="0"><text x="368" y="110" class="cf-fit-equation">F ∝ 1 / r<tspan baseline-shift="super" font-size="16">${fit.exponent.toFixed(2)}</tspan></text><text x="368" y="139" class="cf-small">按论文近似比较 · 三点拟合</text></g>
      </svg></div>
      <div class="cf-conversion" aria-live="polite"><div data-focus="distance"><span>距离 · 第一次为 1</span><strong data-part="distance-readout">—</strong></div><div data-focus="twist"><span>总扭转</span><strong data-part="twist-readout">—</strong></div><div data-focus="force"><span>斥力 · 第一次为 1</span><strong data-part="force-readout">—</strong></div></div>
      <div class="cf-actions"><button type="button" class="cf-primary" data-action="next">放入第一次读数</button><button type="button" data-action="play">连续演示</button><button type="button" data-action="reset" class="cf-reset">重新开始</button><p data-part="caption">施力球靠近并跟随，活动球转开，银丝逐渐扭紧。</p></div>
    </div>
    <details class="cf-notes"><summary>原文中的力值与比较方法</summary><p><b>原文有绝对力的标定。</b>库仑写道：在 4 普斯力臂处，1/340 格令重的力可使银丝扭转 360°；第一次 36° 对应 1/3400 格令重。论证距离规律时，他主要比较 36°、144°、约 576°，即第一次的 1、4、约 16 倍。</p><p>主图按论文近似比较：以分离角比 α/36° 表示相对距离，近似取恒定力臂，以总扭转比 (α + β)/36° 表示相对斥力。第三次保持原读数 8.5°，所以横坐标是 8.5/36 ≈ 0.236；总扭转相加为 575.5°，纵坐标约为 15.986，标作“约16倍”。</p><p>图中采用上端固定的等效示意：施力球先靠近，再跟随活动球转动，银丝累计扭转依次从 0° 增至 36°、144°、575.5°。最后两球的间隔角是 8.5°，银丝的累计扭转是 575.5°；施力球此时相对初始方向转过 567°。这两个角分别表示两球距离与银丝扭转，不能混作同一个读数。相同银丝、相同总扭转对应相同回复力矩；实际斥力还取决于垂直力臂。材质、镜头与运动是现代三维重建。</p><div class="cf-notes-grid"><div><h3>需要绝对值时，再作几何换算</h3><p>r = 2R sin(α/2)<br>θ = α + β，τ = κθ<br>F = τ / [R cos(α/2)]</p><p>α 是下端两球的分离角；β 是上端向反方向转过的角度大小。公式里的 θ 用弧度。R cos(α/2) 是斥力的垂直力臂。</p><p>取 R ≈ 10.8 cm、1 格令 ≈ 53 mg、现代标准重力加速度 9.80665 m/s²，得 κ ≈ 2.63 × 10⁻⁸ N·m/rad。原文用物重表示力，下表换成现代单位；旧制单位本身采用近似换算。</p></div><div><h3>两种比较方法，分别保留</h3><p>原文第三次将 567° + 8.5° 圆整为 576°。计算与拟合保留 <b>575.5°</b>；没有把 8.5° 改成 9°。</p><p>主图的相对数据在 log r–log F 上作无权最小二乘拟合，再绘在线性坐标中，得到 n ≈ ${COULOMB_RELATIVE_FIT.exponent.toFixed(2)}。下表按论文后续说明作弦长与余弦力臂修正，相应三点拟合为 n ≈ ${COULOMB_POWER_FIT.exponent.toFixed(2)}。</p><p>两个结果都是从实际记录换算；漏电、零点与读数误差没有另行修正。三次读数讨论的是同种电斥力与距离的关系。</p></div></div>
      <table><caption>现代单位换算：弦长、有效力臂与恒定力臂近似</caption><thead><tr><th>测量</th><th>α</th><th>β</th><th>θ = α + β</th><th>弦长 r / cm</th><th>几何修正 F / μN</th><th>恒定力臂近似 F / μN</th></tr></thead><tbody>${COULOMB_MEASUREMENTS.map(p => `<tr><td>${p.number}</td><td>${p.alphaDegrees}°</td><td>${p.betaMagnitudeDegrees}°</td><td>${p.twistDegrees}°</td><td>${short(p.distanceCm)}</td><td>${short(p.forceMicroN)}</td><td>${short(p.constantArmForceMicroN)}</td></tr>`).join('')}</tbody></table>
      <p class="cf-citation">依据：库仑 1785 年第一篇电学论文的三次试验、银丝标定和第三条说明。<a href="${COULOMB_FIT_DATA.source}" target="_blank" rel="noopener noreferrer">MIT 英译全文 ↗</a> · <a href="${COULOMB_FIT_DATA.frenchSource}" target="_blank" rel="noopener noreferrer">法文原刊 ↗</a>（英译的 sine 已据原文 cosinus 校正）。</p>
    </details>
  </section>`;
  const one = part => host.querySelector(`[data-part="${part}"]`);
  const nextButton = host.querySelector('[data-action="next"]'), playButton = host.querySelector('[data-action="play"]');
  const video = one('readout-video');
  video.muted = true; video.defaultMuted = true; video.disablePictureInPicture = true;
  let frame = coulombFitFrameAt(0), raf = 0, clockStart = 0, timeStart = 0, endTime = COULOMB_FIT_TIMING.duration, destroyed = false, emittedKey = '';
  let desiredVideoTime = 0;
  const reduced = win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // The component owns the clock. The native video remains paused and presents
  // the requested frame; seeked coalesces pending requests when decoding lags.
  function syncVideo(time = desiredVideoTime) {
    desiredVideoTime = time;
    if (destroyed || video.readyState < 1 || video.seeking) return;
    const target = coulombReadoutVideoTime(time, video.duration);
    if (Math.abs(video.currentTime - target) > .001) video.currentTime = target;
  }
  function videoReady() { one('video-message').hidden = true; syncVideo(); }
  function videoSeeked() { syncVideo(); }
  function videoError() { one('video-message').hidden = false; }
  function stopNativePlayback() { video.pause(); syncVideo(); }

  function render(time) {
    frame = coulombFitFrameAt(time);
    const { phase, recordIndex, visibleCount, curveProgress } = frame, p = COULOMB_MEASUREMENTS[recordIndex], relative = COULOMB_RELATIVE_SERIES[recordIndex];
    syncVideo(frame.time);
    const forceShown = !['ready', 'distance', 'twist'].includes(phase);
    const active = phase === 'ready' ? '' : phase === 'point' || phase === 'fit' ? 'force' : phase;
    host.querySelectorAll('[data-focus]').forEach(el => el.classList.toggle('is-active', el.dataset.focus === active));
    const shownSeparation = coulombDisplayedSeparationAt(frame.time);
    one('distance-readout').textContent = shownSeparation === null ? '—' : `${short(shownSeparation / COULOMB_MEASUREMENTS[0].alphaDegrees)}倍`;
    const shownTwist = coulombDisplayedTwistAt(frame.time);
    one('twist-readout').textContent = shownTwist === null ? '—' : `${Number(shownTwist.toFixed(1))}°`;
    one('force-readout').textContent = forceShown ? relative.forceLabel : '—';
    const labels = { ready: '把读数放到图上', distance: '看两球距离', twist: '看银丝扭紧', force: '读出斥力', point: `第 ${recordIndex + 1} 个测量点`, fit: '三点拟合' };
    one('phase').textContent = labels[phase];
    host.querySelectorAll('[data-dot]').forEach(el => el.setAttribute('opacity', Number(el.dataset.dot) < visibleCount ? 1 : 0));
    one('guides').innerHTML = phase === 'point' ? `<path d="M ${px(relative.distanceRatio)} ${plot.y + plot.height} V ${py(relative.forceRatio)} H ${plot.x}" fill="none" stroke="${colors[recordIndex]}" stroke-opacity=".6" stroke-dasharray="3 5"/>` : '';
    const points = [];
    if (curveProgress > 0) for (let i = 0; i <= Math.ceil(curveProgress * 120); i++) {
      const f = Math.min(i / 120, curveProgress), r = COULOMB_RELATIVE_SERIES[0].distanceRatio + (COULOMB_RELATIVE_SERIES[2].distanceRatio - COULOMB_RELATIVE_SERIES[0].distanceRatio) * f;
      points.push(`${i ? 'L' : 'M'} ${px(r)} ${py(fit.coefficient / r ** fit.exponent)}`);
    }
    one('curve').setAttribute('d', points.join(' ')); one('fit-label').setAttribute('opacity', phase === 'fit' ? 1 : 0);
    host.querySelectorAll('[data-step]').forEach(el => { const step = Number(el.dataset.step); el.classList.toggle('is-current', phase !== 'ready' && step === (phase === 'fit' ? 4 : recordIndex + 1)); el.classList.toggle('is-done', step <= visibleCount); el.setAttribute('aria-pressed', String(phase !== 'ready' && step === (phase === 'fit' ? 4 : recordIndex + 1))); });
    nextButton.textContent = visibleCount === 0 ? '放入第一次读数' : visibleCount === 1 ? '放入第二次读数' : visibleCount === 2 ? '放入第三次读数' : phase === 'fit' ? '三次读数已画完' : '拟合这三个点';
    nextButton.disabled = phase === 'fit';
    const key = `${phase}:${recordIndex}:${visibleCount}:${curveProgress >= 1}`;
    if (key !== emittedKey) { emittedKey = key; const detail = { ...frame, currentReading: phase === 'ready' ? null : p, relativeReading: phase === 'ready' ? null : relative, fit: phase === 'fit' ? fit : null }; host.dispatchEvent(new win.CustomEvent('coulomb-fit:change', { detail })); onChange?.(detail); }
  }
  function pause() { if (raf) win.cancelAnimationFrame(raf); raf = 0; video.pause(); syncVideo(frame.time); playButton.textContent = '连续演示'; }
  function tick(now) { if (destroyed) return; const time = Math.min(endTime, timeStart + (now - clockStart) / 1000); render(time); if (time >= endTime) pause(); else raf = win.requestAnimationFrame(tick); }
  function animateTo(time, from = frame.time) { pause(); if (reduced) { render(time); return; } timeStart = from; clockStart = win.performance.now(); endTime = time; playButton.textContent = '暂停'; raf = win.requestAnimationFrame(tick); }
  function setTime(time) { pause(); render(time); }
  function setStep(step, { animate = false } = {}) {
    if (!Number.isInteger(step) || step < 0 || step > 4) throw new RangeError('Step must be an integer from 0 to 4.');
    const timing = COULOMB_FIT_TIMING;
    const targets = [0, ...[1, 2, 3].map(index => timing.leadIn + index * timing.readingDuration - .001), timing.duration];
    if (animate && step > 0) animateTo(targets[step], step === 4 ? timing.fitStart : timing.leadIn + (step - 1) * timing.readingDuration);
    else setTime(targets[step]);
  }
  function play() { const duration = COULOMB_FIT_TIMING.duration; animateTo(duration, frame.time >= duration ? 0 : frame.time); }
  function click(event) { const button = event.target.closest('button'); if (!button || !host.contains(button)) return; if (button.dataset.step) setStep(Number(button.dataset.step), { animate: true }); else if (button.dataset.action === 'reset') setStep(0); else if (button.dataset.action === 'play') raf ? pause() : play(); else if (button.dataset.action === 'next') setStep(Math.min(4, frame.visibleCount + 1), { animate: true }); }
  function seek(event) { if (Number.isFinite(event.detail?.time)) setTime(event.detail.time); else if (Number.isInteger(event.detail?.step)) setStep(event.detail.step); }
  video.addEventListener('loadedmetadata', videoReady); video.addEventListener('loadeddata', videoReady); video.addEventListener('seeked', videoSeeked); video.addEventListener('error', videoError); video.addEventListener('play', stopNativePlayback);
  host.addEventListener('click', click); host.addEventListener('coulomb-fit:seek', seek);
  const cleanup = () => { destroyed = true; pause(); video.removeEventListener('loadedmetadata', videoReady); video.removeEventListener('loadeddata', videoReady); video.removeEventListener('seeked', videoSeeked); video.removeEventListener('error', videoError); video.removeEventListener('play', stopNativePlayback); video.removeAttribute('src'); video.load(); host.removeEventListener('click', click); host.removeEventListener('coulomb-fit:seek', seek); host.innerHTML = ''; };
  Object.assign(cleanup, { setStep, setTime, play, pause, getState: () => ({ ...frame }) });
  setStep(initialStep); if (autoplay) play(); return cleanup;
}
