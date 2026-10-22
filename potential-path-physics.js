import {fieldAt} from './physics.js';
import {PATH_SOURCES,makeRoute,integrateRoute} from './paths-physics.js';
export const POTENTIAL_ENDPOINTS=Object.freeze({A:Object.freeze([-2,-.4,0]),B:Object.freeze([2,.6,0]),handle:Object.freeze([0,1.7,0])});
// Ideal parallel plates: x in [-4,4] mm, left 8 V and right 0 V.
// E=-grad(V)=1000 V/m in the gap; fringing is intentionally excluded.
export function potentialField(p,model='plates'){
 if(model==='plates')return {V:4-p[0],E:[1000,0,0]};
 if(model==='spheres')return fieldAt(p,PATH_SOURCES);
 throw Error('Unknown potential model');
}
export function potentialPathExercise(state){
 const fieldAtPoint=p=>potentialField(p,state.model),direct=integrateRoute(makeRoute(state.A,state.B),{q:1,fieldAtPoint}),curved=integrateRoute(makeRoute(state.A,state.B,state.handle),{q:1,fieldAtPoint});
 const VA=potentialField(state.A,state.model).V,VB=potentialField(state.B,state.model).V;
 return {answer:VA-VB,values:[VA,VB],labels:['V_A','V_B'],units:['V','V'],direct:direct.work,curved:curved.work,error:curved.work-(VA-VB),directLength:direct.length,curvedLength:curved.length,model:state.model};
}
// Piecewise-linear contours on a sampled XY plane. Splitting each cell into
// triangles avoids ambiguous saddle cases; curves approximate equipotentials.
export function potentialContours(model,levels,{nx=120,ny=80}={}){
 const xs=Array.from({length:nx+1},(_,i)=>-4+8*i/nx),ys=Array.from({length:ny+1},(_,i)=>-2.6+5.2*i/ny);
 const grid=ys.map(y=>xs.map(x=>({p:[x,y,0],v:potentialField([x,y,0],model).V})));
 return levels.map(level=>{
  const segments=[];
  function triangle(t){const hits=[];for(let i=0;i<3;i++){const a=t[i],b=t[(i+1)%3];if((a.v<level)!==(b.v<level)){const f=(level-a.v)/(b.v-a.v);hits.push(a.p.map((v,j)=>v+(b.p[j]-v)*f));}}if(hits.length===2)segments.push(hits);}
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=grid[y][x],b=grid[y][x+1],c=grid[y+1][x+1],d=grid[y+1][x];triangle([a,b,c]);triangle([a,c,d]);}
  return {level,segments};
 });
}
