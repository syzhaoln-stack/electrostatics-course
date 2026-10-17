"""Original spatial electrostatics lessons, rendered with Manim Community.

All model positions and field vectors live in 3D. Video annotations are fixed
to the camera; they do not rotate into illegibility. No borrowed video assets.
"""
from pathlib import Path
import json
import os
import textwrap
import numpy as np
from manim import *
from manim.animation.animation import prepare_animation

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / 'media' / 'lesson-dialogues'
BG = '#07111b'
FIELD = '#66cbd8'
FORCE = '#f6ce75'
SOURCE = '#ff806a'
INWARD = '#9aafff'
OUTWARD = '#67d9bd'
INK = '#e9edf0'
MUTED = '#8da3b5'
config.background_color = BG
config.max_files_cached = 300


def label(text, size=26, color=INK):
    return Text(text, font='Microsoft YaHei', font_size=size, color=color, line_spacing=0.7)


def math(text, size=38, color=INK):
    if r'\oiint' in text:
        template = TexTemplate()
        template.add_to_preamble(r'\usepackage{esint}')
        return MathTex(text, font_size=size, color=color, tex_template=template)
    return MathTex(text, font_size=size, color=color)


def ball(pos, radius=0.22, color=SOURCE, resolution=(16, 8)):
    return Sphere(center=pos, radius=radius, resolution=resolution, checkerboard_colors=False,
                  fill_color=color, fill_opacity=1, stroke_width=0)


def vector(start, delta, color=FIELD, width=2.2):
    start, delta = np.array(start, dtype=float), np.array(delta, dtype=float)
    length = np.linalg.norm(delta)
    end = start + delta
    head = min(.14, length * .29)
    shaft = Line(start, end, color=color, stroke_width=width).set_shade_in_3d(True)
    tip = Cone(base_radius=head * .31, height=head, direction=delta/length,
               resolution=(2, 6), fill_color=color, fill_opacity=1, stroke_width=0)
    tip.shift(end)
    return VGroup(shaft, tip)


def fib_directions(n=30):
    directions = []
    for i in range(n):
        z = 1 - 2 * (i+.5) / n
        a = i * np.pi * (3-np.sqrt(5))
        directions.append(np.array([np.sqrt(1-z*z)*np.cos(a), np.sqrt(1-z*z)*np.sin(a), z]))
    return directions


def radial_field(center=ORIGIN, sign=1, scale=1, n=24, width=1.6):
    result = VGroup()
    for distance in (1.2, 1.8, 2.4):
        for direction in fib_directions(n):
            p = np.array(center) + distance * direction
            length = scale * .88 / distance**2
            a = vector(p, sign * length * direction, FIELD, width)
            a.set_opacity(.84 if p[1] < 0 else .48)
            result.add(a)
    return result


def ghost_ring(radius, color=FIELD):
    rings = VGroup()
    for angle in (0, PI/2):
        ring = Circle(radius=radius, color=color, stroke_width=.9).rotate(angle, axis=RIGHT)
        rings.add(ring)
    # set_opacity would also fill the circles, hiding the charges behind disks.
    return rings.set_stroke(opacity=.3)


