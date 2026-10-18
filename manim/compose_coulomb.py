"""Compose source-backed Blender motion, original explanatory diagrams and voice.
Final 1920x1080/24 fps; Blender footage native1280x720. Temporal blending is
explicitly documented; not a simulation of the historical oscillation period.
"""
from pathlib import Path
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps
import math,json,re,subprocess,sys,shutil
ROOT=Path(__file__).resolve().parent.parent
WORK=ROOT/'media/lesson-dialogues/production/v3-5/coulomb'
PUBLIC=ROOT/'media/lesson-dialogues'
SCRIPT=json.loads((ROOT/'manim/coulomb-film.json').read_text(encoding='utf-8'))
TIME=json.loads((WORK/'timeline.json').read_text(encoding='utf-8'))
DURATION=json.loads((WORK/'manifest.json').read_text(encoding='utf-8'))['duration']
FFMPEG='D:/Python tools/ffmpeg-6.0-full_build/bin/ffmpeg.exe'
W,H,FPS=1920,1080,24
BG='#0c1013';INK='#eee8db';MUTED='#9cabae';GOLD='#d9b36d';CYAN='#70c1cb';RED='#ee8b70'
@lru_cache(None)
def font(size,serif=False):return ImageFont.truetype('C:/Windows/Fonts/STSONG.TTF' if serif else 'C:/Windows/Fonts/msyh.ttc',size)
def write(d,xy,text,size=32,color=INK,serif=False,anchor=None):d.text(xy,text,font=font(size,serif),fill=color,anchor=anchor)
def wrap(d,text,width,size):
 lines=[];line=''
 for c in text:
  if c=='\n' or (d.textlength(line+c,font=font(size))>width and c not in '，。？！；：、'):
   lines.append(line);line='' if c=='\n' else c
  else:line+=c
 if line:lines.append(line)
 return lines
def paragraph(d,x,y,text,width=500,size=32,color=INK,serif=False):
 for line in wrap(d,text,width,size):write(d,(x,y),line,size,color,serif);y+=size*1.55
 return y
def arrow(d,a,b,color,width=5,head=16):
 d.line([a,b],fill=color,width=width);ang=math.atan2(b[1]-a[1],b[0]-a[0]);d.polygon([b,(b[0]-head*math.cos(ang-.48),b[1]-head*math.sin(ang-.48)),(b[0]-head*math.cos(ang+.48),b[1]-head*math.sin(ang+.48))],fill=color)
@lru_cache(maxsize=12)
def still(shot,index):
 p=WORK/f'renders-final/{shot}/{index:04}.png'
 if not p.exists():p=WORK/f'renders/{shot}-preview.png'
 return Image.open(p).convert('RGB').resize((1120,630),Image.Resampling.LANCZOS)
def footage(img,shot,u):
 v=max(0,min(47,u*47));i=int(v);a=still(shot,i);b=still(shot,min(47,i+1));img.paste(Image.blend(a,b,v-i),(70,236))
def diagram_frame(d):
 d.rounded_rectangle((70,236,1190,866),radius=8,fill='#10181e',outline='#263238',width=1)
def label(d,x,y,title,value,color=GOLD):
 write(d,(x,y),title,25,MUTED);write(d,(x,y+45),value,42,color,True)
