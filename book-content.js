// 正文与交互插图分开维护，问题与教学目标见 lesson-guide.js。
export const UNITS=[
  {
    "id": "foundations",
    "title": "电荷与电场",
    "hours": 1,
    "sub": "一个位置的电场，决定放在这里的电荷怎样受力。",
    "module": "foundations-page.js",
    "mount": "mountFoundations",
    "standalone": "foundations.html",
    "before": "<p>先把金色小球放到不同位置，测它受到的力。红球是产生场的源，金球是用来测量的试探电荷；图中的球形是位置标记。</p><div class=\"symbol-index\"><div><b>Q</b><span>源电荷的电荷量<small>大写 Q · 单位库仑 C</small></span></div><div><b>q</b><span>试探电荷的电荷量<small>小写 q · 单位库仑 C</small></span></div><div><b>F</b><span>试探电荷受到的电场力<small>有大小、有方向 · 单位牛顿 N</small></span></div><div><b>E</b><span>观察位置的电场强度<small>有大小、有方向 · 单位 N/C</small></span></div></div><div class=\"discovery-question-chain\" aria-label=\"本节问题链\"><span><b>①</b> 同样远，换方向呢？</span><span><b>②</b> 距离加倍呢？</span><span><b>③</b> 只换 q 呢？</span><span><b>④</b> 哪个量属于位置本身？</span></div>",
    "action": "直接拖黄点测不同位置；抓住源旁的电量环改变强度。有限模型比较可展开。",
    "after": "<h2>先固定位置，再换电荷</h2><p>两个图中的源 Q 和观察位置 P 完全相同。左边放入 +e，右边放入 +2e。电场 E 相同，右边受到的力 F 是左边的两倍。这里 e 是元电荷的大小，不是电场 E。</p><figure class=\"inline-figure\" data-inline-model=\"charge\" aria-label=\"同一个位置的+e与+2e受力对照\"></figure><p>把不同试探电荷的力除以各自的电荷量，得到同一个有方向的量 F/q。这个量描述位置的场，而不是某颗试探电荷；我们定义它为电场强度 E。于是求某颗电荷受力时，再乘回它自己的 q。</p><div class=\"book-equation\"><strong>E = F/q，F = qE</strong><span>固定源和位置：只改变 q，E 不变，F 随 q 改变。正 q 的 F 与 E 同向，负 q 的 F 与 E 反向。</span></div>\n<h2>“电荷”和“电荷量”分别指什么？</h2><p>带电是物质的一种物理性质，会表现为吸引或排斥等作用。电荷量描述带电的正负和多少，通常用 Q 或 q 表示；它们是同一种物理量，大小写在这里用来区分源和试探者。电荷量不是物体体积，也不是质量。</p><div class=\"symbol-e\"><span data-tex=\"e=1.602176634\\times10^{-19}\\,\\mathrm C\"></span><br>e 是元电荷的<b>大小</b>，是正数。电子的电荷量为 −e；+e 表示与它等量的正电荷，+2e 表示两份。<span data-tex=\"10^{-19}=1/10^{19}\"></span>，表示“非常小的一份库仑”，不是“负十九库仑”。使用 e，能避免每次书写很长的小数。<small>数值按 <a href=\"https://www.bipm.org/en/measurement-units/si-defining-constants\">BIPM 的 SI 定义</a>。普通物体的净电荷量是 e 的整数倍；这不意味着可以只改变某个电子自身的电荷量。</small></div><p>充电和放电改变的是物体上电荷的分配，例如转移电子。一个孤立系统的总电荷守恒。</p>\n<h2>同样远，换方向为什么还要画箭头？</h2><p>下图三个位置到源的距离相同。场强<b>大小</b>相同，但<b>方向</b>不同，所以 E 是矢量。一个数字只能告诉你“多强”，箭头还告诉你“朝哪边”。F 也是矢量。</p><figure class=\"inline-figure\" data-inline-model=\"directions\" aria-label=\"同半径三个方位的场强大小相同方向不同\"></figure><p>这里的源具有球对称性。场强大小只通过到源的距离 r 依赖位置；方向沿源—P 连线。它不是“与 x、y、z 完全无关”：坐标共同决定距离和方位。正源的 E 向外，负源的 E 向内；电子的受力还要反过来。</p>\n<h2>距离为什么重要？先试一个猜想</h2><p>把同一个试探电荷拉到两倍远。如果猜“力会减半”，下面的测量就给出反例：力只剩四分之一。电场强度也是如此；再换一个距离，可以继续检验这个平方反比规律。</p><figure class=\"inline-figure\" data-inline-model=\"distance\" aria-label=\"距离r和2r的场强与力平方反比对照\"></figure><div class=\"book-equation\"><strong>E的大小 = k|Q|/r²</strong><span>r 是源到观察点的距离，k 是真空中的库仑常数，|Q| 表示源电荷量的大小。方向已经由连线和源的正负给出，这里先只计算大小。</span></div><p>例如从 2 mm 到 4 mm，距离是两倍；分母 r² 是四倍，因此 E 和同一个 q 的受力都变成 1/4。两倍远并不意味着力的方向也变成“两倍”。</p>\n<h2>从受力到运动：a 和 m 是什么？</h2><p>力会改变速度。<b>a 是加速度</b>，描述速度每秒怎样变化，单位 m/s²；<b>m 是质量</b>，单位 kg。若只受电场力，牛顿第二定律给出 F = ma，结合电场力，得到下面的关系。</p><p class=\"book-acceleration-formula\"><span data-tex=\"\\mathbf a=\\frac{\\mathbf F}{m}=\\frac qm\\mathbf E\"></span></p><figure class=\"inline-figure\" data-inline-model=\"mass\" aria-label=\"相同电荷量不同质量的加速度对照\"></figure><p>同一个 E、同一个 q：质量加倍，力不变，加速度减半。图中用可调质量的试探粒子模型比较；球的造型用于区分参数，不表示真实电子尺寸。</p>\n<h2>现实物体，什么时候可以当成理想模型？</h2><p>理想模型保留主要影响，省去对当前观察位置影响很小的细节。不是把现实物体真的变成一个点或无限大，而是检查这样简化会产生多大误差。</p><div class=\"model-examples\"><article><b>小带电球 → 点源</b><p>在球外，球对称的电荷分布与同电量点源有相同的场。更一般的小物体，只有当物体尺寸相对观察距离很小、周围边界影响可忽略时，才近似为点电荷。<a href=\"#experience\" data-try-source=\"point\">在主图测点源 ↗</a></p></article><article><b>均匀带电的长细线 → 无限长线</b><p>观察点靠近中段，离端点很远时，端部的轴向影响较小。理想无限长线的场沿垂直于线的方向；半径距离加倍，场强约减半。<a href=\"#experience\" data-try-source=\"line\">直接拉长线段，读误差 ↗</a></p></article><article><b>均匀带电的大薄膜 → 无限大平面</b><p>观察点离膜近、又远离边缘时，场近似垂直膜面，同侧强度近似不随距离改变。实际有限圆盘的边缘会改变场的方向与大小。<a href=\"#experience\" data-try-source=\"plane\">直接拉大圆盘，读误差 ↗</a></p></article></div><figure class=\"inline-figure\" data-inline-model=\"models\" aria-label=\"有限线段与无限长线的方向对照\"></figure><p>静电除尘器中，带电粉尘受到电场力而被收集。真实装置的极丝、收集板和边界共同决定电场，不能把单个理想源的数值直接套到整个设备；理想模型提供的是理解局部场的方法。</p><figure class=\"ideal-photo\"><img src=\"assets/cases/esp-interior.jpg\" alt=\"真实静电除尘设备内部的极丝与收集结构\" loading=\"lazy\"><figcaption>静电除尘设备实物对照 · 来源及署名见<a href=\"cases.html?case=esp\">除尘器案例</a>。可把发射带电粒子实验中的 qE 与真实颗粒收集联系起来。</figcaption></figure>\n<h2>谁把这些规律测出来，又是谁开始用“场”思考？</h2><div class=\"discovery-history\"><h3>库仑：用扭秤把小力变成可测的转角</h3><p>1785 年，库仑发表电力测量结果。细丝悬挂一根轻杆，杆端带电小球受到另一个小球的排斥后转动；细丝扭转产生恢复力矩。先校准细丝，再改变小球间距并读取转角，就能比较不同距离的电力，得到平方反比关系。异号球容易靠拢接触，他还采用不同方法核验吸引力。</p><small>历史依据：<a href=\"https://www.aps.org/apsnews/2016/06/coulomb-measures-electric-force\">美国物理学会：库仑测量电力</a>；<a href=\"https://dspace.mit.edu/entities/publication/93de3f66-7454-45a3-9632-7a1db0307fe7\">MIT 收录的库仑扭秤论文说明</a>。</small><h3>法拉第：把注意力从“两物体相隔多远”移向周围空间</h3><p>十九世纪，法拉第用力线和场的观念研究电磁作用。他记录磁体周围铁屑呈现的形状，关心空间中的作用怎样分布；这是磁场实验，不能当成电场的直接照片。电场概念让我们先问“这个位置的场怎样”，再问“放入哪个电荷会受多大力”。今天的 E = F/q 是这种描述方式的定量定义，不是某一次实验里直接看见的物质。</p><small>历史资料：<a href=\"https://www.rigb.org/explore-science/explore/collection/michael-faradays-iron-filings\">英国皇家研究所保存的 1851 年铁屑实验记录</a>、<a href=\"https://www.rigb.org/explore-science/explore/collection/history-research-ri\">研究史</a>。这里没有把电力定律与场概念归为同一次发现。</small></div>\n<p class=\"book-limit\">本节主图采用固定源、真空和不扰动源的试探电荷；点源的平方反比用于源外，球内分布另行讨论。矢量箭长采用固定压缩尺度，精确强弱读数值。三维对照图的箭长在同一对比中按相同比例显示；电场与力单位不同，二者的箭长不能互相当作同单位数值比较。1 pC = 10⁻¹² C；1 fN = 10⁻¹⁵ N。</p>",
    "related": [
      [
        "beam.html",
        "发射一束粒子",
        "调整 q/m 和速度，看轨迹与接收数量。"
      ]
    ],
    "ref": "5-4-electric-field"
  },
  {
    "id": "field",
    "title": "电场的叠加",
    "hours": 1,
    "sub": "同一个 P 点，接收每一个源的贡献。",
    "module": "field-page.js",
    "mount": "mountField",
    "standalone": "field.html",
    "before": "<p>先分别看每个源在 P 的贡献，再把两个箭头相加。两条虚线连到同一个 P；观察点、箭头和空间场共用同一套三维坐标。</p><div class=\"book-equation\"><strong>𝐄(P) = 𝐄₁(P) + 𝐄₂(P)　　𝐅(P) = q𝐄(P)</strong><span>先按 x、y、z 分量相加；通常 |E| 不等于 |E₁| + |E₂|。</span></div>",
    "action": "拖动黄点，看两条源—P 连线、两个分场与合场。再换成同号源。",
    "after": "<h2>抵消发生在一个位置</h2><p>两个等量同号源的中点，两个分场等大反向，合场为零。离开中点后一般不再抵消。等量异号源的中点则不同：正源的场指向外，负源的场指向内，两个贡献方向相同，合场增强。</p><div class=\"book-example\"><b>把问题放进图里</b><p>按照图下的当前任务，把 P 拖到符合目标的位置。判断依据是 P 点的合场与 q 的符号，而不是某一条源—P 连线。回到自由探索，在一个固定的 P 点改变源电量，观察受力方向怎样改变。</p></div><p class=\"book-limit\">源用均匀带电小球建模；球外与同电量点源相同。移动源展示一系列静电状态，未包含传播延迟。分场和合场使用相同局部箭头比例；背景箭头为便于观察进行了长度压缩。</p>",
    "ref": "5-6-calculating-electric-fields"
  },
  {
    "id": "flux",
    "title": "电通量与高斯定理",
    "hours": 1,
    "sub": "把闭合面各处的朝外与朝内贡献合起来。",
    "module": "flux-page.js",
    "mount": "mountFlux",
    "standalone": "flux.html",
    "before": "<p>这个半透明面是想象的测量边界，能任意放大或变形。红球放在外面时，一条线可能先进入、再离开；放进里面后，情况就不同了。</p><div class=\"book-equation\"><strong>Φ = ∯S 𝐄·d𝐀 = Q内 / ε₀</strong><span>朝外计正，朝内计负。先独立算表面积分，再与包入的电量核对；不是数画出来的场线。</span></div>",
    "action": "拖动红球，跨过包围面的边界。沿高亮的同一条线，看它穿入、穿出的带符号贡献。",
    "after": "<h2>外面的源也产生场，为什么净通量为零？</h2><p>外部点源发出的场线，若穿过闭合面，就会有进入和离开的配对。积分中朝内与朝外贡献抵消；内部没有净电荷时，<b>净通量为零并不等于每处 E 都为零</b>。正点源在内部时，其总贡献朝外；负点源在内部时，总贡献朝内。</p><p>场线是表达方向的图示，数量由绘图者选择。动画中的“穿过”帮助辨认符号，真正的电通量按 E·dA 计算，不能把屏幕上画了几条线当作测量值。</p><div class=\"book-example\"><b>保持电荷在面内，改变面的大小与形状</b><p>各点场强、面积与夹角都可能改变，但总和仍是 Q内/ε₀。图中的数值积分会有离散误差；源非常接近面时，需要更细的采样。</p></div><p class=\"book-limit\">本图的红球是均匀带电绝缘实心球，跨界时按包入闭合面的电荷比例计算 Q内。若改用理想点电荷，点恰落在积分面上的情形需另行处理。</p>",
    "ref": "6-2-explaining-gausss-law"
  },
  {
    "id": "symmetry",
    "title": "用对称性求场强",
    "hours": 2,
    "sub": "高斯定理总成立，只有合适的对称性才能把 E 提出来。",
    "module": "symmetry-page.js",
    "mount": "mountSymmetry",
    "standalone": "symmetry.html",
    "before": "<p>把偏心的红球拖回球面中心。源与测量面具有共同对称性时，面上各点的场才具有可用于简化积分的关系。</p><div class=\"book-equation\"><strong>∯ 𝐄·d𝐀 → E × 有效面积</strong><span>高斯定理对任意闭合面成立；写成一个 E 乘面积需要额外的对称性条件。</span></div>",
    "action": "切换三种源，拖动高斯面的尺寸。再把球源移离中心，观察哪里不再相同。",
    "after": "<div class=\"book-equation\"><strong>球、线、面的场强</strong><span>先由对称性确定方向和等大关系，再计算有效通量面积。</span></div><h2>同一个定理，三种距离规律</h2><div class=\"book-table-wrap\"><table class=\"book-table\"><thead><tr><th>源与高斯面</th><th>通量关系</th><th>场强大小</th></tr></thead><tbody><tr><td>球对称源外；同心球</td><td>E·4πr² = |Q|/ε₀</td><td>|Q|/(4πε₀r²)</td></tr><tr><td>无限长均匀直线；同轴圆柱</td><td>E·2πrL = |λ|L/ε₀</td><td>|λ|/(2πε₀r)</td></tr><tr><td>无限大均匀薄平面；跨面扁柱</td><td>2EA = |σ|A/ε₀</td><td>|σ|/(2ε₀)</td></tr></tbody></table></div><p>表中 E 表示场强大小，正源的场背离源，负源的场指向源。距离加倍，球源外的 E 变为 1/4，直线的 E 变为 1/2，平面的 E 不变。这里的“平面”是两侧对称的孤立均匀带电薄层；静电平衡导体表面外侧的关系是 Eₙ = σ/ε₀，条件不同。</p><h2>偏心后，什么仍然成立？</h2><p>把球源移离球形高斯面的中心，只要源仍完全在面内，净通量不变。但面上 E 不再处处等大，也不再处处沿法线，因此不能用一个未知 E 乘球面积求解。高斯定理依然正确，失效的是这一步简化。</p><p class=\"book-limit\">无限长与无限大是理想模型。有限物体在何处可近似，回看第一节的误差比较。λ 的单位为 C/m，σ 为 C/m²；计算时先换成 SI 单位。</p>",
    "ref": "6-3-applying-gausss-law"
  },
  {
    "id": "potential",
    "title": "电势与等势面",
    "hours": 2,
    "sub": "同一位置的电势，给出每单位电荷的电势能。",
    "module": "slice-page.js",
    "mount": "mountSlice",
    "standalone": "slice.html",
    "before": "<p>点一层带电势读数的面，再让粒子沿面移动。金色力箭头依然存在；沿面的一小步却与它垂直。电势是位置的量，电势能还要乘上放在这里的 q。</p><div class=\"book-equation\"><strong>V(P) = Σ Vᵢ(P)　　W = q(VA − VB) = −ΔU</strong><span>V = U/q，单位 J/C，即伏特。只有电场做功时，W = ΔK。</span></div>",
    "action": "选一层电势，让粒子沿面扫行。看金色力箭头与切向位移保持垂直，再切到自由释放。",
    "after": "<h2>两个电荷的电势怎样相加？</h2><p>在两个源的球外，V = kQ₁/r₁ + kQ₂/r₂。移动 P，两个距离改变，各源的带符号贡献同时改变。等量异号源的中垂面上，两项恰好抵消，V = 0；这里的 E 却通常不为零。</p><div class=\"book-example\"><b>电势能和电势，不是同一个量</b><p>同一 P 点若 V = +0.80 V：放入 +e，U = +0.80 eV；换成 −e，U = −0.80 eV，V 仍为 +0.80 V。电子从 V = 0 到 V = +1 V，电场做功 +1 eV；若无其他力做功，动能就增加 1 eV。</p></div><h2>零点是约定，电势差有直接效果</h2><p>本图的有限电荷体系取无穷远 V = 0。把所有电势统一加一个常数，不改变 ΔV、E 和电场做功。无穷远是距离趋于无限大的极限，不是画面里某个可到达的点；图中“∞ 零电势参考”可连续拉远观察读数趋近零。</p><p class=\"book-limit\">无限长线与无限大平面的电势不能套用 V(∞)=0，应选择有限参考位置。图中各层电势间隔并不相等；只有比较相等 ΔV 的相邻面，才可用疏密直观判断场强。一般应比较 |ΔV|/法向距离。</p>",
    "ref": "7-2-electric-potential-and-potential-difference"
  },
  {
    "id": "paths",
    "title": "电场做功与环路定理",
    "hours": 2,
    "sub": "起点、终点相同，绕路会改变电场做功吗？",
    "module": "paths-page.js",
    "mount": "mountPaths",
    "standalone": "paths.html",
    "before": "<p>拖动金色绕路柄，改变经过的空间。两颗粒子受约束走不同的路，沿路逐段累计电场的功；比较它们到达同一终点时的结果。</p><div class=\"book-equation\"><strong>VB − VA = −∫A→B 𝐄·d𝐫　　∮ 𝐄·d𝐫 = 0</strong><span>dW = qE·dr；顺着力做正功，逆着力做负功，垂直于力的一阶位移不做功。</span></div>",
    "action": "拖动 A、B 和绕路柄，比较两条路。再闭合一圈，看功怎样累加、又回到零。",
    "after": "<h2>局部的 E 与整体的电势差</h2><p>切到“转动一小步”。固定起点，让小位移转向：沿 E 时 V 降低；逆 E 时 V 升高；垂直 E 的瞬时方向上，电势的一阶变化为零。</p><div class=\"book-equation\"><strong>Eₛ = −∂V/∂s　　𝐄 = −∇V</strong><span>有限小步近似：E 在该方向的分量 ≈ −ΔV/Δs。步长越小，局部近似通常越好。</span></div><p>这里的“垂直”是当前位置的局部关系。要在弯曲等势面上持续走，需要不断转向，让每一步都与新的 E 垂直。沿某点的切线走一大步，一般会离开原来的等势面。</p><div class=\"book-example\"><b>数字来自两种独立算法</b><p>图中一份功由路径上 qE·dr 的数值积分累加，另一份由 q(VA−VB) 计算。两者的微小差异来自离散采样；改变绕路形状后，它们仍应接近。沿指定路线演示时有约束，不能仅据电场做功断言 ΔK。</p></div><p class=\"book-limit\">环路定理针对静电场。存在随时间变化的磁场时，电场的闭合积分可不为零；首页振荡场预览属于后续电磁学拓展。</p>",
    "ref": "7-4-determining-field-from-potential"
  },
  {
    "id": "conductors",
    "title": "静电感应与静电平衡",
    "hours": 2,
    "sub": "导体内的电荷重新分布，直到内部总电场为零。",
    "module": "conductors-page.js",
    "mount": "mountConductors",
    "standalone": "conductors.html",
    "before": "<p>中性金属球也能分出正、负表面区域。它们产生的感应场与外场叠加，直到材料内部的总场为零。直接拖动 P，比较球内、表面与球外。</p><div class=\"book-equation\"><strong>导体内：𝐄总 = 0，V = 常数；表面外：E切向 = 0，E法向 = σ/ε₀</strong><span>静电平衡的导体等势，电势不一定为零；表面外侧取真空、外法线方向。</span></div>",
    "action": "先看中性金属球。改变外场，剖开球看外场与感应场相消；再把探针锁到表面移动。",
    "after": "<h2>用边界条件求球内、球外的场与势</h2><p>孤立带电导体球半径 R、净电量 Q，取无穷远为零。球外由球对称性得 E = kQ r̂/r²、V = kQ/r；球内 E = 0，且与表面等势，所以 V = kQ/R。跨过表面时 V 连续，E 的法向分量发生跳变。</p><div class=\"book-equation\"><strong>r &lt; R：E = 0，V = kQ/R<br>r &gt; R：E = kQ/r²，V = kQ/r</strong><span>上式 E 为径向带符号分量。图中的径向曲线随探针位置同步读数。</span></div><h2>中性球在均匀外场中</h2><p>这个模型的总净电荷为零，表面电荷密度为 σ = 3ε₀E₀cosθ，θ 从外场方向量起。外场与感应场在金属内部逐点相消；球外则相互叠加。转动外场方向，表面的正负区域也随之改变。</p><p class=\"book-limit\">均匀外场延伸到无穷远，本模型选择过球心且垂直外场的平面为零电势参考，不能使用 V(∞)=0。画面依次展示不同静电平衡状态，不模拟瞬态电流。空腔含电荷、复杂导体与接地边界需另行求解。</p>",
    "related": [
      [
        "charge.html#spark",
        "金属球充电与火花",
        "观察电势差积累、空气间隙放电和接地。"
      ]
    ],
    "ref": "6-4-conductors-in-electrostatic-equilibrium"
  },
  {
    "id": "applications",
    "title": "事故与工程应用",
    "hours": 1,
    "sub": "同样的电荷积累，既能完成工作，也可能触发事故。",
    "module": "risk.js",
    "mount": "mountRisk",
    "standalone": "cases.html",
    "before": "<p>除尘设备利用电场收集带电颗粒；电势差也可能触发火花。点开照片，看清现场、过程和关注部位，再在同一案例里改变一个条件。</p>",
    "action": "点一张现场照片。留意模型中被点亮的部位，并在同一案例中查看 5W2H。",
    "after": "<h2>把现象接回本章</h2><div class=\"book-table-wrap\"><table class=\"book-table\"><thead><tr><th>观察对象</th><th>用哪个量解释</th><th>返回实验核对</th></tr></thead><tbody><tr><td>带电颗粒偏转与收集</td><td>F = qE；a = qE/m</td><td><a href=\"beam.html\">调整一束粒子的轨迹</a></td></tr><tr><td>电势差加速粒子</td><td>W = q(VA−VB)；只有电场做功时 ΔK = W</td><td><a href=\"chapter.html?unit=potential\">电势、能量和释放</a></td></tr><tr><td>金属表面电荷与接地</td><td>静电平衡、等势体、可移动电荷</td><td><a href=\"chapter.html?unit=conductors\">剖开导体看场</a></td></tr><tr><td>空气间隙出现火花</td><td>电荷积累、电势差、局部强场与介质击穿</td><td><a href=\"charge.html#spark\">充电与放电示意</a></td></tr></tbody></table></div><p class=\"book-limit\">事故动画解释可能的物理机制，不能代替事故调查结论。只有来源确认的事实才作为事件事实；数值与三维装置示意不作为工程安全设计依据。照片授权与来源见各案例。</p>",
    "ref": "7-5-equipotential-surfaces-and-conductors"
  }
];
export const COVERAGE=[
  [
    "(1) E 与 V 的物理意义",
    "电荷与电场；电势与等势面",
    "固定 P 改 q：E 不变、F 改变；同一 V 下比较 U=qV。",
    [
      "foundations",
      "potential"
    ]
  ],
  [
    "(2) 库仑定律与理想模型",
    "电荷与电场",
    "距离加倍看 1/r²；有限线段、圆盘与点、长线、大平面模型比较。",
    [
      "foundations"
    ]
  ],
  [
    "(3) 高斯定理、环路定理",
    "电通量；电场做功",
    "拖源跨过闭合面；沿非等势闭路累计正负功，总和回零。",
    [
      "flux",
      "paths"
    ]
  ],
  [
    "(4) 叠加计算、对称性判别",
    "电场的叠加；用对称性求场强",
    "读取 P 点各分量；球、线、面求 E；偏心后辨认不能提取 E。",
    [
      "field",
      "symmetry"
    ]
  ],
  [
    "(5) 电势叠加、定义式求势",
    "电势；电场做功",
    "比较两源 V 的贡献；由线积分与端点电势差分别计算功。",
    [
      "potential",
      "paths"
    ]
  ],
  [
    "(6) 做功、E 与 V 的微积分关系",
    "电场做功与环路定理",
    "改变路线、转动小位移；比较积分与 −ΔV/Δs。",
    [
      "paths"
    ]
  ],
  [
    "(7) 感应、平衡与导体边界",
    "静电感应与静电平衡",
    "中性球内总场相消；沿表面等势；径向曲线读球内外 E、V。",
    [
      "conductors"
    ]
  ]
];
