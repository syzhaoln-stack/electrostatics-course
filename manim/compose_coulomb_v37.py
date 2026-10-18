"""A motion-first Coulomb film: real Blender core, speech-timed demonstrations.

The measured points come from the memoir. Rendered dynamics illustrate cause
and response and do not independently establish the inverse-square law.
"""
from pathlib import Path
from functools import lru_cache
from PIL import Image, ImageDraw, ImageFont, ImageChops
import bisect, hashlib, json, math, re, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parent.parent
STORAGE = Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904')
AUDIO = STORAGE/'coulomb-v37-audio/production/v3-7-intuition/coulomb'
WORK = STORAGE/'coulomb-v37-edit'; WORK.mkdir(exist_ok=True)
RENDERS = STORAGE/'coulomb-v37-renders'
OLD = ROOT/'media/lesson-dialogues/production/v3-6/coulomb/renders'
PUBLIC = ROOT/'media/lesson-dialogues'
TIME = json.loads((AUDIO/'timeline.json').read_text(encoding='utf8'))
META = json.loads((AUDIO/'manifest.json').read_text(encoding='utf8'))
DATA = json.loads((ROOT/'coulomb-fit-data.json').read_text(encoding='utf8'))['relativeComparison']
W,H,FPS = 1920,1080,24
DURATION = META['duration']
FFMPEG = 'D:/Python tools/ffmpeg-6.0-full_build/bin/ffmpeg.exe'
BG='#090d10'; INK='#efe9dc'; MUTED='#9bafb0'; GOLD='#e4bf7d'; CYAN='#8bd2d7'; CORAL='#ec9c85'
PROJECTIONS={}; DURATIONS={}; OLD_PROJECTIONS={}
for p in sorted(OLD.glob('projection-*.json'),key=lambda p:p.stat().st_mtime):
    for k,v in json.loads(p.read_text(encoding='utf8')).get('shots',{}).items():
        if k not in OLD_PROJECTIONS or len(v)>len(OLD_PROJECTIONS[k]):OLD_PROJECTIONS[k]=v
for name in ['projection-intuition-preview.json','projection-intuition.json']:
    p=RENDERS/name
    if p.exists():
        payload=json.loads(p.read_text(encoding='utf8'));PROJECTIONS.update(payload['shots']);DURATIONS.update(payload.get('durations',{}))

@lru_cache(None)
def font(size,serif=False):return ImageFont.truetype('C:/Windows/Fonts/STSONG.TTF' if serif else 'C:/Windows/Fonts/msyh.ttc',size)
def text(d,xy,value,size=30,color=INK,anchor=None,serif=False):d.text(xy,str(value),font=font(size,serif),fill=color,anchor=anchor)
def clamp(v):return max(0,min(1,v))
def ease(v):v=clamp(v);return v*v*(3-2*v)
def mix(a,b,u):return a+(b-a)*clamp(u)
def remap(t,knots):
    if t<=knots[0][0]:return knots[0][1]
    for (a,x),(b,y) in zip(knots,knots[1:]):
        if t<=b:return mix(x,y,(t-a)/max(.001,b-a))
    return knots[-1][1]
def arrow(d,a,b,color=CORAL,width=4,head=14):
    d.line([a,b],fill=color,width=width);ang=math.atan2(b[1]-a[1],b[0]-a[0])
    d.polygon([b,(b[0]-head*math.cos(ang-.45),b[1]-head*math.sin(ang-.45)),(b[0]-head*math.cos(ang+.45),b[1]-head*math.sin(ang+.45))],fill=color)
def dashed(d,a,b,color=MUTED,width=2):
    length=math.dist(a,b)
    if length<1:return
    for i in range(0,int(length),15):
        f=i/length;g=min(1,(i+7)/length)
        d.line([(mix(a[0],b[0],f),mix(a[1],b[1],f)),(mix(a[0],b[0],g),mix(a[1],b[1],g))],fill=color,width=width)
def glow(d,p,r=18,color=GOLD,width=2):d.ellipse((p[0]-r,p[1]-r,p[0]+r,p[1]+r),outline=color,width=width)
def callout(d,p,xy,title,sub='',color=GOLD,size=29):
    d.line([p,(xy[0]-20,p[1]),(xy[0]-20,xy[1]+14)],fill=color,width=2);glow(d,p,8,color)
    text(d,xy,title,size,color)
    if sub:text(d,(xy[0],xy[1]+42),sub,23,MUTED)
