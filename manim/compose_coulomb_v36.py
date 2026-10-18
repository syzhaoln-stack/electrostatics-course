"""Full-frame native-HD Blender film, integrated labels and sequential linear plot."""
from pathlib import Path
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont,ImageOps
import json,math,subprocess,sys,re
ROOT=Path(__file__).resolve().parent.parent
WORK=ROOT/'media/lesson-dialogues/production/v3-6-edit/coulomb'
RENDERS=ROOT/'media/lesson-dialogues/production/v3-6/coulomb/renders'
FOLLOW_RENDERS=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-follow-renders')
PUBLIC=ROOT/'media/lesson-dialogues'
TIME=json.loads((WORK/'timeline.json').read_text(encoding='utf8'))
META=json.loads((WORK/'manifest.json').read_text(encoding='utf8'))
DATA=json.loads((ROOT/'coulomb-fit-data.json').read_text(encoding='utf8'))
REL=DATA['relativeComparison']
DURATION=META['duration'];W,H,FPS=1920,1080,24
FFMPEG='D:/Python tools/ffmpeg-6.0-full_build/bin/ffmpeg.exe'
BG='#090d10';INK='#efe9dc';MUTED='#9bafb0';GOLD='#e4bf7d';CYAN='#8bd2d7';CORAL='#ec9c85'
COLORS=[CYAN,GOLD,CORAL]
PROJECTIONS={}
for path in sorted(RENDERS.glob('projection-*.json'),key=lambda p:p.stat().st_mtime):
 for key,val in json.loads(path.read_text(encoding='utf8')).get('shots',{}).items():
  if key not in PROJECTIONS or len(val)>=len(PROJECTIONS[key]):PROJECTIONS[key]=val
@lru_cache(None)
def font(size,serif=False):return ImageFont.truetype('C:/Windows/Fonts/STSONG.TTF' if serif else 'C:/Windows/Fonts/msyh.ttc',size)
def text(d,xy,value,size=30,color=INK,anchor=None,serif=False):d.text(xy,str(value),font=font(size,serif),fill=color,anchor=anchor)
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
def arrow(d,a,b,color=CORAL,width=4,head=14):
 d.line([a,b],fill=color,width=width);ang=math.atan2(b[1]-a[1],b[0]-a[0]);d.polygon([b,(b[0]-head*math.cos(ang-.45),b[1]-head*math.sin(ang-.45)),(b[0]-head*math.cos(ang+.45),b[1]-head*math.sin(ang+.45))],fill=color)
def dashed(d,a,b,color=MUTED,width=2):
 length=math.dist(a,b)
 if length<1:return
 for i in range(0,int(length),15):
  x=i/length;y=min(1,(i+7)/length)
  d.line([(a[0]+(b[0]-a[0])*x,a[1]+(b[1]-a[1])*x),(a[0]+(b[0]-a[0])*y,a[1]+(b[1]-a[1])*y)],fill=color,width=width)
def glow(d,p,r=16,color=GOLD,weight=2):
 d.ellipse((p[0]-r,p[1]-r,p[0]+r,p[1]+r),outline=color,width=weight)
def callout(d,p,xy,title,sub='',color=GOLD):
 end=(xy[0]-18,xy[1]+17);d.line([p,(end[0],p[1]),end],fill=color,width=2);glow(d,p,8,color)
 text(d,xy,title,30,color)
 if sub:text(d,(xy[0],xy[1]+43),sub,22,MUTED)
def cue(turn,phrase,fallback):
 words=turn['words'];joined=''.join(w['text'] for w in words);at=joined.find(phrase);offset=0
 if at<0:return fallback
 for word in words:
  if offset+len(word['text'])>at:return word['start']-turn['start']
  offset+=len(word['text'])
 return fallback
def pulse(turn,phrase,local):
 dt=local-cue(turn,phrase,1e9)
 return math.sin(math.pi*dt/2.1)**2 if 0<=dt<=2.1 else 0
def captions(turn):
 out=[];chunk=[]
 for word in turn['words']:
  chunk.append(word)
  if len(''.join(w['text'] for w in chunk))>=26 or re.search('[。？！；]',word['text']):
   out.append((chunk[0]['start'],chunk[-1]['end'],''.join(w['text'] for w in chunk)));chunk=[]
 if chunk:out.append((chunk[0]['start'],chunk[-1]['end'],''.join(w['text'] for w in chunk)))
 return out
