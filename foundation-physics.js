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

const magnitude=v=>Math.hypot(...v);
const times=(v,s)=>v.map(n=>n*s);
export const SOURCE_DEFAULTS=Object.freeze({point:4e-13,line:1e-10,plane:1e-8});
// The line lies on the x axis. The sheet lies in the xz plane.
// Position, source strength, and the returned vector all use SI units.
export function idealSourceField(model,p,strength=SOURCE_DEFAULTS[model]){
 const [x,y,z]=p;
 if(model==='point'){
  const r=magnitude(p);if(r===0)throw new RangeError('Point source is singular.');
  return times(p,K*strength/r**3);
 }
 if(model==='line'){
  const rho=Math.hypot(y,z);if(rho===0)throw new RangeError('Line source is singular.');
  return [0,2*K*strength*y/rho**2,2*K*strength*z/rho**2];
 }
 if(model==='plane'){
  if(y===0)throw new RangeError('The ideal sheet field is discontinuous on the sheet.');
  return [0,Math.sign(y)*strength/(2*EPS0),0];
 }
 throw new Error('Unknown source model');
}
export function finiteLineField(p,length,density){
 if(!(length>0))throw new RangeError('Positive line length required.');
 const [x,y,z]=p,a=length/2,rho=Math.hypot(y,z),dl=Math.hypot(x+a,rho),dr=Math.hypot(x-a,rho);
 if(!rho&&Math.abs(x)<=a)throw new RangeError('The observation point lies on the line.');
 const Ex=K*density*(1/dr-1/dl);
 if(rho===0)return [Ex,0,0];
 const factor=K*density*((a-x)/dr+(a+x)/dl)/rho**2;
 return [Ex,factor*y,factor*z];
}

// Gauss–Legendre nodes integrate a uniformly charged disk. The azimuthal
// trapezoid is periodic; it is unrelated to a user-facing segment count.
function gaussLegendre(n){
 const result=[];
 for(let i=0;i<n;i++){
  let x=Math.cos(Math.PI*(i+.75)/(n+.5)),dp=0;
  for(let k=0;k<12;k++){
   let p0=1,p1=x;for(let j=2;j<=n;j++){const pj=((2*j-1)*x*p1-(j-1)*p0)/j;p0=p1;p1=pj;}
   dp=n*(x*p1-p0)/(x*x-1);const dx=p1/dp;x-=dx;if(Math.abs(dx)<1e-14)break;
  }
  result.push([x,2/((1-x*x)*dp*dp)]);
 }
 return result;
}
const diskQuadrature=new Map();
function diskPoints(radial,angular){
 const key=radial+':'+angular;if(diskQuadrature.has(key))return diskQuadrature.get(key);
 const points=[];
 for(const [node,w] of gaussLegendre(radial)){
  const radius=(node+1)/2,weight=w/2*radius*2*Math.PI/angular;
  for(let j=0;j<angular;j++){const angle=2*Math.PI*(j+.5)/angular;points.push([radius*Math.cos(angle),radius*Math.sin(angle),weight]);}
 }
 diskQuadrature.set(key,points);return points;
}
export function finiteDiskFieldQuadrature(p,radius,density,{radial=20,angular=72}={}){
 if(!(radius>0))throw new RangeError('Positive disk radius required.');
 const [x,y,z]=p;
 if(y===0&&Math.hypot(x,z)<=radius)throw new RangeError('The observation point lies on the disk.');
 // Exact center-axis field also avoids cancellation at very large radii.
 if(x===0&&z===0)return [0,Math.sign(y)*density/(2*EPS0)*(1-Math.abs(y)/Math.hypot(y,radius)),0];
 const E=[0,0,0];
 for(const [u,v,w] of diskPoints(radial,angular)){
  const dx=x-u*radius,dz=z-v*radius,r=Math.hypot(dx,y,dz),c=K*density*radius*radius*w/r**3;
  E[0]+=c*dx;E[1]+=c*y;E[2]+=c*dz;
 }
 return E;
}
export function finiteDiskField(p,radius,density,{angular=96}={}){
 if(!(radius>0))throw new RangeError('Positive disk radius required.');
 const [x,y,z]=p,rho=Math.hypot(x,z),h=Math.abs(y);
 if(h===0&&rho<=radius)throw new RangeError('The observation point lies on the disk.');
 if(rho===0)return [0,Math.sign(y)*density/(2*EPS0)*(1-h/Math.hypot(h,radius)),0];
 // Polar rays start at the projection of P onto the disk's plane. Their radial
 // integrals are analytic, so the field stays accurate close to a large disk.
 // Integrate only the angle; outside the disk use Gauss–Legendre nodes at the
 // two tangent rays, where a plain equally spaced rule converges slowly.
 let horizontal=0,normal=0;
 const primitive=(r)=>h?Math.asinh(r/h)-r/Math.hypot(r,h):Math.log(r);
 const add=(theta,weight)=>{
  const co=Math.cos(theta),si=Math.sin(theta),disc=Math.max(0,radius*radius-rho*rho*si*si),root=Math.sqrt(disc),outer=-rho*co+root,inner=Math.max(0,-rho*co-root);
  if(outer<=inner||outer<=0)return;
  horizontal-=co*(primitive(outer)-(inner?primitive(inner):0))*weight;
  normal+=Math.sign(y)*((inner?h/Math.hypot(inner,h):1)-h/Math.hypot(outer,h))*weight;
 };
 if(rho<radius){for(let i=0;i<angular;i++)add(2*Math.PI*(i+.5)/angular,2*Math.PI/angular);}
 else{
  const alpha=Math.asin(Math.min(1,radius/rho));
  for(const [node,weight] of gaussLegendre(Math.max(24,Math.ceil(angular/2))))add(Math.PI+node*alpha,weight*alpha);
 }
 const coefficient=K*density;
 return [coefficient*horizontal*x/rho,coefficient*normal,coefficient*horizontal*z/rho];
}
export function sourceField({model='point',finite=false,size=.004,strength=SOURCE_DEFAULTS[model]},p,quality){
 if(!finite)return idealSourceField(model,p,strength);
 if(model==='plane')return finiteDiskField(p,size,strength,quality);
 return finiteLineField(p,size,model==='point'?strength/size:strength);
}
export function sourceDistance(model,p){return model==='point'?magnitude(p):model==='line'?Math.hypot(p[1],p[2]):Math.abs(p[1]);}
export function sourceReading(source,p,q=ELEMENTARY_CHARGE){
 const E=sourceField(source,p),ideal=idealSourceField(source.model,p,source.strength),F=times(E,q),Emag=magnitude(E),idealMagnitude=magnitude(ideal);
 return {E,F,Emag,Fmag:magnitude(F),ideal,distance:sourceDistance(source.model,p),error:idealMagnitude?magnitude(E.map((n,i)=>n-ideal[i]))/idealMagnitude:0};
}
// A fixed display scale preserves comparisons. Zero field gives zero length;
// a logarithmic compression keeps a near-source vector inside the frame.
export function fieldGlyph(E){
 const strength=Math.max(0,Math.abs(E));
 return {length:.29*Math.log1p(strength/100),width:.009+.022*strength/(strength+1000)};
}
