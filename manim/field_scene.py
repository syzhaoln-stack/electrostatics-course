"""Original 3D, hypothesis-led superposition dialogue.

The two sources are fixed at +/-1.8 mm. Every local E arrow uses one linear
N/C-to-scene-unit scale; their sum is computed in SI, never by adding lengths.
Only the small test charge changes in the final experiment. Render against the
measured Doubao timeline produced by produce_dialogues.py.
"""
from pathlib import Path
import json
import os
import textwrap
import numpy as np
from manim import *

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'media' / 'lesson-dialogues'
BG, INK, MUTED = '#07111b', '#e9edf0', '#8da3b5'
FIELD, FORCE = '#66cbd8', '#f6ce75'
LEFT_FIELD, RIGHT_FIELD = '#b8d7ff', '#c5a6f5'
SOURCE, NEGATIVE = '#ff806a', '#9aafff'
K, Q, E_CHARGE = 8.9875517923e9, 1e-12, 1.602176634e-19
MM = 1e-3
ARROW_SCALE = 0.0005
CENTER = np.array([-2.10, 0., -.55])
S1, S2 = np.array([-1.8, 0., 0.]), np.array([1.8, 0., 0.])
config.background_color = BG
config.max_files_cached = 300


def words(text, size=24, color=INK):
    return Text(text, font='Microsoft YaHei', font_size=size,
                color=color, line_spacing=.8)


def tex(text, size=32, color=INK):
    return MathTex(text, font_size=size, color=color)


def sphere(position, radius, color):
    return Sphere(center=np.asarray(position), radius=radius,
                  resolution=(12, 6), checkerboard_colors=False,
                  fill_color=color, fill_opacity=1, stroke_width=0)


def arrow(start, displacement, color=FIELD, width=3):
    start, displacement = np.asarray(start), np.asarray(displacement)
    length = np.linalg.norm(displacement)
    if length < 1e-8:
        return VGroup()
    end, head = start + displacement, min(.17, .26 * length)
    shaft = Line(start, end, color=color, stroke_width=width).set_shade_in_3d(True)
    cone = Cone(base_radius=head*.35, height=head,
                direction=displacement/length, resolution=(2, 6),
                fill_color=color, fill_opacity=1, stroke_width=0)
    cone.shift(end)
    return VGroup(shaft, cone)


def source_field(point, source, charge):
    """Point-charge field in N/C; model distances are displayed in mm."""
    delta = (np.asarray(point)-np.asarray(source))*MM
    distance = np.linalg.norm(delta)
    if distance < 1e-9:
        raise ValueError('Observation point must not coincide with a source')
    return K*charge*delta/distance**3


def contributions(point, second_sign=-1):
    a = source_field(point, S1, Q)
    b = source_field(point, S2, second_sign*Q)
    return a, b, a+b


def background(second_sign=-1):
    """Sparse, regular XYZ samples. Same scale as the bright local arrows."""
    group = VGroup()
    for x in (-3.6, -1.2, 1.2, 3.6):
        for y in (-2.2, 2.2):
            for z in (-1.7, .9, 2.5):
                point = np.array([x, y, z])
                if min(np.linalg.norm(point-S1), np.linalg.norm(point-S2)) < 1.6:
                    continue
                e = contributions(point, second_sign)[2]
                group.add(arrow(CENTER+point, ARROW_SCALE*e, FIELD, 1.1).set_opacity(.22))
    return group


