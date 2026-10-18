/** A deliberately small extension: the same torsion measurement idea, not a second gravity chapter. */
export const MEASUREMENT_SOURCES = Object.freeze({
  manuscript: 'https://makingscience.royalsociety.org/items/l-and-p_11_68/paper-experiments-to-determine-the-density-of-the-earth-by-henry-cavendish',
  simulation: 'https://prancer.physics.louisville.edu/modules/cavendish/simulator/index.html',
  demonstration: 'https://sciencedemonstrations.fas.harvard.edu/presentations/cavendish-experiment',
  practical: 'https://www.pasco.com/resources/lab-experiments/1506',
  feedback: 'https://www.nist.gov/publications/design-electrostatic-feedback-experiment-measure-g',
  quote: 'https://websrv.physik.uni-halle.de/Fachgruppen/history/Luchs-2009.pdf'
});

/** Mirror rotation about a fixed pivot; screen perpendicular to the unrotated reflected beam. */
export function opticalLever(thetaDegrees, distanceMetres) {
  if (!Number.isFinite(thetaDegrees) || !Number.isFinite(distanceMetres) || distanceMetres < 0 || Math.abs(thetaDegrees) >= 45) {
    throw new RangeError('A finite mirror angle below 45 degrees and a nonnegative screen distance are required.');
  }
  const thetaRadians = thetaDegrees * Math.PI / 180;
  return {
    thetaRadians,
    reflectedDegrees: 2 * thetaDegrees,
    shiftMetres: distanceMetres * Math.tan(2 * thetaRadians),
    smallAngleShiftMetres: 2 * distanceMetres * thetaRadians
  };
}

const external = (href, title, extra = '') => `<a href="${href}" target="_blank" rel="noopener noreferrer" ${extra}>${title}<span aria-hidden="true"> ↗</span></a>`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
let nextId = 0;

