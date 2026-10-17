import {CONSTANTS,fieldAt} from './physics.js';
import {enclosedSphereFraction} from './flux-physics.js';

const norm=v=>Math.hypot(...v);
export function fluxSurfacePoint(u,phi,radii){const s=Math.sqrt(Math.max(0,1-u*u));return [radii[0]*s*Math.cos(phi),radii[1]*u,radii[2]*s*Math.sin(phi)];}
export function fluxSurfacePatch(u,phi,radii,sources){
 const s=Math.sqrt(Math.max(0,1-u*u)),pos=fluxSurfacePoint(u,phi,radii);
 const areaVector=[radii[1]*radii[2]*s*Math.cos(phi),radii[0]*radii[2]*u,radii[0]*radii[1]*s*Math.sin(phi)],area=norm(areaVector),normal=areaVector.map(v=>v/area),E=fieldAt(pos,sources).E;
 return {pos,normal,E,En:E.reduce((a,v,i)=>a+v*normal[i],0),area};
}
/** SI flux, independently integrating E·n over a centered ellipsoid. */
export function integrateFluxSurface(radii,sources,{nu=64,np=128}={}){
 let positive=0,negative=0;const du=2/nu,dp=2*Math.PI/np;
 for(let j=0;j<nu;j++)for(let i=0;i<np;i++){const p=fluxSurfacePatch(-1+(j+.5)*du,(i+.5)*dp,radii,sources),v=p.En*p.area*du*dp*1e-6;if(v>=0)positive+=v;else negative+=v;}
 return {positive,negative,total:positive+negative};
}
/** Enclosed volume of the finite, uniformly charged ball. A separate solid-angle
 * volume integral is used for ellipsoids; it never reuses E or surface flux. */
export function enclosedBallFraction(radii,pos,radius,{nu=72,np=144}={}){
 if(radii.every(r=>Math.abs(r-radii[0])<1e-12))return enclosedSphereFraction(radii[0],radius,norm(pos));
 const min=Math.min(...radii),max=Math.max(...radii),distance=norm(pos);
 if(distance+radius<=min)return 1;if(distance-radius>=max)return 0;
 let sum=0;const du=2/nu,dp=2*Math.PI/np;
 for(let j=0;j<nu;j++)for(let i=0;i<np;i++){
  const u=-1+(j+.5)*du,phi=(i+.5)*dp,s=Math.sqrt(1-u*u),n=[s*Math.cos(phi),u,s*Math.sin(phi)];
  let A=0,B=0,C=-1;for(let k=0;k<3;k++){const rr=radii[k]**2;A+=n[k]**2/rr;B+=2*pos[k]*n[k]/rr;C+=pos[k]**2/rr;}
  const disc=B*B-4*A*C;if(disc<=0)continue;const root=Math.sqrt(disc),lo=Math.max(0,(-B-root)/(2*A)),hi=Math.min(radius,(-B+root)/(2*A));if(hi>lo)sum+=(hi**3-lo**3)/radius**3;
 }
 return Math.max(0,Math.min(1,sum/(nu*np)));
}
export function fluxSurfaceReading(radii,sources,quality={}){
 const integral=integrateFluxSurface(radii,sources,quality),enclosedPC=sources.reduce((sum,s)=>sum+s.Q*enclosedBallFraction(radii,s.pos,s.radius||.42,quality),0),expected=enclosedPC*1e-12/CONSTANTS.epsilon0;
 return {...integral,enclosedPC,expected,error:Math.abs(integral.total-expected)};
}
