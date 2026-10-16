import {smallDisplacement,PATH_SOURCES} from './paths-physics.js';

export const direction3D=(azimuth,elevation=0)=>[Math.cos(elevation)*Math.cos(azimuth),Math.cos(elevation)*Math.sin(azimuth),Math.sin(elevation)];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
/** The existing XY directional-derivative calculation in an orthonormal
 * frame whose first axis is the requested spatial displacement. Sources and
 * observation point undergo the same rotation, preserving distances and V. */
export function spatialDisplacement(point,azimuth,step,{q=1,sources=PATH_SOURCES,elevation=0}={}){
 const u=direction3D(azimuth,elevation),v=[-Math.sin(azimuth),Math.cos(azimuth),0],w=[-Math.sin(elevation)*Math.cos(azimuth),-Math.sin(elevation)*Math.sin(azimuth),Math.cos(elevation)],basis=[u,v,w];
 const toFrame=p=>basis.map(axis=>dot(p,axis)),toWorld=p=>u.map((_,i)=>basis.reduce((s,axis,j)=>s+axis[i]*p[j],0));
 const local=smallDisplacement(toFrame(point),0,step,{q,sources:sources.map(s=>({...s,pos:toFrame(s.pos)}))});
 return {...local,point:[...point],end:toWorld(local.end),E:toWorld(local.E),direction:u};
}
