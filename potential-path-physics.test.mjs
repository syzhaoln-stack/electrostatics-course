import test from 'node:test';
import assert from 'node:assert/strict';
import {POTENTIAL_ENDPOINTS,potentialField,potentialPathExercise,potentialContours} from './potential-path-physics.js';
import {makeRoute,integrateRoute} from './paths-physics.js';
test('ideal plates: fixed endpoints give 6 V, 2 V and 4 V along different 3D routes',()=>{
 const initial={...POTENTIAL_ENDPOINTS,model:'plates'};
 for(const handle of [[0,1.7,0],[2,-1.8,0],[-1,1.4,.7]]){
  const r=potentialPathExercise({...initial,handle});assert.deepEqual(r.values,[6,2]);assert.equal(r.answer,4);assert.ok(Math.abs(r.curved-4)<1e-10);assert.ok(Math.abs(r.direct-4)<1e-10);
 }
 assert.equal(potentialField([-4,0,0],'plates').V,8);assert.equal(potentialField([4,0,0],'plates').V,0);
 const changed=potentialPathExercise({...initial,B:[1,.6,0]});assert.equal(changed.answer,3);
 const closed=integrateRoute(makeRoute(initial.A,initial.B,initial.handle,{closed:true}),{fieldAtPoint:p=>potentialField(p,'plates')});assert.ok(Math.abs(closed.work)<1e-10);
});
test('sphere equipotentials have conservative integrals; E is minus spatial potential gradient',()=>{
 for(const handle of [[0,1.7,0],[0,-.4,0]]){const r=potentialPathExercise({...POTENTIAL_ENDPOINTS,model:'spheres',handle});assert.ok(Math.abs(r.curved-r.answer)<1e-6);}
 const p=[.3,.9,.2],h=1e-5,f=potentialField(p,'spheres');
 for(let i=0;i<3;i++){const lo=[...p],hi=[...p];lo[i]-=h;hi[i]+=h;const E=-(potentialField(hi,'spheres').V-potentialField(lo,'spheres').V)/(2*h*1e-3);assert.ok(Math.abs(E-f.E[i])<1e-5);}
});
test('plate contours carry their stated potential and have constant x',()=>{
 for(const {level,segments} of potentialContours('plates',[1,2,4,6,7],{nx:32,ny:20})){assert.ok(segments.length>0);for(const p of segments.flat()){assert.ok(Math.abs(p[0]-(4-level))<1e-12);assert.ok(Math.abs(potentialField(p,'plates').V-level)<1e-12);}}
});
