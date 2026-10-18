// SI units throughout. Dilute charged dust in prescribed airflow; no particle–particle force.
export const COLLECTION = Object.freeze({
  count:100, x0:-.32, exitX:.32, lowerY:-.05, upperY:.05, halfDepth:.06,
  targetX:[-.02,.20], targetZ:[-.045,.045], emissionInterval:.13,
  radius:2e-6, density:2200, viscosity:1.81e-5, charge:-2e-16,
  gravity:9.80665, maxField:240000, initialField:-120000, maxStep:.01,
  goal:90, seed:1785,
});
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
export function airflow(time){
  return .30+.115*Math.sin(2*Math.PI*time/6.4)+.025*Math.sin(2*Math.PI*time/2.9);
}
export function dustProperties(radius=COLLECTION.radius,charge=COLLECTION.charge){
  const mass=4/3*Math.PI*radius**3*COLLECTION.density;
  const drag=6*Math.PI*COLLECTION.viscosity*radius;
  return {radius,charge,mass,drag,tau:mass/drag};
}
export function terminalVelocity(field,wind,properties=dustProperties()){
  return [wind,(properties.charge*field-properties.mass*COLLECTION.gravity)/properties.drag,0];
}
export function fieldForSlope(wind,slope=.06/.43,properties=dustProperties()){
  return (properties.drag*slope*wind+properties.mass*COLLECTION.gravity)/properties.charge;
}
export function dragStep(position,velocity,terminal,tau,dt){
  const decay=Math.exp(-dt/tau), integral=-tau*Math.expm1(-dt/tau);
  return {
    pos:position.map((x,i)=>x+terminal[i]*dt+(velocity[i]-terminal[i])*integral),
    vel:velocity.map((v,i)=>terminal[i]+(v-terminal[i])*decay),
  };
}
function rng(seed){let state=seed>>>0;return()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
export function makeCollection({seed=COLLECTION.seed}={}){
  const random=rng(seed),particles=[];
  for(let id=0;id<COLLECTION.count;id++){
    const radius=COLLECTION.radius*(.96+.08*random()),charge=COLLECTION.charge*(.97+.06*random());
    particles.push({id,...dustProperties(radius,charge),born:id*COLLECTION.emissionInterval,
      pos:[COLLECTION.x0,-.01+(random()-.5)*.0015,(random()-.5)*.055],
      vel:[airflow(id*COLLECTION.emissionInterval),0,0],status:'waiting',trace:[],
      arrival:null,impact:null,electricWork:0,lastTraceTime:-Infinity});
  }
  return {time:0,field:COLLECTION.initialField,particles,emitted:0,hits:0,misses:0,escaped:0,
    done:false,history:[],traceInterval:.025,fieldChanges:0};
}
export function setCollectionField(state,value){
  if(!Number.isFinite(value))throw new TypeError('Electric field must be finite.');
  const field=clamp(value,-COLLECTION.maxField,COLLECTION.maxField);
  if(field!==state.field){state.fieldChanges++;state.history.push({time:state.time,field});}
  state.field=field;return field;
}
function boundaries(position){
  return [position[1]>=COLLECTION.upperY,position[1]<=COLLECTION.lowerY,
    position[0]>=COLLECTION.exitX,Math.abs(position[2])>=COLLECTION.halfDepth];
}
function integrateParticle(p,dt,field,wind){
  const target=terminalVelocity(field,wind,p),next=dragStep(p.pos,p.vel,target,p.tau,dt);
  if(!boundaries(next.pos).some(Boolean))return {...next,used:dt,boundary:null};
  // Find the first boundary along the analytic constant-force substep. No tunnelling.
  let lo=0,hi=dt;
  for(let n=0;n<38;n++){const mid=(lo+hi)/2;
    if(boundaries(dragStep(p.pos,p.vel,target,p.tau,mid).pos).some(Boolean))hi=mid;else lo=mid;}
  const end=dragStep(p.pos,p.vel,target,p.tau,hi),flags=boundaries(end.pos);
  let boundary=flags[0]?'upper':flags[1]?'lower':flags[2]?'exit':'side';
  if(boundary==='upper')end.pos[1]=COLLECTION.upperY;
  else if(boundary==='lower')end.pos[1]=COLLECTION.lowerY;
  else if(boundary==='exit')end.pos[0]=COLLECTION.exitX;
  return {...end,used:hi,boundary};
}
export function stepCollection(state,dt){
  if(!Number.isFinite(dt)||dt<0)throw new TypeError('Time step must be finite and non-negative.');
  if(state.done||dt===0)return state;
  let remaining=dt;
  while(remaining>1e-12&&!state.done){
    const step=Math.min(COLLECTION.maxStep,remaining),start=state.time,end=start+step;
    for(const p of state.particles){
      if(p.status==='waiting'&&p.born<=end){p.status='flying';state.emitted++;p.trace.push([...p.pos]);}
      if(p.status!=='flying')continue;
      const begin=Math.max(start,p.born),duration=end-begin;if(duration<=0)continue;
      const beforeY=p.pos[1],sample=integrateParticle(p,duration,state.field,airflow(begin+duration/2));
      p.electricWork+=p.charge*state.field*(sample.pos[1]-beforeY);
      p.pos=sample.pos;p.vel=sample.vel;
      if(sample.boundary){
        const inPatch=sample.boundary==='upper'&&p.pos[0]>=COLLECTION.targetX[0]&&p.pos[0]<=COLLECTION.targetX[1]&&Math.abs(p.pos[2])<=COLLECTION.targetZ[1];
        p.status=inPatch?'collected':sample.boundary==='exit'?'escaped':'missed';
        p.arrival=begin+sample.used;p.impact=[...p.pos];p.boundary=sample.boundary;
        state[inPatch?'hits':sample.boundary==='exit'?'escaped':'misses']++;
      }
      if(sample.boundary||end-p.lastTraceTime>=state.traceInterval){p.trace.push([...p.pos]);p.lastTraceTime=end;}
    }
    state.time=end;remaining-=step;
    state.done=state.hits+state.misses+state.escaped===COLLECTION.count;
  }
  return state;
}
export function collectionSummary(state){
  const active=state.particles.filter(p=>p.status==='flying');
  const tracked=active[Math.floor(active.length/2)]||null;
  return {time:state.time,field:state.field,wind:airflow(state.time),emitted:state.emitted,
    hits:state.hits,misses:state.misses,escaped:state.escaped,active:active.length,
    speed:tracked?Math.hypot(...tracked.vel):null,tracked,done:state.done,
    passed:state.done&&state.hits>=COLLECTION.goal&&state.escaped===0};
}
export function collectionSnapshot(state){
  return {hits:state.hits,misses:state.misses,escaped:state.escaped,time:state.time,
    particles:state.particles.map(p=>({status:p.status,trace:p.trace.map(pos=>[...pos])}))};
}
