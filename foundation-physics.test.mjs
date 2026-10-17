import test from 'node:test';
import assert from 'node:assert/strict';
import {pointReading,finiteModel,segmentedRod,ELEMENTARY_CHARGE as e,idealSourceField,finiteLineField,finiteDiskField,finiteDiskFieldQuadrature,sourceReading,SOURCE_DEFAULTS,fieldGlyph,EPS0,K} from './foundation-physics.js';
test('Coulomb distance, source and probe are independent controls',()=>{
 const a=pointReading(1e-12,.002,e),b=pointReading(1e-12,.004,e),c=pointReading(2e-12,.002,e),d=pointReading(1e-12,.002,-2*e);
 assert.equal(b.E,a.E/4);assert.equal(c.E,2*a.E);assert.equal(d.E,a.E);assert.equal(d.F,-2*a.F);assert.equal(d.U,-2*a.U);
});

const norm=v=>Math.hypot(...v);
const near=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} != ${expected}`);
test('ideal line vectors are perpendicular to the line and invariant along its length',()=>{
 const a=idealSourceField('line',[0,.002,.001],1e-10),b=idealSourceField('line',[.137,.002,.001],1e-10),twice=idealSourceField('line',[.137,.004,.002],1e-10);
 assert.deepEqual(a,b);assert.equal(a[0],0);near(a[1]*.001,a[2]*.002);near(norm(twice),norm(a)/2);
});
test('ideal plane vectors are normal and uniform on each side',()=>{
 for(const p of [[0,.002,0],[1,.5,-.08],[-.045,.00001,12]]){
  const E=idealSourceField('plane',p,1e-8);assert.equal(E[0],0);assert.equal(E[2],0);near(E[1],1e-8/(2*EPS0));
  near(idealSourceField('plane',p.map((n,i)=>i===1?-n:n),1e-8)[1],-E[1]);
 }
});
test('probe sign and charge affect force but do not change the source field',()=>{
 for(const model of ['point','line','plane']){
  const source={model,strength:SOURCE_DEFAULTS[model]},p=[.001,.002,.0007],a=sourceReading(source,p,e),b=sourceReading(source,p,-2*e);
  assert.deepEqual(a.E,b.E);for(let i=0;i<3;i++)assert.equal(b.F[i],-2*a.F[i]);near(b.Fmag,2*a.Fmag,1e-12);
 }
});
test('finite line analytic field agrees with an independent off-axis Coulomb sum',()=>{
 const p=[.003,.0015,-.0008],L=.004,lambda=1e-10,E=finiteLineField(p,L,lambda),numeric=[0,0,0],N=12000;
 for(let i=0;i<N;i++){const r=[p[0]-((i+.5)/N-.5)*L,p[1],p[2]],c=K*lambda*L/N/norm(r)**3;r.forEach((n,j)=>numeric[j]+=c*n);}
 E.forEach((n,i)=>near(n,numeric[i],2e-8));assert.ok(E[0]>0);assert.ok(E[1]>0);assert.ok(E[2]<0);
 const axis=finiteLineField([.004,0,0],L,lambda);near(axis[0],K*lambda*(1/.002-1/.006));assert.equal(axis[1],0);assert.equal(axis[2],0);
});
test('finite disk off-axis field agrees with independent area integration',()=>{
 for(const p of [[.001,.002,.0008],[.006,.0015,-.001],[.0025,-.0008,.0004]]){
  const E=finiteDiskField(p,.004,1e-8,{angular:192}),area=finiteDiskFieldQuadrature(p,.004,1e-8,{radial:80,angular:320});
  E.forEach((n,i)=>near(n,area[i],1e-5));
 }
});
test('disk field remains accurate near a large disk and has rotational symmetry',()=>{
 const p=[.0015,.0004,.0008],R=.014,E=finiteDiskField(p,R,1e-8,{angular:192}),rotated=finiteDiskField([p[2],p[1],-p[0]],R,1e-8,{angular:192});
 near(rotated[0],E[2]);near(rotated[1],E[1]);near(rotated[2],-E[0]);near(E[0]/p[0],E[2]/p[2]);assert.ok(E[1]>1e-8/(2*EPS0)*.95);
 const coarse=finiteDiskField(p,R,1e-8,{angular:64});E.forEach((n,i)=>near(coarse[i],n,1e-7));
});
test('finite limits preserve their source parameter and approach ideal fields',()=>{
 const p=[0,.002,.0006];
 const line=finiteLineField(p,10,1e-10),lineIdeal=idealSourceField('line',p,1e-10);line.forEach((n,i)=>near(n,lineIdeal[i],1e-6));
 const point=finiteLineField(p,.00001,4e-13/.00001),pointIdeal=idealSourceField('point',p,4e-13);point.forEach((n,i)=>near(n,pointIdeal[i],4e-6));
 const disk=finiteDiskField([.001,.002,.0006],10,1e-8),plane=idealSourceField('plane',[.001,.002,.0006],1e-8);near(disk[1],plane[1],.0003);
});
test('field glyph scale is fixed, monotone and gives no arrow for zero field',()=>{
 assert.equal(fieldGlyph(0).length,0);for(const E of [1,10,100,1000]){assert.ok(fieldGlyph(2*E).length>fieldGlyph(E).length);assert.ok(fieldGlyph(2*E).width>fieldGlyph(E).width);}
});
test('finite geometries approach their respective ideal limits',()=>{
 assert.ok(finiteModel('point',.0001,.01,1e-12).ratio>.9999);
 assert.ok(finiteModel('line',1,.001,1e-9).ratio>.99999);
 assert.ok(finiteModel('plane',1,.001,1e-6).ratio>.9989);
 assert.ok(finiteModel('line',.002,.002,1e-9).ratio<.5);
});
test('discrete Coulomb sums converge to finite rod result',()=>{
 const exact=finiteModel('point',.006,.002,1e-12).finite;
 const coarse=segmentedRod(1e-12,.006,.002,4),fine=segmentedRod(1e-12,.006,.002,256);
 assert.ok(Math.abs(fine[0])<1e-9);assert.ok(Math.abs(fine[1]-exact)<Math.abs(coarse[1]-exact));assert.ok(Math.abs(fine[1]/exact-1)<.00001);
});
