/** Questions are introduced by the film, answers remain after the explanation. */
export const VIDEO_QUESTIONS = Object.freeze({
  potential: [
    {question:'受力，就一定做功吗？',answer:'不是。dW = F·dr，只取沿位移方向的力；垂直时，这一步的功为零。',turn:0,answerTurn:1,action:'surface'},
    {question:'沿面走和松手，有什么不同？',answer:'沿等势面受约束移动：F ≠ 0，W = 0。自由释放后，正电荷沿力加速，不会自动沿面走。',turn:2,answerTurn:3,action:'release'},
    {question:'电势和电势能，是同一个量吗？',answer:'V = U/q。V 属于场中位置，U = qV 还取决于放入的电荷。1 V = 1 J/C。',turn:4,answerTurn:5,action:'charge'},
    {question:'零伏，就是没有力？',answer:'不是。等量异号源的中垂面 V = 0，但 E、F 可以不为零；做功取决于电势差。',turn:6,answerTurn:7,action:'zero'},
  ],
  paths: [
    {question:'绕远路会多做功吗？',answer:'先保持相同 q、起点和终点，分别累加两条路径的小段功。',turn:0,answerTurn:1,action:'routes'},
    {question:'为什么最终总功相同？',answer:'静电场中 W = q(VA − VB)，只看端点。中途正功、负功可以不同。',turn:2,answerTurn:3,action:'routes'},
    {question:'回到起点，能再赚一次能量？',answer:'不能。静电场闭路总功为零；各段的功不必为零。指定路径需要外部约束。',turn:4,answerTurn:5,action:'loop'},
    {question:'垂直走一小步，就一直不做功？',answer:'起点的切向直线只保证一阶功为零。要沿弯曲等势面走，方向须持续转动，始终垂直当地 F。',turn:6,answerTurn:7,action:'local'},
  ],
  conductors: [
    {question:'外场被挡没了，还是相消了？',answer:'在静电平衡的金属内部：外场与感应场相消，合场 E = 0。',turn:0,answerTurn:1,action:'inside'},
    {question:'表面外侧也没有电场？',answer:'切向场为零，法向场可以非零；否则自由电荷还会沿表面移动。',turn:2,answerTurn:3,action:'surface'},
    {question:'内部 E = 0，就一定 V = 0？',answer:'不一定。导体等势，但电势值取决于参考。孤立带电球内 V = kQ/R，取 V(∞)=0。',turn:4,answerTurn:5,action:'charged'},
    {question:'感应产生了新的净电荷吗？',answer:'孤立中性球只重新分布电荷，净电荷仍为零。转动外场后比较新的平衡。',turn:6,answerTurn:7,action:'direction'},
  ],
  foundations: [
    {question:'Q、q、F 分别是什么？', answer:'Q 是源的电荷量，q 是试探电荷量；F 是试探电荷受到的力，有大小和方向。', turn:0, answerTurn:3, action:'charge'},
    {question:'换方向、拉远，会怎样？', answer:'固定 Q、q：同距离，力等大、沿连线；距离加倍，力减到 1/4。', turn:4, answerTurn:6, action:'distance'},
    {question:'只换试探电荷 q 呢？', answer:'固定源和位置：q 加倍，F 加倍；q 反号，F 反向。', turn:7, answerTurn:7, action:'charge'},
    {question:'场 E 和力 F 怎么区分？', answer:'E 描述这个位置的场，单位 N/C；F = qE 是放入 q 后的受力，单位 N。试探电荷须足够小，不扰动源。', turn:8, answerTurn:11, action:'charge'},
  ],
  field: [
    {question:'两个贡献，在哪里相加？', answer:'在同一个观察点 P：先算各源的 E₁、E₂，再相加。', turn:0, answerTurn:1, action:'dipole'},
    {question:'能直接把大小相加吗？', answer:'通常不能。保留方向，逐个分量相加：Ex = E₁x + E₂x；y、z 同理。', turn:2, answerTurn:5, action:'dipole'},
    {question:'什么时候抵消，什么时候增强？', answer:'等大反向可抵消；同向才把大小直接相加。比较同号、异号等量源的中点。', turn:6, answerTurn:7, action:'same'},
    {question:'换成电子，场也反向吗？', answer:'源和 P 固定，E 不变；电子 q < 0，所以 F = qE 与 E 反向。', turn:8, answerTurn:9, action:'dipole'},
  ],
  flux: [
    {question:'有电场，净通量为什么还能为零？', answer:'每小块面的法向场分量 × 面积，再带正负相加。外部源的贡献相抵，不代表处处没场。', turn:0, answerTurn:3, action:'flux'},
    {question:'电荷进入包围面，变了什么？', answer:'正源在内有净穿出，通量为正；负源在内有净穿入，通量为负。', turn:4, answerTurn:5, action:'flux'},
    {question:'面变大，为什么结果不变？', answer:'球心点源：r ×2，E ÷4，面积 ×4。一般封闭面也只取决于包住的净电荷。', turn:6, answerTurn:7, action:'flux'},
    {question:'净通量为零，里面就没有电荷？', answer:'不能这样推断。正负相抵，净电荷也可为零；“合计为零”不等于“每项为零”。', turn:8, answerTurn:9, action:'flux'},
  ],
});

export function questionProgress(questions, timeline, currentTime, furthestTime = currentTime) {
  return questions.map(q => ({
    visible: !!timeline[q.turn] && furthestTime >= timeline[q.turn].start,
    answered: !!timeline[q.answerTurn] && furthestTime >= timeline[q.answerTurn].end,
    current: !!timeline[q.turn] && currentTime >= timeline[q.turn].start,
  }));
}
