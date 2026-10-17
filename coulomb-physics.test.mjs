import test from 'node:test';import assert from 'node:assert/strict';
import {RECORDS,R,DEG,KAPPA,distance,lever,reading,equilibrium,residual,historicalPoints,fittedPower,electricalForce} from './coulomb-physics.js';
test('historical measurements stay distinct from the assumed-law simulation',()=>{
 assert.deepEqual(RECORDS.map(r=>[r.beta,r.alpha]),[[0,36],[126,18],[567,8.5]]);
 assert.equal(RECORDS[2].beta+RECORDS[2].alpha,575.5);assert.equal(RECORDS[2].reportedTwist,576);
 assert.ok(Math.abs(equilibrium(0).alpha-36)<1e-10);assert.ok(Math.abs(equilibrium(567).alpha-8.5)>.01);
});
test('force and torque use the chord and perpendicular moment arm',()=>{
 for(const alpha of [8.5,18,36,70]){
  const p=[R*Math.cos(alpha*DEG),R*Math.sin(alpha*DEG)],d=Math.hypot(p[0]-R,p[1]);
  assert.ok(Math.abs(d-distance(alpha))<1e-14);
  const ux=(p[0]-R)/d,uy=p[1]/d;
  assert.ok(Math.abs(p[0]*uy-p[1]*ux-lever(alpha))<1e-14);
  const v=reading(126,alpha);assert.ok(Math.abs(v.force*lever(alpha)-KAPPA*(126+alpha)*DEG)<1e-20);
 }
});
test('equilibrium balances torques, tighter top rotation reduces ball separation',()=>{
 for(const power of [1,2,3]){let previous=180;for(const beta of [0,126,300,567,720]){const v=equilibrium(beta,{power});assert.ok(v.alpha<=previous);previous=v.alpha;if(v.contact)assert.ok(residual(v.alpha,beta,{power})<=0);else assert.ok(Math.abs(residual(v.alpha,beta,{power}))<1e-18);}}
});
test('both charges leaking reduces force quadratically; doubled wire diameter multiplies stiffness by 16',()=>{
 assert.ok(Math.abs(electricalForce(18,{chargeFraction:.9})/electricalForce(18)-.81)<1e-12);
 assert.equal(reading(0,36,{wire:2}).kappa/KAPPA,16);
 assert.ok(equilibrium(126,{chargeFraction:.9}).alpha<equilibrium(126).alpha);
 assert.ok(equilibrium(126,{wire:2}).alpha<equilibrium(126).alpha);
});
test('three reported trials are approximate evidence, not forced exact inverse-square data',()=>{
 const p=historicalPoints();assert.equal(p[1].x,.5);assert.equal(p[1].y,4);
 assert.ok(fittedPower(p)>1.85&&fittedPower(p)<2);assert.ok(fittedPower(historicalPoints(true))<2);
 assert.throws(()=>equilibrium(-1));assert.throws(()=>equilibrium(1,{power:0}));
});
