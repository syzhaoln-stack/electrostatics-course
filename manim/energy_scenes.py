"""Original question-led electrostatics diagrams; positions are schematic.
Arrows show forces, not material streams. Constrained paths are labelled.
"""
from lesson_scenes import *


class EnergyDialogue(DialogueScene):
    def setup(self):
        super().setup()
        self.set_camera_orientation(phi=0, theta=-90*DEGREES, zoom=1, frame_center=ORIGIN)

    def note(self, text):
        if getattr(self, 'explanation', None) is not None:
            self.remove(self.explanation)
        self.explanation = label(text, 24, INK).move_to([3.25, -.25, 0])
        if self.explanation.width > 5.3:
            self.explanation.scale_to_fit_width(5.3)
        self.add(self.explanation)

    def turn(self, i, animation=None, duration=2, rate=linear):
        self.subtitle(i)
        if animation is not None:
            self.play_turn(i, animation, duration=duration, rate_func=rate)
        self.end_turn(i)


class PotentialDialogue(EnergyDialogue):
    lesson = 'potential'
    heading = '不做功，为什么还受力？'

    def construct(self):
        center = np.array([-2.4, -.15, 0.])
        a = ValueTracker(.3)
        r = ValueTracker(1.55)
        point = lambda: center + r.get_value()*np.array([np.cos(a.get_value()), np.sin(a.get_value()), 0])
        source = ball(center, .18)
        shell = Circle(1.55, color=OUTWARD, stroke_width=2).move_to(center)
        equator = Ellipse(width=3.1, height=.78, color=OUTWARD, stroke_width=.8).move_to(center)
        disk = Circle(1.55, fill_color=OUTWARD, fill_opacity=.035, stroke_width=0).move_to(center)
        probe = always_redraw(lambda: Dot(point(), radius=.09, color=FORCE))
        force = always_redraw(lambda: Arrow(point(),point()+.95*np.array([np.cos(a.get_value()),np.sin(a.get_value()),0]),buff=0,color=FORCE,stroke_width=3))
        displacement = always_redraw(lambda: Arrow(point(),point()+.8*np.array([-np.sin(a.get_value()),np.cos(a.get_value()),0]),buff=0,color=INWARD,stroke_width=3))
        corner = always_redraw(lambda: VMobject(color=INK,stroke_width=1).set_points_as_corners([point()+.2*np.array([np.cos(a.get_value()),np.sin(a.get_value()),0]),point()+.2*np.array([np.cos(a.get_value())-np.sin(a.get_value()),np.sin(a.get_value())+np.cos(a.get_value()),0]),point()+.2*np.array([-np.sin(a.get_value()),np.cos(a.get_value()),0])]))
        self.add(disk,shell,equator,source,probe,force,displacement,corner)
        self.add(label('等势面的一条截线',18,MUTED).move_to([-2.4,-2.15,0]),label('金：电场力 F    紫：沿面位移',19).move_to([2.9,1.15,0]))
        self.formula(r'dW=\mathbf F\cdot d\mathbf r=F\,ds\cos\theta','W：电场做功；θ：力与这一步位移的夹角')
        self.note('有力，未必沿着移动方向出力。')
        self.init_cues(self.lesson)
        for i,phrase,key,getter in [(0,'金色小球','probe',lambda:probe),(1,'金箭头','force',lambda:force),(1,'紫箭头','displacement',lambda:displacement),(2,'垂直','right-angle',lambda:corner),(3,'力还在' if False else '不受力','force',lambda:force),(4,'电势','formula',lambda:self.current_formula),(5,'两倍电荷','energy',lambda:self.explanation),(6,'金箭头','force',lambda:self.pair_force),(7,'电势差','formula',lambda:self.current_formula)]:
            self.cue(i,phrase,key,getter)
        self.turn(0);self.turn(1)
        self.note('θ = 90°\n电场力 ≠ 0\n沿面电场做功 = 0')
        self.turn(2,a.animate.set_value(2.2),5)
        self.note('松手，从静止释放\n正电荷沿力向外加速')
        self.remove(displacement,corner)
        # Repulsive inverse-square release from rest, normalized physical time.
        radii=np.linspace(1.55,2.45,1001)
        u=radii/1.55
        times=np.sqrt(u*(u-1))+np.arcsinh(np.sqrt(u-1))
        times/=times[-1]
        release=lambda t: float((np.interp(t,times,radii)-1.55)/.9)
        self.turn(3,r.animate.set_value(2.45),2.5,rate=release)
        self.formula(r'V=U/q\qquad U=qV','V：电势 / V；U：电势能 / J；q：电荷量 / C')
        self.note('同一位置：V 不变\nq → 2q，U → 2U')
        self.turn(4);self.turn(5)
        self.remove(disk,shell,equator,source,probe,force)
        positive=ball([-4,0,0],.20,SOURCE);negative=ball([-1,0,0],.20,INWARD)
        self.pair_force=Arrow([-2.5,0,0],[-1.5,0,0],buff=0,color=FORCE)
        zero=Line([-2.5,-1.7,0],[-2.5,1.5,0],color=OUTWARD)
        self.add(positive,negative,zero,Dot([-2.5,0,0],color=FORCE),self.pair_force,label('+Q',22,SOURCE).move_to([-4,.5,0]),label('−Q',22,INWARD).move_to([-1,.5,0]))
        self.formula(r'V_1+V_2=0\quad\mathrm{but}\quad\mathbf E_1+\mathbf E_2\ne0','等量异号源：中垂面 V = 0；此处的电场仍不为零')
        self.note('零伏 ≠ 零场\n零功 ≠ 零力')
        self.turn(6);self.turn(7);self.finish()