def projection(p,shot,u):
 shots={'balance':((4.8,-7.4,4.4),(0,0,1.75)),'charge':((4.8,-7.4,4.4),(0,0,1.75)),'whole':((15,-26,12),(0,0,4.7)),'knob':((1.25,-2.1,10.9),(0,0,9.85)),'wire':((13,-14,6),(7,0,3.3))}
 pos,t=shots[shot];a=(u-.5)*.12;v=[pos[i]-t[i] for i in range(3)];pos=[t[0]+v[0]*math.cos(a)-v[1]*math.sin(a),t[1]+v[0]*math.sin(a)+v[1]*math.cos(a),pos[2]]
 sub=lambda a,b:[a[i]-b[i] for i in range(3)];dot=lambda a,b:sum(a[i]*b[i] for i in range(3));norm=lambda a:[x/math.sqrt(dot(a,a)) for x in a];cross=lambda a,b:[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
 forward=norm(sub(t,pos));right=norm(cross(forward,[0,0,1]));up=cross(right,forward);v=sub(p,pos);z=dot(v,forward)
 return (70+1120*(.5+1.25*dot(v,right)/z),236+630*(.5-1.25*16/9*dot(v,up)/z))
def caption_segments(turn):
 # Provider word timing, not independently forced-aligned. Keep one short line.
 segments=[];chunk=[]
 for word in turn['words']:
  chunk.append(word)
  if len(''.join(w['text'] for w in chunk))>=24 or re.search('[。？！；]',word['text']):
   segments.append((chunk[0]['start'],chunk[-1]['end'],''.join(w['text'] for w in chunk)));chunk=[]
 if chunk:segments.append((chunk[0]['start'],chunk[-1]['end'],''.join(w['text'] for w in chunk)))
 return segments
CAPTIONS=[caption_segments(t) for t in TIME]
def cue(n,phrase,fallback):
 words=TIME[n]['words'];joined=''.join(w['text'] for w in words);at=joined.find(phrase)
 if at<0:return fallback
 offset=0
 for w in words:
  if offset>=at:return w['start']-TIME[n]['start']
  offset+=len(w['text'])
 return fallback

def pulse(n,phrase,local,span=1.8):
 dt=local-cue(n,phrase,1e9)
 return math.sin(math.pi*dt/span)**2 if 0<dt<span else 0
def frame(n,local):
 s=SCRIPT[n];turn=TIME[n];duration=turn['end']-turn['start'];u=max(0,min(1,local/duration));smooth=u*u*(3-2*u)
 img=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(img)
 write(d,(76,40),'COULOMB  /  1785',25,GOLD);write(d,(1840,40),f'{n+1:02d} / 13',24,MUTED,anchor='ra')
 write(d,(76,95),s['question'],53,INK,True)
 shot=s['shot'];visual=shot if shot in ['whole','balance','charge','wire','knob'] else None
 visual_u=u
 if n==5:
  withdraw=cue(n,'再把针拿走',duration*.35);repel=cue(n,'开始相斥',duration*.5)
  visual_u=0 if local<withdraw else .28*min(1,(local-withdraw)/max(.5,repel-withdraw)) if local<repel else .28+.72*min(1,(local-repel)/max(1,duration-repel))
 if visual:footage(img,visual,visual_u)
 else:diagram_frame(d)
 d=ImageDraw.Draw(img)
 d.line((1240,248,1240,866),fill='#293136',width=1)
 write(d,(1300,260),'实验记录',24,MUTED)
 y=paragraph(d,1300,318,s['answer'],490,36,GOLD,True)
 notes=[]
 if n==0:
  notes=['依据1784、1785年论文','第一人称为现代改写','三维复原 · 豆包合成旁白'];write(d,(100,830),'一根银丝，怎样称出电力？',34,INK,True)
 elif n==1:
  for x,path,title in [(95,'torsion-1784-page1.jpg','1784 · 金属丝扭转'),(650,'plate-xiii.jpg','1785 · 电秤原图')]:
   pic=Image.open(ROOT/'assets/coulomb'/path).convert('RGB');pic=ImageOps.contain(pic,(480,520));img.paste(pic,(x,270));write(d,(x,805),title,27,GOLD)
  notes=['悬挂磁针 → 研究扭转','测流体阻力 → 测电力','尚未找到可核验的私人实验日记']
 elif n==2:
  a=projection((-.35,0,1.64),'whole',u);b=projection((-.35,0,9.2),'whole',u);d.line([a,b],fill=GOLD,width=2+round(3*pulse(n,'银丝',local)));write(d,(a[0]-35,(a[1]+b[1])/2),'28 法寸',27,GOLD,anchor='rm')
  notes=['银丝：约0.756 m','轻杆臂：约0.108 m','玻璃罩挡风；并非静电屏蔽']
 elif n==3:
  label(d,1300,y+45,'上端固定 β','0°',GOLD);label(d,1300,y+160,'下端偏转 α',f'{60*smooth:.0f}°',RED)
  write(d,(1300,780),f'θ = α = {60*smooth:.0f}°',35,CYAN)
  write(d,(105,816),'直轴扭转 · 金线为附加的表面观察标记',25,GOLD)
 elif n==4:
  for x,length,angle,title in [(360,210,25,'L'),(840,420,50,'2L')]:
   end=720;top=end-length
   for off in range(-7,8):d.line((x+off,top,x+off,end),fill=(int(90+135*(1-abs(off)/8)),int(100+135*(1-abs(off)/8)),int(110+135*(1-abs(off)/8))),width=1)
   d.rectangle((x-40,top-15,x+40,top+10),fill='#58646b');a=math.radians(angle*min(1,u*2));dx=100*math.cos(a);dy=35*math.sin(a);d.line((x-dx,end+dy,x+dx,end-dy),fill=GOLD,width=8)
   write(d,(x,top-65),title,35,GOLD,anchor='mm');write(d,(x,795),f'{angle*min(1,u*2):.0f}°',40,CYAN,anchor='mm')
  notes=['θ = 力矩 / 扭转刚度 κ','κ ∝ D⁴ / L','L：丝长　D：丝径','相同材料、丝径、作用力矩']
 elif n in [5,6,10]:
  a=(6.9+29.1*(1-math.exp(-6*max(0,visual_u-.2)/.8))) if n==5 else 36
  angle=math.radians(a);p=(1.08*math.cos(angle),1.08*math.sin(angle),1.64);q=(1.08,0,1.64)
  if n==5:
   notes=['髓质小球，不是实心金属球','绝缘柄传电后撤走','同种电荷相互排斥']
   if local>cue(n,'把电传给它们',duration*.25):
    for point in [p,q]:write(d,projection(point,'charge',visual_u),'+',30,RED,anchor='mm')
  elif n==6:
   dv=[p[i]-q[i] for i in range(3)];r=math.sqrt(sum(x*x for x in dv));end=tuple(p[i]+dv[i]/r*.65 for i in range(3));arrow(d,projection(p,'balance',u),projection(end,'balance',u),RED,5+round(4*pulse(n,'电力',local)))
   pts=[projection((.55*math.cos(t),.55*math.sin(t),1.68),'balance',u) for t in [math.radians(130-i*90/25) for i in range(26)]];width=5+round(4*pulse(n,'回复力矩',local));d.line(pts,fill=CYAN,width=width);arrow(d,pts[-2],pts[-1],CYAN,width)
   notes=['F × 垂直力臂 = κθ','F：两球间的电力','κ：校准后的扭转刚度','θ：两端相对扭转，计算用弧度']
  else:notes=['原文：零点约有2–3°不确定性','纸片阻尼、玻璃挡风','灵敏 ≠ 无限精确','较软的悬丝，往往稳定得更慢']
 elif n==7:
  notes=['第一次：0° + 36° = 36°','第二次：126° + 18° = 144°','144 / 36 = 4','不是只看轻杆的18°']
  write(d,(110,810),'第二次平衡读数：上端 −126°，下端 +18°',28,GOLD)
 elif n==8:
  for i,(vals,threshold) in enumerate([(['测量','上端 β','下端 α','总扭转 θ'],0),(['01','0°','36°','36°'],0),(['02','126°','18°','144°'],.18),(['03','567°','8.5°','575.5°'],.4)]):
   if u<threshold:continue
   y0=300+i*105;d.line((115,y0+80,1140,y0+80),fill='#334047',width=1)
   for x,val in zip([125,360,625,885],vals):write(d,(x,y0),val,32 if i==0 else 42,MUTED if i==0 else GOLD)
  write(d,(130,785),'原文将第三次总扭转记为 576°。',28,MUTED)
  notes=['约减半的距离','约四倍的回复作用','F ∝ 1 / r²','r 是两球的距离，不是转角']
 elif n==9:
  cx,cy,R=600,545,240;a=math.radians(36-18*smooth);P=(cx+R*math.cos(a),cy-R*math.sin(a));Q=(cx+R,cy)
  d.ellipse((cx-R,cy-R,cx+R,cy+R),outline='#3b4a50',width=2);d.line([(cx,cy),P],fill=GOLD,width=4);d.line([(cx,cy),Q],fill='#6b7477',width=3);d.line([P,Q],fill=RED,width=6)
  for pt,color in [(P,RED),(Q,GOLD)]:d.ellipse((pt[0]-12,pt[1]-12,pt[0]+12,pt[1]+12),fill=color)
  write(d,(cx+90,cy-45),'α',36,GOLD);write(d,((P[0]+Q[0])/2+26,(P[1]+Q[1])/2),'d',40,RED);write(d,(cx+100,cy+15),'R',34,MUTED)
  write(d,(160,810),'图示：角度在圆心，电力沿两球的连线。',28,MUTED)
  notes=['d = 2R sin(α/2)','R：悬轴到活动球心的距离','d：球心之间的弦长','垂直力臂 = R cos(α/2)']
 elif n==11:
  # Explicitly schematic modern optical lever; original 1798 apparatus used telescopes.
  center=(580,565);theta=math.radians(8*math.sin(u*2.2));end=(1020,565-440*math.tan(2*theta))
  d.line((1020,290,1020,795),fill=MUTED,width=5);d.line((580,315,*center),fill=RED,width=4);d.line([center,end],fill=RED,width=4)
  v=(35*math.cos(math.pi/4-theta),35*math.sin(math.pi/4-theta));d.line((center[0]-v[0],center[1]-v[1],center[0]+v[0],center[1]+v[1]),fill=CYAN,width=12);d.ellipse((end[0]-9,end[1]-9,end[0]+9,end[1]+9),fill=GOLD)
  write(d,(140,755),'小角度 → 反射光方向变化 → 远处光斑位移',29,INK);write(d,(140,810),'现代激光读数示意；角度放大，不是1798年原装置',25,MUTED)
  notes=['1798：卡文迪许测地球密度','现代：镜转 θ，光转 2θ','Δx ≈ 2Dθ，放大读数','静电反馈，也可平衡引力矩']
 elif n==12:
  notes=['把作用转成位移或转角','先校准，再测未知量','同时处理干扰与量程','继续：亲手转动电秤']
 if notes:
  y=max(y+40,510)
  for i,note in enumerate(notes):
   if local>i*1.6:
    write(d,(1300,y),note,26,INK if i==0 else MUTED);y+=65
 source='主体长度据1785原文；银丝、小球为辨识放大；材质与灯光为解释性复原'
 if n==1:source='1784 金属丝扭转论文 / 1785 电学第一论文 · MIT 英译本'
 if n in [3,4,6,9]:source='现代力学解释 · 图示转角和扭转标记为教学放大；不代表真实振动周期'
 if n==11:source='Cavendish 1798 原论文 / PASCO 现代实验 / NIST 2022 静电反馈研究'
 write(d,(76,906),source,22,MUTED)
 t=turn['start']+local;cap=next((c[2] for c in CAPTIONS[n] if c[0]<=t<c[1]+.08),'')
 if cap:
  d.rounded_rectangle((130,963,1790,1044),radius=8,fill='#171e23');write(d,(960,979),cap,36,INK,anchor='ma')
 # subtle global progress, separate from scientific quantities.
 d.rectangle((0,1076,int(W*t/DURATION),1080),fill=GOLD)
 return img
def main():
 if '--preview' in sys.argv:
  for n in [0,2,3,4,6,8,9,11]:frame(n,(TIME[n]['end']-TIME[n]['start'])*.65).save(WORK/f'preview-{n:02}.jpg',quality=94)
  return
 for shot in ['whole','balance','charge','knob','wire']:
  if len(list((WORK/'renders-final'/shot).glob('*.png')))!=48:raise RuntimeError(f'Incomplete Blender shot: {shot}')
 video=WORK/'picture.mp4';log=open(WORK/'encode.log','w',encoding='utf8')
 proc=subprocess.Popen([FFMPEG,'-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','24','-threads','4','-pix_fmt','yuv420p',str(video)],stdin=subprocess.PIPE,stderr=log)
 n=0
 try:
  for f in range(math.ceil(DURATION*FPS)):
   t=f/FPS
   while n<len(TIME)-1 and t>=TIME[n+1]['start']:n+=1
   proc.stdin.write(frame(n,max(0,t-TIME[n]['start'])).tobytes())
   if f%(FPS*20)==0:print(f'Composed {t:.0f}/{DURATION:.0f}s',flush=True)
 finally:proc.stdin.close()
 if proc.wait():raise RuntimeError('Picture encode failed')
 dest=PUBLIC/'coulomb.mp4'
 subprocess.run([FFMPEG,'-hide_banner','-loglevel','warning','-y','-i',str(video),'-i',str(WORK/'dialogue.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','loudnorm=I=-17:TP=-1.5:LRA=9','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest',str(dest)],check=True)
 frame(0,4).save(PUBLIC/'coulomb.poster.jpg',quality=92)
 chapters=[{**{k:v for k,v in s.items() if k!='text'},'start':t['start'],'end':t['end']} for s,t in zip(SCRIPT,TIME)]
 (PUBLIC/'coulomb.chapters.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2),encoding='utf8')
 vtt=['WEBVTT','']
 def stamp(t):
  m=round(t*1000);return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02}.{m%1000:03}'
 for caps in CAPTIONS:
  for a,b,c in caps:vtt += [f'{stamp(a)} --> {stamp(b)}',c,'']
 (PUBLIC/'coulomb.vtt').write_text('\n'.join(vtt),encoding='utf8')
 status=json.loads((WORK/'manifest.json').read_text(encoding='utf8'))
 (PUBLIC/'coulomb.manifest.json').write_text(json.dumps({'title':'一根银丝，怎样称出电力？','duration':DURATION,'voice':'Doubao 清爽男大, seed-audio-1.0','synthetic':True,'first_person':'现代改写；不是历史录音或私人日记','picture':'Blender Cycles native1280x720 motion samples, temporally blended into1920x1080/24fps explanatory film','subtitle':'Provider timing, locally adjusted; not independent forced alignment','human_listening_review':False,'sources':'See assets/coulomb/film-sources.json','script':[s['text'] for s in SCRIPT]},ensure_ascii=False,indent=2),encoding='utf8')
 print('Installed film:',dest,flush=True)
if __name__=='__main__':main()