class DialogueScene(ThreeDScene):
    lesson = ''
    heading = ''

    def setup(self):
        super().setup()
        # A new soundtrack is staged until muxing has verified a complete MP4.
        # Do not overwrite the published timeline while pictures are rendering.
        timeline_root = os.getenv('LESSON_TIMELINE_DIR')
        staged = (Path(timeline_root) / self.lesson / 'timeline.json') if timeline_root else (
            MEDIA / 'production' / 'v3-1' / self.lesson / 'timeline.json')
        timeline_file = staged if staged.is_file() else MEDIA / f'{self.lesson}.timeline.json'
        self.timeline = json.loads(timeline_file.read_text(encoding='utf-8'))
        self.set_camera_orientation(phi=69*DEGREES, theta=-78*DEGREES, zoom=.90, frame_center=[0, 0, .25])
        self.title = label(self.heading, 34).to_edge(UP, buff=.35)
        self.add_fixed_in_frame_mobjects(self.title)
        self.current_subtitle = None
        self.current_formula = None
        self.current_note = None
        self.add_fixed_in_frame_mobjects(label('静电场 · 两位同学的发现', 16, MUTED).to_corner(UL, buff=.2))

    def formula(self, tex, note=''):
        if self.current_formula is not None:
            self.remove(self.current_formula)
        self.current_formula = math(tex, 36).move_to([0, 2.62, 0])
        if r'\boxed' in tex and self.current_formula.height > .82:
            self.current_formula.scale_to_fit_height(.82)
        self.add_fixed_in_frame_mobjects(self.current_formula)
        if self.current_note is not None:
            self.remove(self.current_note)
        self.current_note = label(note, 20, MUTED).move_to([0, 2.08, 0])
        self.add_fixed_in_frame_mobjects(self.current_note)

    def subtitle(self, idx):
        turn = self.timeline[idx]
        self.wait_until(turn['start'])
        if self.current_subtitle is not None:
            self.remove(self.current_subtitle)
        text = '\n'.join(textwrap.wrap(turn['text'], width=34, break_long_words=True, break_on_hyphens=False))
        self.current_subtitle = label(f"{turn['name']}：{text}", 26,
                                      FORCE if turn['speaker'] == 'xia' else FIELD).move_to([0, -3.3, 0])
        if self.current_subtitle.width > 13.2:
            self.current_subtitle.scale_to_fit_width(13.2)
        self.add_fixed_in_frame_mobjects(self.current_subtitle)
        return turn

    def wait_until(self, t):
        current = self.renderer.time
        if t > current + .015:
            self.wait(t-current)

    def end_turn(self, idx):
        self.wait_until(self.timeline[idx]['end'])

    def play_turn(self, idx, *animations, duration=1., **kwargs):
        """Keep an animation inside its actual, newly synthesized speech turn."""
        remaining = self.timeline[idx]['end'] - self.renderer.time - .06
        if remaining < 1 / config.frame_rate:
            # This is mainly a guard against unexpectedly short speech segments.
            for animation in animations:
                animation = prepare_animation(animation)
                animation.begin()
                animation.interpolate(1)
                animation.finish()
            return
        self.play(*animations, run_time=min(duration, remaining), **kwargs)

    def camera_turn(self, idx, duration=1., **kwargs):
        remaining = self.timeline[idx]['end'] - self.renderer.time - .06
        if remaining >= 1 / config.frame_rate:
            self.move_camera(run_time=min(duration, remaining), **kwargs)

    def finish(self):
        self.wait_until(self.timeline[-1]['end'] + .6)


