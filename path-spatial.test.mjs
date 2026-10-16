import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldAt} from './physics.js';
import {PATH_SOURCES,makeRoute,integrateRoute} from './paths-physics.js';
import {direction3D,spatialDisplacement} from './path-spatial.js';
const near=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≠ ${b}`);
test('spatial small displacement evaluates the actual 3D source field and endpoint potential',()=>{
 const P=[-.4,1.1,1.3],azimuth=.7,elevation=.6,step=.3,q=-2,d=direction3D(azimuth,elevation),r=spatialDisplacement(P,azimuth,step,{q,elevation}),f=fieldAt(P,PATH_SOURCES),end=P.map((v,i)=>v+step*d[i]);
 r.end.forEach((v,i)=>near(v,end[i]));r.E.forEach((v,i)=>near(v,f.E[i]));near(r.V,f.V);near(r.endV,fieldAt(end,PATH_SOURCES).V);near(r.parallel,f.E.reduce((s,e,i)=>s+e*d[i],0));near(r.work,-q*r.deltaV);assert.ok(Math.abs(r.end[2]-P[2])>.1);
});
test('the 3D finite difference converges to E dot displacement direction',()=>{
 const P=[.2,1.4,.9],a=spatialDisplacement(P,-.4,.03,{elevation:.8}),b=spatialDisplacement(P,-.4,.003,{elevation:.8});assert.ok(Math.abs(b.error)<Math.abs(a.error)/8);
});
test('a spatial step perpendicular to E has zero first-order work but a finite-step correction',()=>{
 const P=[-.8,1.4,1.2],E=fieldAt(P,PATH_SOURCES).E,azimuth=Math.atan2(E[1],E[0])+Math.PI/2,a=spatialDisplacement(P,azimuth,.3),b=spatialDisplacement(P,azimuth,.003);near(a.parallel,0,1e-9);assert.ok(Math.abs(b.deltaV)<Math.abs(a.deltaV)/1000);
});
test('two genuinely spatial paths independently integrate to the same endpoint work',()=>{
 const A=[-3.1,1.6,-.7],B=[3.5,1.2,.9],handle=[.1,3.2,1.9],a=integrateRoute(makeRoute(A,B),{q:-2}),b=integrateRoute(makeRoute(A,B,handle),{q:-2});
 near(a.work,a.endpointWork,1e-8);near(b.work,b.endpointWork,1e-8);near(a.work,b.work,1e-8);assert.ok(b.samples.some(s=>Math.abs(s.p[2]-A[2])>1));
});