class SuperpositionDialogue(ThreeDScene):
    """Twelve measured turns: conjecture -> experiment -> vector correction."""

    def setup(self):
        super().setup()
        timeline_dir = Path(os.getenv('LESSON_TIMELINE_DIR', str(OUT/'production/v3-1')))
        candidate = timeline_dir / 'field' / 'timeline.json'
        if not candidate.is_file():
            candidate = OUT / 'field.timeline.json'
        self.timeline = json.loads(candidate.read_text(encoding='utf-8'))
        if len(self.timeline) != 12:
            raise ValueError('SuperpositionDialogue requires the frozen 12-turn script')
        self.set_camera_orientation(phi=66*DEGREES, theta=-84*DEGREES,
                                    zoom=1.05, frame_center=[0, 0, 0])
        title = words('两个源，怎样得到同一个点的场？', 33).move_to([0, 3.25, 0])
        eyebrow = words('电场叠加 · 两位同学边试边想', 16, MUTED).to_corner(UL, buff=.18)
        self.add_fixed_in_frame_mobjects(title, eyebrow)
        self.questions = [
            words('① 同一个 P', 20), words('② 大小直接加？', 20),
            words('③ 抵消或增强？', 20), words('④ 换小 q 呢？', 20),
        ]
        self.chain = VGroup(*self.questions).arrange(RIGHT, buff=.60).move_to([0, 2.48, 0])
        self.add_fixed_in_frame_mobjects(self.chain)
        separator = Line([2.42, 1.87, 0], [2.42, -2.70, 0],
                         stroke_width=1, color=MUTED).set_opacity(.28)
        self.add_fixed_in_frame_mobjects(separator)
        self.card = None
        self.current_subtitle = None

    def wait_to(self, moment):
        if moment > self.renderer.time + .015:
            self.wait(moment-self.renderer.time)

    def turn(self, index, question):
        turn = self.timeline[index]
        self.wait_to(turn['start'])
        for i, q in enumerate(self.questions):
            q.set_color(FIELD if i == question else MUTED)
        if self.current_subtitle is not None:
            self.remove(self.current_subtitle)
        # The mux step rewrites this safety-zone text from the same timeline.
        caption = '\n'.join(textwrap.wrap(turn['text'], width=34,
                                          break_long_words=True, break_on_hyphens=False))
        self.current_subtitle = words(turn['name']+'：'+caption, 25,
                                      FORCE if turn['speaker'] == 'xia' else FIELD)
        self.current_subtitle.move_to([0, -3.33, 0])
        if self.current_subtitle.width > 13.2:
            self.current_subtitle.scale_to_fit_width(13.2)
        self.add_fixed_in_frame_mobjects(self.current_subtitle)

    def end_turn(self, index):
        self.wait_to(self.timeline[index]['end'])

    def card_text(self, heading, equation='', lines=(), accent=FIELD):
        if self.card is not None:
            self.remove(self.card)
        parts = [words(heading, 24, accent).move_to([4.68, 1.47, 0])]
        if equation:
            formula = tex(equation, 30)
            if formula.width > 3.9:
                formula.scale_to_fit_width(3.9)
            formula.move_to([4.68, .70, 0])
            parts.append(formula)
        for i, line in enumerate(lines):
            item = words(line, 19, INK if i == 0 else MUTED)
            if item.width > 3.85:
                item.scale_to_fit_width(3.85)
            item.move_to([4.68, -.05-i*.50, 0])
            parts.append(item)
        self.card = VGroup(*parts)
        self.add_fixed_in_frame_mobjects(self.card)

    def local_vectors(self, p, sign2, visible, test_sign=1, construction=False):
        world = CENTER+p
        e1, e2, total = contributions(p, sign2)
        local = VGroup()
        for source in (S1, S2):
            local.add(DashedLine(CENTER+source, world, color=MUTED,
                                 stroke_width=1.15, dash_length=.07).set_opacity(.6))
        if 'e1' in visible:
            local.add(arrow(world, ARROW_SCALE*e1, LEFT_FIELD, 3.4))
        if 'e2' in visible:
            local.add(arrow(world, ARROW_SCALE*e2, RIGHT_FIELD, 3.4))
        if construction and np.linalg.norm(total) > 1e-8:
            local.add(DashedLine(world+ARROW_SCALE*e1, world+ARROW_SCALE*total,
                                 color=RIGHT_FIELD, stroke_width=1.5, dash_length=.065),
                      DashedLine(world+ARROW_SCALE*e2, world+ARROW_SCALE*total,
                                 color=LEFT_FIELD, stroke_width=1.5, dash_length=.065))
        if 'total' in visible:
            if np.linalg.norm(total) < 1e-8:
                local.add(Circle(radius=.28, color=FIELD, stroke_width=2.5)
                          .rotate(PI/2, axis=RIGHT).move_to(world))
            else:
                local.add(arrow(world, ARROW_SCALE*total, FIELD, 5.0))
        if 'force' in visible:
            # F has its own N scale, selected so +/-e is easy to compare by
            # direction. No claim that E and F share a physical unit.
            local.add(arrow(world+[0, -.08, 0], test_sign*ARROW_SCALE*total,
                            FORCE, 4.0))
        return local

    def set_local(self, p, sign2, visible, test_sign=1, construction=False):
        if hasattr(self, 'local'):
            self.remove(self.local)
        self.local = self.local_vectors(p, sign2, visible, test_sign, construction)
        self.add(self.local)

    def move_probe(self, end, sign2, visible, duration=1.3, construction=False):
        start = self.p.copy()
        def update(_mob, alpha):
            self.p = (1-alpha)*start+alpha*np.asarray(end)
            self.probe.move_to(CENTER+self.p)
            self.p_label.move_to(CENTER+self.p+[.12, 0, .33])
            self.local.become(self.local_vectors(self.p, sign2, visible,
                                                 construction=construction))
        self.play(UpdateFromAlphaFunc(self.probe, update), run_time=duration,
                  rate_func=smooth)

    def construct(self):
        self.p = np.array([0., 0., .62])
        self.q1 = sphere(CENTER+S1, .23, SOURCE)
        self.q2 = sphere(CENTER+S2, .23, NEGATIVE)
        self.probe = sphere(CENTER+self.p, .12, FORCE)
        self.add(self.q1, self.q2, self.probe)
        self.source1_label = words('+Q₁', 23, SOURCE).move_to(CENTER+S1+[0, 0, -.43])
        self.source2_label = words('−Q₂', 23, NEGATIVE).move_to(CENTER+S2+[0, 0, -.43])
        self.p_label = words('P', 22, FORCE).move_to(CENTER+self.p+[.12, 0, .33])
        self.add_fixed_orientation_mobjects(self.source1_label, self.source2_label, self.p_label)
        legend = words('浅蓝 E₁    紫 E₂    青 合场 E    金 受力 F', 18).move_to([-2.22, -2.33, 0])
        scale_note = words('P 处电场箭头同一比例 · 源电量绝对值各 1 pC', 16, MUTED).move_to([-2.22, -2.70, 0])
        self.add_fixed_in_frame_mobjects(legend, scale_note)
        self.set_local(self.p, -1, [])

        self.turn(0, 0)
        self.card_text('先找同一个观察点', r'P',
                       ['Q₁、Q₂：源的电荷量', 'P：放入试探电荷的位置',
                        '1 pC = 10⁻¹² C，C 是库仑', '虚线：源到 P 的连线'])
        self.move_camera(theta=-78*DEGREES, run_time=1.0)
        self.end_turn(0)

        self.turn(1, 0)
        self.card_text('各个源，在 P 的贡献', r'\mathbf E_1\quad\mathbf E_2',
                       ['E₁：左源在 P 的场', 'E₂：右源在 P 的场', '单位：N/C（牛顿每库仑）'])
        self.set_local(self.p, -1, ['e1'])
        self.wait_to((self.timeline[1]['start']+self.timeline[1]['end'])/2)
        self.set_local(self.p, -1, ['e1', 'e2'])
        self.end_turn(1)

        self.turn(2, 1)
        self.card_text('猜想：只把大小相加？', r'|\mathbf E|\overset{?}{=}|\mathbf E_1|+|\mathbf E_2|',
                       ['先保留猜想，挪 P 试试', '源电荷的位置和电量不变'], FORCE)
        self.end_turn(2)

        self.turn(3, 1)
        self.move_probe([0., 0., 1.8], -1, ['e1', 'e2'], duration=1.5)
        self.end_turn(3)

        self.turn(4, 1)
        e1, e2, total = contributions(self.p)
        magnitude, scalar_sum = np.linalg.norm(total), np.linalg.norm(e1)+np.linalg.norm(e2)
        self.set_local(self.p, -1, ['e1', 'e2', 'total'], construction=True)
        self.card_text('反证：读数不相等', r'|\mathbf E|<|\mathbf E_1|+|\mathbf E_2|',
                       [f'合场大小：{magnitude:.0f} N/C',
                        f'两个大小之和：{scalar_sum:.0f} N/C', '箭头的方向，不能丢'])
        self.end_turn(4)

        self.turn(5, 1)
        self.card_text('场强 E：矢量', r'\mathbf E=\mathbf E_1+\mathbf E_2',
                       ['有大小，也有方向', '虚线补成平行四边形', '对角线：这个 P 的合场', '三支电场箭头同尺比较'])
        self.field = background(-1)
        self.play(FadeIn(self.field), run_time=.6)
        self.end_turn(5)

        self.turn(6, 2)
        self.remove(self.field)
        self.q2.set_color(SOURCE)
        self.source2_label.become(words('+Q₂', 23, SOURCE).move_to(CENTER+S2+[0, 0, -.43]))
        self.set_local(self.p, 1, ['e1', 'e2', 'total'])
        self.move_probe([0., 0., 0.], 1, ['e1', 'e2', 'total'], duration=1.2)
        self.card_text('同号等量源 · 中点', r'\mathbf E_1=-\mathbf E_2\quad\Rightarrow\quad\mathbf E=0',
                       ['两边各有场', '等大、反向，合场为零', '不是“这里没有源的影响”'])
        self.end_turn(6)

        self.turn(7, 2)
        # Let “equal and opposite” finish while the zero-field experiment is
        # still visible; change the sign when the next spoken action starts.
        self.wait_to(self.timeline[7]['start']+1.9)
        self.q2.set_color(NEGATIVE)
        self.source2_label.become(words('−Q₂', 23, NEGATIVE).move_to(CENTER+S2+[0, 0, -.43]))
        self.set_local(self.p, -1, ['e1', 'e2', 'total'])
        self.field = background(-1)
        self.add(self.field)
        midpoint_e = np.linalg.norm(contributions(self.p)[2])
        self.card_text('异号等量源 · 中点', r'\mathbf E_1\parallel\mathbf E_2',
                       ['同向，合场增强', f'合场大小：{midpoint_e:.0f} N/C', '青箭头长为单个贡献的 2 倍'])
        self.end_turn(7)

        self.turn(8, 3)
        self.set_local(self.p, -1, ['total', 'force'])
        self.card_text('只换试探电荷', r'q:+e\longrightarrow-e',
                       ['源与 P 都固定', 'e：元电荷的正值', 'e = 1.602 176 634 × 10⁻¹⁹ C', '电子的电荷量是 −e'], FORCE)
        self.wait_to((self.timeline[8]['start']+self.timeline[8]['end'])/2)
        self.set_local(self.p, -1, ['total', 'force'], test_sign=-1)
        self.end_turn(8)

        self.turn(9, 3)
        self.card_text('场不变，力反向', r'\mathbf F=q\mathbf E\qquad q=-e',
                       ['E：源在 P 形成的场，N/C', 'F：试探电荷受到的力，N',
                        f'|F| = {midpoint_e*E_CHARGE/1e-16:.2f} × 10⁻¹⁶ N', '金箭头采用独立的力标尺'])
        self.end_turn(9)

        self.turn(10, 0)
        self.set_local(self.p, -1, ['e1', 'e2', 'total'])
        self.card_text('比较的是同一个 P', r'\mathbf E(P)=\mathbf E_1(P)+\mathbf E_2(P)',
                       ['每个贡献，都取在同一点', '保留每个贡献的方向', '不是两个源之间的相互力'])
        self.end_turn(10)

        self.turn(11, 3)
        # An equal and opposite pair has no finite zero-field point. Return
        # explicitly to like signs before inviting the viewer to find one.
        self.q2.set_color(SOURCE)
        self.source2_label.become(words('+Q₂', 23, SOURCE).move_to(CENTER+S2+[0, 0, -.43]))
        self.remove(self.field)
        self.field = background(1)
        self.add(self.field)
        self.set_local(self.p, 1, ['e1', 'e2', 'total'])
        self.move_probe([.25, 0., .6], 1, ['e1', 'e2', 'total'], duration=1.0)
        self.card_text('问题链，走完一遍', r'\mathbf E_1+\mathbf E_2\quad\longrightarrow\quad q\mathbf E',
                       ['① 固定同一个 P，分源看', '② 移动 P，检验直接加大小',
                        '③ 同号源：拖 P 找抵消处', '④ 换小 q，区分场与力'])
        for item in self.questions:
            item.set_color(FIELD)
        self.wait_to(self.timeline[-1]['end']+.6)
