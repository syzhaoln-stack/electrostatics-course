import {THREE} from './scene.js';
export const ACADEMIC_COLORS=Object.freeze({paper:'#fbfbf8',ink:'#293e48',muted:'#78868b',field:'#286f7c',force:'#ac7627',positive:'#bc6a54',negative:'#527c9b',surface:'#65928f',normal:'#77638b'});
export function academicColor(value){
 const c=new THREE.Color(value),hsl={};c.getHSL(hsl);
 if(hsl.l>.51)c.setHSL(hsl.h,Math.min(.65,hsl.s),Math.max(.29,Math.min(.44,hsl.l*.59)));
 return c;
}
export function applyAcademicScene(view){
 view.academic=true;
 view.scene.background.set(ACADEMIC_COLORS.paper);view.scene.fog.color.set(ACADEMIC_COLORS.paper);view.scene.fog.near=24;view.scene.fog.far=58;
 view.renderer.setClearColor(ACADEMIC_COLORS.paper);
 view.grid.visible=false;view.floor.visible=false;view.layer('axes').visible=false;
 view.scene.children.filter(o=>o.isHemisphereLight).forEach(o=>{o.color.set('#ffffff');o.groundColor.set('#d3d8d7');o.intensity=1.55;});
 view.scene.children.filter(o=>o.isDirectionalLight).forEach((o,i)=>{o.color.set(i?'#e7edf0':'#fffdf5');o.intensity=i?1.2:2.2;});
 return view;
}
