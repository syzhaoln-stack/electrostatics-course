export const EPS0=8.8541878128e-12;
export const K=1/(4*Math.PI*EPS0);
export const ELEMENTARY_CHARGE=1.602176634e-19;
// All inputs and outputs in SI units. Probes remain outside the source.
export function pointReading(Q,r,q){
 if(!(r>0))throw new RangeError('The observation point must be outside the source.');
 const E=K*Q/r**2,V=K*Q/r;
 return {E,F:q*E,V,U:q*V};
}
export function finiteModel(kind,size,r,strength){
 if(!(size>0&&r>0))throw new RangeError('Positive geometry required.');
 if(kind==='point'){
  const finite=K*strength/(r*Math.sqrt(r*r+(size/2)**2)),ideal=K*strength/r**2;
  return {finite,ideal,ratio:finite/ideal};
 }
 if(kind==='line'){
  const a=size/2,ideal=2*K*strength/r,finite=ideal*a/Math.sqrt(r*r+a*a);
  return {finite,ideal,ratio:finite/ideal};
 }
 if(kind==='plane'){
  const ideal=strength/(2*EPS0),finite=ideal*(1-r/Math.sqrt(r*r+size*size));
  return {finite,ideal,ratio:finite/ideal};
 }
 throw new Error('Unknown model');
}
export function segmentedRod(Q,L,r,N){
 let Ex=0,Ey=0;
 for(let i=0;i<N;i++){
  const x=(i+.5)*L/N-L/2,d=Math.hypot(x,r),c=K*Q/N/d**3;
  Ex-=c*x;Ey+=c*r;
 }
 return [Ex,Ey,0];
}
