// SI model of the horizontal repulsive torsion balance. Historical readings are
// observations, never overwritten by the model's equilibrium solution.
export const DEG=Math.PI/180;
export const R=.108; // 4 historical pouces; rounded conversion supplied with the memoir.
export const GRAIN_KG=.000053;
export const G=9.80665; // modern standard gravity, for an illustrative SI conversion only.
export const KAPPA=(GRAIN_KG*G/340)*R/(2*Math.PI);
// Modern calibration illustration: a known tangential force at fixed arm R.
// The 1° readout step and 60° window are teaching assumptions, not historical limits.
export function calibrationResponse(force,{diameter=1,stepDegrees=1,windowDegrees=60,zeroDegrees=2.5}={}){
 if(!Number.isFinite(force)||force<0||!Number.isFinite(diameter)||diameter<=0||!(stepDegrees>0&&windowDegrees>0&&zeroDegrees>=0))throw Error('Invalid calibration inputs');
 const kappa=KAPPA*diameter**4,perDegree=kappa*DEG/R,angle=force/perDegree;
 return {kappa,angle,forcePerStep:perDegree*stepDegrees,windowForce:perDegree*windowDegrees,zeroForce:perDegree*zeroDegrees,overWindow:angle>windowDegrees,belowStep:angle<stepDegrees};
}
export const RECORDS=Object.freeze([
 {beta:0,alpha:36,reportedTwist:36},
 {beta:126,alpha:18,reportedTwist:144},
 {beta:567,alpha:8.5,reportedTwist:576}
]);
export const distance=alpha=>2*R*Math.sin(alpha*DEG/2);
export const lever=alpha=>R*Math.cos(alpha*DEG/2);
export function reading(beta,alpha,{zero=0,wire=1}={}){
 const twist=beta+alpha-zero,kappa=KAPPA*wire**4;
 const torque=kappa*twist*DEG;
 return {beta,alpha,twist,d:distance(alpha),arm:lever(alpha),torque,force:torque/lever(alpha),kappa};
}
const FIRST=reading(0,36);
export function electricalForce(alpha,{power=2,chargeFraction=1}={}){
 return FIRST.force*chargeFraction**2*(FIRST.d/distance(alpha))**power;
}
export function residual(alpha,beta,options={}){
 return electricalForce(alpha,options)*lever(alpha)-reading(beta,alpha,options).torque;
}
export function equilibrium(beta,options={}){
 if(!Number.isFinite(beta)||beta<0||beta>720)throw Error('Top rotation outside 0–720 degrees');
 const {power=2,chargeFraction=1,wire=1,zero=0}=options;
 if(!(power>=1&&power<=3&&chargeFraction>=0&&chargeFraction<=1&&wire>=1&&wire<=2&&Math.abs(zero)<=3))throw Error('Invalid model parameters');
 let lo=2*Math.asin(.003/R)/DEG,hi=175; // 6 mm balls: do not allow their volumes to overlap.
 if(residual(lo,beta,options)<=0)return {...reading(beta,lo,options),contact:true};
 for(let i=0;i<80;i++){const mid=(lo+hi)/2;if(residual(mid,beta,options)>0)lo=mid;else hi=mid;}
 return {...reading(beta,(lo+hi)/2,options),contact:false};
}
export function historicalPoints(exact=false){
 const base=reading(0,36);
 return RECORDS.map(row=>({...row,twist:row.beta+row.alpha,
  x:exact?distance(row.alpha)/base.d:row.alpha/36,
  y:exact?reading(row.beta,row.alpha).force/base.force:(row.beta+row.alpha)/36}));
}
export function fittedPower(points){
 const xs=points.map(p=>Math.log(p.x)),ys=points.map(p=>Math.log(p.y));
 const mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length;
 return -xs.reduce((s,x,i)=>s+(x-mx)*(ys[i]-my),0)/xs.reduce((s,x)=>s+(x-mx)**2,0);
}