CAPS=[captions(t) for t in TIME]
@lru_cache(maxsize=10)
def load_frame(shot,index):
 path=frame_path(shot,index)
 if not path.exists():path=RENDERS/f'{shot}-preview.png'
 return Image.open(path).convert('RGB')
def frame_path(shot,index):
 path=FOLLOW_RENDERS/shot/f'{index:04}.png'
 return path if path.exists() else RENDERS/shot/f'{index:04}.png'
def sample(shot,u):
 seq=PROJECTIONS[shot];u=max(0,min(1,u))
 # Frame u values also describe dense sampling of the early knob movement.
 j=next((i for i,v in enumerate(seq) if v['u']>=u),len(seq)-1)
 i=max(0,j-1);denom=seq[j]['u']-seq[i]['u'];f=0 if denom<=0 else (u-seq[i]['u'])/denom;f=max(0,min(1,f))
 record={k:seq[i][k]*(1-f)+seq[j][k]*f for k in ['alpha_deg','beta_deg','twist_deg','separation_deg','source_angle_deg'] if k in seq[i]}
 record['points']={k:(v['x']*(1-f)+seq[j]['points'][k]['x']*f,v['y']*(1-f)+seq[j]['points'][k]['y']*f) for k,v in seq[i]['points'].items()}
 return i,j,f,record
def footage(img,shot,u,box=(0,0,W,H),crop=(0,0,W,H)):
 i,j,f,record=sample(shot,u);a=load_frame(shot,i);b=load_frame(shot,j)
 if shot.startswith('passive-follow'):
  # Do not crossfade moving spheres into four apparent objects. Geometry
  # annotations use exactly the displayed pose; angle readouts stay continuous.
  selected=i if f<.5 else j;view=a if selected==i else b
  record['points']={k:(v['x'],v['y']) for k,v in PROJECTIONS[shot][selected]['points'].items()}
 else:view=Image.blend(a,b,f) if i!=j and f>0 else a
 scale=min((box[2]-box[0])/(crop[2]-crop[0]),(box[3]-box[1])/(crop[3]-crop[1]))
 size=(round((crop[2]-crop[0])*scale),round((crop[3]-crop[1])*scale));off=(round(box[0]+(box[2]-box[0]-size[0])/2),round(box[1]+(box[3]-box[1]-size[1])/2))
 img.paste(view.crop(crop).resize(size,Image.Resampling.LANCZOS),off)
 record['points']={k:(off[0]+(p[0]-crop[0])*scale,off[1]+(p[1]-crop[1])*scale) for k,p in record['points'].items()}
 if shot.startswith('passive-follow-close'):
  tip=PROJECTIONS[shot][selected]['points']['force_tip']
  if not (0<=tip['x']<=1920 and 0<=tip['y']<=1080):
   # Carry the force annotation into the reserved margin when its head goes
   # beyond the native close-up. Direction comes from the same 3D chord.
   arrow(ImageDraw.Draw(img),record['points']['force_tail'],record['points']['force_tip'],CORAL,max(2,round(6*scale)),max(7,round(26*scale)))
 return record
@lru_cache(None)
def shade():
 mask=Image.new('RGBA',(W,H));d=ImageDraw.Draw(mask)
 for y in range(190):d.line((0,y,W,y),fill=(5,9,12,round(245*(1-y/190)**.5)))
 for y in range(940,H):d.line((0,y,W,y),fill=(5,9,12,round(245*((y-940)/140)**.5)))
 return mask
def angular(d,record,labels=True,force=False):
 p=record['points'];o=p['needle_center'];q=p['fixed_ball'];a=p['moving_ball'];alpha=record['alpha_deg'];rad=math.radians(alpha)
 dashed(d,o,q,'#70888c',2)
 d.line([q,a],fill=CYAN,width=4);glow(d,q,9,CYAN);glow(d,a,9,CYAN)
 ex=(q[0]-o[0],q[1]-o[1]);sin=math.sin(rad)
 if abs(sin)>.02:
  ey=((a[0]-o[0]-ex[0]*math.cos(rad))/sin,(a[1]-o[1]-ex[1]*math.cos(rad))/sin)
  points=[(o[0]+.38*(ex[0]*math.cos(t)+ey[0]*math.sin(t)),o[1]+.38*(ex[1]*math.cos(t)+ey[1]*math.sin(t))) for t in [rad*i/36 for i in range(37)]]
  d.line(points,fill=CYAN,width=3)
  if force:
   vec=(a[0]-q[0],a[1]-q[1]);length=math.hypot(*vec);b=(a[0]+110*vec[0]/length,a[1]+110*vec[1]/length);arrow(d,a,b,CORAL,5);text(d,(b[0]+12,b[1]-35),'F',31,CORAL)
   arc=[(o[0]+.65*(ex[0]*math.cos(t)+ey[0]*math.sin(t)),o[1]+.65*(ex[1]*math.cos(t)+ey[1]*math.sin(t))) for t in [math.radians(115-85*i/36) for i in range(37)]]
   d.line(arc,fill=GOLD,width=4);arrow(d,arc[-2],arc[-1],GOLD,4)
 if labels:text(d,(o[0]+25,o[1]+38),f'α = {alpha:.1f}°',27,CYAN)
