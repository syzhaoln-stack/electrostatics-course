import * as THREE from 'three';

/** Camera-only orthographic projections. Never rewrite physical coordinates. */
export function createDimensionView({host,stage,getCamera,setCamera,controls}){
 let mode='3d',saved=null,orthographic=null,height=10;
 const align=()=>{
  if(mode==='3d')return;
  const camera=getCamera(),aspect=Math.max(stage.clientWidth,1)/Math.max(stage.clientHeight,1);
  camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.aspect=aspect;
  const direction=mode==='xy'?[0,0,1]:mode==='xz'?[0,-1,0]:[1,0,0];
  camera.position.copy(saved.target).addScaledVector(new THREE.Vector3(...direction),saved.distance);
  camera.up.set(...(mode==='xy'?[0,1,0]:[0,0,1]));camera.lookAt(saved.target);camera.updateProjectionMatrix();
  controls.target.copy(saved.target);controls.enableRotate=false;
 };
 function setMode(next){
  if(!['3d','xy','xz','yz'].includes(next)||next===mode)return;
  if(mode==='3d'){
   const camera=getCamera();saved={camera,position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),target:controls.target.clone(),distance:camera.position.distanceTo(controls.target),rotate:controls.enableRotate,damping:controls.enableDamping};
   height=1.44*saved.distance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
   controls.enableDamping=false;controls.update();
   orthographic=new THREE.OrthographicCamera(-5,5,5,-5,.01,Math.max(camera.far,200));
   orthographic.layers.mask=camera.layers.mask;orthographic.aspect=camera.aspect;
   setCamera(orthographic);controls.object=orthographic;
  }
  mode=next;
  if(mode==='3d'){
   setCamera(saved.camera);controls.object=saved.camera;saved.camera.position.copy(saved.position);saved.camera.up.copy(saved.up);saved.camera.quaternion.copy(saved.quaternion);saved.camera.aspect=Math.max(stage.clientWidth,1)/Math.max(stage.clientHeight,1);saved.camera.updateProjectionMatrix();controls.target.copy(saved.target);controls.enableRotate=saved.rotate;controls.enableDamping=saved.damping;controls.update();
  }else align();
  host.dataset.dimension=mode;host.dataset.projection=mode==='3d'?'perspective':'orthographic';
  host.querySelectorAll('[data-field-view],[data-path-view]').forEach(button=>button.disabled=mode!=='3d');
  host.dispatchEvent(new CustomEvent('dimension-changed',{bubbles:true,detail:{mode}}));
 }
 const onRequest=e=>setMode(e.detail?.mode);
 host.addEventListener('set-dimension',onRequest);host.dataset.dimension='3d';host.dataset.projection='perspective';
 return {get mode(){return mode;},update:align,setMode,dispose(){if(mode!=='3d')setMode('3d');host.removeEventListener('set-dimension',onRequest);}};
}