def cue(turn,phrase,fallback):
    joined=''.join(w['text'] for w in turn['words']);at=joined.find(phrase);offset=0
    if at<0:return fallback
    for word in turn['words']:
        if offset+len(word['text'])>at:return word['start']-turn['start']
        offset+=len(word['text'])
    return fallback
def pulse(turn,phrase,t):
    dt=t-cue(turn,phrase,1e9)
    return math.sin(math.pi*dt/1.8)**2 if 0<=dt<=1.8 else 0
def captions(turn):
    out=[];chunk=[]
    for w in turn['words']:
        chunk.append(w)
        length=len(''.join(v['text'] for v in chunk))
        if length>=32 or re.search('[。？！；]',w['text']) or (length>=8 and re.search('[，：]',w['text'])):
            out.append((chunk[0]['start'],chunk[-1]['end'],''.join(v['text'] for v in chunk)));chunk=[]
    if chunk:out.append((chunk[0]['start'],chunk[-1]['end'],''.join(v['text'] for v in chunk)))
    return out
CAPS=[captions(t) for t in TIME]

@lru_cache(maxsize=12)
def load_frame(name,index,legacy=False):
    base=OLD if legacy else RENDERS;path=base/name/f'{index:04}.png'
    if not path.exists():path=base/f'{name}-preview.png'
    return Image.open(path).convert('RGB')
@lru_cache(maxsize=16)
def edge_mask(size):
    width,height=size;edge=min(85,width*.16,height*.16)
    x=Image.new('L',(width,1));x.putdata([round(255*min(1,i/edge,(width-1-i)/edge)) for i in range(width)])
    y=Image.new('L',(1,height));y.putdata([round(255*min(1,i/edge,(height-1-i)/edge)) for i in range(height)])
    return ImageChops.multiply(x.resize(size),y.resize(size))
def footage(img,name,u,box=(0,0,W,H),crop=(0,0,W,H),legacy=False):
    table=OLD_PROJECTIONS if legacy else PROJECTIONS;seq=table[name]
    us=[s['u'] for s in seq];j=min(len(seq)-1,bisect.bisect_left(us,clamp(u)));i=max(0,j-1)
    selected=i if abs(us[i]-u)<abs(us[j]-u) else j
    rec=dict(seq[selected]);view=load_frame(name,selected,legacy)
    scale=min((box[2]-box[0])/(crop[2]-crop[0]),(box[3]-box[1])/(crop[3]-crop[1]))
    size=(round((crop[2]-crop[0])*scale),round((crop[3]-crop[1])*scale))
    off=(round(box[0]+(box[2]-box[0]-size[0])/2),round(box[1]+(box[3]-box[1]-size[1])/2))
    img.paste(view.crop(crop).resize(size,Image.Resampling.LANCZOS),off,edge_mask(size))
    rec['points']={k:(off[0]+(v['x']-crop[0])*scale,off[1]+(v['y']-crop[1])*scale) for k,v in rec['points'].items()}
    return rec
def fraction(name,t):return clamp(t/DURATIONS.get(name,1))
def wire(img,name,u,box=(65,185,360,935)):
    return footage(img,name,u,box,(700,25,1270,1060))
def close(img,name,u,box=(410,215,1850,920)):
    return footage(img,name,u,box,(120,0,1800,1080))
def lower_angle(d,record,scale=.45,color=GOLD):
    p=record['points'];o=p['needle_center'];z=p['zero'];ball=p['moving_ball']
    rad=math.radians(record['twist_deg']);ex=(z[0]-o[0],z[1]-o[1]);sn=math.sin(rad)
    if abs(sn)<.025:return
    ey=((ball[0]-o[0]-ex[0]*math.cos(rad))/sn,(ball[1]-o[1]-ex[1]*math.cos(rad))/sn)
    a=min(abs(rad),2*math.pi)*(-1 if rad<0 else 1)
    points=[(o[0]+scale*(ex[0]*math.cos(a*k/60)+ey[0]*math.sin(a*k/60)),o[1]+scale*(ex[1]*math.cos(a*k/60)+ey[1]*math.sin(a*k/60))) for k in range(61)]
    dashed(d,o,z,'#536c70');d.line(points,fill=color,width=3)
