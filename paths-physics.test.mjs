import test from 'node:test';
import assert from 'node:assert/strict';
import {PATH_DEFAULTS,PATH_SOURCES,makeRoute,integrateRoute,smallDisplacement,routePoint} from './paths-physics.js';
const {A,B,handle}=PATH_DEFAULTS;
test('separate line integration agrees for straight and freely bent paths',()=>{
 const straight=integrateRoute(makeRoute(A,B));
 for(const p of [handle,[-1,2,1],[1,3,-.8],[-.6,-3.1,1.4]]){
  const detour=integrateRoute(makeRoute(A,B,p));
  assert.ok(Math.abs(detour.work-straight.work)<2e-7);
  assert.ok(Math.abs(detour.error)<2e-7);
 }
});
test('charge sign and magnitude change work and energy, not potential',()=>{
 const route=makeRoute(A,B,handle),positive=integrateRoute(route),negative=integrateRoute(route,{q:-1}),double=integrateRoute(route,{q:2});
 assert.equal(negative.potentialA,positive.potentialA);assert.equal(double.potentialB,positive.potentialB);
 assert.equal(negative.energyA,-positive.energyA);assert.equal(double.energyA,2*positive.energyA);
 assert.ok(Math.abs(negative.work+positive.work)<1e-12);assert.ok(Math.abs(double.work-2*positive.work)<1e-12);
 assert.equal(double.samples[0].forceN,2*positive.samples[0].forceN);
});
test('non-equipotential closed loop has positive and negative contributions and zero total',()=>{
 const r=integrateRoute(makeRoute(A,B,handle,{closed:true}));
 assert.ok(Math.abs(r.work)<1e-7);assert.equal(r.endpointWork,0);
 assert.ok(r.samples.some(s=>s.dW>1e-4));assert.ok(r.samples.some(s=>s.dW< -1e-4));
 assert.ok(Math.max(...r.samples.map(s=>s.V))-Math.min(...r.samples.map(s=>s.V))>.5);
});
test('refining quadrature converges independently toward potential difference',()=>{
 const route=makeRoute([-3.2,-2.5,0],[3.6,2.4,0],[-.4,-3.6,0]);
 const coarse=integrateRoute(route,{intervals:8}),fine=integrateRoute(route,{intervals:400});
 assert.ok(Math.abs(fine.error)<Math.abs(coarse.error)/100);assert.ok(Math.abs(fine.error)<1e-6);
});
test('piecewise route retains exact endpoints and closes exactly',()=>{
 const r=makeRoute(A,B,handle,{closed:true});assert.deepEqual(routePoint(r,0),A);assert.deepEqual(routePoint(r,.5),B);assert.deepEqual(routePoint(r,1),A);
});
test('directional finite difference approaches minus gradient of V',()=>{
 const p=[-.8,1.3,0],coarse=smallDisplacement(p,.8,.5),fine=smallDisplacement(p,.8,.005);
 assert.ok(Math.abs(fine.error)<Math.abs(coarse.error)/50);
 assert.ok(Math.abs(fine.error)/Math.abs(fine.parallel)<.01);
});
test('locally tangent direction has zero first-order work but finite straight step may change V',()=>{
 const p=[-.4,.8,0],field=smallDisplacement(p),a=Math.atan2(field.E[1],field.E[0])+Math.PI/2;
 const large=smallDisplacement(p,a,.5),small=smallDisplacement(p,a,.005);
 assert.ok(Math.abs(small.parallel)<1e-9);assert.ok(Math.abs(small.slope)<Math.abs(large.slope)/50);assert.ok(Math.abs(large.deltaV)>1e-5);
});
test('finite sphere source keeps integrals finite even through its centre',()=>{
 const centre=PATH_SOURCES[0].pos,route=makeRoute([centre[0]-.6,centre[1],0],[centre[0]+.6,centre[1],0]),r=integrateRoute(route,{intervals:1200});
 assert.ok(Number.isFinite(r.work));assert.ok(Math.abs(r.error)<1e-5);
});
