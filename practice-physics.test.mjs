import test from 'node:test';
import assert from 'node:assert/strict';
import {CONSTANTS} from './physics.js';
import {PATH_DEFAULTS} from './paths-physics.js';
import {fieldExercise,pathExercise,fluxExercise,calculateSlots,parsePastedNumbers,checkNumeric,gaussEvidence} from './practice-physics.js';
test('symmetric charges cancel x and add y, electron reverses direction',()=>{
 const s={p:[0,3,0],sign:-1,sources:[{pos:[-4,0,0],Q:1},{pos:[4,0,0],Q:1}]},r=fieldExercise(s);
 const expected=2*CONSTANTS.k*1e-12/(.005**2)*.6;
 assert.ok(Math.abs(r.E[0])<1e-10);assert.ok(Math.abs(r.E[1]-expected)<1e-8);assert.ok(r.F[1]<0);assert.ok(Math.abs(r.angle-45)<1e-8);
 assert.equal(fieldExercise({...s,p:[0,0,0]}).angle,null);
});
test('3D path integral matches endpoint work and reverses with charge',()=>{
 const state={...PATH_DEFAULTS,handle:[0,3.2,1.35]},a=pathExercise(state),b=pathExercise({...state,q:-1});
 assert.ok(Math.abs(a.curved-a.answer)<1e-7);assert.ok(Math.abs(a.direct-a.answer)<1e-7);assert.ok(Math.abs(a.answer+b.answer)<1e-12);
 assert.ok(Math.abs(calculateSlots('A*(B-C)',a.values)-a.answer)<1e-12);
});
test('flux to charge converts C to pC, preserving sign and zero',()=>{
 for(const charge of [-.1,0,.1]){const r=fluxExercise({flux:charge*1e-12/CONSTANTS.epsilon0});assert.ok(Math.abs(r.answer-charge)<1e-12);assert.ok(Math.abs(calculateSlots('A*B*1e12',r.values)-charge)<1e-12);}
});
test('calculator supports pasted scientific numbers, rejects missing slots and code',()=>{
 assert.deepEqual(parsePastedNumbers('1e-3，-2\n3E2',3),['1e-3','-2','3E2']);
 assert.equal(calculateSlots('A+D',['2','','','-3']),-1);
 assert.equal(calculateSlots('1E-3+A',['2']),2.001);
 assert.throws(()=>calculateSlots('A+D',['2']));assert.throws(()=>calculateSlots('alert(1)',[]));
 assert.throws(()=>parsePastedNumbers('1 mm,2',2));assert.throws(()=>parsePastedNumbers('1 2',3));assert.throws(()=>calculateSlots('1/0',[]));
});
test('numeric feedback rejects blank, wrong sign and nonnumeric; allows near zero absolute tolerance',()=>{
 assert.equal(checkNumeric('',0).ok,false);assert.equal(checkNumeric('Infinity',1).ok,false);assert.equal(checkNumeric('-5',5).ok,false);
 assert.equal(checkNumeric('5.01',5).ok,true);assert.equal(checkNumeric('1e-9',0).ok,true);
});
test('Gauss induction needs both locations and two shapes with unchanged enclosed charge',()=>{
 const record=(inside,outside,radii,enclosed)=>({state:{inside,outside,radii,enclosed}});
 const a=record(true,false,[2,2,2],.1),b=record(false,true,[2,2,2],0),c=record(true,false,[2,3,2],.1);
 assert.equal(gaussEvidence([a,b,a]).complete,false);assert.equal(gaussEvidence([a,b,c]).complete,true);
 assert.equal(gaussEvidence([a,b,{state:{...c.state,enclosed:.05}}]).complete,false);
});

test('vertical electron force agrees with the analytic symmetric Coulomb case in fN',()=>{
 const state={quantity:'vertical-force',p:[0,-3,0],sign:-1,sources:[{pos:[-4,0,0],Q:1},{pos:[4,0,0],Q:1}]};
 const r=fieldExercise(state),expected=2*CONSTANTS.k*1e-12*CONSTANTS.elementaryCharge/(.005**2)*.6*1e15;
 assert.ok(Math.abs(r.answer-expected)<1e-10);
 assert.ok(Math.abs(r.values.reduce((a,b)=>a+b,0)-expected)<1e-10);
 assert.deepEqual(r.units,['fN','fN']);
 assert.ok(Math.abs(fieldExercise({...state,sign:1}).answer+expected)<1e-10);
});
