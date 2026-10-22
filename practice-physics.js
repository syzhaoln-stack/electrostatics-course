import {potentialPathExercise} from './potential-path-physics.js';
import {fieldAt,CONSTANTS} from './physics.js';
import {PATH_SOURCES,makeRoute,integrateRoute} from './paths-physics.js';
import {evaluateScientific} from './oil-calculator.js';

export function fieldExercise(state){
 const parts=state.sources.map(s=>fieldAt(state.p,[s]).E),E=fieldAt(state.p,state.sources).E;
 const F=E.map(v=>v*state.sign*CONSTANTS.elementaryCharge),m=Math.hypot(...F);
 // Target is +x,-y in the physical XY plane, independent of camera angle.
 const angle=m?Math.acos(Math.max(-1,Math.min(1,(F[0]-F[1])/(Math.SQRT2*m))))*180/Math.PI:null;
 if(state.quantity==='vertical-force'){const values=parts.map(v=>v[1]*state.sign*CONSTANTS.elementaryCharge*1e15);return {parts,E,F,angle,answer:F[1]*1e15,values,labels:['F₁y','F₂y'],units:['fN','fN']};}
 return {parts,E,F,angle,answer:E[0],values:[parts[0][0],parts[1][0]],labels:['E₁x','E₂x'],units:['N/C','N/C']};
}
export function pathExercise(state){
 if(state.model)return potentialPathExercise(state);
 const curved=integrateRoute(makeRoute(state.A,state.B,state.handle),{q:state.q}),direct=integrateRoute(makeRoute(state.A,state.B),{q:state.q});
 return {answer:curved.endpointWork,values:[state.q,curved.potentialA,curved.potentialB],labels:['q/e','V_A','V_B'],units:['1','V','V'],direct:direct.work,curved:curved.work,error:curved.error,sources:PATH_SOURCES};
}
export function fluxExercise(state){
 return {answer:CONSTANTS.epsilon0*state.flux*1e12,values:[CONSTANTS.epsilon0,state.flux],labels:['ε₀','Φ'],units:['C²/(N·m²)','N·m²/C']};
}
export function calculateSlots(expression,values){
 // Substitute only A–F; scientific notation and all arithmetic go through the existing safe parser.
 const expanded=expression.replace(/(?<![\d.])[A-F](?![a-zA-Z])/g,letter=>{
  const raw=values[letter.charCodeAt(0)-65];
  if(raw==null||String(raw).trim()==='')throw Error(`请先填写 ${letter} 槽。`);
  const n=evaluateScientific(String(raw));return `(${n})`;
 });
 return evaluateScientific(expanded);
}
export function parsePastedNumbers(text,count){
 const numbers=text.trim().split(/[\s,，;；]+/).filter(Boolean);
 if(numbers.length!==count)throw Error(`需要 ${count} 个数，当前有 ${numbers.length} 个；可用空格、逗号或换行分隔。`);
 numbers.forEach(value=>{if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)||!Number.isFinite(Number(value)))throw Error('只粘贴数值，科学记数法写成 1.2e-3；单位见各槽标签。');});
 return numbers;
}
export function checkNumeric(raw,expected,{relative=.01,absolute=1e-8}={}){
 if(!String(raw).trim())return {ok:false,message:'请填写数值答案，再核对。'};
 let value;try{value=evaluateScientific(String(raw));}catch(e){return {ok:false,message:e.message};}
 const ok=Math.abs(value-expected)<=Math.max(absolute,Math.abs(expected)*relative);
 return {ok,value,message:ok?'数值在容差内。请补充原因，交由老师判断理解是否充分。':'数值还不一致。检查正负号、分量和单位，再试一次。'};
}
export function gaussEvidence(records){
 const states=records.map(r=>r.state),inside=states.filter(s=>s.inside),outside=states.filter(s=>s.outside);
 const changedShape=inside.some(a=>inside.some(b=>Math.abs(a.enclosed-b.enclosed)<1e-5&&Math.hypot(...a.radii.map((x,i)=>x-b.radii[i]))>.2));
 return {inside:inside.length>0,outside:outside.length>0,changedShape,complete:inside.length>0&&outside.length>0&&changedShape};
}
