"""Highlight actual scene objects using the provider's measured word metadata.

Metadata is adjusted upstream for trimming/tempo. It is not independent speech
recognition. A missing phrase fails rendering rather than inventing a timestamp.
"""
from pathlib import Path
import json
import os
import numpy as np
from manim import VGroup


def phrase_window(turn, phrase):
    words = turn.get('words', [])
    text = ''.join(w['text'] for w in words)
    offset = text.find(phrase)
    if offset < 0:
        raise ValueError(f'Cue phrase absent from provider words: {phrase!r}')
    selected, cursor = [], 0
    for word in words:
        end = cursor + len(word['text'])
        if end > offset and cursor < offset + len(phrase):
            selected.append(word)
        cursor = end
    return selected[0]['start'], max(selected[-1]['end'], selected[0]['start']+.7)


class SpeechCues:
    def wait(self, duration=1, **kwargs):
        # Cairo freezes ordinary Wait frames. Split at spoken cues, rendering
        # only those short intervals dynamically; the quiet intervals stay cheap.
        bindings = getattr(self, 'cue_bindings', [])
        if not bindings or kwargs:
            return super().wait(duration, **kwargs)
        start, end = self.renderer.time, self.renderer.time + duration
        breaks = sorted({start, end, *(max(start,min(end,e[k])) for e,_,_ in bindings for k in ('start','end'))})
        for left, right in zip(breaks,breaks[1:]):
            remaining = right-self.renderer.time
            if remaining < 1e-5:
                continue
            active = any(e['start'] <= (left+right)/2 < e['end'] for e,_,_ in bindings)
            self.cue_space.update(0)
            self.cue_screen.update(0)
            super().wait(remaining, frozen_frame=not active)

    def init_cues(self, lesson):
        self.cue_lesson, self.visual_cues, self.cue_bindings = lesson, [], []
        self.cue_space, self.cue_screen = VGroup(), VGroup()
        def update(layer, fixed):
            if fixed:
                self.camera.remove_fixed_in_frame_mobjects(*layer.get_family())
            layer.submobjects = []
            now = self.renderer.time
            for entry, getter, on_screen in self.cue_bindings:
                if fixed != on_screen or not entry['start'] <= now <= entry['end']:
                    continue
                target = getter()
                if target is None:
                    continue
                # A slow luminance swell; never a rapid flash or a new vector.
                phase = (now-entry['start'])/(entry['end']-entry['start'])
                opacity = .22+.48*np.sin(np.pi*phase)**2
                glow = target.copy().clear_updaters(recursive=True)
                # Preserve filled solids vs. open curves. Outlining every sphere
                # triangle creates spikes; filling a guide ring hides the field.
                for part in glow.family_members_with_points():
                    fill = float(np.max(part.get_fill_opacity()))
                    width = float(np.max(part.get_stroke_width()))
                    part.set_fill(color='#fff0b5', opacity=fill*opacity)
                    part.set_stroke(color='#fff0b5', width=width+2 if width else 0,
                                    opacity=opacity if width else 0)
                layer.add(glow)
            if fixed:
                self.camera.add_fixed_in_frame_mobjects(layer)
        self.cue_space.add_updater(lambda m: update(m, False))
        self.cue_screen.add_updater(lambda m: update(m, True))
        self.add(self.cue_space)
        self.add_fixed_in_frame_mobjects(self.cue_screen)
        self.add_foreground_mobjects(self.cue_space, self.cue_screen)

    def cue(self, turn, phrase, key, getter, fixed=False):
        start, end = phrase_window(self.timeline[turn], phrase)
        entry = {'turn':turn,'phrase':phrase,'target':key,'start':round(start,4),'end':round(end,4)}
        self.visual_cues.append(entry)
        self.cue_bindings.append((entry, getter, fixed))
        root = Path(os.getenv('LESSON_TIMELINE_DIR',str(Path(__file__).resolve().parent.parent/'media/lesson-dialogues/production/v3-3'))) / self.cue_lesson
        (root/'visual-cues.json').write_text(json.dumps(self.visual_cues,ensure_ascii=False,indent=2),encoding='utf-8')