class FoundationsDialogue(DialogueScene):
    lesson = 'foundations'
    heading = '先挪小球，再发现电场'

    def concept(self, eyebrow, title, tex='', lines=(), color=INK):
        """A single fixed right-hand explanation, never a stack of panels."""
        if getattr(self, 'concept_group', None) is not None:
            family = self.concept_group.get_family()
            self.remove(*family)
            self.remove_fixed_in_frame_mobjects(*family)
        items = VGroup(label(eyebrow, 17, MUTED).move_to([4.65, 2.5, 0]),
                       label(title, 28, color).move_to([4.65, 1.9, 0]))
        for item in items:
            if item.width > 4.05:
                item.scale_to_fit_width(4.05)
        if tex:
            formula = math(tex, 32, color)
            if formula.width > 4.05:
                formula.scale_to_fit_width(4.05)
            items.add(formula.move_to([4.65, .95, 0]))
        for i, line in enumerate(lines):
            text = label(line, 22, INK)
            if text.width > 4.05:
                text.scale_to_fit_width(4.05)
            items.add(text.move_to([4.65, -.02-i*.46, 0]))
        self.concept_group = items
        self.add_fixed_in_frame_mobjects(items)

    def question_chain(self, step, resolved=False):
        if getattr(self, 'question_group', None) is not None:
            family = self.question_group.get_family()
            self.remove(*family)
            self.remove_fixed_in_frame_mobjects(*family)
        questions = ('① 方向？', '② 距离？', '③ 换 q？', '④ 位置的场？')
        if resolved:
            questions = ('① 沿连线', '② 平方反比', '③ F 随 q 变', '④ E = F/q')
        self.question_group = VGroup()
        for i, text in enumerate(questions):
            color = FIELD if (resolved or i == step) else MUTED
            item = label(text, 19, color).move_to([-5.25+i*1.94, 2.52, 0])
            if not resolved and i != step:
                item.set_opacity(.58)
            self.question_group.add(item)
        self.add_fixed_in_frame_mobjects(self.question_group)

    def quotient_table(self, show_quotient=False):
        self.concept('固定源 Q · 固定位置 P', '换小球，留下什么？', lines=())
        rows = [
            ('q', 'F', 'F / q' if show_quotient else ''),
            ('+e', '+F₀', 'F₀/e = E' if show_quotient else ''),
            ('+2e', '+2F₀', '2F₀/2e = E' if show_quotient else ''),
            ('−e', '−F₀', '−F₀/−e = E' if show_quotient else ''),
        ]
        table = VGroup()
        xs = (3.3, 4.65, 6.) if show_quotient else (3.75, 5.5, 6.1)
        for row, values in enumerate(rows):
            for col, value in enumerate(values):
                if value:
                    text = label(value, 16 if col == 2 else 22,
                                 FIELD if col == 2 else (MUTED if row == 0 else FORCE))
                    table.add(text.move_to([xs[col], .95-row*.55, 0]))
        table.add(label('F₀：第一次测到的力；沿虚线向外取正', 16, MUTED).move_to([4.65, -1.66, 0]))
        if show_quotient:
            table.add(math(r'\mathbf E=\frac{\mathbf F}{q}', 34, FIELD).move_to([4.65, -2.27, 0]))
        self.concept_group.add(table)
        self.add_fixed_in_frame_mobjects(table)

    def construct(self):
        if len(self.timeline) != 15:
            raise ValueError('Discovery foundations needs the new 15-turn soundtrack; stage it before rendering.')
        self.set_camera_orientation(phi=64*DEGREES, theta=-82*DEGREES, zoom=.94,
                                    frame_center=[0, 0, .15])
        self.title.move_to([-2.2, 3.20, 0])
        if self.title.width > 8.7:
            self.title.scale_to_fit_width(8.7)
        divider = Line([2.25, 2.78, 0], [2.25, -2.63, 0], color=MUTED, stroke_width=.8).set_opacity(.32)
        self.add_fixed_in_frame_mobjects(divider)
        center = np.array([-2.45, 0., .0])
        radius_value, angle, test_charge, source_sign = ValueTracker(1.45), ValueTracker(0), ValueTracker(1), ValueTracker(1)
        beta = .73

        def direction():
            a = angle.get_value()
            return np.array([np.cos(a), np.sin(a)*np.cos(beta), np.sin(a)*np.sin(beta)])

        def position():
            return center + radius_value.get_value()*direction()

        def magnitude():
            return (1.45/radius_value.get_value())**2

        source = ball(center, .28, resolution=(32, 16))
        probe = ball(position(), .14, FORCE, resolution=(24, 12))
        probe.add_updater(lambda m: m.move_to(position()))
        join = always_redraw(lambda: DashedLine(center, position(), color=MUTED,
                                                stroke_width=1.2, dash_length=.07))
        force = always_redraw(lambda: vector(position()+[0, 0, -.10],
                                             1.05*magnitude()*test_charge.get_value()*source_sign.get_value()*direction(),
                                             FORCE, 3.2))
        e_arrow = always_redraw(lambda: vector(position()+[0, 0, .15],
                                               1.05*magnitude()*source_sign.get_value()*direction(), FIELD, 3.2))
        q_label = math('q', 30, FORCE).move_to(position()+[0, 0, .35])
        q_label.add_updater(lambda m: m.move_to(position()+[0, 0, .35]))
        big_q = math('Q', 32, SOURCE).move_to(center+[0, 0, .48])
        f_label = math(r'\mathbf F', 29, FORCE)
        f_label.add_updater(lambda m: m.move_to(position()+[0, 0, -.10]
                           + 1.05*magnitude()*test_charge.get_value()*source_sign.get_value()*direction()+[0, 0, -.30]))
        e_label = math(r'\mathbf E', 29, FIELD)
        e_label.add_updater(lambda m: m.move_to(position()+[0, 0, .15]
                           + 1.05*magnitude()*source_sign.get_value()*direction()+[0, 0, .24]))
        self.add(source, probe)
        self.question_chain(0)
        scale_note = label('模型尺寸为示意；金色 F 箭头始终采用同一比例尺', 16, MUTED).move_to([-2.2, -2.58, 0])
        self.add_fixed_in_frame_mobjects(scale_note)
        self.concept('先测量，不急着给公式', '小球会往哪儿受力？', lines=('把同一个小球', '放到不同位置 P'))
        self.subtitle(0)
        self.play_turn(0, angle.animate.set_value(.72), duration=1.1, rate_func=smooth)
        self.play_turn(0, angle.animate.set_value(0), duration=.8)
        self.end_turn(0)

        self.subtitle(1)
        self.add(join, force)
        self.add_fixed_orientation_mobjects(big_q, q_label, f_label)
        self.concept('两个角色 · 一次测量', 'Q 是源，q 来测',
                     lines=('大 Q：源电荷的电荷量', '小 q：试探电荷的电荷量', 'F：试探电荷受到的力', 'F 的单位：牛顿 N'), color=FORCE)
        self.play_turn(1, Indicate(source, color=SOURCE), duration=.55)
        self.play_turn(1, Indicate(probe, color=FORCE), duration=.55)
        self.end_turn(1)

        self.subtitle(2)
        self.concept('电荷，和电荷量', '球画大，就带电多？', lines=('画面大小，只是符号', '带电多少，需要另一个量'))
        small_icon = Circle(radius=.31, color=FORCE, fill_color=FORCE, fill_opacity=.15).move_to([3.8, .95, 0])
        large_icon = Circle(radius=.48, color=FORCE, fill_color=FORCE, fill_opacity=.15).move_to([5.5, .95, 0])
        icons = VGroup(small_icon, large_icon, label('?', 31, FORCE).move_to([4.65, .95, 0]))
        self.concept_group.add(icons)
        self.add_fixed_in_frame_mobjects(icons)
        self.end_turn(2)

        self.subtitle(3)
        self.concept('物体带电，可吸引或排斥', '电荷量：正负 + 多少',
                     r'e=1.602176634\times10^{-19}\,\mathrm C',
                     lines=('Q、q 的单位：库仑 C', 'e：元电荷的大小', '试探 q 从 +e 开始', '球的尺寸不表示电量'), color=FORCE)
        self.end_turn(3)

        self.subtitle(4)
        same_radius = ghost_ring(1.45, FORCE).shift(center)
        orbit = ParametricFunction(lambda t: center+1.45*np.array([np.cos(t), np.sin(t)*np.cos(beta),
                                   np.sin(t)*np.sin(beta)]), t_range=[0, TAU], color=FORCE,
                                   stroke_width=1.15, stroke_opacity=.5).set_shade_in_3d(True)
        self.add(same_radius, orbit)
        self.concept('人为挪动 · 保持 Q、q 不变', '一样远，力一样大', r'|\mathbf F|=F_0',
                     ('F₀：第一次测到的力', '等距球面上换方位', '金箭头等长，方向随位置转', '这不是小球的自由轨道'), FORCE)
        meter_base = Line([-4.1, -2.04, 0], [-.8, -2.04, 0], color=MUTED, stroke_width=2).set_opacity(.34)
        meter = always_redraw(lambda: Line([-4.1, -2.04, 0],
                         [-4.1+1.65*magnitude()*abs(test_charge.get_value()), -2.04, 0],
                         color=FORCE, stroke_width=5))
        meter_labels = VGroup(label('|F|', 21, FORCE).move_to([-4.75, -2.04, 0]),
                              label('0', 16, MUTED).move_to([-4.1, -2.32, 0]),
                              label('F₀', 16, MUTED).move_to([-2.45, -2.32, 0]),
                              label('2F₀', 16, MUTED).move_to([-.8, -2.32, 0]))
        self.add_fixed_in_frame_mobjects(meter_base, meter, meter_labels)
        ghosts = VGroup()
        for t in (.5, 2.2, 3.8):
            d = np.array([np.cos(t), np.sin(t)*np.cos(beta), np.sin(t)*np.sin(beta)])
            p = center+1.45*d
            ghosts.add(ball(p, .07, FORCE), vector(p+[0, 0, -.1], 1.05*d, FORCE, 2))
        ghosts.set_opacity(.24)
        self.add(ghosts)
        self.play_turn(4, angle.animate.set_value(TAU), duration=4.8, rate_func=linear)
        self.end_turn(4)

        self.subtitle(5)
        self.concept('方向：看源到 P 的连线', '大小：看相对距离 r',
                     r'r=\sqrt{(x-x_Q)^2+(y-y_Q)^2+(z-z_Q)^2}',
                     ('同 r，受力大小相同', '方向仍随 P 的方位变化', '适用：点源 / 球对称源外'))
        self.play_turn(5, angle.animate.set_value(TAU+.85), duration=1.1)
        self.play_turn(5, angle.animate.set_value(TAU), duration=1.)
        self.end_turn(5)

        self.subtitle(6)
        self.question_chain(1)
        self.remove(ghosts, same_radius, orbit)
        old_force = force.copy().clear_updaters().set_opacity(.24)
        old_probe = ball(position(), .11, FORCE).set_opacity(.24)
        self.add(old_force, old_probe)
        self.concept('先猜一猜，再看测量', '两倍远，力会减半？',
                     r'\text{guess: }r\to2r\quad |\mathbf F|\to F_0/2',
                     ('虚线只表示两球距离', '淡色箭头保留上一次测量'), FORCE)
        self.play_turn(6, radius_value.animate.set_value(2.9), duration=2.3)
        self.wait_until(self.timeline[6]['start']+(self.timeline[6]['end']-self.timeline[6]['start'])*.58)
        self.concept('实测推翻了“减半”的猜想', '距离 ×2，力 ÷4',
                     r'r\to2r\qquad |\mathbf F|\to\frac{F_0}{4}',
                     ('r₀ → 2r₀', '实测 F₀/4，而不是 F₀/2', '平方反比，不是正比'), FORCE)
        self.end_turn(6)

        self.subtitle(7)
        self.question_chain(2)
        self.remove(old_force, old_probe)
        radius_value.set_value(1.45)
        self.concept('固定 P · 改试探电荷 q', '电量改变，力跟着变',
                     r'q\to2q:\quad\mathbf F\to2\mathbf F',
                     ('再换成 −q：F 反向', '源 Q 和位置 P 都没变'), FORCE)
        self.play_turn(7, test_charge.animate.set_value(2), duration=1.15)
        self.wait_until(self.timeline[7]['start']+(self.timeline[7]['end']-self.timeline[7]['start'])*.55)
        # Do not interpolate q through zero: a vanishing vector has no direction.
        test_charge.set_value(-1)
        self.play_turn(7, Indicate(probe, color=FORCE), duration=.65)
        self.end_turn(7)

        self.subtitle(8)
        self.question_chain(3)
        self.quotient_table(False)
        self.end_turn(8)

        self.subtitle(9)
        self.quotient_table(True)
        self.remove(scale_note)
        scale_note = label('E 与 F 单位不同，分别采用各自的箭头比例尺', 16, MUTED).move_to([-2.2, -2.58, 0])
        self.add_fixed_in_frame_mobjects(scale_note)
        self.add(e_arrow)
        self.add_fixed_orientation_mobjects(e_label)
        self.play_turn(9, Indicate(e_arrow, color=FIELD), duration=.75)
        self.end_turn(9)

        self.subtitle(10)
        self.concept('E：电场强度 · 单位 N/C', '每库仑电荷，受到的力',
                     r'\mathbf E(P)=\frac{\mathbf F}{q}',
                     ('场由源 Q 和位置 P 决定', '蓝箭头：这个位置的场', '金箭头：放入 q 后的受力'), FIELD)
        field = radial_field(center, n=12)
        field.set_opacity(.34)
        self.play_turn(10, FadeIn(field), duration=.8)
        self.end_turn(10)

        self.subtitle(11)
        self.concept('把场与被测电荷分开', '先有 E，再求 F',
                     r'\boxed{\mathbf F=q\mathbf E}',
                     ('改变 Q 或 P：E 会变', '只换 q：E 不变，F 会变', 'F 单位 N；q 单位 C'), FIELD)
        test_charge.set_value(1)
        self.play_turn(11, test_charge.animate.set_value(2), duration=.9)
        self.play_turn(11, test_charge.animate.set_value(1), duration=.9)
        self.end_turn(11)

        self.subtitle(12)
        test_charge.set_value(-1)
        self.concept('电子：带负电的粒子', '负 q，受力与场相反',
                     r'q=-e\quad\Rightarrow\quad\mathbf F=-e\mathbf E',
                     ('E 按正试探电荷受力定向', '蓝 E 向外，金 F 向内', 'e：元电荷的大小'), FORCE)
        self.play_turn(12, Indicate(force, color=FORCE), duration=.75)
        self.end_turn(12)

        self.subtitle(13)
        self.remove(scale_note)
        scale_note = label('点源 / 球对称源外；箭头长度分别采用 E、F 比例尺', 16, MUTED).move_to([-2.2, -2.58, 0])
        self.add_fixed_in_frame_mobjects(scale_note)
        self.concept('点源 / 球对称源外', '大小随 r² 衰减',
                     r'|\mathbf E|=\frac{k|Q|}{r^2}',
                     ('Q：源电荷量，单位 C', 'r：源到 P 的距离，单位 m', 'k：库仑常量', '方向：正源向外，负源向内'), FIELD)
        test_charge.set_value(1)
        self.wait_until(self.timeline[13]['start']+(self.timeline[13]['end']-self.timeline[13]['start'])*.65)
        source_sign.set_value(-1)
        self.play_turn(13, source.animate.set_color(INWARD), Transform(field, radial_field(center, sign=-1, n=12).set_opacity(.34)), duration=.9)
        self.end_turn(13)

        self.subtitle(14)
        self.question_chain(3, resolved=True)
        self.concept('轮到你，把规律拖出来', '先挪位置，再换 q',
                     r'\mathbf E=\frac{\mathbf F}{q}\qquad\mathbf F=q\mathbf E',
                     ('同距离，换方位', '同位置，换电荷量', '看 E 与 F 谁变了'), FIELD)
        self.play_turn(14, angle.animate.set_value(TAU+.58), duration=1.2)
        self.finish()


