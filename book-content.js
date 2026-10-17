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
    "before": "<p>带电物体改变周围空间。黄点 P 测量这个位置的电场；把试探电荷放在这里，才能得到它的受力。先保持位置不动，再换试探电荷。</p><div class=\"book-equation\"><strong>𝐄 = 𝐅 / q　　𝐅 = q𝐄</strong><span>E：N/C，等价于 V/m；q：C；F：N。青色表示 E，金色表示 F；二者单位不同。</span></div>",
    "action": "直接拖黄点测不同位置；抓住源旁的电量环改变强度。有限模型比较可展开。",
    "after": "<h2>先看位置，再看电荷</h2><p>电场方向约定为正试探电荷的受力方向。+2e 的力是 +e 的两倍；电子带 −e，力与 E 反向。质量不改变 F = qE，却会通过 <b>a = qE/m</b> 改变加速度。普通物体的净电荷为元电荷 e 的整数倍；e = 1.602176634 × 10⁻¹⁹ C。充电与接地转移电荷，孤立系统的总电荷守恒。</p><h2>距离为什么重要？</h2><div class=\"book-equation\"><strong>E = kQ r̂/r²</strong><span>源为静止点电荷，r̂ 从源指向 P，k = 1/(4πε₀)。这同时给出大小和方向。</span></div><p>点源距离加倍，E 变成 1/4；无限长线按到线的垂直距离衰减，距离加倍 E 变成 1/2；无限大均匀薄平面同侧的 E 不随距离改变。线的场处处垂直于线，面的场处处垂直于面，图中的延伸标记表示源在窗口外仍然继续。</p><h2>现实物体什么时候能用理想模型？</h2><p>主图默认使用严格的理想模型。打开有限尺寸比较，直接拉长线段或拉大圆盘，读取与无限模型的误差。点电荷近似要求物体尺寸相对观察距离小；长线与大平面近似还要求观察位置远离边缘。是否足够大或足够远，要由允许误差判断。</p><details class=\"book-method\"><summary>连续电荷怎样算？</summary><p>对有限线段与圆盘，把每个小电荷的贡献按方向相加：<b>E = ∫ k r̂ dq/r²</b>。程序完成积分，主图保留“尺寸、位置 → 场强与误差”的直接关系。</p></details><p class=\"book-limit\">模型：真空、固定源、试探电荷不扰动源。箭长与粗细使用固定的单调压缩尺度，强弱以读数为准；电场箭头不是流动粒子，粒子造型不表示真实电子尺寸。</p>",
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
