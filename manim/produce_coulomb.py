"""Locked, source-based first-person adaptation. No invented diary or voice clone."""
import json
import produce_dialogues as voice
voice.NAMES['che']='库仑视角 · 现代重述'
voice.PROMPT=('中文科学纪录片旁白，研究者向大学生耐心展示自己设计的仪器。自然、清楚、温和，有好奇心，不演老人，不用舞台腔，不刻意拖慢。遇到关键数字稍停顿，保持正常交流语速。只朗读下面文字，不添加解释、音乐或声音效果：\n')
script=json.loads((voice.ROOT/'manim/coulomb-film.json').read_text(encoding='utf-8'))
voice.produce('coulomb', [('che',s['text']) for s in script], 'v3-5', {'che':-3,'xia':5}, 3)
