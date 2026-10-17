const norm=v=>Array.isArray(v)?Math.hypot(...v):Math.abs(Number(v));
const dist=(a,b)=>Array.isArray(a)&&Array.isArray(b)?norm(a.map((v,i)=>v-b[i])):Infinity;
const close=(a,b,relative=.04,absolute=1e-9)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=Math.max(absolute,relative*Math.max(Math.abs(a),Math.abs(b)));
export const numberText=(v,d=2)=>!Number.isFinite(Number(v))?'—':Math.abs(v)>1e5||Math.abs(v)>0&&Math.abs(v)<.001?Number(v).toExponential(2):Number(v).toFixed(d);
const f=numberText;
/** Evaluation uses independent measured states; no task passes merely because its mode is selected. */
export function evaluateObservation(unit,task,s,m={}){
 const result=(pass,evidence)=>({pass:Boolean(pass),evidence});
 if(unit==='foundations'){
  const kind=s.kind||s.sourceKind||s.model||s.source?.kind||s.source, E=norm(s.E??s.field),F=norm(s.F??s.force),q=Number(s.q??s.charge),P=s.probe||s.P,r=Number(s.distance??s.r),strength=Number(s.strength??s.sourceStrength??s.source?.strength),error=Number(s.relativeError??s.error);
  if(task==='charge'){if(!m.b&&E>0)m.b={E,F,q,P,kind,strength};const b=m.b,dot=Array.isArray(s.E)&&Array.isArray(s.F)?s.E.reduce((sum,v,i)=>sum+v*s.F[i],0)/(E*F):Math.sign(q);return result(b&&q!==b.q&&q!==0&&Math.sign(dot)===Math.sign(q)&&dist(P,b.P)<1e-6&&close(E,b.E,.001)&&close(F/b.F,Math.abs(q/b.q),.002),`E = ${f(E)} V/m · |F| = ${f(F*1e15,4)} fN${b?` · E/E初 = ${f(E/b.E,3)}`:''} · F${q<0?'反向':'同向'}`);}
  const target=task==='point-distance'?'point':task==='line-distance'?'line':'plane',correct=String(kind).includes(target)||target==='point'&&kind==='sphere';
  if(task==='finite'){if(s.finite&&m.b===undefined&&Number.isFinite(error))m.b=error;return result(s.finite&&Number.isFinite(error)&&error<.05&&error<m.b-.0001,`有限模型误差 ${Number.isFinite(error)?f(error*100,2)+'%':'—'} · 目标 < 5%`);}
  if(!correct){delete m.b;return result(false,`请先选择${target==='point'?'点电荷':target==='line'?'无限长线':'无限大平面'}。`);}
  if(!m.b&&r>0&&E>0)m.b={r,E,strength,P};const b=m.b;if(!b)return result(false,'拖动 P，读取它到源的距离。');
  if(Number.isFinite(strength)&&Number.isFinite(b.strength)&&!close(strength,b.strength,.0001)){m.b={r,E,strength,P};return result(false,'源强度已改变，以当前位置重新比较距离。');}
  const expected=target==='point'?.25:target==='line'?.5:1,ratio=r/b.r;return result(target==='plane'?ratio>1.4&&close(E,b.E,.005):Math.abs(ratio-2)<.1&&close(E/b.E,expected,.12),`r/r初 = ${f(ratio,2)} · E/E初 = ${f(E/b.E,3)} · 目标 ${target==='plane'?'移动后仍为 1':expected}`);
 }
 if(unit==='field'){
  const E=norm(s.E),a=norm(s.E1),b=norm(s.E2),sum=a+b;
  if(task==='cancel')return result(s.preset==='same'&&sum>10&&E/sum<.015,`|E₁| = ${f(a)} · |E₂| = ${f(b)} · |E| = ${f(E)} V/m`);
  if(task==='reinforce')return result(s.preset==='dipole'&&sum>10&&close(a,b,.025)&&close(E,sum,.015),`|E| = ${f(E)} V/m · |E₁| + |E₂| = ${f(sum)} V/m`);
  if(!m.b&&E>1)m.b={E:s.E,F:s.F,P:s.P,q:s.q};const x=m.b;return result(x&&s.q!==x.q&&dist(s.P,x.P)<1e-6&&dist(s.E,x.E)<1e-6&&s.F.reduce((v,a,i)=>v+a*x.F[i],0)<0,`|E| = ${f(E)} V/m · q = ${s.q>0?'+e':'−e'} · F ${s.q<0?'与 E 反向':'与 E 同向'}`);
 }
 if(unit==='flux'){
  const Q=Number(s.enclosedCharge??s.Qin??s.enclosed),total=Number(s.sourceCharge??s.Q??s.charge),phi=Number(s.flux??s.integral),eps=8.8541878128e-12,shape=JSON.stringify(s.axes??s.radii??s.surface??s.radius),inside=s.inside??s.fullyInside,ratio=total?Q/total:NaN,measured=Number(s.measuredCharge??phi*eps);
  if(task==='outside'){const p=s.sourcePosition;if(!m.P&&p)m.P=[...p];return result(p&&dist(p,m.P)>.08&&close(ratio,0,0,.005)&&Math.abs(measured/total)<.025,`Q内/Q源 = ${f(ratio,3)} · ε₀Φ/Q源 = ${f(measured/total,3)} · 一进一出相抵`);}
  if(task==='inside')return result(close(ratio,1,.005)&&close(measured,Q,.035,1e-18),`Q内/Q源 = ${f(ratio,3)} · ε₀Φ/Q源 = ${f(measured/total,3)}`);
  if(!m.b&&ratio>.99)m.b={Q,measured,shape};return result(m.b&&shape!==m.b.shape&&ratio>.99&&close(Q,m.b.Q,.001,1e-18)&&close(measured,m.b.measured,.04,1e-18),`包围面改变 · Q内/Q源 = ${f(ratio,3)} · ε₀Φ/Q源 = ${f(measured/total,3)}`);
 }
 if(unit==='symmetry'){
  const mode=s.mode??s.model,spread=Number(s.spread??s.fieldSpread??s.variation),offset=Math.abs(Number(s.offset??s.sourceOffset)),ratio=Number(s.fluxRatio??s.chargeRatio),size=JSON.stringify(s.radius??s.axes??s.dimensions);
  if(task==='center'){if(offset<.02&&!m.center)m.center={r:s.radius,E:s.E};return result((mode==='sphere'||mode==='point')&&m.center&&Math.abs(s.radius-m.center.r)>.1&&offset<.02&&spread<.02&&close(s.E*s.radius**2,m.center.E*m.center.r**2,.015),`偏心 ${f(offset)} mm · 场强相对差 ${f(spread*100,2)}% · E r² = ${f(s.E*s.radius**2)} V·mm²/m`);}
  if(task==='offset')return result((mode==='sphere'||mode==='point')&&offset>.35&&spread>.1&&close(ratio,1,.04),`偏心 ${f(offset)} mm · 场强相对差 ${f(spread*100,1)}% · ε₀Φ/Q = ${f(ratio,3)}`);
  if(!m.models)m.models={};if(mode==='line'||mode==='plane'){if(!m.models[mode])m.models[mode]={size,E:s.E,r:s.radius};else if(m.models[mode].size!==size&&close(s.E/m.models[mode].E,mode==='line'?m.models[mode].r/s.radius:1,.02))m[mode]=true;}return result(m.line&&m.plane,`长线${m.line?' ✓':'：拖高斯面，核对 E r 不变'} · 平面${m.plane?' ✓':'：拖测量高度，核对 E 不变'}`);
 }
 if(unit==='potential'){
  if(task==='surface')return result(s.mode!==0&&s.progress>.85&&Math.abs(s.W)<.002&&s.E>1,`沿面 ${f(s.progress*100,0)}% · |E| = ${f(s.E)} V/m · W = ${f(s.W,4)} eV`);
  if(task==='potential-charge'){if(!m.b&&s.mode!==0)m.b={q:s.q,V:s.V};return result(m.b&&s.mode!==0&&s.q!==m.b.q&&Math.abs(s.V)>.01&&close(s.V,m.b.V,0,.002)&&close(s.U,s.q*s.V,.002,.002),`V = ${f(s.V,3)} V · q = ${s.q<0?'−e':'+e'} · U = ${f(s.U,3)} eV`);}
  if(task==='zero')return result(s.mode===3&&Math.abs(s.level)<1e-8&&s.progress>.3&&Math.abs(s.V)<.003&&s.E>1,`V = ${f(s.V,4)} V · |E| = ${f(s.E)} V/m · W = ${f(s.W,4)} eV`);
  if(task==='reference'){if(!m.b&&Number.isFinite(s.farV))m.b={V:s.farV,r:s.farDistance};return result(m.b&&s.farDistance>m.b.r*2&&Math.abs(s.farV)<Math.abs(m.b.V)*.12,`r = ${f(s.farDistance,1)} mm · V = ${f(s.farV,5)} V · 随距离增大趋近 0`);}
  return result(s.mode===0&&s.progress>.35&&Math.abs(s.W)>.03&&close(s.W,s.K,.02,.004)&&close(s.W,-s.deltaU,.02,.004),`W = ${f(s.W,3)} eV · −ΔU = ${f(-s.deltaU,3)} eV · ΔK = ${f(s.K,3)} eV`);
 }
 if(unit==='paths'){
  if(task==='routes')return result(s.mode==='routes'&&s.progress>.999&&close(s.W1,s.W2,0,.01)&&close(s.W2,s.endpoint,0,.01),`直达 ${f(s.W1,4)} · 绕行 ${f(s.W2,4)} · q(VA−VB) ${f(s.endpoint,4)} eV`);
  if(task==='loop')return result(s.mode==='loop'&&s.progress>.999&&Math.abs(s.W2)<.01,`闭路进度 ${f(s.progress*100,0)}% · 累计功 ${f(s.W2,5)} eV`);
  return result(s.mode==='local'&&s.step<=.08&&Math.abs(s.parallel)>10&&close(s.slope,s.parallel,.08),`−ΔV/Δs = ${f(s.slope)} V/m · E·û = ${f(s.parallel)} V/m · Δs = ${f(s.step,2)} mm`);
 }
 if(unit==='conductors'){
  const E=norm(s.E),external=norm(s.external),induced=norm(s.induced);
  if(task==='inside'){if(!m.P&&s.P)m.P=[...s.P];return result(s.mode==='induced'&&s.inside&&s.P&&dist(s.P,m.P)>.1&&external>1&&E<.01,`|E外| = ${f(external)} · |E感应| = ${f(induced)} · |E总| = ${f(E)} V/m`);}
  if(task==='surface'){if(s.surface&&!m.b)m.b={P:s.P,V:s.V};return result(s.surface&&m.b&&dist(s.P,m.b.P)>.3&&close(s.V,m.b.V,0,.002)&&Math.abs(s.tangent)<.01,`V = ${f(s.V,4)} V · 切向 E = ${f(s.tangent,4)} V/m`);}
  if(s.mode==='charged'&&Math.abs(s.Q)>0){const k=8.9875517923e9,r=norm(s.P)*1e-3,R=s.radius*1e-3;if(s.inside)m.inside=E<.01&&close(s.V,k*s.Q/R,.003);else if(E>0)m.outside=close(E,Math.abs(k*s.Q)/r**2,.003)&&close(s.V,k*s.Q/r,.003);}return result(m.inside&&m.outside,`已核对${m.outside?'球外 E=kQ/r²、V=kQ/r ✓':'球外 ○'} · ${m.inside?'球内 E=0、V=kQ/R ✓':'球内 ○'} · 当前 V = ${f(s.V,3)} V`);
 }
 if(task==='case')return result(s.case&&s.analysis&&s.stage>=1,`案例 ${s.case||'尚未打开'} · 过程第 ${Number.isFinite(s.stage)?s.stage+1:1} 步 · 5W2H ${s.analysis?'已展开':'待展开'}`);
 if(!m.b&&s.case)m.b=s.condition;return result(s.case&&m.b!==undefined&&m.b!==s.condition,`案例 ${s.case||'—'} · ${m.b!==s.condition?'防护条件已改变':'改变一个防护条件，重看过程'}`);
}
