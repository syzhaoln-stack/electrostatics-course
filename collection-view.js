import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {COLLECTION,airflow} from './collection-physics.js';
const SCALE=28, GOLD='#f2ce8c',MINT='#91e3c8',CYAN='#68b9db';
const world=p=>new THREE.Vector3(...p).multiplyScalar(SCALE),vec=p=>new THREE.Vector3(...p);
export function createCollectionView(host,{onFieldChange=()=>{}}={}){
  let field=COLLECTION.initialField,mode='space',lastState=null,historyVisible=true,disposed=false;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#071119');scene.fog=new THREE.Fog('#071119',35,65);
  const camera=new THREE.PerspectiveCamera(35,1,.1,120);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.append(renderer.domElement);
  const envCanvas=document.createElement('canvas');envCanvas.width=1024;envCanvas.height=512;const envContext=envCanvas.getContext('2d'),gradient=envContext.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#859a9e');gradient.addColorStop(.48,'#273e49');gradient.addColorStop(1,'#061017');envContext.fillStyle=gradient;envContext.fillRect(0,0,1024,512);for(const [x,width,fill] of [[110,70,'#e1e7df'],[480,150,'#7cabb9'],[850,40,'#eddbb9']]){envContext.fillStyle=fill;envContext.fillRect(x,80,width,220);}const environmentSource=new THREE.CanvasTexture(envCanvas);environmentSource.mapping=THREE.EquirectangularReflectionMapping;const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(environmentSource);scene.environment=environment.texture;environmentSource.dispose();pmrem.dispose();
  const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.enablePan=false;orbit.minDistance=14;orbit.maxDistance=50;orbit.minPolarAngle=.18;orbit.maxPolarAngle=Math.PI-.18;
  scene.add(new THREE.HemisphereLight('#cde5e4','#0d1b22',2));
  const key=new THREE.DirectionalLight('#f8e1b1',3);key.position.set(-5,10,9);scene.add(key);
  const rim=new THREE.DirectionalLight('#8ac9e7',2.5);rim.position.set(6,2,-6);scene.add(rim);
  const apparatus=new THREE.Group(),arrows=new THREE.Group(),history=new THREE.Group();scene.add(apparatus,arrows,history);
  function material(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1,side:THREE.DoubleSide});}
  function lines(points,color,opacity=.5,parent=apparatus){const mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(world)),new THREE.LineBasicMaterial({color,transparent:true,opacity}));parent.add(mesh);return mesh;}
  function box(size,pos,mat,parent=apparatus){const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size.map(x=>x*SCALE)),mat);mesh.position.copy(world(pos));parent.add(mesh);return mesh;}
  function brushedTexture(){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;const context=canvas.getContext('2d');context.fillStyle='#76858b';context.fillRect(0,0,512,64);for(let y=0;y<64;y++){context.fillStyle=`rgba(220,233,232,${.02+.07*(.5+.5*Math.sin(y*19.83))})`;context.fillRect(0,y,512,1);}const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,1);return texture;}
  const metal=new THREE.MeshStandardMaterial({color:'#68868b',metalness:.78,roughness:.32,map:brushedTexture()});
  const darkMetal=new THREE.MeshStandardMaterial({color:'#23373e',metalness:.76,roughness:.30});
  for(const y of [-.05,.05]){
    box([.64,.003,.006],[0,y,-.063],metal);box([.64,.003,.006],[0,y,.063],metal);
    const plate=new THREE.Mesh(new THREE.PlaneGeometry(.64*SCALE,.12*SCALE),material('#517e82',.055));plate.rotation.x=-Math.PI/2;plate.position.y=y*SCALE;apparatus.add(plate);
    for(const x of [-.32,.32])box([.004,.003,.126],[x,y,0],metal);
  }
  for(const x of [-.32,.32])for(const z of [-.063,.063])box([.004,.1,.004],[x,0,z],darkMetal);
  for(const z of [-.063,.063])lines([[-.32,0,z],[.32,0,z]],'#66898c',.14);
  // Collecting patch is on the inner face of one plate, not a force-producing small electrode.
  const target=new THREE.Mesh(new THREE.PlaneGeometry(.22*SCALE,.09*SCALE),material(MINT,.13));target.rotation.x=-Math.PI/2;target.position.copy(world([.09,.0498,0]));apparatus.add(target);
  lines([[-.02,.0496,-.045],[.20,.0496,-.045],[.20,.0496,.045],[-.02,.0496,.045],[-.02,.0496,-.045]],MINT,.9);
  for(let x=-.01;x<.20;x+=.02)lines([[x,.0495,-.044],[x,.0495,.044]],MINT,.13);
  for(const z of [-.03,0,.03])lines([[-.019,.0495,z],[.199,.0495,z]],MINT,.12);
  for(const x of [-.32,.32]){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.021*SCALE,.0015*SCALE,10,72),material(x<0?GOLD:'#a77265',.6));ring.rotation.y=Math.PI/2;ring.position.copy(world([x,0,0]));apparatus.add(ring);
  }
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.022*SCALE,.026*SCALE,.035*SCALE,48,1,true),darkMetal);pipe.rotation.z=Math.PI/2;pipe.position.copy(world([-.343,0,0]));apparatus.add(pipe);
  for(let i=0;i<10;i++){const y=-.045+i*.01;lines([[.323,y,-.055],[.323,y,.055]],'#b57666',.10);}
  const planeFloor=new THREE.Mesh(new THREE.PlaneGeometry(28,14),new THREE.MeshStandardMaterial({color:'#07131a',metalness:.15,roughness:.75}));planeFloor.rotation.x=-Math.PI/2;planeFloor.position.y=-3.1;scene.add(planeFloor);
  const particleMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,12,10),material(GOLD),100);
  const impactMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.055,12,10),material(MINT),100);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);impactMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particleMesh.frustumCulled=impactMesh.frustumCulled=false;scene.add(particleMesh,impactMesh);
  const pose=new THREE.Object3D(),color=new THREE.Color();
  const trailCapacity=100*300*6,trailArray=new Float32Array(trailCapacity),trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailArray,3).setUsage(THREE.DynamicDrawUsage));trailGeometry.setDrawRange(0,0);
  const trail=new THREE.LineSegments(trailGeometry,new THREE.LineBasicMaterial({color:GOLD,transparent:true,opacity:.25}));trail.frustumCulled=false;scene.add(trail);
  const airArray=new Float32Array(20*6),airGeometry=new THREE.BufferGeometry();airGeometry.setAttribute('position',new THREE.BufferAttribute(airArray,3).setUsage(THREE.DynamicDrawUsage));const air=new THREE.LineSegments(airGeometry,new THREE.LineBasicMaterial({color:'#9dd9d4',transparent:true,opacity:.095}));air.frustumCulled=false;scene.add(air);
  const eArrow=new THREE.ArrowHelper(vec([0,-1,0]),vec([0,0,0]),.5,CYAN,.13,.065),fArrow=new THREE.ArrowHelper(vec([0,1,0]),vec([0,0,0]),.5,GOLD,.13,.065),vArrow=new THREE.ArrowHelper(vec([1,0,0]),vec([0,0,0]),1,'#d5e6df',.12,.06);scene.add(eArrow,fArrow,vArrow);
  const arrowSamples=[];for(const x of [-.22,-.11,0,.11,.22])for(const z of [-.035,.035])for(const y of [-.027,.02]){
    const arrow=new THREE.ArrowHelper(vec([0,-1,0]),world([x,y,z]),.45,CYAN,.11,.045);arrow.line.material.transparent=arrow.cone.material.transparent=true;arrow.line.material.opacity=.42;arrow.cone.material.opacity=.7;arrows.add(arrow);arrowSamples.push(arrow);
  }
  const overlay=document.createElement('div');overlay.className='collection-overlay';host.append(overlay);
  function label(text,cls){const e=document.createElement('span');e.className=`world-label ${cls}`;e.textContent=text;overlay.append(e);return e;}
  const targetLabel=label('收集侧壁 · 亮区','target'),exitLabel=label('出口：不能穿过','exit'),entryLabel=label('负电粉尘 →','entry');
  const eLabel=label('E','electric'),fLabel=label('F','force'),vLabel=label('v','velocity');
  const fieldValue=label('','field-value'),fieldTop=label('向亮区偏转 ↑','field-top'),fieldBottom=label('↓ 反向偏转','field-bottom');
  const handle=document.createElement('button');handle.className='field-grip';handle.type='button';handle.textContent='↕';handle.setAttribute('role','slider');handle.setAttribute('aria-label','实时调节电场。上推增强向上收集力；负电粉尘的受力与电场方向相反。');handle.setAttribute('aria-valuemin',String(-COLLECTION.maxField));handle.setAttribute('aria-valuemax',String(COLLECTION.maxField));handle.setAttribute('aria-orientation','vertical');overlay.append(handle);
  const base=world([-.235,0,.096]);lines([[-.235,-.045,.096],[-.235,.045,.096]],GOLD,.28);lines([[-.239,0,.096],[-.231,0,.096]],GOLD,.5);
  function screen(point){const p=point.clone().project(camera);return {x:(p.x+1)*host.clientWidth/2,y:(1-p.y)*host.clientHeight/2,visible:p.z<1&&Math.abs(p.x)<1.1&&Math.abs(p.y)<1.1};}
  function put(element,point,dx=0,dy=0){const p=screen(point);element.style.left=`${p.x+dx}px`;element.style.top=`${p.y+dy}px`;element.hidden=!p.visible;}
  let drag=null;
  handle.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();handle.focus({preventScroll:true});const a=screen(base),b=screen(base.clone().add(vec([0,1,0]))),unit=new THREE.Vector2(b.x-a.x,b.y-a.y);drag={x:event.clientX,y:event.clientY,field,unit:unit.clone().normalize(),pixels:Math.max(14,unit.length())};orbit.enabled=false;handle.classList.add('dragging');handle.setPointerCapture(event.pointerId);});
  handle.addEventListener('pointermove',event=>{if(!drag)return;event.preventDefault();const delta=((event.clientX-drag.x)*drag.unit.x+(event.clientY-drag.y)*drag.unit.y)/drag.pixels;onFieldChange(Math.round((drag.field-delta*COLLECTION.maxField/(.045*SCALE))/1000)*1000);});
  const release=()=>{drag=null;orbit.enabled=true;handle.classList.remove('dragging');};for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,release);
  handle.addEventListener('keydown',event=>{if(!['ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();onFieldChange(event.key==='Home'?0:field+(event.key==='ArrowUp'?-1:1)*(event.shiftKey?20000:5000));});
  function updateField(value){field=value;const sign=Math.sign(value),length=.16+.52*Math.sqrt(Math.abs(field)/COLLECTION.maxField);for(const arrow of arrowSamples){arrow.visible=!!sign;if(sign){arrow.setDirection(vec([0,sign,0]));arrow.setLength(length,.10,.045);}}}
  function fit(){const aspect=Math.max(1,host.clientWidth)/Math.max(1,host.clientHeight);camera.aspect=aspect;const distance=Math.max(18.8,23/aspect*1.45);camera.position.copy(mode==='front'?vec([0,.2,distance]):vec([distance*.12,distance*.32,distance]));camera.lookAt(0,0,0);camera.updateProjectionMatrix();orbit.target.set(0,0,0);orbit.update();}
  function draw(state,clock=0){
    if(disposed)return;lastState=state;const active=state.particles.filter(p=>p.status==='flying'),tracked=active[Math.floor(active.length/2)];
    let n=0;
    state.particles.forEach((p,i)=>{
      pose.position.copy(world(p.pos));pose.scale.setScalar(p.status==='flying'?Math.max(.65,p.radius/COLLECTION.radius):0);if(state.time===0&&i===0){pose.position.copy(world([-.06,-.005,0]));pose.scale.setScalar(1.3);}pose.updateMatrix();particleMesh.setMatrixAt(i,pose.matrix);
      const impact=['collected','missed','escaped'].includes(p.status);pose.scale.setScalar(impact?1:0);if(impact){color.set(p.status==='collected'?MINT:p.status==='escaped'?'#e99f88':'#9b8675');pose.scale.multiplyScalar(1+Math.max(0,1-(state.time-p.arrival)*4));}pose.updateMatrix();impactMesh.setMatrixAt(i,pose.matrix);impactMesh.setColorAt(i,color);
      for(let j=1;j<p.trace.length&&n+6<=trailArray.length;j++){for(const point of [p.trace[j-1],p.trace[j]])for(const coordinate of point)trailArray[n++]=coordinate*SCALE;}
    });
    particleMesh.instanceMatrix.needsUpdate=true;impactMesh.instanceMatrix.needsUpdate=true;if(impactMesh.instanceColor)impactMesh.instanceColor.needsUpdate=true;trailGeometry.attributes.position.needsUpdate=true;trailGeometry.setDrawRange(0,n/3);
    const phase=state.time>0?state.time:clock*.12;for(let i=0;i<20;i++){const x=-.32+((phase*airflow(state.time)+i*.037)%.64),y=-.041+(i%5)*.019,z=-.052+(i%4)*.035;airArray.set([x*SCALE,y*SCALE,z*SCALE,(x+.012)*SCALE,y*SCALE,z*SCALE],i*6);}airGeometry.attributes.position.needsUpdate=true;
    const sign=Math.sign(field),point=tracked?world(tracked.pos):world([-.06,-.005,0]),length=.35+.4*Math.sqrt(Math.abs(field)/COLLECTION.maxField);
    for(const [arrow,s] of [[eArrow,sign],[fArrow,-sign]]){arrow.visible=!!sign;arrow.position.copy(point);if(sign){arrow.setDirection(vec([0,s,0]));arrow.setLength(length,.13,.065);}}
    vArrow.visible=!!tracked;if(tracked){vArrow.position.copy(point);vArrow.setDirection(vec(tracked.vel).normalize());vArrow.setLength(.7+Math.hypot(...tracked.vel)*1.7,.13,.065);}
    orbit.update();put(targetLabel,world([.09,.075,-.01]));put(exitLabel,world([.355,-.006,0]));put(entryLabel,world([-.342,-.04,0]));
    if(sign){put(eLabel,point.clone().add(vec([0,sign*(length+.17),0])),8);put(fLabel,point.clone().add(vec([0,-sign*(length+.17),0])),8);}else eLabel.hidden=fLabel.hidden=true;
    if(tracked)put(vLabel,point.clone().add(vec(tracked.vel).normalize().multiplyScalar(vArrow.line.scale.y+.25)),0,-6);else vLabel.hidden=true;
    const handlePoint=base.clone().add(vec([0,-field/COLLECTION.maxField*.045*SCALE,0]));put(handle,handlePoint);put(fieldValue,base,75,0);put(fieldTop,base.clone().add(vec([0,.060*SCALE,0])),0,-5);put(fieldBottom,base.clone().add(vec([0,-.061*SCALE,0])),0,8);
    fieldValue.textContent=`E ${Math.abs(field/1000).toFixed(0)} kV/m ${field<0?'↓':field>0?'↑':'·'}`;handle.setAttribute('aria-valuenow',String(field));handle.setAttribute('aria-valuetext',`电场 ${Math.abs(field/1000).toFixed(0)} 千伏每米，${field<0?'向下，负粉尘向上受力':field>0?'向上，负粉尘向下受力':'没有电场力'}`);
    target.material.opacity=.13+.025*(.5+.5*Math.sin(clock*2));history.visible=historyVisible;host.dataset.forceOpposesField=sign?'true':'zero';host.dataset.activeParticles=String(active.length);host.dataset.trailVertices=String(n/3);renderer.render(scene,camera);
  }
  const observer=new ResizeObserver(()=>{renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);fit();if(lastState)draw(lastState);});observer.observe(host);updateField(field);fit();
  return {draw,setField:updateField,view(value){mode=value;fit();},showHistory(value){historyVisible=value;},remember(snapshot){for(const child of [...history.children]){child.geometry.dispose();child.material.dispose();history.remove(child);}if(snapshot){const points=[];for(const p of snapshot.particles)for(let i=1;i<p.trace.length;i++)points.push(...p.trace[i-1].map(x=>x*SCALE),...p.trace[i].map(x=>x*SCALE));const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));history.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#7c9599',transparent:true,opacity:.19})));}host.dataset.historyParticles=String(snapshot?.particles.length||0);},dispose(){disposed=true;observer.disconnect();orbit.dispose();scene.traverse(object=>{object.geometry?.dispose();if(object.material)for(const mat of Array.isArray(object.material)?object.material:[object.material]){mat.map?.dispose();mat.dispose();}});environment.dispose();renderer.dispose();renderer.domElement.remove();overlay.remove();}};
}
