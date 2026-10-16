import test from 'node:test';
import assert from 'node:assert/strict';
import {SYMMETRY_K,SYMMETRY_EPSILON0,symmetryOptions,symmetryField,symmetryReadings,integrateSymmetrySurface} from './symmetry-physics.js';
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t*Math.max(Math.abs(b),1e-12),`${a} ≠ ${b}`);
test('physical units and geometry yield the three Gauss formulas',()=>{
  const sphere=symmetryReadings({mode:'sphere',radius:2});near(sphere.magnitude,SYMMETRY_K*.1e-12/.002**2);near(sphere.effectiveArea,4*Math.PI*.002**2);
  const line=symmetryReadings({mode:'line',radius:2,length:4});near(line.enclosed,.01e-9*.004);near(line.effectiveArea,2*Math.PI*.002*.004);near(line.derivedE,line.magnitude);
  const plane=symmetryReadings({mode:'plane',radius:2,halfWidth:2.4});near(plane.faceArea,.0048**2);near(plane.enclosed,.002e-6*.0048**2);near(plane.magnitude,.002e-6/(2*SYMMETRY_EPSILON0));
});
test('doubling observation distance gives 1/4, 1/2, and unchanged E',()=>{
  for(const [mode,ratio] of [['sphere',.25],['line',.5],['plane',1]])near(symmetryReadings({mode,radius:3}).magnitude/symmetryReadings({mode,radius:1.5}).magnitude,ratio);
});
test('source doubling and reversing have their actual linear effect',()=>{
  for(const mode of ['sphere','line','plane']){
    const a=symmetryReadings({mode}),b=symmetryReadings({mode,strength:2}),c=symmetryReadings({mode,sign:-1});
    near(b.magnitude,2*a.magnitude);near(b.enclosed,2*a.enclosed);a.E.forEach((e,i)=>near(c.E[i],-e));near(c.expectedFlux,-a.expectedFlux);
  }
});
test('independent closed surface integral agrees with enclosed charge for every source',()=>{
  for(const mode of ['sphere','line','plane'])for(const radius of [.6,1.4,3.5])for(const sign of [-1,1]){
    const o={mode,radius,sign};near(integrateSymmetrySurface(o).total,symmetryReadings(o).expectedFlux,1e-10);
  }
});
test('off-centre sphere retains flux but loses a common surface E',()=>{
  for(const offset of [.6,1.3]){const o={radius:2,offset},r=symmetryReadings(o);near(integrateSymmetrySurface(o).total,r.expectedFlux,2e-10);assert.equal(r.symmetric,false);assert.equal(r.derivedE,null);assert.ok(r.range[1]>r.range[0]*3);}
});
test('external point source yields zero closed flux but nonzero surface E',()=>{
  const o={radius:2,offset:3.5};assert.ok(Math.abs(integrateSymmetrySurface(o).total)<1e-10);assert.equal(symmetryReadings(o).enclosed,0);assert.ok(symmetryReadings(o).magnitude>0);
});
test('cylinder end caps and pillbox sides have zero contribution despite nonzero field',()=>{
  const line=integrateSymmetrySurface({mode:'line'}),plane=integrateSymmetrySurface({mode:'plane'});
  assert.equal(line.parts.capTop,0);assert.equal(line.parts.capBottom,0);assert.ok(Math.hypot(...symmetryField([1,2,0],{mode:'line'}))>0);
  assert.equal(plane.parts.sides,0);near(plane.parts.top,plane.parts.bottom);assert.ok(Math.hypot(...symmetryField([2,1,1],{mode:'plane'}))>0);
});
test('length or area changes enclosed charge and area together, keeping E unchanged',()=>{
  near(symmetryReadings({mode:'line',length:8}).magnitude,symmetryReadings({mode:'line',length:4}).magnitude);
  near(symmetryReadings({mode:'line',length:8}).enclosed,2*symmetryReadings({mode:'line',length:4}).enclosed);
  near(symmetryReadings({mode:'plane',halfWidth:4}).enclosed,4*symmetryReadings({mode:'plane',halfWidth:2}).enclosed);
});
test('singular points are not reported as zero electric field',()=>{
  assert.ok(symmetryField([0,0,0]).every(Number.isNaN));assert.ok(Number.isNaN(symmetryField([1,0,1],{mode:'plane'})[1]));assert.throws(()=>symmetryOptions({radius:0}));
});
test('odd quadrature order handles a sheet intersection without inventing a normal field',()=>{
  const o={mode:'plane'};near(integrateSymmetrySurface(o,{polar:25,azimuth:51}).total,symmetryReadings(o).expectedFlux,1e-10);
});