class WorkDialogue(EnergyDialogue):
    lesson='paths'
    heading='绕远路，会多做功吗？'

    def construct(self):
        center=np.array([-4.4,0,0.]);A=np.array([-3.4,-.4,0.]);B=np.array([-.8,-.4,0.])
        direct=Line(A,B,color=FIELD);curve=CubicBezier(A,[-3.3,2,0],[-1.1,1.7,0],B,color=FORCE)
        self.add(ball(center,.18),direct,curve,label('A',24).next_to(Dot(A),DOWN),label('B',24).next_to(Dot(B),DOWN))
        t=ValueTracker(0)
        p=lambda route:route.point_from_proportion(t.get_value())
        first=always_redraw(lambda:Dot(p(direct),radius=.09,color=FIELD))
        second=always_redraw(lambda:Dot(p(curve),radius=.09,color=FORCE))
        work=lambda route:1/np.linalg.norm(A-center)-1/np.linalg.norm(p(route)-center)
        counters=always_redraw(lambda:VGroup(label('直达  '+f'{work(direct):+.3f}'+' eV',25,FIELD),label('绕行  '+f'{work(curve):+.3f}'+' eV',25,FORCE)).arrange(DOWN,aligned_edge=LEFT).move_to([3,.6,0]))
        self.add(first,second,counters)
        self.formula(r'W=\int_A^B q\mathbf E\cdot d\mathbf r','固定点源；示例取 q = +e，kQ = 1 V·mm')
        self.note('起点相同 · 终点相同')
        self.explanation.shift(DOWN*.7)
        self.init_cues(self.lesson)
        for i,phrase,key,getter in [(0,'绕远路','detour',lambda:curve),(1,'起点','start',lambda:Dot(A,radius=.13)),(2,'一样','work-readouts',lambda:counters),(3,'电势差','formula',lambda:self.current_formula),(4,'起点','start',lambda:Dot(A,radius=.13)),(5,'总功为零','formula',lambda:self.current_formula),(6,'这一小步','displacement',lambda:self.smallstep),(7,'直的切线','displacement',lambda:self.smallstep)]:self.cue(i,phrase,key,getter)
        self.turn(0);self.turn(1,t.animate.set_value(.42),5);self.turn(2,t.animate.set_value(1),4)
        self.formula(r'W=q(V_A-V_B)=-\Delta U','同一静电场、同一电荷、同一对端点')
        self.turn(3);self.turn(4)
        self.formula(r'\oint q\mathbf E\cdot d\mathbf r=0','闭路各段可以做正功、负功；总和为零')
        self.turn(5,t.animate.set_value(0),5)
        self.remove(first,second,counters,direct,curve)
        circle=Circle(1.4,color=OUTWARD,stroke_width=1.5).move_to([-2.5,0,0]);P=np.array([-1.1,0,0.]);ang=ValueTracker(0)
        F=Arrow(P,P+RIGHT*.9,buff=0,color=FORCE)
        self.smallstep=always_redraw(lambda:Arrow(P,P+.9*np.array([np.cos(ang.get_value()),np.sin(ang.get_value()),0]),buff=0,color=INWARD))
        self.add(circle,F,self.smallstep,Dot(P,color=FORCE))
        self.note('金：F    紫：一小步\n顺着 +    逆着 −    垂直 0')
        self.formula(r'dW=F\,ds\cos\theta','直切线仅在切点垂直；有限长直线通常离开等势面')
        self.turn(6,ang.animate.set_value(PI),3)
        self.turn(7,ang.animate.set_value(PI/2),2);self.finish()