def force_views(img,u,whole='force-cycle',detail='force-close',detail_u=None):
    a=wire(img,whole,u);b=close(img,detail,u if detail_u is None else detail_u)
    d=ImageDraw.Draw(img);p=a['points'];text(d,(75,180),'上端固定',24,MUTED)
    d.line((p['upper_clamp'][0]-21,p['upper_clamp'][1]-8,p['upper_clamp'][0]+21,p['upper_clamp'][1]-8),fill=GOLD,width=3)
    lower_angle(d,b);return a,b
def pursuit_views(img,trial,u,compact=False):
    suffix=['0','126','567'][trial];name='pursuit-close-'+suffix
    # Whole-wire and close-up share the same physical time, including pauses.
    before=sum(DURATIONS.get('pursuit-close-'+s,0) for s in ['0','126','567'][:trial])
    wu=(before+clamp(u)*DURATIONS.get(name,1))/DURATIONS.get('pursuit-wire',1)
    wr=wire(img,'pursuit-wire',wu,(45,220,250,920) if compact else (65,185,360,935))
    cr=close(img,name,u,(265,330,1000,855) if compact else (420,240,1810,915))
    d=ImageDraw.Draw(img);p=cr['points']
    d.line([p['source_ball'],p['moving_ball']],fill=CYAN,width=3)
    glow(d,p['source_ball'],11,GOLD);glow(d,p['moving_ball'],11,CORAL)
    pts=[p[f'gap_arc_{i:02}'] for i in range(17)];d.line(pts,fill=CYAN,width=3)
    return wr,cr
def state_label(d,record,xy=(460,202),size=29):
    status='施力球先靠近' if record.get('source_speed_deg_s',0)>.1 else '施力球停下，悬球继续退开'
    if abs(record.get('source_speed_deg_s',0))<.1 and record.get('speed_deg_s',0)<-.2:status='施力球停下，悬杆回摆、逐渐停稳'
    if abs(record.get('speed_deg_s',0))<.05 and record['u']>.8:status='停稳后，读数'
    text(d,xy,status,size,MUTED)
def graph(d,count,curve=0,large=False,highlight=-1):
    x0,y0,x1,y1=(280,280,1730,825) if large else (1110,325,1790,830)
    px=lambda r:x0+r/1.12*(x1-x0);py=lambda f:y1-f/18*(y1-y0)
    for r in [0,.25,.5,.75,1]:
        x=px(r);d.line((x,y0,x,y1),fill='#263338');text(d,(x,y1+18),f'{r:g}',23,MUTED,'ma')
    for f in [0,4,8,12,16]:
        y=py(f);d.line((x0,y,x1,y),fill='#263338');text(d,(x0-14,y),f'{f:g}',23,MUTED,'rm')
    arrow(d,(x0,y1),(x1+20,y1),MUTED,2,10);arrow(d,(x0,y1),(x0,y0-16),MUTED,2,10)
    text(d,(x0,y0-58),'力 · 第一次为 1',29,GOLD);text(d,(x1,y1+63),'距离 · 第一次为 1',27,CYAN,'ra')
    if curve:
        pts=[];fit=DATA['fit']
        for k in range(round(240*curve)):
            r=1.06-.83*k/239;v=fit['coefficient']/r**fit['exponent'];pts.append((px(r),py(v)))
        if len(pts)>1:d.line(pts,fill='#c6d4c5',width=4)
    for i,p in enumerate(DATA['points'][:count]):
        x,y=px(p['distanceRatio']),py(p['forceRatio']);col=[CYAN,GOLD,CORAL][i]
        d.ellipse((x-8,y-8,x+8,y+8),fill=col)
        dx,dy=(((-225 if large else -140),-105) if i==0 else (18,-78) if i==1 else (-225,30) if large else (85,-25))
        text(d,(x+dx,y+dy),f'距离 {p["distanceRatio"]:.2f}',25,col)
        text(d,(x+dx,y+dy+35),f'力 {p["forceLabel"]}',25,col)
        if i==highlight:dashed(d,(x,y1),(x,y),CYAN);dashed(d,(x0,y),(x,y),GOLD);glow(d,(x,y),17,col)
    return px,py

