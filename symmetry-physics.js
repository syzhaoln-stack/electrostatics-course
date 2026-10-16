/** Ideal vacuum sources. Geometry: mm; Q: pC; lambda: pC/mm;
 * sigma: pC/mm². Outputs use SI (E: V/m, area: m², Q: C, flux: V m).
 * Infinite line is the y axis; infinite plane is y=0. */
export const SYMMETRY_EPSILON0 = 8.8541878128e-12;
export const SYMMETRY_K = 1 / (4 * Math.PI * SYMMETRY_EPSILON0);
export const DEFAULT_SYMMETRY = Object.freeze({ mode:'sphere', radius:2, length:4, halfWidth:2.4, offset:0, strength:1, sign:1 });
export function symmetryOptions(input={}) {
  const o={...DEFAULT_SYMMETRY,...input};
  if(!['sphere','line','plane'].includes(o.mode))throw new RangeError('Unknown source');
  for(const k of ['radius','length','halfWidth'])if(!(Number.isFinite(o[k])&&o[k]>0))throw new RangeError(k+' must be positive');
  for(const k of ['offset','strength'])if(!Number.isFinite(o[k]))throw new RangeError('Invalid '+k);
  if(o.strength<0||![1,-1].includes(o.sign))throw new RangeError('Invalid source strength or sign');
  return o;
}
export function symmetrySource(input={}) {
  const o=symmetryOptions(input),factor=o.strength*o.sign;
  return {Q:.1e-12*factor,lambda:.01e-9*factor,sigma:.002e-6*factor};
}
export function symmetryField(point,input={}) {
  const o=symmetryOptions(input),s=symmetrySource(o);
  if(o.mode==='plane')return [0,point[1]===0?NaN:Math.sign(point[1])*s.sigma/(2*SYMMETRY_EPSILON0),0];
  const d=o.mode==='sphere'?[point[0]-o.offset,point[1],point[2]]:[point[0],0,point[2]];
  const r=Math.hypot(...d)*1e-3;
  if(r===0)return [NaN,NaN,NaN];
  const e=o.mode==='sphere'?SYMMETRY_K*s.Q/r**2:s.lambda/(2*Math.PI*SYMMETRY_EPSILON0*r);
  return d.map(v=>e*v*1e-3/r);
}
export function symmetryReadings(input={}) {
  const o=symmetryOptions(input),s=symmetrySource(o),r=o.radius*1e-3,L=o.length*1e-3,A=(2*o.halfWidth*1e-3)**2;
  const enclosed=o.mode==='sphere'?(Math.abs(o.offset)<o.radius?s.Q:Math.abs(o.offset)>o.radius?0:NaN):o.mode==='line'?s.lambda*L:s.sigma*A;
  const effectiveArea=o.mode==='sphere'?4*Math.PI*r*r:o.mode==='line'?2*Math.PI*r*L:2*A;
  const probe=o.mode==='plane'?[0,o.radius,0]:[o.radius,0,0],E=symmetryField(probe,o),symmetric=o.mode!=='sphere'||Math.abs(o.offset)<1e-10;
  const near=Math.abs(o.radius-Math.abs(o.offset))*1e-3,far=(o.radius+Math.abs(o.offset))*1e-3;
  const range=o.mode==='sphere'?[SYMMETRY_K*Math.abs(s.Q)/far**2,SYMMETRY_K*Math.abs(s.Q)/near**2]:[Math.hypot(...E),Math.hypot(...E)];
  return {options:o,source:s,enclosed,effectiveArea,faceArea:A,probe,E,magnitude:Math.hypot(...E),range,symmetric,expectedFlux:enclosed/SYMMETRY_EPSILON0,derivedE:symmetric?enclosed/(SYMMETRY_EPSILON0*effectiveArea):null};
}
function gaussLegendre(n) {
  const result=[];
  for(let i=1;i<=n;i++){
    let z=Math.cos(Math.PI*(i-.25)/(n+.5)),derivative=0;
    for(let j=0;j<32;j++){
      let p0=1,p1=z;for(let k=2;k<=n;k++){const p=((2*k-1)*z*p1-(k-1)*p0)/k;p0=p1;p1=p;}
      derivative=n*(z*p1-p0)/(z*z-1);const next=z-p1/derivative;
      if(Math.abs(next-z)<1e-15){z=next;break;}z=next;
    }
    result.push([z,2/((1-z*z)*derivative*derivative)]);
  }
  return result;
}
/** Independent E·n dA quadrature on the actual closed surface, not Q/epsilon. */
export function integrateSymmetrySurface(input={}, {polar=32,azimuth=96}={}) {
  const o=symmetryOptions(input),parts={},nodes=gaussLegendre(polar),dphi=2*Math.PI/azimuth;
  function add(part,p,n,areaMM2){const E=symmetryField(p,o),v=E.reduce((sum,e,i)=>n[i]===0?sum:sum+e*n[i],0)*areaMM2*1e-6;parts[part]=(parts[part]||0)+v;}
  if(o.mode==='sphere'){
    for(const [u,w] of nodes)for(let j=0;j<azimuth;j++){
      const phi=(j+.5)*dphi,s=Math.sqrt(1-u*u),n=[s*Math.cos(phi),u,s*Math.sin(phi)];add('sphere',n.map(v=>v*o.radius),n,o.radius**2*w*dphi);
    }
  }else if(o.mode==='line'){
    for(const [u,w] of nodes)for(let j=0;j<azimuth;j++){
      const phi=(j+.5)*dphi,n=[Math.cos(phi),0,Math.sin(phi)];
      add('side',[o.radius*n[0],u*o.length/2,o.radius*n[2]],n,o.radius*o.length/2*w*dphi);
      const rho=(u+1)*o.radius/2,area=rho*o.radius/2*w*dphi;
      for(const sign of [-1,1])add(sign>0?'capTop':'capBottom',[rho*n[0],sign*o.length/2,rho*n[2]],[0,sign,0],area);
    }
  }else{
    for(const [u,wu] of nodes)for(const [v,wv] of nodes){
      for(const sign of [-1,1]){
        add(sign>0?'top':'bottom',[u*o.halfWidth,sign*o.radius,v*o.halfWidth],[0,sign,0],o.halfWidth**2*wu*wv);
        add('sides',[sign*o.halfWidth,u*o.radius,v*o.halfWidth],[sign,0,0],o.radius*o.halfWidth*wu*wv);
        add('sides',[u*o.halfWidth,v*o.radius,sign*o.halfWidth],[0,0,sign],o.radius*o.halfWidth*wu*wv);
      }
    }
  }
  return {parts,total:Object.values(parts).reduce((s,v)=>s+v,0)};
}
