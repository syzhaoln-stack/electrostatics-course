/** Questions are introduced by the film, answers remain after the explanation. */
export const VIDEO_QUESTIONS = Object.freeze({
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
