import * as THREE from 'three';

// Procedural, repeatable material textures. Surface finish is an interpretation;
// the memoir, rather than these textures, determines the instrument's structure.
export function historicalMaterials(renderer){
 const textures=[];
 function canvasTexture(w,h,paint){const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t;}
 const noise=(x,y)=>{const a=Math.sin(x*127.1+y*311.7)*43758.5453;return a-Math.floor(a);};
 const wood=canvasTexture(1024,512,(ctx,w,h)=>{
  const im=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const bend=12*Math.sin(x*.005)+5*Math.sin(x*.019),grain=Math.sin((y+bend)*.34)+.35*Math.sin((y+bend)*1.14),broad=Math.sin(y*.027+Math.sin(x*.004));
   const shade=grain*2.6+broad*4+noise(x,y)*5;const i=(y*w+x)*4;im.data[i]=60+shade;im.data[i+1]=39+shade*.7;im.data[i+2]=26+shade*.45;im.data[i+3]=255;
  }ctx.putImageData(im,0,0);for(let y=0;y<h;y+=128){ctx.fillStyle='#25190f';ctx.fillRect(0,y,w,2);ctx.fillStyle='#8b674430';ctx.fillRect(0,y+2,w,1);}
 });wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(1.5,1.2);
 const metal=canvasTexture(256,256,(ctx,w,h)=>{const im=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=noise(x,y),patina=8*Math.sin(x*.037)*Math.sin(y*.029),v=185+patina+n*16;const i=(y*w+x)*4;im.data[i]=v;im.data[i+1]=v*.85;im.data[i+2]=v*.58;im.data[i+3]=255;}ctx.putImageData(im,0,0);ctx.strokeStyle='#e7ce9720';for(let i=0;i<70;i++){ctx.beginPath();ctx.moveTo(noise(i,2)*w,noise(i,3)*h);ctx.lineTo(noise(i,2)*w+4+noise(i,7)*20,noise(i,3)*h+.5);ctx.stroke();}});
 // Subtle circumferential tool marks, deliberately without modern chrome or
 // decorative knurling. Their exact finish is interpretive, not archaeological.
 const brushed=canvasTexture(256,256,(ctx,w,h)=>{const im=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=225+9*Math.sin(y*.83)+3*Math.sin(y*2.41)+noise(x,y)*3,i=(y*w+x)*4;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}ctx.putImageData(im,0,0);});brushed.colorSpace=THREE.NoColorSpace;
 const fiber=canvasTexture(256,256,(ctx,w,h)=>{ctx.fillStyle='#e3d1a7';ctx.fillRect(0,0,w,h);for(let i=0;i<4500;i++){const x=noise(i,1)*w,y=noise(i,2)*h;ctx.fillStyle=i%3?'#6750360b':'#ffffff25';ctx.fillRect(x,y,1+noise(i,3)*4,.6);}});
 const pith=canvasTexture(128,128,(ctx,w,h)=>{ctx.fillStyle='#d8cba9';ctx.fillRect(0,0,w,h);for(let i=0;i<2000;i++){ctx.fillStyle=i%2?'#79664423':'#ffffff38';const r=.2+noise(i,5)*.9;ctx.beginPath();ctx.arc(noise(i,1)*w,noise(i,2)*h,r,0,Math.PI*2);ctx.fill();}});
 const scale=canvasTexture(4096,180,(ctx,w,h)=>{ctx.fillStyle='#d8c69e';ctx.fillRect(0,0,w,h);for(let i=0;i<10000;i++){ctx.fillStyle=i%2?'#6c4d2810':'#fff6d616';ctx.fillRect(noise(i,1)*w,noise(i,2)*h,3,.7);}ctx.strokeStyle='#35291c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,18);ctx.lineTo(w,18);ctx.stroke();ctx.font='32px Georgia';ctx.textAlign='center';ctx.fillStyle='#302416';for(let a=0;a<360;a++){const x=a/360*w,l=a%10===0?65:a%5===0?45:25;ctx.beginPath();ctx.moveTo(x,18);ctx.lineTo(x,18+l);ctx.stroke();if(a%20===0)ctx.fillText(String((360-a)%360),x,132);}ctx.lineWidth=1;ctx.strokeRect(0,3,w,h-6);});
 // A fixed face: zero lies on +X, and the numbering follows a positive Y
 // rotation of the pointer after the circle is laid in the horizontal plane.
 const dial=canvasTexture(1024,1024,(ctx,w,h)=>{const c=w/2;ctx.fillStyle='#b39a65';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#403522';ctx.fillStyle='#30271a';ctx.font='38px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';for(const radius of[400,486]){ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(c,c,radius,0,Math.PI*2);ctx.stroke();}for(let a=0;a<360;a++){const u=a*Math.PI/180,r=a%10===0?417:a%5===0?439:456;ctx.lineWidth=a%10===0?3:1.4;ctx.beginPath();ctx.moveTo(c+Math.cos(u)*r,c-Math.sin(u)*r);ctx.lineTo(c+Math.cos(u)*480,c-Math.sin(u)*480);ctx.stroke();if(a%30===0)ctx.fillText(String(a),c+Math.cos(u)*363,c-Math.sin(u)*363);}});
 const reflection=canvasTexture(1024,512,(ctx,w,h)=>{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#555b5b');g.addColorStop(.48,'#1b2224');g.addColorStop(1,'#4e3420');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);for(const [x,width,c]of[[155,115,'#e1d6bf'],[640,65,'#acc4ce']]){ctx.fillStyle=c;ctx.fillRect(x,75,width,265);ctx.fillStyle='#4c4d42';ctx.fillRect(x+width/2-3,75,6,265);ctx.fillRect(x,190,width,5);}ctx.fillStyle='#c8d5dc';ctx.fillRect(465,65,14,320);const glow=ctx.createRadialGradient(850,100,0,850,100,100);glow.addColorStop(0,'#ddbb79');glow.addColorStop(1,'#ddbb7900');ctx.fillStyle=glow;ctx.fillRect(750,0,200,200);});reflection.mapping=THREE.EquirectangularReflectionMapping;
 const pmrem=new THREE.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(reflection);pmrem.dispose();
 return {
  environment:env.texture,
  wood:new THREE.MeshStandardMaterial({map:wood,roughness:.52,metalness:0,bumpMap:wood,bumpScale:.009}),
  brass:new THREE.MeshStandardMaterial({color:0xe0c493,map:metal,roughness:.28,metalness:.88,bumpMap:metal,bumpScale:.0015}),
  glass:new THREE.MeshPhysicalMaterial({color:0xf4f7f3,metalness:0,roughness:0,transmission:.99,thickness:.008,ior:1.48,attenuationColor:0xc2d1be,attenuationDistance:5,side:THREE.FrontSide}),
  shellac:new THREE.MeshPhysicalMaterial({color:0x704422,roughness:.32,clearcoat:.4,clearcoatRoughness:.3}),
  silver:new THREE.MeshStandardMaterial({color:0xcbd1d5,metalness:.9,roughness:.39}),
  steel:new THREE.MeshStandardMaterial({color:0x83919c,metalness:.82,roughness:.42,roughnessMap:brushed,bumpMap:brushed,bumpScale:.0006}),
  steelEdge:new THREE.MeshStandardMaterial({color:0xbbc7ce,metalness:.88,roughness:.33}),
  engraving:new THREE.MeshStandardMaterial({color:0x20282d,metalness:.35,roughness:.55}),
  pith:new THREE.MeshStandardMaterial({map:pith,roughness:.98,bumpMap:pith,bumpScale:.008}),
  paper:new THREE.MeshStandardMaterial({map:fiber,roughness:1,side:THREE.DoubleSide}),
  scale:new THREE.MeshStandardMaterial({map:scale,roughness:.94,side:THREE.DoubleSide}),
  dial:new THREE.MeshStandardMaterial({map:dial,metalness:.58,roughness:.36}),
  dispose(){textures.forEach(t=>t.dispose());env.dispose();}
 };
}
