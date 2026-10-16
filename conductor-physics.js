// SI outputs. Geometry inputs are millimetres; Q is picocoulombs.
export const EPSILON_0=8.8541878128e-12;
export const COULOMB_K=1/(4*Math.PI*EPSILON_0);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const scale=(a,s)=>a.map(v=>v*s);
const norm=a=>Math.hypot(...a);
export function conductorOptions(o={}){
 const raw=o.direction||[0,1,0],d=norm(raw)||1;
 return {mode:o.mode==='charged'?'charged':'induced',R:Math.max(.01,Number(o.R??1.5)),Q:Number(o.Q??.12),E0:Number(o.E0??180),direction:norm(raw)?raw.map(v=>v/d):[0,1,0],center:[...(o.center||[0,0,0])]};
}
export function conductorAt(point,options={}){
 const o=conductorOptions(options),p=point.map((v,i)=>(v-o.center[i])*1e-3),r=norm(p),R=o.R*1e-3,inside=r<R*(1-1e-12),n=r?scale(p,1/r):[0,1,0];
 let E=[0,0,0],external=[0,0,0],induced=[0,0,0],V=0;
 if(o.mode==='charged'){
  V=COULOMB_K*o.Q*1e-12/Math.max(R,r);
  if(!inside)E=scale(n,COULOMB_K*o.Q*1e-12/(r*r));
 }else{
  external=scale(o.direction,o.E0);
  if(inside){induced=scale(external,-1);V=0;}
  else{
   const ratio=(R/r)**3,projection=dot(o.direction,n);
   induced=n.map((v,i)=>o.E0*ratio*(3*v*projection-o.direction[i]));
   E=external.map((v,i)=>v+induced[i]);
   V=-o.E0*dot(o.direction,p)*(1-ratio);
  }
 }
 const radial=dot(E,n),tangent=E.map((v,i)=>v-radial*n[i]);
 return {E,external,induced,V,inside,r:r*1e3,normal:n,radial,tangent,magnitude:norm(E),surface:Math.abs(r-R)<1e-9};
}
export function conductorSigma(normal,options={}){
 const o=conductorOptions(options),d=norm(normal)||1,n=scale(normal,1/d);
 return o.mode==='charged'?o.Q*1e-12/(4*Math.PI*(o.R*1e-3)**2):3*EPSILON_0*o.E0*dot(o.direction,n);
}
export function conductorProfile(direction,options={},count=121){
 const o=conductorOptions(options),d=norm(direction)||1,n=norm(direction)?scale(direction,1/d):[0,1,0],end=o.R*3;
 const radii=[...Array.from({length:count},(_,i)=>end*i/(count-1)),o.R*(1-1e-8),o.R,o.R*(1+1e-8)].sort((a,b)=>a-b);
 return radii.map(r=>({r,...conductorAt(o.center.map((v,i)=>v+n[i]*r),o)}));
}
export function spherePoint(theta,phi,options={}){
 const o=conductorOptions(options);
 return [Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi)].map((v,i)=>o.center[i]+o.R*v);
}