class EquilibriumDialogue(EnergyDialogue):
    lesson='conductors'
    heading='外场还在，球内为什么是零？'

    def construct(self):
        C=np.array([-2.6,0,0.]);P=C+np.array([.25,.25,0]);sphere=Circle(1.55,color=MUTED,fill_color='#647b88',fill_opacity=.15)
        sphere.move_to(C);self.add(sphere,label('金属球剖面',18,MUTED).move_to([-2.6,-2,0]))
        outer=VGroup(*[Arrow([x,-1.9,0],[x,-1.35,0],buff=0,color=FIELD,stroke_width=1.4) for x in [-4.7,-3.9,-3.1,-2.3,-1.5,-.7]])
        probe=Dot(P,color=FORCE,radius=.09)
        external=Arrow(P,P+UP*.9,buff=0,color=FIELD)
        induced=Arrow(P,P+DOWN*.9,buff=0,color=FORCE)
        charges=VGroup(*[label('+' if np.sin(a)>0 else '−',22,SOURCE if np.sin(a)>0 else INWARD).move_to(C+1.55*np.array([np.cos(a),np.sin(a),0])) for a in np.linspace(.3,2*PI+.3,12,endpoint=False)])
        self.add(outer,probe,external)
        self.formula(r'\mathbf E_{\rm total}=\mathbf E_{\rm external}+\mathbf E_{\rm induced}','蓝：外场；金：感应场。图中是平衡后的结果。')
        self.note('外场没有凭空消失。')
        self.init_cues(self.lesson)
        for i,phrase,key,getter in [(0,'外面的电场','external',lambda:outer),(1,'两支箭头','components',lambda:VGroup(external,induced)),(1,'表面','surface-charge',lambda:charges),(2,'探针','probe',lambda:probe),(3,'法线','surface-normal',lambda:self.surfaceF),(4,'电势','potential',lambda:self.explanation),(5,'正的常数','potential',lambda:self.explanation),(6,'正有负','surface-charge',lambda:charges),(7,'转动','external',lambda:outer)]:self.cue(i,phrase,key,getter)
        self.turn(0);self.add(induced,charges);self.note('内部：外场 + 感应场 = 0')
        self.turn(1)
        self.turn(2, VGroup(probe,external,induced).animate.shift(LEFT*.5+DOWN*.5),2)
        self.remove(probe,external,induced)
        S=C+1.55*np.array([.6,.8,0]);self.surfaceF=Arrow(S,S+.8*np.array([.6,.8,0]),buff=0,color=FIELD)
        tangent=Line(S+[-.4,.3,0],S+[.4,-.3,0],color=INWARD)
        self.add(Dot(S,color=FORCE),self.surfaceF,tangent)
        self.formula(r'E_{\rm tangent}=0\qquad E_{\rm normal}\ \mathrm{can\ be}\ne0','表面外侧场沿法线；若有切向场，自由电荷还会移动')
        self.note('表面外侧 ≠ 材料内部')
        self.turn(3);self.turn(4)
        self.remove(outer,charges,self.surfaceF,tangent)
        positive=VGroup(*[label('+',22,SOURCE).move_to(C+1.55*np.array([np.cos(a),np.sin(a),0])) for a in np.linspace(0,2*PI,12,endpoint=False)])
        self.add(positive)
        self.formula(r'r<R:\quad E=0,\qquad V=kQ/R>0','孤立带正电球，选 V(∞)=0')
        self.note('内部处处同一个正电势\n零电场 ≠ 零电势')
        self.turn(5)
        self.remove(positive);self.add(charges,outer)
        self.formula(r'Q_{\rm total}=0','中性孤立球：电荷重新分布，总电荷不变')
        self.note('改外场方向\n比较新的平衡分布')
        self.turn(6);self.turn(7,Rotate(VGroup(charges,outer),PI/3,about_point=C),3);self.finish()
