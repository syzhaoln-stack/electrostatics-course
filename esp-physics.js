/** Dry plate-type ESP teaching model. SI units. Vertical wires => x-z slice.
 * Laplace field (no space charge), zero-potential plates, prescribed negative
 * wire potentials; zero normal derivative at inlet/outlet. Grid-scale wire
 * radius is illustrative. Negligible particle inertia: Stokes terminal drift.
 * Charging is prescribed, not a corona/plasma calculation. Not an efficiency rating.
 */
let cached;
export function espPotentialGrid(){
 if(cached)return cached;
 const nx=129,nz=61,h=.05,V=new Float64Array(nx*nz),fixed=new Uint8Array(nx*nz),at=(x,z)=>x*nz+z;
 for(let i=0;i<nx;i++)for(const j of [0,30,60])fixed[at(i,j)]=1;
 for(const x of [-2.4,-.8,.8,2.4])for(const z of [-.75,.75]){const k=at(Math.round((x+3.2)/h),Math.round((z+1.5)/h));fixed[k]=1;V[k]=-1;}
 let residual=Infinity,iterations=0;
 for(;iterations<3000;iterations++){residual=0;for(let i=0;i<nx;i++)for(let j=1;j<nz-1;j++){const k=at(i,j);if(fixed[k])continue;const next=(V[at(Math.max(0,i-1),j)]+V[at(Math.min(nx-1,i+1),j)]+V[k-1]+V[k+1])/4,d=next-V[k];V[k]+=1.75*d;residual=Math.max(residual,Math.abs(d));}if(residual<1e-7)break;}
 return cached={nx,nz,h,V,fixed,iterations,residual};
}
export function espField(x,z,voltageKV=40){
 const {nx,nz,h,V}=espPotentialGrid(),u=Math.max(0,Math.min(nx-1,(x+3.2)/h)),v=Math.max(0,Math.min(nz-1,(z+1.5)/h));
 const i=Math.min(nx-2,Math.floor(u)),j=Math.min(nz-2,Math.floor(v)),a=u-i,b=v-j,read=(di,dj)=>V[(i+di)*nz+j+dj]*voltageKV*1000;
 const v00=read(0,0),v10=read(1,0),v01=read(0,1),v11=read(1,1);
 return {V:(1-a)*(1-b)*v00+a*(1-b)*v10+(1-a)*b*v01+a*b*v11,E:[-((1-b)*(v10-v00)+b*(v11-v01))/h,0,-((1-a)*(v01-v00)+a*(v11-v10))/h]};
}
export function simulateDust({voltageKV=40,speed=1.2,charged=true,fieldOn=true,count=100}={}){
 const mobility=charged?-5e-15/(6*Math.PI*1.8e-5*2.5e-6):0,paths=[];
 for(let id=0;id<count;id++){
  const side=id%2?1:-1,frac=((id*37)%101+.5)/101;let x=-3.18,z=side*(.08+1.34*frac),t=0,collected=false;
  const y=-.9+1.95*((id*23)%97)/97,samples=[[x,y,z,0]];
  while(x<3.2&&t<30){const field=fieldOn?espField(x,z,voltageKV).E:[0,0,0],chargedHere=charged&&x> -2.55,qm=chargedHere?mobility:0,dt=.0125,nextZ=z+qm*field[2]*dt; x+=Math.max(.1,speed+qm*field[0])*dt;t+=dt;
   if(side*nextZ<=.035||side*nextZ>=1.465){z=side*nextZ<=.035?side*.035:side*1.465;collected=true;samples.push([x,y,z,t]);break;}
   z=nextZ;samples.push([x,y,z,t]);
  }
  paths.push({id,y,collected,samples,duration:t});
 }
 return {paths,hits:paths.filter(p=>p.collected).length,total:count,voltageKV,speed};
}