def linear_plot(d,count,phase=1,curve=0,large=False,current=None):
 x0,y0,x1,y1=(350,290,1680,870) if large else (1100,300,1800,850)
 px=lambda r:x0+r/1.12*(x1-x0);py=lambda f:y1-f/18*(y1-y0)
 for v in [0,.25,.5,.75,1]:
  x=px(v);d.line((x,y0,x,y1),fill='#233036',width=1);text(d,(x,y1+17),str(v),23,MUTED,'ma')
 for v in [0,4,8,12,16]:
  y=py(v);d.line((x0,y,x1,y),fill='#233036',width=1);text(d,(x0-16,y),f'{v:g}',23,MUTED,'rm')
 arrow(d,(x0,y1),(x1+22,y1),MUTED,2,9);arrow(d,(x0,y1),(x0,y0-20),MUTED,2,9)
 text(d,(x0,y0-72),'相对斥力 · 第一次为 1',27,GOLD);text(d,(x1,y1+60),'相对距离 · 第一次为 1',27,CYAN,'ra')
 if curve>0:
  pts=[];fit=REL['fit']
  for k in range(250):
   r=1.06-(1.06-.23)*k/249;f=fit['coefficient']/r**fit['exponent']
   if k/249<=curve:pts.append((px(r),py(f)))
  if len(pts)>1:d.line(pts,fill='#c6d4c5',width=4)
  if curve>.65:
   text(d,(px(.55),py(11.5)),'F ∝ 1 / r',46,INK,serif=True)
   text(d,(px(.55)+205,py(11.5)-12),f'{fit["exponent"]:.2f}',28,INK)
   text(d,(px(.55),py(11.5)+65),'接近平方反比',29,CYAN)
 for i,p in enumerate(REL['points'][:count]):
  x,y=px(p['distanceRatio']),py(p['forceRatio']);col=COLORS[i]
  d.ellipse((x-8,y-8,x+8,y+8),fill=col)
  dx,dy=((-210,-70) if i==0 else (17,-85) if i==1 else (17,-70))
  text(d,(x+dx,y+dy),f'0{i+1}',24,col)
  text(d,(x+dx,y+dy+32),f'距离 {p["distanceRatio"]:.2f} · 力 {p["forceLabel"]}',21,col)
 if current is not None:
  p=REL['points'][current];x,y=px(p['distanceRatio']),py(p['forceRatio']);col=COLORS[current]
  if phase>=.2:
   dashed(d,(x,y1),(x,y),CYAN);text(d,(x,y1-12),f'{p["distanceRatio"]:.2f}',25,CYAN,'mb')
  if phase>=.5:dashed(d,(x0,y),(x,y),GOLD)
  if phase>=.85:glow(d,(x,y),14+9*(1-phase),col,2)
 return px,py
def follow_pose(local,approach,follow,settled):
 if local<approach:return 0
 if local<follow:return .16*(local-approach)/max(.1,follow-approach)
 if local<settled:return .16+.7*(local-follow)/max(.1,settled-follow)
 return 1
