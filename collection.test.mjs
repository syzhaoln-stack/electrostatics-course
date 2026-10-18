import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLECTION,airflow,dustProperties,dragStep,makeCollection,setCollectionField,stepCollection,fieldForSlope,collectionSummary,collectionSnapshot} from './collection-physics.js';
const finish=(controller,dt=.01)=>{const state=makeCollection();for(let i=0;i<10000&&!state.done;i++){if(controller)setCollectionField(state,controller(state));stepCollection(state,dt);}return state;};
test('micrometre dust uses SI mass, charge, and stable exact Stokes relaxation',()=>{
  const p=dustProperties();assert.ok(p.mass>7e-14&&p.mass<8e-14);assert.ok(p.tau<.0002);
  const result=dragStep([0,0,0],[0,0,0],[.4,.03,0],p.tau,1);
  assert.ok(Math.abs(result.vel[0]-.4)<1e-14);assert.ok(Math.abs(result.pos[0]-(.4-.4*p.tau))<1e-12);
});
test('same seed replays the same 100-particle challenge',()=>{assert.deepEqual(makeCollection(),makeCollection());assert.equal(makeCollection().particles.length,100);});
test('live field change changes existing particles without restarting or erasing traces',()=>{
  const s=makeCollection();stepCollection(s,.25);const p=s.particles[0],before=[...p.pos],count=p.trace.length,t=s.time;
  setCollectionField(s,160000);assert.equal(s.time,t);assert.deepEqual(p.pos,before);assert.equal(p.trace.length,count);
  stepCollection(s,.02);assert.ok(p.vel[1]<0);assert.ok(p.pos[0]>before[0]);assert.ok(s.time>t);
});
test('flow speed actually varies and dust speed responds',()=>{
  const s=makeCollection();stepCollection(s,.25);const speed0=s.particles[0].vel[0];stepCollection(s,.5);
  assert.ok(Math.abs(s.particles[0].vel[0]-speed0)>.025);assert.ok(Math.abs(airflow(1)-airflow(4))>.1);
});
test('zero field lets all dust reach outlet; collection requires a field',()=>{
  const s=finish(()=>0);assert.ok(s.done);assert.equal(s.escaped,100);assert.equal(s.hits,0);
  for(const p of s.particles)assert.equal(p.pos[0],COLLECTION.exitX);
});
test('adaptive electric field can capture all 100 in the chosen patch',()=>{
  const s=finish(state=>fieldForSlope(airflow(state.time+.005)));assert.ok(s.done);
  assert.equal(s.hits,100);assert.equal(s.escaped,0);assert.ok(collectionSummary(s).passed);
  for(const p of s.particles){assert.equal(p.pos[1],COLLECTION.upperY);assert.ok(p.pos[0]>=COLLECTION.targetX[0]&&p.pos[0]<=COLLECTION.targetX[1]);}
});
test('fixed field is insufficient for the changing wind target',()=>{
  const s=finish(()=>COLLECTION.initialField);assert.ok(s.done);assert.ok(s.hits<90);assert.ok(!collectionSummary(s).passed);
});
test('field bounds and finite inputs are enforced',()=>{
  const s=makeCollection();assert.equal(setCollectionField(s,1e9),COLLECTION.maxField);
  assert.throws(()=>setCollectionField(s,NaN));assert.throws(()=>stepCollection(s,-1));assert.throws(()=>stepCollection(s,Infinity));
});
test('large animation frames cannot tunnel through collector or outlet',()=>{
  const s=makeCollection();setCollectionField(s,-COLLECTION.maxField);stepCollection(s,30);
  assert.ok(s.done);assert.equal(s.hits+s.misses+s.escaped,100);
  for(const p of s.particles){assert.ok(p.pos[0]<=COLLECTION.exitX+1e-12);assert.ok(Math.abs(p.pos[1])<=COLLECTION.upperY+1e-12);}
});
test('completed traces remain independent for next-round comparison',()=>{
  const s=finish(()=>0),snapshot=collectionSnapshot(s),x=snapshot.particles[0].trace[0][0];
  s.particles[0].trace[0][0]=999;assert.equal(snapshot.particles[0].trace[0][0],x);
});