def shell(radius=1.8):
    surface = Sphere(radius=radius, resolution=(16, 8), fill_color=FIELD,
                     fill_opacity=.035, stroke_color=FIELD, stroke_opacity=.15, stroke_width=.35)
    return VGroup(surface, ghost_ring(radius))


def sampled_field(source, sign=1):
    result = VGroup()
    for x in (-2.7, -1.35, 0, 1.35, 2.7):
        for z in (-1.5, 0, 1.5):
            for y in (-1.25, 1.25):
                p = np.array([x, y, z])
                d = p-np.array(source)
                r = np.linalg.norm(d)
                if r < .48:
                    continue
                length = min(.75, 1.5/r**2)
            result.add(vector(p, sign*length*d/r, FIELD, 2.4).set_opacity(.82))
    return result


class FluxDialogue(DialogueScene):
    lesson = 'flux'
    heading = '隔着一个面，能知道里面有什么吗？'

    def construct(self):
        self.set_camera_orientation(phi=68*DEGREES, theta=-77*DEGREES, zoom=.90, frame_center=[0, 0, .2])
        qpos = np.array([-3.5, 0, 0])
        source = ball(qpos, .24)
        boundary = shell()
        field = sampled_field(qpos)
        self.add(boundary, source, field)
        self.formula(r'\Phi_E=\oiint_S\mathbf E\cdot\mathrm d\mathbf A', '闭合面 S：把穿出的贡献减去穿入的贡献')
        self.subtitle(0)
        self.camera_turn(0, theta=-64*DEGREES, duration=1.5)
        self.end_turn(0)
        self.subtitle(1)
        ray = Line(qpos, [3.4, 0, 0], color=INK, stroke_width=3).set_shade_in_3d(True)
        cursor = ball(qpos, .07, INK)
        mark_in = ball([-1.8, 0, 0], .10, INWARD)
        mark_out = ball([1.8, 0, 0], .10, OUTWARD)
        ray_arrows = VGroup(vector([-2.2, 0, 0], [.55, 0, 0], INWARD, 4),
                            vector([1.55, 0, 0], [.55, 0, 0], OUTWARD, 4))
        self.add(ray, cursor, ray_arrows)
        self.play_turn(1, cursor.animate.move_to([-1.8, 0, 0]), FadeIn(mark_in), duration=1)
        self.play_turn(1, cursor.animate.move_to([1.8, 0, 0]), FadeIn(mark_out), duration=1.5)
        self.play_turn(1, cursor.animate.move_to([3.4, 0, 0]), duration=.7)
        self.add_fixed_in_frame_mobjects(label('亮点只引导视线；场线不是飞行轨迹', 16, MUTED).move_to([0, -2.62, 0]))
        self.end_turn(1)
        self.subtitle(2)
        self.formula(r'\Phi_{\rm in}<0\qquad\Phi_{\rm out}>0\qquad\Phi_{\rm net}=0', '局部场可以不为零；整个闭合面的净通量为零')
        self.play_turn(2, Indicate(mark_in, color=INWARD), Indicate(mark_out, color=OUTWARD), duration=1)
        self.end_turn(2)
        self.subtitle(3)
        self.formula(r'Q_{\rm enclosed}=0\qquad\Longrightarrow\qquad\Phi_E=0', '电荷在面外：所有场线的穿入、穿出净贡献相抵')
        self.end_turn(3)
        self.subtitle(4)
        self.remove(ray, cursor, mark_in, mark_out, ray_arrows)
        inside_field = radial_field(ORIGIN, n=16, width=2.2)
        inside_field.set_opacity(.82)
        self.play_turn(4, source.animate.move_to(ORIGIN), Transform(field, inside_field), duration=1.5)
        onlyout = VGroup(*(vector(1.6*d, .7*d, OUTWARD, 3) for d in fib_directions(12)))
        self.add(onlyout)
        self.formula(r'Q_{\rm enclosed}=+Q\qquad\Phi_E=+\frac Q{\varepsilon_0}', '正源在内部：沿场线方向，只穿出')
        self.end_turn(4)
        self.subtitle(5)
        half = (self.timeline[5]['end']-self.timeline[5]['start'])*.5
        self.wait_until(self.timeline[5]['start']+half)
        negative = radial_field(ORIGIN, sign=-1, n=16, width=2.2)
        negative.set_opacity(.82)
        onlyin = VGroup(*(vector(2.3*d, -.7*d, INWARD, 3) for d in fib_directions(12)))
        self.play_turn(5, Transform(field, negative), Transform(onlyout, onlyin), source.animate.set_color(INWARD), duration=1.1)
        self.formula(r'Q_{\rm enclosed}=-Q\qquad\Phi_E=-\frac Q{\varepsilon_0}', '负源在内部：沿场线方向，只穿入')
        self.end_turn(5)
        self.subtitle(6)
        self.remove(onlyout)
        self.play_turn(6, boundary.animate.scale(1.3), duration=1.3)
        self.play_turn(6, boundary.animate.stretch(.60, 0), duration=1.3)
        self.formula(r'\Phi_E=-\frac Q{\varepsilon_0}\quad\text{unchanged}', '包围的净电荷不变，换大小与形状也不改变净通量')
        self.end_turn(6)
        self.subtitle(7)
        self.formula(r'\boxed{\displaystyle\oiint_S\mathbf E\cdot\mathrm d\mathbf A=\frac{Q_{\rm enclosed}}{\varepsilon_0}}', '测整个面的净通量，就能得到里面的净电荷')
        self.camera_turn(7, theta=-78*DEGREES, duration=1.5)
        self.end_turn(7)
        self.subtitle(8)
        self.formula(r'\Phi_E=0\quad\Longrightarrow\quad Q_{\rm enclosed}=0', '“净电荷为零”能否推出“没有电荷”？')
        self.end_turn(8)
        self.subtitle(9)
        minus = ball([-.55, 0, 0], .22, INWARD)
        plus = ball([.55, 0, 0], .22, SOURCE)
        pair_field = VGroup()
        for x in (-2.4, -1.2, 0, 1.2, 2.4):
            for y in (-1.2, 1.2):
                for z in (-1.25, 0, 1.25):
                    p = np.array([x,y,z])
                    d1, d2 = p-np.array([.55,0,0]), p-np.array([-.55,0,0])
                    E = d1/np.linalg.norm(d1)**3-d2/np.linalg.norm(d2)**3
                    amp = np.linalg.norm(E)
                    if amp > .001:
                        pair_field.add(vector(p, min(.65,.8*amp)*E/amp, FIELD, 2.3).set_opacity(.82))
        self.play_turn(9, FadeOut(source), FadeIn(minus), FadeIn(plus), Transform(field, pair_field), duration=1.2)
        self.formula(r'(+Q)+(-Q)=0\qquad\Phi_E=0', '面内仍有正、负电荷，也仍有电场')
        self.end_turn(9)
        self.subtitle(10)
        self.formula(r'Q_{\rm enclosed}=\varepsilon_0\Phi_E', '回到交互：拖红球穿过边界，追踪一条场线')
        self.finish()