def first_scene(img,turn,t,dur):
    release=cue(turn,'现在撤掉',6);returned=cue(turn,'原来',11)
    if t<release:pt=mix(.18,3.8,t/max(1,release))
    else:pt=mix(4,8.8,(t-release)/max(1,dur-release-1))
    wr,cr=force_views(img,fraction('force-cycle',pt));d=ImageDraw.Draw(img)
    wire_flash=pulse(turn,'细银丝',t);rod_flash=pulse(turn,'横杆',t)
    if wire_flash>.05:
        d.line([wr['points']['wire_top'],wr['points']['wire_bottom']],fill=GOLD,width=1+round(2*wire_flash))
    if rod_flash>.05:d.line([cr['points']['needle_center'],cr['points']['moving_ball']],fill=GOLD,width=1+round(3*rod_flash))
    text(d,(445,205),'轻轻推一下' if t<release else '撤力 → 银丝把轻杆扭回',34,CORAL if t<release else CYAN)
    text(d,(1450,760),'轻杆',27,INK);text(d,(1450,806),'悬在细银丝下端',23,MUTED)
    if t>2:text(d,(460,849),'蓝色：银丝的回复作用',26,CYAN)
    if t>2:text(d,(95,900),'细银丝',27,GOLD)
    if t<release:
        text(d,(1450,325),'F',66,CORAL,serif=True);text(d,(1450,402),'外加的小力',25,CORAL)
        if t>1.4:
            text(d,(1450,477),'≈ 16 μg 重',39,GOLD)
            text(d,(1450,535),'第一次实测力的量级',22,MUTED)
    else:
        text(d,(1450,325),'撤掉外力',39,INK);text(d,(1450,390),'仍有回复作用',26,CYAN)
    if t>=cue(turn,'它被扭转',dur*.55):
        for key in ['wire_top','wire_bottom']:glow(d,wr['points'][key],12,GOLD)
        text(d,(460,900),'扭开以后，银丝就想转回来。',33,CYAN)

def double_scene(img,turn,t,dur):
    change=cue(turn,'把力加到两倍',dur*.4)
    settled=cue(turn,'转角也变成两倍',dur*.65)-.3
    elapsed=0 if t<change else mix(0,5.5,(t-change)/max(1,settled-change))
    du=0 if t<change else fraction('force-double-close',.5+elapsed)
    # The overall wire shows the same angle as the close-up, using the second
    # loading interval of the shared cycle after the first equilibrium.
    wu=fraction('force-cycle',14.8 if t<change else 15+elapsed)
    wr,cr=force_views(img,wu,detail='force-double-close',detail_u=du);d=ImageDraw.Draw(img)
    text(d,(445,205),'同一根丝，同一根杆',31,MUTED)
    text(d,(1440,325),'F' if t<change else '2F',70,CORAL,serif=True)
    text(d,(1440,432),f'{cr["twist_deg"]:.0f}°',68,GOLD,serif=True)
    text(d,(1440,518),'平衡转角' if t<change or t>=settled else '当前转角',25,MUTED)
    if t>=settled:text(d,(460,900),'力 × 2    →    平衡转角 × 2',40,INK)

def comparison_scene(img,turn,t,dur,length=True):
    change=cue(turn,'仍然施加' if length else '仍然横着推',dur*.35)
    settled=cue(turn,'最终转角' if length else '平衡转角',dur*.75)-.3
    progress=clamp((t-max(0,change-2))/max(2,settled-max(0,change-2)))
    names=[('short-wire','short-wire-close'),('force-cycle','force-close')] if length else [('force-cycle','force-close'),('long-arm','long-arm-close')]
    for i,(whole,detail) in enumerate(names):
        offset=i*940
        # Equal force ramps, then readable settled positions in both views.
        seconds=mix(9.02,14.8,progress) if whole=='force-cycle' else mix(.18,8 if whole=='short-wire' else 13,progress)
        u=fraction(whole,seconds);du=fraction(detail,seconds)
        wr=wire(img,whole,u,(55+offset,215,315+offset,920))
        # Camera zoom must not erase the physical factor-of-two comparison.
        ortho={'force-close':5.6,'short-wire-close':4.8,'long-arm-close':8.4}[detail]
        ratio=ortho/(5.6 if length else 8.4)
        cx,cy=620+offset,622.5
        box=(cx-320*ratio,cy-227.5*ratio,cx+320*ratio,cy+227.5*ratio)
        cr=close(img,detail,du,box);d=ImageDraw.Draw(img)
        lower_angle(d,cr)
        label=('短银丝 · L' if i==0 else '长银丝 · 2L') if length else ('杆臂 R' if i==0 else '杆臂 2R')
        text(d,(75+offset,205),label,37,GOLD,serif=True)
        text(d,(430+offset,302),'同样的力 F',29,CORAL)
        text(d,(430+offset,840),f'转角 {cr["twist_deg"]:.0f}°',40,CYAN)
        if length:
            top=wr['points']['wire_top'];bottom=wr['points']['wire_bottom'];x=top[0]-38
            d.line((x,top[1],x,bottom[1]),fill=GOLD,width=2)
            for y in [top[1],bottom[1]]:d.line((x-6,y,x+6,y),fill=GOLD,width=2)
        else:
            d.line([cr['points']['needle_center'],cr['points']['moving_ball']],fill=GOLD,width=3)
    if progress>.95:text(ImageDraw.Draw(img),(960,928),'同样的小力，留下更大的转角。',33,INK,'mm')