def follow_views(img,trial,pose,wide=False):
 suffix=['0','126','567'][trial]
 wirebox=(70,190,395,935) if wide else (60,230,340,910)
 closebox=(470,270,1550,900) if wide else (350,350,1030,825)
 wire=footage(img,'passive-follow-'+suffix,pose,wirebox,(720,160,1200,960))
 close=footage(img,'passive-follow-close-'+suffix,pose,closebox)
 d=ImageDraw.Draw(img);p=close['points'];top=wire['points']['upper_clamp']
 d.line((top[0]-23,top[1]-9,top[0]+23,top[1]-9),fill=GOLD,width=3)
 text(d,(wirebox[0]+15,wirebox[1]-30),'上端固定',24,MUTED)
 arc=[p[f'gap_arc_{i:02}'] for i in range(17)]
 d.line(arc,fill=CYAN,width=3)
 # Both ends of this marked angle rotate together; its value is their gap.
 for key,col in [('source_ball',GOLD),('moving_ball',CORAL)]:glow(d,p[key],8 if not wide else 13,col,2)
 return wire,close
def follow_labels(d,record,origin=(430,185),size=32):
 x,y=origin
 text(d,(x,y),f'两球相隔 {record["separation_deg"]:.1f}°',size,CYAN)
 text(d,(x,y+55),f'银丝累计扭转 {record["twist_deg"]:.1f}°',size,GOLD)
def follow_geometry(img,local,turn):
 _,record=follow_views(img,2,1,True);d=ImageDraw.Draw(img);p=record['points']
 follow_labels(d,record,(560,190),34)
 a=p['moving_ball'];q=p['source_ball'];o=p['needle_center']
 d.line([q,a],fill=CYAN,width=4)
 # Equal radii put the true 3D perpendicular foot at the chord midpoint.
 # Orthographic projection preserves that midpoint, not screen orthogonality.
 foot=((q[0]+a[0])/2,(q[1]+a[1])/2);dashed(d,o,foot,GOLD,3)
 text(d,(1240,400),'两球夹角 α',31,CYAN)
 text(d,(1240,455),'→ 球心距离 r',31,CYAN)
 if local>=cue(turn,'相对转角',5):
  text(d,(1240,560),'银丝总扭转 θ',31,GOLD)
  text(d,(1240,615),'→ 回复力矩 κθ',31,GOLD)
 if local>=cue(turn,'力矩除以',19):
  text(d,(590,900),'平衡时：斥力 = 回复力矩 ÷ 垂直力臂',33,INK)
 return record
