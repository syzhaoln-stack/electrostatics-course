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


def ball(pos, radius=0.22, color=SOURCE):
    return Sphere(center=pos, radius=radius, resolution=(16, 8), checkerboard_colors=False,
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


def radial_field(center=ORIGIN, sign=1, scale=1, n=24):
    result = VGroup()
    for distance in (1.2, 1.8, 2.4):
        for direction in fib_directions(n):
            p = np.array(center) + distance * direction
            length = scale * .88 / distance**2
            a = vector(p, sign * length * direction, FIELD, 1.6)
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
        self.timeline = json.loads((MEDIA / f'{self.lesson}.timeline.json').read_text(encoding='utf-8'))
        self.set_camera_orientation(phi=69*DEGREES, theta=-78*DEGREES, zoom=.90, frame_center=[0, 0, .25])
        self.title = label(self.heading, 34).to_edge(UP, buff=.35)
        self.add_fixed_in_frame_mobjects(self.title)
        self.current_subtitle = None
        self.current_formula = None
        self.current_note = None
        self.add_fixed_in_frame_mobjects(label('静电场 · 两位同学的 1 分钟', 16, MUTED).to_corner(UL, buff=.2))

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

    def finish(self):
        self.wait_until(self.timeline[-1]['end'] + 1.74)


class FoundationsDialogue(DialogueScene):
    lesson = 'foundations'
    heading = '换电荷，场也会变吗？'

    def construct(self):
        center = np.array([-1.65, 0., 0.])
        p = np.array([.35, 0., 0.])
        source = ball(center, .30)
        probe = ball(p, .14, FORCE)
        field = radial_field(center, n=16)
        radius = DashedLine(center, p, color=MUTED, stroke_width=1.5)
        e = vector(p + np.array([0, 0, .15]), [1.15, 0, 0], FIELD, 4)
        f = vector(p + np.array([0, 0, -.17]), [1.15, 0, 0], FORCE, 4)
        self.add(source, field, radius, probe, e, f)
        source_label = label('源电荷 Q', 22, SOURCE).move_to([-4.7, -.6, 0])
        legend = label('蓝：电场 E     金：受力 F', 22).move_to([0, -2.62, 0])
        self.add_fixed_in_frame_mobjects(source_label, legend)
        self.formula(r'\mathbf F=q\mathbf E', '固定源电荷 · 固定观察位置 P')
        self.subtitle(0)
        self.move_camera(theta=-68*DEGREES, run_time=1.4)
        self.end_turn(0)
        self.subtitle(1)
        self.play(Indicate(e, color=FIELD), Indicate(f, color=FORCE), run_time=1.2)
        self.end_turn(1)
        self.subtitle(2)
        doubled = vector(p + [0, 0, -.17], [2.3, 0, 0], FORCE, 4)
        self.formula(r'q:e\to2e\qquad E:E\to E\qquad F:F\to2F')
        self.play(Transform(f, doubled), probe.animate.scale(1.15), run_time=1.1)
        self.end_turn(2)
        self.subtitle(3)
        self.formula(r'\mathbf F=q\mathbf E\qquad \mathbf E=\frac{\mathbf F}{q}', '把测试电荷看作足够小，不改变原来的源电荷分布')
        self.end_turn(3)
        self.subtitle(4)
        negative = vector(p + [0, 0, -.17], [-1.15, 0, 0], FORCE, 4)
        self.play(Transform(f, negative), run_time=1)
        self.formula(r'q=-e\quad\Longrightarrow\quad\mathbf F=-e\mathbf E')
        self.end_turn(4)
        self.subtitle(5)
        self.play(Indicate(f, color=FORCE), run_time=1.2)
        self.end_turn(5)
        self.subtitle(6)
        p2 = center + 2*(p-center)
        old_e = e.copy().set_opacity(.2)
        old_f = f.copy().set_opacity(.2)
        self.add(old_e, old_f)
        new_e = vector(p2+[0, 0, .15], [.2875, 0, 0], FIELD, 4)
        new_f = vector(p2+[0, 0, -.17], [-.2875, 0, 0], FORCE, 4)
        self.play(probe.animate.move_to(p2), Transform(e, new_e), Transform(f, new_f),
                  Transform(radius, DashedLine(center, p2, color=MUTED, stroke_width=1.5)), run_time=1.5)
        self.formula(r'r\to 2r\qquad E\to\frac E4\qquad |F|\to\frac{|F|}4', '淡色箭头保留原位置与原长度')
        self.end_turn(6)
        self.subtitle(7)
        self.formula(r'E=\frac{k|Q|}{r^2}\qquad |F|=|q|E', '同一个源电荷 · 同一个测试电荷')
        self.end_turn(7)
        self.subtitle(8)
        self.play(FadeOut(VGroup(source, field, probe, e, f, old_e, old_f, radius)), run_time=.8)
        self.remove(source_label, legend)
        self.end_turn(8)
        self.subtitle(9)
        wire = Line([0, -4, 0], [0, 4, 0], color=SOURCE, stroke_width=7).set_shade_in_3d(True)
        wire_field = VGroup()
        for y in (-2, 0, 2):
            for a in np.arange(0, TAU, TAU/8):
                for r in (1.15, 2.15):
                    d = np.array([np.cos(a), 0, np.sin(a)])
                    wire_field.add(vector([r*d[0], y, r*d[2]], .7/r*d, FIELD, 1.8))
        self.add(wire, wire_field)
        self.formula(r'\text{line:}\quad E=\frac{|\lambda|}{2\pi\varepsilon_0r}', '无限长线：垂直于线 · 距离加倍，强度减半')
        self.move_camera(theta=-55*DEGREES, run_time=1.3)
        t = self.timeline[9]
        self.wait_until(t['start'] + (t['end']-t['start'])*.5)
        self.remove(wire, wire_field)
        sheet = Polygon([-2.5, -2.5, 0], [2.5, -2.5, 0], [2.5, 2.5, 0], [-2.5, 2.5, 0],
                        fill_color=SOURCE, fill_opacity=.13, stroke_color=SOURCE, stroke_width=.6)
        grid = VGroup()
        for value in np.linspace(-2.5, 2.5, 7):
            grid.add(Line([-2.5, value, 0], [2.5, value, 0], color=SOURCE, stroke_width=.7),
                     Line([value, -2.5, 0], [value, 2.5, 0], color=SOURCE, stroke_width=.7))
        plane_field = VGroup()
        for x in (-1.7, 0, 1.7):
            for y in (-1.7, 0, 1.7):
                for z in (-1.05, -.4, .4, 1.05):
                    plane_field.add(vector([x, y, z], np.sign(z)*.42*OUT, FIELD, 2))
        self.add(sheet, grid, plane_field)
        self.formula(r'\text{plane:}\quad E=\frac{|\sigma|}{2\varepsilon_0}', '无限大平面：垂直于面 · 两侧各自均匀，强度不随距离变')
        self.move_camera(phi=61*DEGREES, theta=-70*DEGREES, run_time=1.2)
        self.end_turn(9)
        self.subtitle(10)
        self.formula(r'\text{source}\quad\longrightarrow\quad\mathbf E(P)\quad\longrightarrow\quad q\mathbf E(P)', '回到交互：拖动金色点 P，观察同一点的场与力')
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
                result.add(vector(p, sign*length*d/r, FIELD, 1.7).set_opacity(.64))
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
        self.move_camera(theta=-64*DEGREES, run_time=1.5)
        self.end_turn(0)
        self.subtitle(1)
        ray = Line(qpos, [3.4, 0, 0], color=INK, stroke_width=3).set_shade_in_3d(True)
        cursor = ball(qpos, .07, INK)
        mark_in = ball([-1.8, 0, 0], .10, INWARD)
        mark_out = ball([1.8, 0, 0], .10, OUTWARD)
        ray_arrows = VGroup(vector([-2.2, 0, 0], [.55, 0, 0], INWARD, 4),
                            vector([1.55, 0, 0], [.55, 0, 0], OUTWARD, 4))
        self.add(ray, cursor, ray_arrows)
        self.play(cursor.animate.move_to([-1.8, 0, 0]), FadeIn(mark_in), run_time=1)
        self.play(cursor.animate.move_to([1.8, 0, 0]), FadeIn(mark_out), run_time=1.5)
        self.play(cursor.animate.move_to([3.4, 0, 0]), run_time=.7)
        self.add_fixed_in_frame_mobjects(label('亮点只引导视线；场线不是飞行轨迹', 16, MUTED).move_to([0, -2.62, 0]))
        self.end_turn(1)
        self.subtitle(2)
        self.formula(r'\Phi_{\rm in}<0\qquad\Phi_{\rm out}>0\qquad\Phi_{\rm net}=0', '局部场可以不为零；整个闭合面的净通量为零')
        self.play(Indicate(mark_in, color=INWARD), Indicate(mark_out, color=OUTWARD), run_time=1)
        self.end_turn(2)
        self.subtitle(3)
        self.formula(r'Q_{\rm enclosed}=0\qquad\Longrightarrow\qquad\Phi_E=0', '电荷在面外：所有场线的穿入、穿出净贡献相抵')
        self.end_turn(3)
        self.subtitle(4)
        self.remove(ray, cursor, mark_in, mark_out, ray_arrows)
        inside_field = radial_field(ORIGIN, n=16)
        self.play(source.animate.move_to(ORIGIN), Transform(field, inside_field), run_time=1.5)
        onlyout = VGroup(*(vector(1.6*d, .7*d, OUTWARD, 3) for d in fib_directions(12)))
        self.add(onlyout)
        self.formula(r'Q_{\rm enclosed}=+Q\qquad\Phi_E=+\frac Q{\varepsilon_0}', '正源在内部：沿场线方向，只穿出')
        self.end_turn(4)
        self.subtitle(5)
        half = (self.timeline[5]['end']-self.timeline[5]['start'])*.5
        self.wait_until(self.timeline[5]['start']+half)
        negative = radial_field(ORIGIN, sign=-1, n=16)
        onlyin = VGroup(*(vector(2.3*d, -.7*d, INWARD, 3) for d in fib_directions(12)))
        self.play(Transform(field, negative), Transform(onlyout, onlyin), source.animate.set_color(INWARD), run_time=1.1)
        self.formula(r'Q_{\rm enclosed}=-Q\qquad\Phi_E=-\frac Q{\varepsilon_0}', '负源在内部：沿场线方向，只穿入')
        self.end_turn(5)
        self.subtitle(6)
        self.remove(onlyout)
        self.play(boundary.animate.scale(1.3), run_time=1.3)
        self.play(boundary.animate.stretch(.60, 0), run_time=1.3)
        self.formula(r'\Phi_E=-\frac Q{\varepsilon_0}\quad\text{unchanged}', '包围的净电荷不变，换大小与形状也不改变净通量')
        self.end_turn(6)
        self.subtitle(7)
        self.formula(r'\boxed{\displaystyle\oiint_S\mathbf E\cdot\mathrm d\mathbf A=\frac{Q_{\rm enclosed}}{\varepsilon_0}}', '测整个面的净通量，就能得到里面的净电荷')
        self.move_camera(theta=-78*DEGREES, run_time=1.5)
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
                        pair_field.add(vector(p, min(.65,.8*amp)*E/amp, FIELD, 1.7))
        self.play(FadeOut(source), FadeIn(minus), FadeIn(plus), Transform(field, pair_field), run_time=1.2)
        self.formula(r'(+Q)+(-Q)=0\qquad\Phi_E=0', '面内仍有正、负电荷，也仍有电场')
        self.end_turn(9)
        self.subtitle(10)
        self.formula(r'Q_{\rm enclosed}=\varepsilon_0\Phi_E', '回到交互：拖红球穿过边界，追踪一条场线')
        self.finish()