def shield_scene(img,turn,t,dur):
    enter=cue(turn,'穿过玻璃',dur*.6)
    u=.05+.35*clamp(t/max(1,enter)) if t<enter else mix(.42,1,(t-enter)/max(1,dur-enter))
    rec=footage(img,'shield-and-scale',u,(0,160,1920,950),(180,0,1740,1080));d=ImageDraw.Draw(img)
    if t<enter:
        callout(d,rec['points']['glass_shield'],(1300,340),'玻璃罩挡住气流','外面有风，里面保持安静',CYAN)
        if t>cue(turn,'刻度',4):callout(d,rec['points']['scale'],(1320,670),'外圈刻度','转过多少，直接读角度',GOLD)
        for phrase,key,color in [('玻璃罩','glass_shield',CYAN),('刻度','scale',GOLD)]:
            amount=pulse(turn,phrase,t)
            if amount>.05:glow(d,rec['points'][key],14+20*amount,color,3)
    else:
        p=rec['points']['wire_bottom']
        d.line([p,(p[0]+60,p[1]+70),(1270,p[1]+70),(1270,704)],fill=GOLD,width=2)
        glow(d,p,8,GOLD)
        text(d,(1290,690),'细银丝 + 轻杆',29,GOLD)
        text(d,(1290,732),'小力 → 可见的转动',23,MUTED)

def magnitude_scene(img,turn,t,dur):
    wr,cr=pursuit_views(img,0,min(1,t/6));d=ImageDraw.Draw(img)
    second=cue(turn,'零位只能',dur*.45)
    if t<second:
        text(d,(455,200),'第一次测量',29,MUTED)
        text(d,(1510,300),'≈ 16 μg',68,GOLD,serif=True)
        text(d,(1510,388),'这么轻的物体的重量',25,MUTED)
        text(d,(1510,448),'≈ 0.15 μN',42,INK)
        text(d,(1510,540),'最终转过 36°',44,CYAN)
    else:
        text(d,(455,200),'零位附近的细微差别',29,MUTED)
        text(d,(1510,292),'2–3°',66,CYAN,serif=True)
        text(d,(1510,380),'原文的零位不确定范围',24,MUTED)
        text(d,(1510,450),'≈ 1.3 μg 重',48,GOLD)
        text(d,(1510,522),'≈ 13 nN',43,INK)
        # Small inset distinguishes an uncertainty band from a claimed digital
        # resolution. The exact main-model pose stays at the measured 36°.
        o=(1510,802);r=135
        d.pieslice((o[0]-r,o[1]-r,o[0]+r,o[1]+r),-93,-87,fill='#426b74')
        d.line((o[0],o[1],o[0],o[1]-r),fill=CYAN,width=2)
        end=(o[0]+r*math.sin(math.radians(36)),o[1]-r*math.cos(math.radians(36)))
        d.line([o,end],fill=GOLD,width=3)
        d.arc((o[0]-75,o[1]-75,o[0]+75,o[1]+75),-90,-54,fill=GOLD,width=2)
        text(d,(o[0]-12,o[1]-r-33),'零位',22,CYAN,'ra')
        text(d,(end[0]+12,end[1]),'36°',28,GOLD)
        text(d,(1550,875),'把零位的小范围，与实测偏转对照。',24,MUTED,'mm')

