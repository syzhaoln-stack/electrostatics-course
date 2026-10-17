import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateObservation as judge} from './lesson-observations.js';
import {spatialDisplacement} from './path-spatial.js';import {fieldAt} from './physics.js';
import {PATH_SOURCES,PATH_DEFAULTS,makeRoute,integrateRoute} from './paths-physics.js';import {conductorAt} from './conductor-physics.js';
test('rotation challenge requires nonzero field, a changed direction and a short transverse step',()=>{
 const P=[-.45,1.15,.65],E=fieldAt(P,PATH_SOURCES).E,a=Math.atan2(E[1],E[0]),m={};
 const state=(angle,step)=>{const s=spatialDisplacement(P,angle,step);return{mode:'local',parallel:s.parallel,localE:s.E,localDirection:s.direction,step};};
 assert.equal(judge('paths','zero-step',state(a,.3),m).pass,false);assert.equal(judge('paths','zero-step',state(a+Math.PI/2,.3),m).pass,false);assert.equal(judge('paths','zero-step',state(a+Math.PI/2,.04),m).pass,true);
});
test('endpoint drag work goal can be reached by a real route and cannot pass before arrival',()=>{
 const result=integrateRoute(makeRoute(PATH_DEFAULTS.A,[1.3,3.7,0],[0,3.2,1.35]));const s={mode:'routes',progress:1,endpoint:result.endpointWork,W2:result.samples.at(-1).W};assert.equal(judge('paths','target-work',s).pass,true);assert.equal(judge('paths','target-work',{...s,progress:0}).pass,false);
});
test('surface maximum goal rejects equator and finds poles of induced conducting sphere',()=>{
 const state=p=>{const s=conductorAt(p,{R:1.5});return{mode:'induced',surface:true,E:s.E,external:s.external,induced:s.induced,tangent:Math.hypot(...s.tangent)};};
 assert.equal(judge('conductors','pole',state([1.5,0,0])).pass,false);assert.equal(judge('conductors','pole',state([0,1.5,0])).pass,true);
});
test('potential challenge distinguishes potential from the signed particle energy',()=>{assert.equal(judge('potential','energy-sign',{mode:3,V:1.4,U:-1.4,q:-1}).pass,true);assert.equal(judge('potential','energy-sign',{mode:3,V:1.4,U:1.4,q:1}).pass,false);});
