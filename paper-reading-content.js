/**
 * Source-backed prompts for guided paper reading.
 * Figure lists contain checked main-figure navigation and selected panels.
 * Supplementary figures are not exhaustively indexed; read one panel at a time.
 * All exported strings are plain text; a caller should render them as text.
 */

export const READING_STAGES = [
  {id: 'figure', label: '逐图读懂', hint: '一次只读一张分图：先观察，再解释，最后用小模型核验。'},
  {id: 'conclusion', label: '主要结论', hint: '找出作者回答的问题、结论与直接证据。'},
  {id: 'contribution', label: '研究贡献', hint: '辨认作者相对既有工作的推进，以及我们能核实到哪里。'},
  {id: 'limitations', label: '条件与局限', hint: '区分作者明说的限制、读者推断和仍未验证的问题。'},
  {id: 'results', label: '结果与讨论', hint: '把观察到的结果、机制解释与不确定性分开。'},
  {id: 'goal', label: '我的目标能否实现', hint: '先写目标、指标、条件和资源，再逐项判断达成程度。'},
  {id: 'topics', label: '比较三个选题', hint: '从已经确认的差距出发，比较三个可检验的小选题。'},
];

export const PAPERS = {
  droplet: {
    title: 'A droplet robotic system enabled by electret-induced polarization on droplet',
    url: 'https://www.nature.com/articles/s41467-024-50520-9',
    openUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/',
    scope: 'Zhang et al., Nature Communications 15, 6220 (2024)，DOI: 10.1038/s41467-024-50520-9。开放原始研究。Nature Communications 与 Nature 正刊是不同期刊。本章连接电场、感应和力的叠加，需补充极化；机器人系统整体超出本次静电学小模型。索引包含主图导航和选定分图，不含全部补充图；一次选一个分图。',
    defaultFigure: 'fig2d',
    figures: [
      {id: 'fig2d', label: '分图 Fig. 2D · 正负极性实验对照', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig2', question: '换成相反极性的驻极体后，同一水滴的响应有什么相同或不同？这能区分哪些受力解释？'},
      {id: 'fig2e', label: '分图 Fig. 2E · 表面应力计算', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig2', question: '图中比较了正、负及中性液滴的哪些 Maxwell 表面应力？这些结果来自模拟，怎样检验极化作用的解释？'},
      {id: 'fig1a', label: '分图 Fig. 1A · 装置与工作方式', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig1', question: '先辨认场源、液滴和装置部件：哪些作用属于静电机制，哪些属于其他驱动或支撑环节？'},
      {id: 'fig1c', label: '分图 Fig. 1C · 操控示例', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig1', question: '这张分图直接展示了什么操作结果？它本身能说明机制吗，还需要哪种对照证据？'},
      {id: 'fig1', label: '主图 Fig. 1 · 系统总览（先选分图）', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig1', overview: true, question: '请先选择一个分图。该分图是在说明工作原理、装置构成，还是展示操作结果？'},
      {id: 'fig2', label: '主图 Fig. 2 · 机制鉴别与运动特征（先选分图）', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig2', overview: true, question: '请先选择一个分图。它用什么对照区分受力机制，或用什么量刻画运动？明确实验与模拟的区别。'},
      {id: 'fig3', label: '主图 Fig. 3 · 液滴性质与适用范围（先选分图）', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig3', overview: true, question: '请先选择一个分图。体积、电导率或介电常数中哪个在变化，其他条件是否相同，结果支持多大范围的适用性？'},
      {id: 'fig4', label: '主图 Fig. 4 · 生物样品与基底兼容性（先选分图）', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig4', overview: true, question: '请先选择一个分图。能移动样品与保持生物活性分别需要什么证据，这张图直接检验的是哪一项？'},
      {id: 'fig5', label: '主图 Fig. 5 · 磁静电协同（先选分图）', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig5', overview: true, question: '请先选择一个分图，辨认磁力驱动谁、静电力驱动谁；哪些环节属于本章静电学，哪些需要额外知识？'},
      {id: 'fig6', label: '主图 Fig. 6 · 体液锂检测（先选分图）', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11266649/#Fig6', overview: true, question: '请先选择一个分图。检测值接近参考值支持什么判断，其样本、范围与误差还不能支持什么更强结论？'},
    ],
  },
  graphene: {
    title: 'Electric Field Effect in Atomically Thin Carbon Films',
    url: 'https://www.science.org/doi/10.1126/science.1102896',
    openUrl: 'https://arxiv.org/pdf/cond-mat/0410550',
    scope: 'Novoselov et al., Science 306, 666–669 (2004)，DOI: 10.1126/science.1102896。作者公开稿可读；这是历史奠基研究，与 2010 年石墨烯诺奖相关，不能称为最新进展或门控公式单独获奖。早期研究含少层薄膜。本章连接电势差与感应；几何电容需要补充，完整输运解释超出本章。索引包含主图导航和选定分图，不含全部补充图；一次选一个分图。主图 3 为进阶量子输运阅读，不是必做。',
    defaultFigure: 'fig1e',
    figures: [
      {id: 'fig1e', label: '分图 Fig. 1E · 门控器件剖面示意', url: 'https://arxiv.org/pdf/cond-mat/0410550#page=4', question: '栅极、绝缘层、薄膜与外接电极各在哪里？电势差改变时，电子通过什么路径进入或离开薄膜？'},
      {id: 'fig2a', label: '分图 Fig. 2A · 电阻率实验曲线', url: 'https://arxiv.org/pdf/cond-mat/0410550#page=4', question: '横纵轴及温度对照分别表示什么？峰值的位置是否说明零栅压就一定电中性？'},
      {id: 'fig2b', label: '分图 Fig. 2B · 电导推算与作者模型', url: 'https://arxiv.org/pdf/cond-mat/0410550#page=4', question: '图中的点与红线分别怎样得到？几何电容估算能解释哪些变化，还不能解释哪些输运细节？'},
      {id: 'fig1', label: '主图 Fig. 1 · 薄膜与器件（先选分图）', url: 'https://arxiv.org/pdf/cond-mat/0410550#page=4', overview: true, question: '请先选择一个分图。它是样品照片、显微表征还是器件示意，各自能证明什么？'},
      {id: 'fig2', label: '主图 Fig. 2 · 栅压与电学响应（先选分图）', url: 'https://arxiv.org/pdf/cond-mat/0410550#page=4', overview: true, question: '请先选择一个分图。它的响应量是什么，哪些是实验或由实验推算的量，哪些是作者模型？'},
      {id: 'fig3', label: '主图 Fig. 3 · 量子输运（进阶选做）', url: 'https://arxiv.org/pdf/cond-mat/0410550#page=5', overview: true, question: '这是超出本章必修目标的进阶阅读。若选择继续，请先指定一个分图，辨认变化的磁场、栅压或温度与测量量，不必复现完整量子输运模型。'},
    ],
  },
  storage: {
    title: 'Giant energy storage and dielectric performance in all-polymer nanocomposites',
    url: 'https://www.nature.com/articles/s41586-026-10195-2',
    openUrl: 'https://www.nature.com/articles/s41586-026-10195-2',
    scope: 'Li et al., Nature 651, 377–382 (2026)，DOI: 10.1038/s41586-026-10195-2。Nature 正刊近期原始研究。公开摘要、元数据与扩展图说明可供核查，完整正文受订阅限制；公开链接仅为可访问页面，不代表开放全文。电容、介电常数和介质储能需补充选做。以下仅列已核验的扩展图入口，不能据此宣称通读全文或掌握全部数据。',
    defaultFigure: 'ed1',
    figures: [
      {id: 'ed1', label: 'Extended Data Fig. 1 · 介电常数与目标储能', url: 'https://www.nature.com/articles/s41586-026-10195-2', question: '先从图注辨认坐标轴与固定的能量密度：介电常数增大时，达到同一目标所需的场强怎样变化？这是否等于实测击穿或可回收能量？'},
    ],
  },
};

const STAGE_TASKS = {
  figure: `本轮任务：只精读当前选定的一张分图。若当前仅选择主图导航、还没指定分图，先让学生选择一个分图；分图确定后再进入下面的观察步骤。
先检查本次输入及其附加内容是否已经包含学生的观察。若已填写，先简短复述并对照原图核对，再进入下一步，不重复索要同一观察。若未填写，第一条回复先简短说明能读到的材料，再只提出一个观察问题：“你先看这张分图，能指出它改变了什么、展示或测量了什么，以及你最想解释的一处现象吗？”暂不直接给完整答案，等学生回应后再继续。
取得学生观察后，按以下顺序引导：
1. 对照原图纠正观察。若是曲线，辨认横纵轴、单位、尺度与图例；若是照片或示意图，说明它没有坐标轴，辨认比例尺、对象、箭头和操作顺序，不虚构坐标。
2. 说明自变量、响应量、固定条件及对照组；明确实测、由实测推算、作者计算或结构示意，不能混称为实验结果。
3. 检查误差线、重复次数、样本、分辨率及作者报告的不确定性。图中未提供时如实记录“此图未报告”，不能补造，也不据此直接判定研究无效。
4. 用一个可复述的句子概括此分图支持的结论，附证据定位；再指出它不能单独支持的更强结论。
5. 连接一个 JC05 已学概念，标出需要补充的知识；解释研究比课本问题多考虑了什么。
6. 提出一个可验证的小模型：列假设、变量、公式、单位、固定条件和一个预测；让学生先预测，再计算或操作；至少做一个量纲、比例、极限或反例核验。
7. 以一个独立解释问题收尾，不代学生写最终作业。可以指出下一张值得读的图号，但本轮不要继续解析它。`,
  conclusion: `本轮任务：梳理论文回答的问题和主要结论。
先让学生用一句话说出自己认为作者想解决的问题，再根据已访问材料校正。将“研究问题—作者结论—支撑证据—成立条件”逐项对应，优先保留 2～3 个核心结论，不用摘要措辞代替证据。
每个结论附可回查的原文证据和位置，分清作者明确表达、由结果合理推断以及目前未验证。需要图证据时，本轮只详细读当前选定分图；其他图只记录待核验位置，不一次展开全部图。
若只读到摘要或部分图注，输出只能称“基于当前可访问材料的结论梳理”，说明哪些正文证据仍缺失。最后请学生自己改写一个结论，并指出一个不能由它推出的更强说法。`,
  contribution: `本轮任务：辨认研究贡献，而不是把期刊名当作贡献证据。
先让学生说出“它比已经知道的事情多解决了什么”。随后从已读原文提取：原问题及已有方法的限制、作者新增的方法/材料/器件/机制证据、支撑新增内容的比较或对照。
将“作者自述的贡献”“当前图和实验可支持的推进”“仍需查既有文献才能确认的新颖性”分开。引用作者比较的先前工作时，若未读取原文就说明只知道本论文如何转述，不能声称完成独立验证。
联系课程，分别写出“课本已学概念—研究多考虑的问题—学生能做的小模型—原研究还做了哪些工作”。强调概念上的再走一步不等于完成可发表研究。结尾让学生指出一项不能由课堂模型代替的研究工作。`,
  limitations: `本轮任务：核查成立条件与局限。
先让学生选一个自己想改变的条件，再检查论文是否验证过这个变化。分成三类记录：作者明确承认的限制；读者依据方法或数据推断的潜在限制；当前材料尚不能判断的问题。
逐项检查适用样本/材料、参数范围、环境与边界条件、测量或计算假设、对照与不确定性。必须有具体位置；没有报告的内容写“当前未找到证据”，不能改写成“作者没有做”或断言论文有错误。
只挑最影响当前教学问题的 2～3 项，分别说明它限制了哪条结论，以及最小的进一步测量、对照或仿真能如何检验。不要用学生简化模型的不足冒充原论文不足。最后让学生提出一个可检验的边界条件。`,
  results: `本轮任务：把结果与讨论对应起来。
先检查输入及附加内容是否已有学生的观察。若已有，简短复述并核对其描述，把观察和初步解释分开，然后继续分析，不再要求重复填写；若没有，先让学生只描述当前分图中看到的一个变化，不解释原因，等其回答后再进入分析。
按三列组织：“观察或计算得到的结果”“作者提出的机制解释”“不确定性与其他可能解释”。每条都给原文位置并标明证据性质；相关性不能自动写成因果，拟合符合也不等于机制被唯一证明。
对照与当前分图有关的 Results/Discussion 或其他实际章节标题，不虚构论文没有的章节。说明作者用了什么比较支持解释、什么证据可能区分替代解释，以及哪些问题仍未解决。
选一个大学物理概念帮助解释，并设计一个只改变一个条件的小模型检验。说明该检验只能检验课堂模型的关系，不能代替原实验或自动验证论文的全部讨论。`,
  goal: `本轮任务：评估学生的具体目标能达到什么程度。
先读取下面的目标输入。必须先确认四项：目标是什么；以什么可测指标和阈值判断；在什么适用条件下；有哪些时间、设备、数据与计算资源。缺项时先用一个简短问题集中询问缺失项，然后等待，不自行编造要求。
要求明确后，将“完美达成”转换为约定的验收条件，不承诺无条件、全场景或零不确定性的完美。逐项比较目标指标与论文实际证据：已在相符条件下验证、只部分支持、尚无证据、或条件不相容。
每个判断附原文证据与位置，区分原论文达到的性能、学生小模型可验证的关系和现实实现仍需的工作。列出最关键的差距、一个可行的最小检验，以及检验失败会说明什么；信息不足时保留判断，不把没有证据写成已经不能实现。`,
  topics: `本轮任务：根据已经确认的目标与证据差距，提出并比较三个小选题。
若目标、资源或关键差距尚未确认，先用一个简短问题补齐并等待；不要为了凑三个题目编造论文缺陷。只把“未被当前资料验证”作为待查问题，不直接称为学术空白。
随后给恰好三个可比较的选题，每项包含：可证伪的问题；来自论文的证据及具体位置；新提出的假设；最小实验或数值仿真；自变量、响应量与固定条件；所需数据/设备/算力/时间；主要难点；难度和在现有资源下的可行性；成功与失败的判据。
用一个简洁表格比较这三题，再推荐一个最适合大学物理学习的小题及理由。基础题可以只是条件变化或机制检验，不能包装成已经具备研究创新。涉及新颖性时，列出还需检索和比较的文献方向；不能仅凭一篇论文断言“首次”“无人研究”或保证发表。
最后让学生自己选择并说明取舍，再把选定题缩减为一项可在现有资源下完成的核验。`,
};

const READING_RULES = `共同规则：
• 只依据实际访问到的论文、补充材料或学生提供的原图与图注。首先简短说明读到了什么；打不开或不完整时明确说明，并请学生补充合法可访问材料，不能假装已经读过。
• 每条关键论断都给原文证据与具体位置。只摘必要短句或短语、配准确定位，其余准确释义，不整段转载。可用“章节标题 + 段落首句短语”“图号/分图 + 图注位置”；PDF 在可核实时同时写印刷页码和文件页序号，找不到时标明，不猜页码或引文。
• 明确区分“作者明确陈述”“读者依据证据推断”“尚未验证”。一句判断若含多种身份，应拆开；模型图、实测数据、由测量推算的量与作者模拟必须分清。
• 每轮需要详细读图时只处理选定的一张图或一个分图；其他图只记作待查线索。若选择了主图导航，先请学生指定其中一个分图，再进入精读；已有明确选择则直接承接。索引包含主图导航与选定分图，不包含全部补充图；用户自填图号要先核实是否存在。
• 课程连接以 JC05 的电荷、电场、电势、高斯定理和静电平衡为主。极化、电容与介电储能需明确补充；完整材料制备、量子输运和器件工程不要求本阶段掌握。
• 教学小模型须说明假设、量纲、边界与一个独立核验。教学模拟不冒充原始实验；概念多走一步不表示科研只需一步。先让学生观察和预测，再解释或计算；若输入已包含其观察、预测或目标，先核对并承接，不重复索要，避免直接替学生交作业。
• 不把历史经典称为最新论文，不混同 Nature Communications 与 Nature 正刊，不把诺奖关联简化为一个公式获奖。不要因论文发表期刊推断结论没有局限。`;

function compactFigureId(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function resolveFigure(paper, figure) {
  const supplied = typeof figure === 'object' && figure !== null
    ? String(figure.id || figure.label || '').trim()
    : String(figure ?? '').trim();
  const requested = supplied || paper.defaultFigure;
  const match = paper.figures.find(item => item.id === requested
    || compactFigureId(item.id) === compactFigureId(requested)
    || compactFigureId(item.label.split('·')[0]) === compactFigureId(requested));
  if (match) return {...match, checked: true};
  return {
    id: requested,
    label: typeof figure === 'object' && figure !== null && figure.label
      ? String(figure.label).trim() : requested,
    url: paper.openUrl || paper.url,
    question: '这是用户自填的图号或分图。请先在原文中核实它是否存在、准确图号及图注，再询问学生观察；不要据图号猜内容。',
    checked: false,
  };
}

function goalText(goal) {
  if (goal === undefined || goal === null) return '';
  if (typeof goal === 'string') return goal.trim();
  if (typeof goal === 'object') {
    const fields = [
      ['目标', goal.target ?? goal.objective ?? goal.goal],
      ['指标与阈值', goal.metrics ?? goal.criteria],
      ['条件', goal.conditions],
      ['资源', goal.resources],
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());
    return fields.map(([label, value]) => `${label}：${String(value).trim()}`).join('\n');
  }
  return String(goal).trim();
}

/**
 * Build one plain-text prompt. `figure` may be a listed id/label or a user-supplied
 * figure number, which stays explicitly unverified. `goal` may be free text or
 * {target, metrics, conditions, resources}. Unknown papers/stages are rejected
 * so the UI cannot silently produce a prompt for a different paper or task.
 */
export function buildReadingPrompt({caseKey = 'droplet', stage = 'figure', figure, goal} = {}) {
  const paper = PAPERS[caseKey];
  if (!Object.hasOwn(PAPERS, caseKey)) throw new RangeError(`Unknown paper case: ${caseKey}`);
  if (!Object.hasOwn(STAGE_TASKS, stage)) throw new RangeError(`Unknown reading stage: ${stage}`);
  const selected = resolveFigure(paper, figure);
  const selectedStage = READING_STAGES.find(item => item.id === stage);
  const target = goalText(goal);
  const targetBlock = target
    ? `学生填写的目标与资源（待核对，不能视为论文事实）：\n${target}`
    : '学生尚未填写个人目标。若本轮为目标评估或选题比较，先请其说明目标、指标与阈值、条件及资源，然后等待回应。';

  return `请做我的大学物理论文精读伙伴，帮助我自己理解和判断。

论文：${paper.title}
正式来源：${paper.url}
可访问阅读入口：${paper.openUrl || paper.url}
论文身份与课程范围：${paper.scope}

当前任务：${selectedStage.label}
${selected.overview ? '当前主图导航' : '当前分图'}：${selected.label}${selected.checked ? '（教师选定的阅读入口）' : '（用户自填，尚待核验）'}
${selected.overview ? '下一步先确认其中一个分图；如学生附加内容已经指定，则直接使用该分图，不能一次解析整张主图。\n' : ''}分图阅读入口：${selected.url}
读图问题：${selected.question}

${targetBlock}

${READING_RULES}

${STAGE_TASKS[stage]}

交流方式：使用清楚的中文，必要英文术语只作对应说明。每次推进一个关键问题，给我回应和修正的机会；证据不足时明确保留判断。`;
}