export function mountMeasurementHistory(host) {
  if (!host) return () => {};
  if (!document.querySelector('link[data-measurement-history]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = new URL('./measurement-history.css', import.meta.url).href;
    style.dataset.measurementHistory = '';
    document.head.append(style);
  }
  const id = `mh-${++nextId}`;
  host.innerHTML = `<section class="mh-section" aria-labelledby="${id}-title">
    <header class="mh-heading">
      <p class="mh-kicker">从电力到引力 · 同一种测量思想</p>
      <h2 id="${id}-title">看不见的微小力，怎样变成读数？</h2>
      <p>库仑用扭转测电力。卡文迪许也用扭秤：让小球之间极微弱的引力，变成悬丝可测的转角。</p>
    </header>
    <div class="mh-lineage">
      <article><time>1785</time><h3>库仑 · 电力</h3><p>电荷使横杆偏转，银丝给出反向回复力矩。先校准悬丝，再由角度推回电力。</p><span class="mh-equation">电力矩 = 悬丝回复力矩</span></article>
      <article><time>1798</time><h3>卡文迪许 · 地球密度</h3><p>承接米歇尔的装置方案，让大铅球吸引悬挂的小铅球。这是扭秤的另一条发展路线，不能简单说成照搬库仑。</p>${external(MEASUREMENT_SOURCES.manuscript, '看原论文与手稿')}</article>
      <article><time>今天</time><h3>让电力抵消引力</h3><p>现代测量还可以把扭秤保持在原位：用已知的静电力矩抵消引力矩，由补偿量反推未知力矩。</p>${external(MEASUREMENT_SOURCES.feedback, 'NIST：静电反馈测量')}</article>
    </div>
    <div class="mh-optical">
      <div class="mh-optical-heading"><div><span class="mh-modern">现代读数方法</span><h3>镜片只转一点，光点能走多远？</h3></div><p>先拖镜片，再把屏移远。</p></div>
      <svg class="mh-diagram" viewBox="0 0 980 400" role="group" aria-label="可拖动的现代光杠杆：镜片转角和读数屏距离共同决定光点位移">
        <defs>
          <linearGradient id="${id}-silver" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#737f89"/><stop offset=".4" stop-color="#f4f7f5"/><stop offset=".6" stop-color="#8796a0"/><stop offset="1" stop-color="#c6d3d9"/></linearGradient>
          <radialGradient id="${id}-glow"><stop stop-color="#ffd1aa"/><stop offset=".3" stop-color="#ff8066" stop-opacity=".75"/><stop offset="1" stop-color="#ff8066" stop-opacity="0"/></radialGradient>
          <marker id="${id}-arrow" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto-start-reverse"><path d="M 5 0 L 0 2.5 L 5 5" fill="none" stroke="#778b8b" stroke-width="1"/></marker>
        </defs>
        <text x="34" y="34" class="mh-svg-caption">俯视 · 光路按同一比例绘制</text>
        <rect x="34" y="86" width="51" height="28" rx="3" fill="#444f54" stroke="#8d9ca0"/>
        <path d="M 43 93 H 70 M 43 100 H 70 M 43 107 H 70" stroke="#8c999a" stroke-width="1"/>
        <text x="35" y="139" class="mh-svg-caption">固定光源</text>
        <path d="M 85 100 H 230" stroke="#f39d85" stroke-width="1.8"/>
        <path data-role="reflected" stroke="#f39d85" stroke-width="1.8" fill="none"/>
        <path data-role="zero-ray" stroke="#748083" stroke-width="1" stroke-dasharray="4 6" fill="none"/>
        <g data-role="mirror-control" role="slider" tabindex="0" aria-label="镜片转角；左右拖动或按左右方向键" aria-valuemin="-0.4" aria-valuemax="0.4" aria-valuenow="0.1" class="mh-mirror-control">
          <circle cx="230" cy="100" r="48" fill="transparent"/>
          <circle class="mh-handle-ring" cx="230" cy="100" r="46" fill="none" stroke="#6d8989" stroke-dasharray="2 6"/>
          <line data-role="mirror" stroke="url(#${id}-silver)" stroke-width="9" stroke-linecap="round"/>
          <circle cx="230" cy="100" r="4" fill="#151e25" stroke="#dbe6e5"/>
        </g>
        <text x="292" y="84" class="mh-svg-label">拖动镜片 ↔</text>
        <text x="292" y="108" data-role="theta-label" class="mh-svg-value"/>
        <path data-role="distance-line" stroke="#778b8b" stroke-width="1" marker-start="url(#${id}-arrow)" marker-end="url(#${id}-arrow)"/>
        <text data-role="distance-label" class="mh-svg-caption" text-anchor="middle"/>
        <g data-role="screen-control" role="slider" tabindex="0" aria-label="镜片到屏的距离；上下拖动或按上下方向键" aria-valuemin="1" aria-valuemax="4" aria-valuenow="2" class="mh-screen-control">
          <rect x="64" y="-17" width="326" height="44" rx="3" fill="#d5ddd7"/>
          <path d="M 70 6 H 384" stroke="#738280"/>
          ${Array.from({ length: 27 }, (_, i) => `<path d="M ${74 + i * 12} 6 v ${i % 5 === 3 ? 11 : 6}" stroke="#738280"/>`).join('')}
          <circle data-role="physical-spot" cx="230" cy="1" r="4" fill="#c34230"/>
          <text x="407" y="7" class="mh-svg-label">拖屏 ↕</text>
        </g>
        <text x="34" y="382" class="mh-svg-caption">只改变读数屏距离，悬丝的力矩与扭角都不变。</text>
        <line x1="493" y1="42" x2="493" y2="355" stroke="#36474c"/>
        <text x="553" y="58" class="mh-svg-caption">屏上刻度放大 · 毫米</text>
        <text x="553" y="111" class="mh-svg-result" data-role="spot-value"/>
        <text x="553" y="143" class="mh-svg-caption" data-role="comparison"/>
        <path d="M 551 228 H 933" stroke="#a0b1b1"/>
        ${[-60, -40, -20, 0, 20, 40, 60].map(n => `<path d="M ${742 + n * 2.8} 221 v 15" stroke="${n === 0 ? '#e0e8df' : '#768c8e'}"/><text x="${742 + n * 2.8}" y="258" text-anchor="middle" class="mh-svg-caption">${n}</text>`).join('')}
        <path data-role="displacement" stroke="#f7a78c" stroke-width="2"/>
        <g data-role="zoom-spot"><circle cy="207" r="22" fill="url(#${id}-glow)"/><circle cy="207" r="5" fill="#ffd5b4"/><path d="M 0 216 V 229" stroke="#ffd5b4"/></g>
        <text x="553" y="304" class="mh-svg-equation">Δx = D tan(2θ) ≈ 2Dθ</text>
        <text x="553" y="334" class="mh-svg-caption">θ：镜片转角（弧度）　D：镜片到屏的距离</text>
        <text x="553" y="359" class="mh-svg-caption">镜片转 θ，反射光方向转 2θ。</text>
      </svg>
      <div class="mh-lab-actions"><button type="button" data-role="double-distance">保持扭角，把屏移远一倍</button><button type="button" data-role="reset">复位</button><p data-role="status" aria-live="polite">0.10° 很小；借助光路，可以读到毫米级的位移。</p></div>
      <p class="mh-optical-note">这是现代激光光杠杆的教学示意，参数为自选演示值；不是卡文迪许 1798 年的原装置或测量数据。位移用正切关系计算，近似式只用于小角度。</p>
    </div>
    <div class="mh-reading-chain" aria-label="小量测量的转换过程"><span>微小力矩 <b>τ</b></span><i>→</i><span>悬丝转角 <b>θ = τ / κ</b></span><i>→</i><span>可读位移 <b>Δx ≈ 2Dθ</b></span></div>
    <p class="mh-chain-note">κ 是悬丝的扭转刚度。加长同材质、同粗细的丝，会降低 κ、增大偏转；但更慢的响应、零点漂移和环境扰动仍限制精度。放大读数，不等于自动提高真实精度。</p>
    <div class="mh-resources" aria-label="仿真实验与实操资料">
      <article><span>动手仿真</span><h3>${external(MEASUREMENT_SOURCES.simulation, '路易斯维尔大学扭秤')}</h3><p>改变悬丝扭转常数与阻尼，比较平衡角和等待时间。让微小引力显出来，也看见测量为什么慢。</p></article>
      <article><span>课堂实操</span><h3>${external(MEASUREMENT_SOURCES.demonstration, '哈佛的装置与光路')}</h3><p>看真实装置、镜面读数和大球换位步骤。正反换位，让引力信号与仪器零点区分开。</p>${external(MEASUREMENT_SOURCES.practical, '另看 PASCO 实验活动')}</article>
      <article><span>回到静电场</span><h3>${external(MEASUREMENT_SOURCES.feedback, '用电力把扭秤稳住')}</h3><p>若未知引力矩被已知静电力矩抵消，读出补偿量也能测量。这是“测偏转”之外的另一种设计。</p></article>
    </div>
    <details class="mh-quotation"><summary>“测量可测之物，让不可测之物可测”是伽利略原话吗？</summary><p lang="en">“Measure what is measurable, and make measurable what is not so.”</p><p>这句话常被归于伽利略，但尚无可靠的伽利略原著出处。科学史学者 Andreas Kleinert 的考证将其表述追溯到 19 世纪作者的转述。因此这里把它当作测量思想的概括，不作为伽利略的确证引语。</p>${external(MEASUREMENT_SOURCES.quote, 'Kleinert，2009：引语来源考证（PDF）')}</details>
  </section>`;

  const find = name => host.querySelector(`[data-role="${name}"]`);
  const svg = host.querySelector('.mh-diagram');
  const mirror = find('mirror-control'), screen = find('screen-control');
  const abort = new AbortController();
  const eventOptions = { signal: abort.signal };
  let theta = .1, distance = 2;
  const state = () => opticalLever(theta, distance);
  const signed = n => `${n > 0 ? '+' : ''}${Math.abs(n) < .00001 ? '0.0' : n.toFixed(1)}`;

  function update(message) {
    const value = state(), screenY = 100 + distance * 60, pixelShift = value.shiftMetres * 60;
    const a = (45 - theta) * Math.PI / 180;
    const mirrorLine = find('mirror');
    mirrorLine.setAttribute('x1', 230 - 35 * Math.cos(a)); mirrorLine.setAttribute('y1', 100 - 35 * Math.sin(a));
    mirrorLine.setAttribute('x2', 230 + 35 * Math.cos(a)); mirrorLine.setAttribute('y2', 100 + 35 * Math.sin(a));
    find('reflected').setAttribute('d', `M 230 100 L ${230 + pixelShift} ${screenY}`);
    find('zero-ray').setAttribute('d', `M 230 100 V ${screenY}`);
    find('distance-line').setAttribute('d', `M 426 108 V ${screenY - 8}`);
    const dLabel = find('distance-label'); dLabel.setAttribute('x', 426); dLabel.setAttribute('y', (100 + screenY) / 2 - 10); dLabel.textContent = `D = ${distance.toFixed(1)} m`;
    screen.setAttribute('transform', `translate(0 ${screenY})`);
    find('physical-spot').setAttribute('cx', 230 + pixelShift);
    find('theta-label').textContent = `θ = ${theta.toFixed(2)}°`;
    find('spot-value').textContent = `Δx = ${signed(value.shiftMetres * 1000)} mm`;
    find('comparison').textContent = `同样的扭角，${(distance / 2).toFixed(2)} 倍屏距 → ${(distance / 2).toFixed(2)} 倍位移`;
    const spot = 742 + value.shiftMetres * 2800;
    find('zoom-spot').setAttribute('transform', `translate(${spot} 0)`);
    find('displacement').setAttribute('d', `M 742 278 H ${spot}`);
    mirror.setAttribute('aria-valuenow', theta.toFixed(2)); mirror.setAttribute('aria-valuetext', `${theta.toFixed(2)} 度`);
    screen.setAttribute('aria-valuenow', distance.toFixed(2)); screen.setAttribute('aria-valuetext', `${distance.toFixed(2)} 米`);
    find('double-distance').disabled = distance >= 4;
    find('double-distance').textContent = distance > 2 ? '保持扭角，把屏移到 4 米' : '保持扭角，把屏移远一倍';
    if (message) find('status').textContent = message;
  }
  const svgPoint = event => {
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  function draggable(element, axis, getter, setter, sensitivity) {
    let start = null;
    element.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      start = { pointerId: e.pointerId, point: svgPoint(e)[axis], value: getter() };
      element.setPointerCapture(e.pointerId); element.focus(); e.preventDefault();
    }, eventOptions);
    element.addEventListener('pointermove', e => {
      if (!start || start.pointerId !== e.pointerId) return;
      setter(start.value + (svgPoint(e)[axis] - start.point) * sensitivity);
    }, eventOptions);
    element.addEventListener('pointerup', () => { start = null; }, eventOptions);
    element.addEventListener('pointercancel', () => { start = null; }, eventOptions);
    element.addEventListener('lostpointercapture', () => { start = null; }, eventOptions);
  }
  const setTheta = n => { theta = clamp(n, -.4, .4); update('镜片转动，光点随之移动。现在试着保持扭角，只移动读数屏。'); };
  const setDistance = n => { distance = clamp(n, 1, 4); update('屏距改变，光点位移随之改变；力矩和镜片转角没有改变。'); };
  draggable(mirror, 'x', () => theta, setTheta, .0025);
  draggable(screen, 'y', () => distance, setDistance, 1 / 60);
  mirror.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
    e.preventDefault(); setTheta(e.key === 'Home' ? 0 : theta + (e.key === 'ArrowRight' ? .01 : -.01));
  }, eventOptions);
  screen.addEventListener('keydown', e => {
    if (!['ArrowUp', 'ArrowDown', 'Home'].includes(e.key)) return;
    e.preventDefault(); setDistance(e.key === 'Home' ? 2 : distance + (e.key === 'ArrowDown' ? .1 : -.1));
  }, eventOptions);
  find('double-distance').addEventListener('click', () => {
    const factor = Math.min(4, distance * 2) / distance; distance = Math.min(4, distance * 2);
    update(factor === 2 ? '屏距加倍，光点位移也加倍。扭角仍然相同。' : '屏已移到本示意的 4 米上限；转角仍然相同。');
  }, eventOptions);
  find('reset').addEventListener('click', () => { theta = .1; distance = 2; update('0.10° 很小；借助光路，可以读到毫米级的位移。'); }, eventOptions);
  update();
  return () => { abort.abort(); host.replaceChildren(); };
}
