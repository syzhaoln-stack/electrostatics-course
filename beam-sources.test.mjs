import test from 'node:test';
import assert from 'node:assert/strict';
import {beamOptions,beamField,BEAM_LEVELS,simulateBeam,simulateElectron,makeBeam} from './beam-physics.js';
test('point and infinite-line shooting fields obey distance scaling and E=-grad V',()=>{
 for(const level of [3,4]){const o=beamOptions(level),a=beamField([1,-2.8,0],0,o),b=beamField([2,-2.8,0],0,o);assert.ok(Math.abs(a.E[0]/b.E[0]-(level===3?4:2))<1e-9);
  for(const p of [[-2,.4,.5],[1,-1,.2]])for(let j=0;j<3;j++){const lo=[...p],hi=[...p],h=1e-5;lo[j]-=h;hi[j]+=h;const gradient=-(beamField(hi,0,o).V-beamField(lo,0,o).V)/(2*h*.001);assert.ok(Math.abs(gradient-beamField(p,0,o).E[j])<1e-4);}
 }
 const o=beamOptions(4);assert.deepEqual(beamField([1,0,3],0,o).E,beamField([1,0,-3],0,o).E);assert.equal(beamField([1,0,3],0,o).E[2],0);
});
test('both source challenges have attainable goals and preserve total energy',()=>{
 for(const level of [3,4]){const o=beamOptions(level,BEAM_LEVELS[level].solution),result=simulateBeam(o);assert.ok(result.hits>=75,`${level}: ${result.hits}`);const p=makeBeam(o)[0],fine=simulateElectron(p,o,{dt:.0125}),coarse=result.trajectories[0];assert.ok(Math.hypot(...fine.samples.at(-1).pos.map((v,i)=>v-coarse.samples.at(-1).pos[i]))<.001);const energy=coarse.samples[0].K-coarse.samples[0].V;assert.ok(coarse.samples.every(s=>Math.abs(s.K-s.V-energy)<.002));assert.ok(simulateBeam(beamOptions(level,{sourceStrength:0})).hits<75);}
});
