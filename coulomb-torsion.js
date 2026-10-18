import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {torsionState,sectionAngle,relativeCompliance} from './coulomb-torsion-physics.js';

const DEG=Math.PI/180;
const COLOR={gold:0xe1c387,blue:0x86c9df,red:0xe6a18c};
let instanceCount=0;

/** Magnified, linked torsion detail. Input angles are degrees from the balance.
 * A gold material line illustrates section rotation; the cylinder's axis never
 * bends. Clamps and surface finish are explanatory reconstruction, not a claim
 * to reproduce an undocumented original clamp profile. */
export function mountTorsion(host){
  const uid=`ct-${++instanceCount}`;
  host.classList.add('coulomb-torsion');
  host.innerHTML=`<div class="ct-toolbar"><strong class="ct-title">细银丝，怎样把力变成转角？</strong><div class="ct-tabs" role="group" aria-label="银丝观察模式"><button data-ct-mode="twist" aria-pressed="true">看清扭转</button><button data-ct-mode="length" aria-pressed="false">同一个力，换一根长丝</button></div></div><div class="ct-body" data-mode="twist"><div class="ct-stage"><div class="ct-figure-note"><b>一根直丝，两端方向不同</b><span>金线贴在丝的表面，帮助看见各截面转了多少。</span></div><div class="ct-readout" aria-live="off"><span class="ct-label">两端相对扭转 θ</span><span class="ct-value">0°</span><span class="ct-equation">α + β = 0°</span></div><div class="ct-hint">拖动下端夹头试扭 · 拖动空白旋转观察</div><div class="ct-legend"><span>↻ 外加力矩</span><span>↺ 银丝回复力矩</span></div></div></div><div class="ct-bottom"><div class="ct-bottom-row"><div class="ct-status" id="${uid}-status">与电秤读数同步</div><div class="ct-actions"><button data-ct-action="twist">扭转一下</button><button data-ct-action="release" class="ct-button-hidden">松开下端</button><button data-ct-action="link" class="ct-button-hidden">返回电秤读数</button></div></div><p class="ct-caption">银丝粗度已放大。金线、转角圆弧和箭头为现代教学标记；夹头细节为结构示意。<b>银丝保持笔直，扭转不是弯成弹簧。</b></p></div>`;
  const stage=host.querySelector('.ct-stage'),body=host.querySelector('.ct-body'),title=host.querySelector('.ct-figure-note b'),note=host.querySelector('.ct-figure-note span'),label=host.querySelector('.ct-label'),value=host.querySelector('.ct-value'),equation=host.querySelector('.ct-equation'),status=host.querySelector('.ct-status'),hint=host.querySelector('.ct-hint'),caption=host.querySelector('.ct-caption');
  const buttons=Object.fromEntries([...host.querySelectorAll('[data-ct-action]')].map(b=>[b.dataset.ctAction,b]));
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x0d151b,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;stage.prepend(renderer.domElement);
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','可旋转的银丝扭转模型。拖下端夹头可试扭；键盘左右键每次转动十度，Escape 恢复电秤状态。');renderer.domElement.setAttribute('aria-describedby',`${uid}-status`);
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.05,80);camera.position.set(3.5,5.3,13.5);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,3.25,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=8;controls.maxDistance=22;controls.minPolarAngle=.7;controls.maxPolarAngle=1.85;
  // Broad softbox reflections reveal real curved metal instead of flat grey.
  const envCanvas=document.createElement('canvas');envCanvas.width=1024;envCanvas.height=512;const ec=envCanvas.getContext('2d');
  const grad=ec.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#8997a5');grad.addColorStop(.36,'#263745');grad.addColorStop(.65,'#10191f');grad.addColorStop(1,'#41515d');ec.fillStyle=grad;ec.fillRect(0,0,1024,512);
  for(const [x,w,c]of[[90,70,'#e5edf1'],[410,18,'#b8cdd6'],[680,110,'#a1b7c8'],[925,28,'#eadabf']]){ec.fillStyle=c;ec.fillRect(x,85,w,300);}
  const envTexture=new THREE.CanvasTexture(envCanvas);envTexture.mapping=THREE.EquirectangularReflectionMapping;envTexture.colorSpace=THREE.SRGBColorSpace;const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(envTexture);pmrem.dispose();scene.environment=environment.texture;scene.environmentIntensity=1.1;
  const silver=new THREE.MeshStandardMaterial({color:0xe0e5ea,metalness:1,roughness:.18}),steel=new THREE.MeshStandardMaterial({color:0x8999a7,metalness:.94,roughness:.24}),edge=new THREE.MeshStandardMaterial({color:0xc0ccd3,metalness:.98,roughness:.16}),dark=new THREE.MeshStandardMaterial({color:0x1c2731,metalness:.7,roughness:.38}),gold=new THREE.MeshStandardMaterial({color:COLOR.gold,metalness:.45,roughness:.32,emissive:0x4d3008,emissiveIntensity:.25});
  scene.add(new THREE.HemisphereLight(0xd4e3ee,0x27313c,1));const key=new THREE.DirectionalLight(0xf5f2e9,4);key.position.set(3,7,7);scene.add(key);const rim=new THREE.DirectionalLight(0xa5cbe5,3);rim.position.set(-4,5,-3);scene.add(rim);
  const model=new THREE.Group();scene.add(model);
  function mesh(geometry,material,parent,pos=[0,0,0]){const o=new THREE.Mesh(geometry,material);o.position.set(...pos);parent.add(o);return o;}
  function cylinder(r,h,material,parent,pos=[0,0,0],segments=64){return mesh(new THREE.CylinderGeometry(r,r,h,segments),material,parent,pos);}
  function rod(a,b,r,material,parent){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);const o=cylinder(r,d.length(),material,parent,av.clone().add(bv).multiplyScalar(.5).toArray(),24);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;}
  function lathe(profile,material,parent){return mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),96),material,parent);}
  function makeClamp(parent,y,upper){const g=new THREE.Group();g.position.y=y;parent.add(g);
    // Turned shoulders with a narrow collet, a slotted screw and engraved index.
    const profile=[[0,-.29],[.11,-.29],[.135,-.26],[.135,-.13],[.21,-.11],[.225,-.08],[.225,.08],[.21,.11],[.135,.13],[.135,.26],[.11,.29],[0,.29]];
    lathe(profile,steel,g);for(const yy of[-.09,.09]){const ring=mesh(new THREE.TorusGeometry(.219,.008,8,96),edge,g,[0,yy,0]);ring.rotation.x=Math.PI/2;}
    const screw=cylinder(.063,.035,edge,g,[0,0,.225],48);screw.rotation.x=Math.PI/2;mesh(new THREE.BoxGeometry(.075,.011,.007),dark,g,[0,0,.246]);
    rod([0,.105,0],[.44,.105,0],.017,gold,g);cylinder(.027,.055,gold,g,[.44,.105,0],24);
    if(!upper){rod([-.73,-.13,0],[.75,-.13,0],.025,edge,g);cylinder(.068,.12,steel,g,[.72,-.13,0],40);cylinder(.068,.12,steel,g,[-.72,-.13,0],40);}
    const hit=cylinder(.40,.70,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),g);hit.userData.clamp=true;return {group:g,hit};
  }
  const labels=[];function callout(text){const e=document.createElement('div');e.className='ct-callout';e.innerHTML=text;stage.append(e);labels.push(e);return e;}
  function curveArrow(parent,r,y,color,sign=1){const g=new THREE.Group();parent.add(g);const points=Array.from({length:80},(_,i)=>{const a=(.1+i/79*1.65)*sign;return new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a));});const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));g.add(line);const end=points.at(-1),a=1.75*sign,dir=new THREE.Vector3(-Math.sin(a)*sign,0,Math.cos(a)*sign);const head=mesh(new THREE.ConeGeometry(.055,.15,24),new THREE.MeshBasicMaterial({color}),g,end.toArray());head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);return g;}
  function makeWire(x,topY,bottomY,{radius=.044,macro=false}={}){const g=new THREE.Group();g.position.x=x;model.add(g);const length=topY-bottomY;
    cylinder(radius,length,silver,g,[0,(topY+bottomY)/2,0],96);
    let top,bottom;
    if(!macro){top=makeClamp(g,topY+.17,true);bottom=makeClamp(g,bottomY-.17,false);}
    else{const cap=y=>{const group=new THREE.Group();group.position.y=y;g.add(group);cylinder(radius+.008,.018,edge,group);rod([0,.014,0],[radius+.13,.014,0],.012,gold,group);const hit=cylinder(radius+.18,.3,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),group);return {group,hit};};top=cap(topY);bottom=cap(bottomY);}
    // A narrow, flush ribbon is a material line on a solid cylinder. Its radius
    // stays constant; never model a free-standing helical tube as the wire.
    const steps=240,positions=new Float32Array((steps+1)*2*3),indices=[];
    for(let i=0;i<steps;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();const strip=mesh(geo,new THREE.MeshBasicMaterial({color:COLOR.gold,side:THREE.DoubleSide}),g);if(macro){const opposite=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xb1a077,side:THREE.DoubleSide}));opposite.rotation.y=Math.PI;g.add(opposite);}
    const tickGroups=[];for(const u of[0,.25,.5,.75,1]){const tick=new THREE.Group();tick.position.y=bottomY+u*length;g.add(tick);rod([radius,0,0],[radius+.10,0,0],.007,gold,tick);tickGroups.push({tick,u});}
    const restoring=curveArrow(g,.57,bottomY-.17,COLOR.blue,-1),applied=curveArrow(g,.86,bottomY-.17,COLOR.red,1);
    const topLabel=callout('上端'),bottomLabel=callout('下端');
    function update(a,b,active=true){top.group.rotation.y=b*DEG;bottom.group.rotation.y=-a*DEG;for(let i=0;i<=steps;i++){const u=i/steps,angle=sectionAngle(u,{alpha:a,beta:b})*DEG;for(let s=0;s<2;s++){const phi=angle+(s?1:-1)*.11,idx=(i*2+s)*3;positions[idx]=Math.cos(phi)*(radius+.0006);positions[idx+1]=bottomY+u*length;positions[idx+2]=Math.sin(phi)*(radius+.0006);}}
      geo.attributes.position.needsUpdate=true;geo.computeBoundingSphere();for(const {tick,u}of tickGroups)tick.rotation.y=-sectionAngle(u,{alpha:a,beta:b})*DEG;
      const twist=a+b;restoring.visible=Math.abs(twist)>.3;applied.visible=active&&Math.abs(twist)>.3;const flip=twist>=0?1:-1;restoring.scale.z=flip;applied.scale.z=flip;
    }
    return {group:g,top,bottom,topY,bottomY,x,topLabel,bottomLabel,update,macro};
  }
  const linkedWire=makeWire(-1.7,6,.65),magnifiedWire=makeWire(2.05,5.6,1.05,{radius:.36,macro:true}),shortWire=makeWire(-1.85,6,3.4),longWire=makeWire(1.85,6,.8);
  shortWire.group.visible=longWire.group.visible=false;
  let current={alpha:0,beta:0,charged:false},shown={alpha:0,beta:0},mode='twist',demo=false,release=false,releaseTime=0,releaseStart=0,drag=null,force=1,disposed=false,visible=true,last=0,raf=0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function num(n){return Math.abs(n)<.05?'0':Number(n.toFixed(1)).toString();}
  function updateUI(){const s=torsionState(demo?{alpha:shown.alpha,beta:shown.beta}:current);if(mode==='twist'){
    value.textContent=`${num(s.twist)}°`;equation.textContent=`α ${num(s.bottom)}° + β ${num(-s.top)}°`;
    status.innerHTML=demo?`<span class="ct-demo">${release?'松手后，银丝带着下端扭回。运动周期为示意。':'试扭模式：上端不动，下端转动。'}</span>`:`<span class="ct-live">与上方电秤同步</span>　回复力矩 <strong>τ = −κθ</strong>，总与相对扭转方向相反。`;
    buttons.twist.classList.toggle('ct-button-hidden',demo);buttons.release.classList.toggle('ct-button-hidden',!demo||release);buttons.link.classList.toggle('ct-button-hidden',!demo);
  }else{value.textContent=`${num(25*force)}° → ${num(50*force)}°`;equation.innerHTML='长度 L → 2L · 转角 θ → 2θ';status.innerHTML='<span class="ct-comparison-equation">κ = GπD⁴ / (32L)</span>　同材料、同丝径、同力矩：<strong>长一倍，转角大一倍。</strong>';Object.values(buttons).forEach(b=>b.classList.add('ct-button-hidden'));}
  }
  function setMode(next){mode=next;body.dataset.mode=mode;host.querySelectorAll('[data-ct-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ctMode===mode)));linkedWire.group.visible=magnifiedWire.group.visible=mode==='twist';shortWire.group.visible=longWire.group.visible=mode==='length';
    title.textContent=mode==='twist'?'一根直丝，两端方向不同':'同样细的银丝，长一倍会怎样？';note.textContent=mode==='twist'?'右侧把丝径放大，金线紧贴表面。':'两根丝同时承受相同的小力矩。拖动下端，比较偏转。';label.textContent=mode==='twist'?'两端相对扭转 θ':'相同力矩下的偏转';hint.textContent=mode==='twist'?'拖动下端夹头试扭 · 拖动空白旋转观察':'拖动任一下端：同时改变两个相同的力矩';caption.innerHTML=mode==='twist'?'右侧将丝径额外放大。金线、转角圆弧和箭头为现代教学标记；夹头细节为结构示意。<b>银丝保持笔直，扭转不是弯成弹簧。</b>':'现代线弹性示意，比较时材料、丝径和力臂相同，力矩也相同。长丝提高角度灵敏度，但实际可测最小力还取决于振动、漂移和读数噪声。';camera.position.set(mode==='twist'?3.5:5.5,mode==='twist'?5.3:5.7,mode==='twist'?13.5:14);controls.target.set(0,3.25,0);updateUI();}
  const onClick=e=>{const m=e.target.closest('[data-ct-mode]'),a=e.target.closest('[data-ct-action]');if(m)setMode(m.dataset.ctMode);if(a){if(a.dataset.ctAction==='twist'){demo=true;release=false;shown={alpha:72,beta:0};}if(a.dataset.ctAction==='release'){release=true;releaseTime=0;releaseStart=shown.alpha;}if(a.dataset.ctAction==='link'){demo=false;release=false;}updateUI();}};host.addEventListener('click',onClick);
  const ray=new THREE.Raycaster();function pointerDown(e){if(e.button!==0)return;const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);const wires=mode==='twist'?[linkedWire,magnifiedWire]:[shortWire,longWire];const hit=ray.intersectObjects(wires.map(w=>w.bottom.hit),false);if(!hit.length)return;drag={x:e.clientX,angle:shown.alpha,force};controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();if(mode==='twist'){demo=true;release=false;shown.beta=0;}renderer.domElement.style.cursor='ew-resize';updateUI();}
  function pointerMove(e){if(!drag)return;if(mode==='twist')shown.alpha=THREE.MathUtils.clamp(drag.angle+(e.clientX-drag.x)*.85,-180,180);else force=THREE.MathUtils.clamp(drag.force+(e.clientX-drag.x)*.012,.1,2.6);updateUI();}
  function pointerUp(){drag=null;controls.enabled=true;renderer.domElement.style.cursor='grab';}
  function keydown(e){if(e.key==='Escape'){demo=false;release=false;updateUI();}else if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();if(mode==='twist'){demo=true;release=false;shown.beta=0;shown.alpha=THREE.MathUtils.clamp(shown.alpha+(e.key==='ArrowRight'?10:-10),-180,180);}else force=THREE.MathUtils.clamp(force+(e.key==='ArrowRight'?.1:-.1),.1,2.6);updateUI();}}
  renderer.domElement.addEventListener('pointerdown',pointerDown,true);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',pointerUp);renderer.domElement.addEventListener('keydown',keydown);renderer.domElement.style.cursor='grab';
  function project(el,x,y,z){const p=new THREE.Vector3(x,y,z).project(camera);el.style.left=`${(p.x*.5+.5)*stage.clientWidth}px`;el.style.top=`${(-p.y*.5+.5)*stage.clientHeight}px`;el.style.transform='translate(-50%,-50%)';el.style.display=Math.abs(p.x)<.95&&Math.abs(p.y)<.95&&p.z<1?'block':'none';}
  function frame(ms){if(disposed)return;raf=requestAnimationFrame(frame);const dt=Math.min((ms-last)/1000||.016,.05);last=ms;if(!visible)return;
    if(!demo){const f=reduced?1:1-Math.exp(-9*dt);shown.alpha+=(current.alpha-shown.alpha)*f;shown.beta+=(current.beta-shown.beta)*f;}else if(release){releaseTime+=dt;shown.alpha=reduced?0:releaseStart*Math.exp(-1.25*releaseTime)*Math.cos(4.7*releaseTime);shown.beta=0;if(releaseTime>5){shown.alpha=0;release=false;}updateUI();}
    if(mode==='twist'){linkedWire.update(shown.alpha,shown.beta,!release&&(demo||current.charged));magnifiedWire.update(shown.alpha,shown.beta,!release&&(demo||current.charged));linkedWire.topLabel.innerHTML=`上端 <strong>−β = ${num(-shown.beta)}°</strong>`;linkedWire.bottomLabel.innerHTML=`下端 <strong>+α = ${num(shown.alpha)}°</strong>`;magnifiedWire.topLabel.innerHTML='<strong>丝径放大</strong> · 同一根直丝';magnifiedWire.bottomLabel.innerHTML='截面相对转动 · 轴线保持笔直';}else{shortWire.update(25*force*relativeCompliance({length:1}),0);longWire.update(25*force*relativeCompliance({length:2}),0);shortWire.topLabel.innerHTML='相同材料 · 相同丝径';longWire.topLabel.innerHTML='相同材料 · 相同丝径';shortWire.bottomLabel.innerHTML=`长度 L · <strong>${num(25*force)}°</strong>`;longWire.bottomLabel.innerHTML=`长度 2L · <strong>${num(50*force)}°</strong>`;}
    controls.update();renderer.render(scene,camera);for(const w of[linkedWire,magnifiedWire,shortWire,longWire]){if(!w.group.visible){w.topLabel.style.display=w.bottomLabel.style.display='none';continue;}project(w.topLabel,w.x+(w.macro?0:.63),w.topY+.3,0);project(w.bottomLabel,w.x+(w.macro?0:.72),w.bottomY-.7,0);}
  }
  const resize=new ResizeObserver(()=>{const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(stage);const observer=new IntersectionObserver(es=>{visible=es[0].isIntersecting;},{rootMargin:'150px'});observer.observe(host);setMode('twist');raf=requestAnimationFrame(frame);
  return {set(s={}){current={alpha:Number.isFinite(s.alpha)?s.alpha:0,beta:Number.isFinite(s.beta)?s.beta:0,charged:!!s.charged};if(!demo)updateUI();},dispose(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();controls.dispose();host.removeEventListener('click',onClick);const materials=new Set();scene.traverse(o=>{o.geometry?.dispose();for(const mat of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(mat);});materials.forEach(m=>m.dispose());environment.dispose();envTexture.dispose();renderer.dispose();host.replaceChildren();host.classList.remove('coulomb-torsion');}};
}