def approach_scene(img,turn,t,dur):
    # One complete third-stage pursuit contains several distinct approach/stop
    # cycles; the suspended sphere follows the dynamics rather than the source.
    knots=[(0,0),(cue(turn,'把施力球靠近',3.8),0),(cue(turn,'悬球被排斥',5.96),1.4),
           (cue(turn,'等它停下',9.64),2.35),(cue(turn,'再把施力球追近',11.16),2.4),
           (cue(turn,'它又转开',13.08),3.85),(cue(turn,'看清',14.72),4.795),
           (cue(turn,'先靠近',16.68),4.8),(cue(turn,'再被推远',17.92),6.2),
           (cue(turn,'一次次重复',19.96),7.2),(cue(turn,'新的位置停稳',23.44),DURATIONS.get('pursuit-close-567',14.83125))]
    pt=remap(t,knots);u=fraction('pursuit-close-567',pt);_,cr=pursuit_views(img,2,u);d=ImageDraw.Draw(img)
    if t<knots[1][0]:text(d,(460,202),'两颗小球，带上同种电荷',29,MUTED)
    else:state_label(d,cr)
    for key in ['source_ball','moving_ball']:text(d,cr['points'][key],'+',24,'#8f513a','mm')
    text(d,(1510,320),'● 施力球',28,GOLD);text(d,(1510,372),'● 悬球',28,CORAL)
    text(d,(1510,500),f'相隔 {cr["separation_deg"]:.1f}°',38,CYAN)
    text(d,(1510,562),f'扭转 {cr["twist_deg"]:.1f}°',38,GOLD)
    text(d,(455,913),'先靠近，再被推远；每次都等它作出响应。',31,INK)

def reference_scene(img,turn,t,dur):
    transition=cue(turn,'只比较停稳',dur*.45)
    left=footage(img,'equiv-active',min(1,t/max(2,transition)),(120,230,670,900),(760,140,1160,970),legacy=True)
    right=wire(img,'pursuit-wire',1,(1100,230,1500,900))
    d=ImageDraw.Draw(img)
    text(d,(190,192),'原操作：拧上端',38,GOLD,serif=True);text(d,(1070,192),'等效演示：上端固定',38,CYAN,serif=True)
    text(d,(660,350),f'上端 −{left["beta_deg"]:.1f}°',30,GOLD);text(d,(660,780),f'下端 +{left["alpha_deg"]:.1f}°',30,CYAN)
    text(d,(1510,350),'上端 0°',30,GOLD);text(d,(1510,780),'下端 +575.5°',30,CYAN)
    if t>=transition:
        text(d,(960,915),'两球相隔 8.5°    ·    银丝相对扭转 575.5°',37,INK,'mm')
        text(d,(960,480),'停稳后',30,MUTED,'mm');text(d,(960,535),'抵抗的力矩相同',29,GOLD,'mm')

def readings_scene(img,turn,t,dur):
    second=cue(turn,'追近以后',dur*.2);third=cue(turn,'再追近',dur*.43)
    stage=0 if t<second else 1 if t<third else 2
    # The preceding scene has already shown the complete dynamical process.
    # Here the spoken numerical results refer to settled observations only.
    u=1
    _,cr=pursuit_views(img,stage,u,True);d=ImageDraw.Draw(img)
    point_times=[cue(turn,'记作一',2),cue(turn,'扭了四倍',6.44),cue(turn,'接近十六倍',20.76)]
    landed=t>=point_times[stage];count=stage+int(landed)
    graph(d,count,highlight=stage if landed else -1)
    text(d,(290,205),f'第 {stage+1} 次',30,MUTED)
    text(d,(290,262),f'两球相隔 {cr["separation_deg"]:.1f}°',34,CYAN)
    text(d,(290,310),f'银丝总扭转 {cr["twist_deg"]:.1f}°',33,GOLD)
    if stage==2 and cr['twist_deg']>=360:text(d,(310,885),'累计扭过 1 圈 + 215.5°',28,GOLD)
    if landed:text(d,(1100,216),['第一次记为 1','距离约一半 → 力约 4 倍','距离约四分之一 → 力约 16 倍'][stage],29,INK)

