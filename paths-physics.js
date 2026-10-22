import {fieldAt,CONSTANTS} from './physics.js';

// Positions are mm. E is V/m; potential is V; displayed work/energy is eV.
// All sources stay fixed, so the line integral is an electrostatic one.
export const PATH_SOURCES=Object.freeze([
 Object.freeze({pos:Object.freeze([-1.8,-1.15,0]),Q:.30,radius:.32,label:'+0.30 pC'}),
 Object.freeze({pos:Object.freeze([2.1,-1.25,0]),Q:-.20,radius:.32,label:'−0.20 pC'})
]);
export const PATH_DEFAULTS=Object.freeze({A:Object.freeze([-3.6,1.25,0]),B:Object.freeze([3.6,1.65,0]),handle:Object.freeze([0,3.2,0]),q:1});
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const norm=v=>Math.hypot(...v);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function makeRoute(A,B,handle=null,{closed=false}={}){
 const start=[...A],end=[...B];
 const segments=[handle?{kind:'quadratic',from:start,to:end,control:handle.map((v,i)=>2*v-(A[i]+B[i])/2)}:{kind:'line',from:start,to:end}];
 if(closed)segments.push({kind:'line',from:[...B],to:[...A]});
 return {segments,start,end:closed?[...A]:[...B]};
}
function segmentPoint(segment,t){return segment.kind==='line'?lerp(segment.from,segment.to,t):segment.from.map((v,i)=>(1-t)**2*v+2*(1-t)*t*segment.control[i]+t*t*segment.to[i]);}
function segmentDerivative(segment,t){return segment.kind==='line'?segment.from.map((v,i)=>segment.to[i]-v):segment.from.map((v,i)=>2*(1-t)*(segment.control[i]-v)+2*t*(segment.to[i]-segment.control[i]));}
export function routePoint(route,progress){const scaled=clamp(progress,0,1)*route.segments.length,index=Math.min(route.segments.length-1,Math.floor(scaled));return segmentPoint(route.segments[index],scaled-index);}
export function routeTangent(route,progress){const scaled=clamp(progress,0,1)*route.segments.length,index=Math.min(route.segments.length-1,Math.floor(scaled)),d=segmentDerivative(route.segments[index],scaled-index),m=norm(d);return m?d.map(v=>v/m):[1,0,0];}

/** Independent composite Simpson quadrature of q E(r(t))·r'(t) dt.
 * Potential differences are only evaluated separately for the comparison.
 * Segment boundaries are always explicit quadrature boundaries. */
export function integrateRoute(route,{q=1,sources=PATH_SOURCES,intervals=400,fieldAtPoint=null}={}){
 const sampleField=fieldAtPoint||((p)=>fieldAt(p,sources));
 const count=Math.max(4,Math.round(intervals/route.segments.length)),samples=[],potentialA=sampleField(route.start).V,potentialB=sampleField(route.end).V;
 let W=0,length=0,previous=route.start;
 const record=(p,u,dW)=>{const f=sampleField(p);return {u,p,E:f.E,V:f.V,U:q*f.V,W,dW,length,forceN:norm(f.E)*Math.abs(q)*CONSTANTS.elementaryCharge};};
 samples.push(record([...route.start],0,0));
 route.segments.forEach((segment,index)=>{
  const integrand=t=>dot(sampleField(segmentPoint(segment,t)).E,segmentDerivative(segment,t))*q*1e-3;
  for(let i=0;i<count;i++){
   const a=i/count,b=(i+1)/count,m=(a+b)/2,dW=(integrand(a)+4*integrand(m)+integrand(b))*(b-a)/6,p=segmentPoint(segment,b);
   W+=dW;length+=norm(p.map((v,j)=>v-previous[j]));previous=p;samples.push(record(p,(index+b)/route.segments.length,dW));
  }
 });
 const endpointWork=q*(potentialA-potentialB);
 return {route,q,sources,samples,work:W,endpointWork,error:W-endpointWork,potentialA,potentialB,energyA:q*potentialA,energyB:q*potentialB,length};
}
export function routeState(result,progress){
 const u=clamp(progress,0,1),scaled=u*(result.samples.length-1),lo=Math.floor(scaled),hi=Math.min(result.samples.length-1,lo+1),a=result.samples[lo],b=result.samples[hi],f=scaled-lo,p=routePoint(result.route,u),field=fieldAt(p,result.sources);
 return {u,p,E:field.E,V:field.V,U:result.q*field.V,W:a.W+(b.W-a.W)*f,tangent:routeTangent(result.route,u),forceN:norm(field.E)*Math.abs(result.q)*CONSTANTS.elementaryCharge};
}
/** A finite straight displacement; forward difference tends to the local
 * directional derivative as ds -> 0. q does not enter either field reading. */
export function smallDisplacement(point,angle=0,step=.30,{q=1,sources=PATH_SOURCES}={}){
 const direction=[Math.cos(angle),Math.sin(angle),0],distance=Math.max(1e-5,Number(step)),end=point.map((v,i)=>v+distance*direction[i]),f=fieldAt(point,sources),endV=fieldAt(end,sources).V,deltaV=endV-f.V,parallel=dot(f.E,direction),slope=-deltaV/(distance*1e-3);
 return {point:[...point],end,direction,step:distance,E:f.E,V:f.V,endV,deltaV,parallel,slope,error:slope-parallel,work:-q*deltaV,forceN:norm(f.E)*Math.abs(q)*CONSTANTS.elementaryCharge,energy:q*f.V};
}