def scene_frame(index,local):
 turn=TIME[index];kind=turn['base_id'];duration=turn['end']-turn['start'];u=max(0,min(1,local/duration));img=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(img)
 # Full-frame 3D shots with labels beside the object, never a detached notes panel.
 if kind in [0,1,2,3,4,5,6,12]:
  shot=turn['shot'];motion=u
  if kind==2 and (local<cue(turn,'下面的轻杆',7) or local>=cue(turn,'玻璃罩',23)):shot='whole'
  if kind in [0,1,2,12,13]:motion=.4
  if kind==12:shot='passive-follow-567';motion=1
  if kind==3:
   release=cue(turn,'松手',duration*.7);motion=.49*min(1,local/max(1,release)) if local<release else .5+.5*min(1,(local-release)/max(1,duration-release))
  if kind==4:motion=.4
  if kind==5:
   withdraw=cue(turn,'现在撤走',duration*.55);move=cue(turn,'互相排斥',duration*.7)
   motion=.08 if local<withdraw else .1+.22*ease((local-withdraw)/max(.5,move-withdraw)) if local<move else .32
  if kind in [6,11]:motion=.4
  record=footage(img,shot,motion);d=ImageDraw.Draw(img);p=record['points']
  if kind==0:
   if local>2:text(d,(140,370),'微小的电力',42,INK,serif=True);text(d,(140,440),'怎样留下可读的变化？',30,MUTED)
   if local>duration*.5:text(d,(1290,370),'银丝被扭转',42,GOLD,serif=True);text(d,(1290,440),'用转角比较力',30,CYAN)
  elif kind==1:
   if local>3:callout(d,p['wire_bottom'],(1210,610),'把轻杆悬起来','小力 → 转角',CYAN)
   if local>12:text(d,(180,380),'1784　研究扭转\n1785　用扭转测电力',36,GOLD,serif=True)
  elif kind==2:
   labels=[('银丝','wire_bottom',(300,270),'银丝','约 76 cm'),('轻杆','needle_center',(160,680),'涂封蜡的轻杆','丝线或稻草'),('虫胶','shellac_tip',(1430,410),'虫胶','轻、绝缘'),('接骨木','moving_ball',(1450,580),'接骨木髓球','直径数毫米'),('纸片','paper_counterweight',(450,815),'薄纸片','配重、减轻摆动')]
   if shot=='whole':
    if local>=cue(turn,'玻璃罩',23):callout(d,p['fixed_ball'],(1240,720),'玻璃罩挡风','让微小转动不被气流淹没',CYAN)
    else:
     mid=(p['wire_bottom'][0],(p['wire_top'][1]+p['wire_bottom'][1])/2)
     callout(d,mid,(1190,430),'28 法寸 ≈ 76 cm','很长、很细的银丝',CYAN)
   else:
    for phrase,key,xy,title,sub in labels:
     if phrase=='银丝':continue
     if local>=cue(turn,phrase,1e9):callout(d,p[key],xy,title,sub,GOLD)
     flash=pulse(turn,phrase,local)
     if flash>0:glow(d,p[key],16+25*flash,GOLD,2+round(3*flash))
  elif kind in [3,4]:
   callout(d,p['upper_clamp'],(1170,230),'上端固定','0°',GOLD)
   callout(d,p['lower_clamp'],(1170,780),'下端转动',f'{record["alpha_deg"]:.0f}°',CORAL)
   for phrase,key in [('上端','upper_clamp'),('下端','lower_clamp')]:
    flash=pulse(turn,phrase,local)
    if flash>0:glow(d,p[key],15+20*flash,GOLD,3)
   if kind==3:
    text(d,(230,380),'轴线仍然笔直',35,INK,serif=True);text(d,(230,445),'两端方向不同 → 回复力矩',27,CYAN)
   else:
    text(d,(180,365),'同材料 · 同丝径',29,MUTED);text(d,(180,425),'丝长加倍 → 同力矩转角加倍',34,CYAN)
    if local>cue(turn,'三百六十',8):text(d,(1190,465),'校准刻度',29,GOLD);text(d,(1190,520),'360° 对应 1/340 格令重',32,INK);text(d,(1190,572),'作用在 4 法寸杆臂上',24,MUTED)
  elif kind==5:
   if local<cue(turn,'电荷传过去',10):
    callout(d,p['needle_center'],(250,300),'先记住零位','旋钮与轻杆分别读角度',CYAN)
   if local>=cue(turn,'电荷传过去',10):
    for key in ['fixed_ball','moving_ball']:text(d,(p[key][0],p[key][1]-40),'+',43,CORAL,'mm')
   if local>=cue(turn,'现在撤走',12):callout(d,p['moving_ball'],(1460,680),'同种电荷相斥','活动球带着轻杆转开',CORAL)
  elif kind==6:
   angular(d,record,True,True)
   text(d,(120,300),'电力推开',36,CORAL,serif=True);text(d,(120,365),'银丝扭回',36,GOLD,serif=True)
   text(d,(1320,370),'第一次平衡',31,INK);text(d,(1320,435),'0° + 36° = 36°',40,GOLD);text(d,(1320,510),'电力矩 = 回复力矩',30,CYAN)
  elif kind==12:
   callout(d,p['paper_counterweight'],(200,750),'纸片减轻摆动','配合玻璃罩挡风',GOLD)
   text(d,(180,270),'2–3°',58,CORAL,serif=True);text(d,(180,350),'原文讨论的零位不确定性',27,MUTED)
   text(d,(1330,340),'细丝易断',35,GOLD);text(d,(1330,405),'电荷会漏掉',35,GOLD);text(d,(1330,485),'三次测量约用两分钟',27,MUTED)
 elif kind in [7,8,9]:
  trial={7:0,8:1,9:2}[kind]
  approach,follow,settled=[(0,.7,3.5),(.8,4.52,8.96),(0,1.5,13.2)][trial]
  motion=follow_pose(local,approach,follow,settled)
  if trial==0:motion=1
  _,record=follow_views(img,trial,motion);d=ImageDraw.Draw(img)
  follow_labels(d,record)
  flash=pulse(turn,'总扭转',local)
  if flash>0:d.rounded_rectangle((412,237,1005,291),8,outline=GOLD,width=2+round(2*flash))
  status='施力球靠近' if local<follow else '施力球跟随 · 银丝逐渐扭紧' if local<settled else '达到平衡'
  text(d,(430,305),status,24,MUTED)
  text(d,(430,350),'● 施力球',21,GOLD);text(d,(650,350),'● 活动球',21,CORAL)
  if trial==2 and record['twist_deg']>=360:text(d,(430,838),'累计转过 1 圈，再继续转',25,GOLD)
  dist_t=cue(turn,['距离记成一','距离约为一半','距离不到四分之一'][trial],duration*.65);force_t=cue(turn,['力也记成一','力变成四倍','力约为十六倍'][trial],duration*.8);land_t=cue(turn,['第一个点','第二个点','第三个点'][trial],duration*.9)
  phase=1 if local>=land_t else .6 if local>=force_t else .3 if local>=dist_t else 0
  count=trial+(local>=land_t);linear_plot(d,count,phase,current=trial)
  vals=REL['points'][trial]
  if local>=dist_t:text(d,(120,910),f'相对距离 {vals["distanceRatio"]:.2f}',33,CYAN)
  if local>=force_t:text(d,(540,910),f'斥力 {vals["forceLabel"]}',33,GOLD)
 elif kind==11:
  follow_geometry(img,local,turn)
 elif kind==13:
  footage(img,'passive-follow-567',1,(620,185,1300,955),(700,140,1220,970));d=ImageDraw.Draw(img)
  text(d,(140,290),'1785 · 库仑',40,GOLD,serif=True);text(d,(140,352),'静电斥力',28,MUTED)
  if local>6:text(d,(1300,290),'1798 · 卡文迪许',40,GOLD,serif=True);text(d,(1300,352),'引力与地球密度',28,MUTED)
  if local>duration*.6:text(d,(140,640),'两球夹角 → 距离',33,CYAN);text(d,(1300,640),'总扭转 → 回复力矩',33,GOLD)
 elif kind==10:
  curve=ease((local-cue(turn,'拟合',duration*.4))/4);linear_plot(d,3,curve=curve,large=True)
  if local>=cue(turn,'距离减半',duration*.7):text(d,(1110,640),'r ÷ 2   →   F × 4',37,GOLD)
 elif kind=='active':
  release=cue(turn,'松手',duration*.45);tighten=cue(turn,'再拧紧',duration*.58);stop=cue(turn,'旋钮这时',duration*.7)
  if local<release:motion=.10
  elif local<tighten:motion=.12+.2*ease((local-release)/max(.5,tighten-release))
  elif local<stop:motion=.4+.45*ease((local-tighten)/max(.5,stop-tighten))
  else:motion=.9
  record=footage(img,'active',motion,(0,165,1920,965));d=ImageDraw.Draw(img);angular(d,record,True,True)
  footage(img,'knob-active',motion,(100,440,540,725),(450,160,1470,850));d=ImageDraw.Draw(img)
  text(d,(110,395),'上端旋钮',26,GOLD)
  text(d,(125,260),'被动：放手，看它转开',33,CYAN);text(d,(125,325),'主动：拧紧，把它稳住',33,GOLD)
  text(d,(1350,610),f'上端 −{record["beta_deg"]:.0f}°',34,GOLD);text(d,(1350,675),f'下端 +{record["alpha_deg"]:.1f}°',34,CYAN)
  if local>=stop:text(d,(1350,765),'平衡 → 停止转动',31,INK)
 elif kind=='equivalent':
  change=cue(turn,'后面就沿用',duration*.79)
  if local<change:
   progress=ease(local/max(1,change*.75));left=footage(img,'equiv-passive',progress,(200,240,820,930),(780,160,1140,920));right=footage(img,'equiv-active',progress,(1100,240,1720,930),(780,160,1140,920));d=ImageDraw.Draw(img)
   text(d,(510,190),'上端固定 · 悬杆转动',34,CYAN,'ma');text(d,(1410,190),'库仑原操作 · 转上端',34,GOLD,'ma')
   text(d,(150,340),'上端 0°',27,MUTED);text(d,(150,820),f'下端 {left["alpha_deg"]:.1f}°',28,CYAN)
   text(d,(1510,340),f'上端 −{right["beta_deg"]:.0f}°',28,GOLD);text(d,(1510,820),f'下端 +{right["alpha_deg"]:.1f}°',28,CYAN)
   text(d,(505,940),f'总扭转 {left["twist_deg"]:.1f}°',29,CYAN,'mm');text(d,(1410,940),f'总扭转 {right["twist_deg"]:.1f}°',29,GOLD,'mm')
   if local>change*.5:text(d,(960,830),'相对扭转相同',31,INK,'mm');text(d,(960,880),'回复力矩相同',31,GOLD,'mm')
  else:
   _,record=follow_views(img,0,follow_pose(local-change,0,.5,3.5),True);d=ImageDraw.Draw(img)
   follow_labels(d,record,(570,190),34)
   text(d,(1270,400),'施力球跟随',34,CYAN);text(d,(1270,475),'直接看累计扭转',34,GOLD)
 # Questions live inside the film. Mild edge shading keeps them legible.
 img=Image.alpha_composite(img.convert('RGBA'),shade()).convert('RGB');d=ImageDraw.Draw(img)
 text(d,(74,34),'COULOMB  /  1785',22,GOLD);text(d,(1846,34),f'{index+1:02} / {len(TIME):02}',22,MUTED,'ra')
 text(d,(74,86),turn['question'],49,INK,serif=True)
 now=turn['start']+local;cap=next((c[2] for c in CAPS[index] if c[0]<=now<c[1]+.07),'')
 if cap:text(d,(960,995),cap,33,INK,'ma')
 d.rectangle((0,1077,round(W*now/DURATION),1080),fill=GOLD)
 return img