def fit_scene(img,turn,t,dur):
    curve=ease((t-cue(turn,'一条',5))/4);graph(ImageDraw.Draw(img),3,curve=curve,large=True)
    d=ImageDraw.Draw(img)
    if curve>.5:text(d,(650,225),'白线：三组实测读数的拟合',25,MUTED)
    if t>=cue(turn,'平方反比',dur*.55):
        text(d,(1080,395),'F ∝ 1 / r²',62,INK,serif=True)
        text(d,(1080,485),'距离减半，力约为 4 倍',32,GOLD)
    if t>=cue(turn,'拟合得到',dur*.75):
        text(d,(1080,565),'实测拟合指数 1.92',35,CYAN)
        text(d,(1080,615),'接近 2；保留真实数据的差别。',25,MUTED)

def closing_scene(img,turn,t,dur):
    wr,cr=force_views(img,fraction('force-cycle',mix(.18,3.8,clamp(t/7))))
    d=ImageDraw.Draw(img);text(d,(1390,320),'微小的力',42,CORAL,serif=True)
    text(d,(1415,390),'↓',45,MUTED);text(d,(1390,460),'明显的转角',42,GOLD,serif=True)
    text(d,(1415,530),'↓',45,MUTED);text(d,(1390,600),'读出力的大小',42,CYAN,serif=True)
    if t>dur*.6:text(d,(445,915),'先标定：多大的力，对应多大的转角。',33,INK)

@lru_cache(None)
def shade():
    out=Image.new('RGBA',(W,H));d=ImageDraw.Draw(out)
    for y in range(170):d.line((0,y,W,y),fill=(5,9,12,round(245*(1-y/170)**.5)))
    for y in range(966,H):d.line((0,y,W,y),fill=(5,9,12,round(245*((y-966)/114)**.4)))
    return out
SCENES={'push-release':first_scene,'double-force':double_scene,'double-length':lambda *a:comparison_scene(*a,length=True),'double-lever':lambda *a:comparison_scene(*a,length=False),'shield-and-scale':shield_scene,'historical-force':magnitude_scene,'approach-response':approach_scene,'relative-reference':reference_scene,'three-readings':readings_scene,'fit-law':fit_scene,'measurement-close':closing_scene}
def scene_frame(index,local):
    turn=TIME[index];dur=turn['end']-turn['start'];img=Image.new('RGB',(W,H),BG)
    SCENES[turn['base_id']](img,turn,local,dur)
    img=Image.alpha_composite(img.convert('RGBA'),shade()).convert('RGB');d=ImageDraw.Draw(img)
    text(d,(74,32),'库仑的电秤  /  1785',22,GOLD);text(d,(1846,32),f'{index+1:02} / {len(TIME):02}',22,MUTED,'ra')
    text(d,(74,78),turn['question'],48,INK,serif=True)
    now=turn['start']+local;cap=next((c[2] for c in CAPS[index] if c[0]<=now<c[1]+.09),'')
    if cap:text(d,(960,1000),cap,33,INK,'ma')
    d.rectangle((0,1077,round(W*now/DURATION),1080),fill=GOLD)
    return img
def stamp(t):
    m=round(t*1000);return f'{m//3600000:02}:{m//60000%60:02}:{m//1000%60:02}.{m%1000:03}'
SHOT_DEPENDENCIES=[['force-cycle','force-close'],['force-cycle','force-double-close'],
    ['short-wire','short-wire-close','force-cycle','force-close'],
    ['long-arm','long-arm-close','force-cycle','force-close'],['shield-and-scale'],
    ['pursuit-wire','pursuit-close-0'],['pursuit-wire','pursuit-close-567'],['pursuit-wire'],
    ['pursuit-wire','pursuit-close-0','pursuit-close-126','pursuit-close-567'],[],['force-cycle','force-close']]
