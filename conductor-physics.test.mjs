import test from 'node:test';
import assert from 'node:assert/strict';
import {conductorAt,conductorSigma,conductorProfile,spherePoint,COULOMB_K,EPSILON_0} from './conductor-physics.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} ≈ ${b}`);
test('带电导体内部 E=0 且 V 与位置无关，外部服从库仑场',()=>{
 const o={mode:'charged',R:2,Q:.2};
 for(const p of [[0,0,0],[1,0,.3],[0,-1.9,0]]){assert.deepEqual(conductorAt(p,o).E,[0,0,0]);near(conductorAt(p,o).V,COULOMB_K*.2e-12/.002);}
 const a=conductorAt([4,0,0],o),b=conductorAt([8,0,0],o);near(a.magnitude,4*b.magnitude);near(a.V,2*b.V);
});
test('两种模型跨表面电势连续，法向场跃变为 σ/ε₀',()=>{
 for(const mode of ['charged','induced'])for(const theta of [.1,.7,1.5,2.4]){
  const o={mode,R:1.5,Q:-.08,E0:210,direction:[1,2,3]},p=spherePoint(theta,.8,o),n=p.map(v=>v/o.R),outside=conductorAt(p.map(v=>v*(1+1e-8)),o),inside=conductorAt(p.map(v=>v*(1-1e-8)),o);
  near(outside.V,inside.V,1e-7);near(outside.radial,conductorSigma(n,o)/EPSILON_0,2e-7);near(Math.hypot(...outside.tangent),0,3e-5);
 }
});
test('中性球内部外场与感应场逐点抵消，旋转外场后仍成立',()=>{
 const o={mode:'induced',E0:320,direction:[3,-2,1],R:1.5};
 for(const p of [[0,0,0],[1,.2,.3],[-.4,.8,-.7]]){
  const f=conductorAt(p,o);assert.deepEqual(f.E,[0,0,0]);near(f.V,0);f.external.forEach((v,i)=>near(v+f.induced[i],0));near(Math.hypot(...f.external),320);
 }
});
test('感应场外部与外场相加，电势梯度给出同一总场',()=>{
 const o={mode:'induced',R:1.5,E0:170,direction:[1,2,-1]},p=[2.7,-1.8,1.3],f=conductorAt(p,o),h=1e-4;
 f.E.forEach((v,i)=>{near(v,f.external[i]+f.induced[i]);const a=p.slice(),b=p.slice();a[i]+=h;b[i]-=h;near(v,-(conductorAt(a,o).V-conductorAt(b,o).V)/(2*h*1e-3),1e-6);});
});
test('中性导体球表面任意位置 V=0，电场没有切向分量',()=>{
 const o={mode:'induced',E0:180,direction:[-.6,.8,0]};
 for(let i=0;i<100;i++){const p=spherePoint(Math.acos(1-2*(i+.5)/100),i*2.39996,o),f=conductorAt(p,o);near(f.V,0,1e-10);near(Math.hypot(...f.tangent),0,1e-9);}
});
test('数值积分表面电荷：中性孤立球为 0，带电球为给定 Q',()=>{
 const N=10000,R=1.5,dA=4*Math.PI*(R*1e-3)**2/N;
 for(const mode of ['charged','induced']){
  const o={mode,R,Q:.16,E0:220,direction:[1,2,-3]};let total=0;
  // Antipodal quadrature ensures exact cancellation of the odd induced density.
  for(let i=0;i<N/2;i++){const z=(i+.5)/(N/2),a=i*2.39996323,n=[Math.sqrt(1-z*z)*Math.cos(a),Math.sqrt(1-z*z)*Math.sin(a),z];total+=(conductorSigma(n,o)+conductorSigma(n.map(v=>-v),o))*dA;}
  assert.ok(Math.abs(total-(mode==='charged'?.16e-12:0))<1e-24);
 }
});
test('孤立球电势趋零，均匀外场模型不能以无限远为统一零势',()=>{
 const charged=conductorAt([0,1e7,0],{mode:'charged'}),induced=conductorAt([0,1e7,0],{mode:'induced',E0:180});
 assert.ok(Math.abs(charged.V)<1e-6);assert.ok(induced.V< -1e6);near(conductorAt([1e7,0,0],{mode:'induced'}).V,0);
});
test('径向曲线准确包含表面跃变两侧并保持导体内平台',()=>{
 const values=conductorProfile([0,1,0],{mode:'charged',R:1.5,Q:.12}),inside=values.filter(v=>v.inside);
 assert.ok(values.some(v=>v.r===1.5));assert.ok(inside.every(v=>v.magnitude===0));inside.forEach(v=>near(v.V,inside[0].V));
});
