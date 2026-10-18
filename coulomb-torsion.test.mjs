import test from 'node:test';
import assert from 'node:assert/strict';
import {torsionState,sectionAngle,relativeCompliance} from './coulomb-torsion-physics.js';

test('opposite micrometer and balance rotations add to the physical twist',()=>{
  assert.deepEqual(torsionState({alpha:18,beta:126}),{top:-126,bottom:18,twist:144});
  assert.equal(torsionState({alpha:8.5,beta:567}).twist,575.5);
  assert.equal(sectionAngle(0,{alpha:18,beta:126}),18);
  assert.equal(sectionAngle(1,{alpha:18,beta:126}),-126);
  assert.equal(sectionAngle(.5,{alpha:18,beta:126}),-54);
});
test('elastic comparison keeps force and diameter fixed when doubling length',()=>{
  assert.equal(relativeCompliance({length:2}),2*relativeCompliance({length:1}));
  assert.equal(relativeCompliance({diameter:2}),1/16);
  assert.equal(relativeCompliance({shearModulus:2}),.5);
  assert.throws(()=>relativeCompliance({length:0}),RangeError);
});