def compose_segment(index):
    files=[]
    for name in SHOT_DEPENDENCIES[index]:
        seq=PROJECTIONS.get(name,[])
        if len(seq)<16:raise RuntimeError(f'Missing projection: {name}')
        files.extend(RENDERS/name/f'{i:04}.png' for i in range(len(seq)))
    if index==7:files.extend(OLD/'equiv-active'/f'{i:04}.png' for i in range(len(OLD_PROJECTIONS['equiv-active'])))
    if not all(p.exists() for p in files):raise RuntimeError(f'Incomplete Blender shots for scene {index}')
    signature=hashlib.sha256(Path(__file__).read_bytes()+(AUDIO/'timeline.json').read_bytes()+
        json.dumps({k:PROJECTIONS[k] for k in SHOT_DEPENDENCIES[index]},sort_keys=True).encode()+
        repr([(str(p),p.stat().st_size,p.stat().st_mtime_ns) for p in files]).encode()).hexdigest()
    output=WORK/f'scene-{index:02}.mp4';record=WORK/f'scene-{index:02}.sha256'
    if output.exists() and record.exists() and record.read_text()==signature:
        print(f'Using verified composition {index:02}',flush=True);return output
    start=0 if index==0 else math.ceil(TIME[index]['start']*FPS)
    end=math.ceil((TIME[index+1]['start'] if index+1<len(TIME) else DURATION)*FPS)
    with (WORK/f'encode-{index:02}.log').open('w',encoding='utf8') as log:
        proc=subprocess.Popen([FFMPEG,'-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r',str(FPS),'-i','-','-an','-c:v','libx264','-crf','21','-preset','fast','-threads','3','-g','48','-pix_fmt','yuv420p',str(output)],stdin=subprocess.PIPE,stderr=log)
        try:
            for f in range(start,end):proc.stdin.write(scene_frame(index,max(0,f/FPS-TIME[index]['start'])).tobytes())
        finally:proc.stdin.close()
        if proc.wait():raise RuntimeError(f'Picture encode failed: scene {index}')
    record.write_text(signature)
    print(f'Composed scene {index:02}: {end-start} frames',flush=True)
    return output
def main():
    if '--preview' in sys.argv:
        for i,t in enumerate(TIME):
            try:scene_frame(i,(t['end']-t['start'])*.78).save(WORK/f'preview-{i:02}.jpg',quality=94)
            except (KeyError,FileNotFoundError) as e:print(f'Pending shot {i}: {e}')
        return
    if '--scenes' in sys.argv:
        for index in map(int,sys.argv[sys.argv.index('--scenes')+1].split(',')):compose_segment(index)
        return
    segments=[compose_segment(i) for i in range(len(TIME))]
    listing=WORK/'picture-segments.txt';listing.write_text(''.join(f"file '{p.name}'\n" for p in segments))
    picture=WORK/'picture.mp4'
    subprocess.run([FFMPEG,'-hide_banner','-loglevel','warning','-y','-f','concat','-safe','0','-i',str(listing),'-c','copy',str(picture)],check=True)
    final=WORK/'coulomb.mp4'
    subprocess.run([FFMPEG,'-hide_banner','-loglevel','warning','-y','-i',str(picture),'-i',str(AUDIO/'dialogue.wav'),'-map','0:v','-map','1:a','-c:v','copy','-af','loudnorm=I=-17:TP=-1.5:LRA=9','-c:a','aac','-b:a','160k','-movflags','+faststart','-shortest',str(final)],check=True)
    shutil.copy2(final,PUBLIC/'coulomb.mp4')
    scene_frame(0,4).save(PUBLIC/'coulomb.poster.jpg',quality=94)
    chapters=[{k:t[k] for k in ['index','id','base_id','start','end','question','answer','shot']} for t in TIME]
    (PUBLIC/'coulomb.chapters.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2),encoding='utf8')
    vtt=['WEBVTT','']
    for caps in CAPS:
        for a,b,c in caps:vtt.extend([f'{stamp(a)} --> {stamp(b)}',c,''])
    (PUBLIC/'coulomb.vtt').write_text('\n'.join(vtt),encoding='utf8')
    manifest={'edition':'3.7.0','title':'一根银丝，怎样称出电力？','duration':DURATION,'width':W,'height':H,'fps':FPS,'voice':META['voice'],'provider':META['provider'],'model':META['model'],'speech_rate_request':5,'native_tempo_preserved':True,'synthetic_voice':True,'human_listening_review':False,'picture':'Native HD Blender Eevee, free-needle damped angular ODE, manually advancing source, discrete sampled poses without ghost-sphere crossfades','historical_data':'Original measured final angles 36/18/8.5 and total twists 36/144/575.5; explanatory dynamics calibrated separately to each endpoint, not independent evidence for the force law','measurement':'First force approximately 0.15 microN; zero uncertainty of 2-3 degrees expressed in force approximately 13 nN, not a modern calibrated resolution specification','source':'assets/coulomb/film-sources.json','script':[t['text'] for t in TIME],'chapters':chapters}
    (PUBLIC/'coulomb.manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
    print(f'Installed {final}: {DURATION:.3f}s',flush=True)
if __name__=='__main__':main()