def main():
 if '--preview' in sys.argv:
  for i,t in enumerate(TIME):
   try:scene_frame(i,(t['end']-t['start'])*.78).save(WORK/f'preview-{i:02}.jpg',quality=94)
   except (KeyError,FileNotFoundError) as e:print(f'Pending Blender shot for {i}: {e}')
  return
 required={'whole','materials','wire','charge','measure-0','equiv-passive','equiv-active'}|{f'passive-follow{close}-{suffix}' for close in ['', '-close'] for suffix in ['0','126','567']}
 required|={t['shot'] for t in TIME if t['base_id'] in [0,1,2,3,4,5,6,12]}
 for shot in required:
  seq=PROJECTIONS.get(shot,[])
  if len(seq)<32 or not all(frame_path(shot,i).exists() for i in range(len(seq))):raise RuntimeError(f'Incomplete Blender sequence {shot}')
 picture=WORK/'picture.mp4';log=(WORK/'encode.log').open('w',encoding='utf8')
 proc=subprocess.Popen([FFMPEG,'-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r',str(FPS),'-i','-','-an','-c:v','libx264','-crf','21','-preset','fast','-threads','4','-g','48','-pix_fmt','yuv420p',str(picture)],stdin=subprocess.PIPE,stderr=log)
 index=0
 try:
  for f in range(math.ceil(DURATION*FPS)):
   now=f/FPS
   while index<len(TIME)-1 and now>=TIME[index+1]['start']:index+=1
   proc.stdin.write(scene_frame(index,max(0,now-TIME[index]['start'])).tobytes())
   if f%(FPS*15)==0:print(f'Composed {now:.0f}/{DURATION:.0f}s',flush=True)
 finally:proc.stdin.close()
 if proc.wait():raise RuntimeError('Video encode failed')
 dest=PUBLIC/'coulomb.mp4'
 subprocess.run([FFMPEG,'-hide_banner','-loglevel','warning','-y','-i',str(picture),'-i',str(WORK/'dialogue.wav'),'-map','0:v','-map','1:a','-c:v','copy','-af','loudnorm=I=-17:TP=-1.5:LRA=9','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',str(dest)],check=True)
 scene_frame(0,8).save(PUBLIC/'coulomb.poster.jpg',quality=94)
 chapters=[{k:v for k,v in t.items() if k not in ['text','words']} for t in TIME]
 (PUBLIC/'coulomb.chapters.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2),encoding='utf8')
 def stamp(t):m=round(t*1000);return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02}.{m%1000:03}'
 vtt=['WEBVTT','']
 for caps in CAPS:
  for a,b,c in caps:vtt.extend([f'{stamp(a)} --> {stamp(b)}',c,''])
 (PUBLIC/'coulomb.vtt').write_text('\n'.join(vtt),encoding='utf8')
 manifest={**META,'title':'一根银丝，怎样称出电力？','synthetic_voice':True,'narrative':'First-person adaptation of published memoirs, source notes on webpage','picture':'Blender Eevee native 1920x1080; fixed cameras; sampled motion blended at 24fps; illustrative timing','plot':'Memoir small-angle comparison: relative distance alpha/36 and relative force (alpha+beta)/36 on LINEAR axes; SI and geometric corrections remain in webpage details','source':'assets/coulomb/film-sources.json','script':[t['text'] for t in TIME],'human_listening_review':False}
 (PUBLIC/'coulomb.manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
 print(f'Installed {dest}: {DURATION:.3f}s',flush=True)
if __name__=='__main__':main()
