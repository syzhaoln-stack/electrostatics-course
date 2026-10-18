"""Verify the revised film against frozen audio, geometry and actual poses."""
from pathlib import Path
from PIL import Image
import json,math,sys
import compose_coulomb_v38 as film
import coulomb_series_v38 as series

checks=[]
def check(name,passed):
    checks.append({'name':name,'passed':bool(passed)})
    if not passed:raise AssertionError(name)

check('ten chapters, lever detour removed',len(film.TIME)==10 and all(t['base_id']!='double-lever' for t in film.TIME))
check('runtime below four minutes',film.DURATION<240)
check('no lever discussion in closing','力臂' not in film.TIME[-1]['text'])
audit=json.loads((film.AUDIO/'audio-audit.json').read_text(encoding='utf8'))
check('all audio decoded',all(t['decode_complete'] for t in audit['turns']))
check('no unmarked leading utterance',not any(t['leading_signal']['unmarked_leading_signal_flag'] for t in audit['turns']))
check('new relative-reference begins with narration',audit['turns'][6]['leading_signal']['first_word_seconds']<.2)
check('native tempo, no clipping',all(t['full_scale_samples']==0 and t['local_tempo']==1 for t in audit['turns']))
check('provider word text agrees',all(t['provider_words_match_text'] and t['word_times_monotonic'] and t['words_within_clip'] for t in audit['turns']))
check('reused audio is byte-identical',all(t['byte_identical'] for t in audit['reused_audio']))
for previous,current in zip(film.TIME,film.TIME[1:]):
    check(f'ordered chapters {previous["index"]}',previous['end']<=current['start'])

turn=film.TIME[2];duration=turn['end']-turn['start']
for t in [0,3,9,14,22.8,27,31,34]:
    state=series.render(Image.new('RGB',(1920,1080),film.BG),turn,t,duration,film)
    check(f'equal visual scale at {t}',abs(state['long_wire_height']/state['short_wire_height']-2)<1e-4)
    if t>14:
        check(f'halves carry equal twist at {t}',abs(state['upper_segment_deg']-state['lower_segment_deg'])<1e-8)
        check(f'angle addition at {t}',abs(state['upper_segment_deg']+state['lower_segment_deg']-state['long_twist_deg'])<1e-8)
    if t>=31:check('both theta labels survive the sum',state['upper_segment_highlighted'] and state['lower_segment_highlighted'])

for name in ['active-bottom-top','active-top','passive-bottom-top']:
    rows=film.PROJECTIONS[name];end=rows[-1]
    check(name+' sufficient rendered poses',len(rows)>=96)
    check(name+' terminal gap',abs(end['gap_deg']-8.5)<.001)
    check(name+' terminal relative twist',abs(end['twist_deg']-575.5)<.001)
    check(name+' relative angle identity',all(abs(r['lower_deg']-r['upper_deg']-r['twist_deg'])<1e-8 for r in rows))
passive=film.PROJECTIONS['passive-bottom-top']
check('external sphere pauses independently',any(abs(r['source_speed_deg_s'])<.01 and r['speed_deg_s']>1 for r in passive))
check('two balls do not intersect',min(r['gap_deg'] for r in passive)>math.degrees(2*math.asin(.065/1.08)))
active=film.PROJECTIONS['active-bottom-top'];knob=film.PROJECTIONS['active-top']
check('knob and bottom share time and upper angle',len(active)==len(knob) and all(a['t']==b['t'] and a['upper_deg']==b['upper_deg'] for a,b in zip(active,knob)))

mass_first_g=.053/3400
zero_mass_g=.053/40000
check('gold-weighing comparison about 640, not a million',630<.01/mass_first_g<650)
check('zero-equivalent comparison about 7500',7400<.01/zero_mass_g<7600)
if '--complete' in sys.argv:
    for name in sorted({n for names in film.SHOT_DEPENDENCIES for n in names}):
        base=film.REFERENCE if name in film.REFERENCE_NAMES else film.RENDERS
        check(name+' complete frame set',all((base/name/f'{i:04}.png').exists() for i in range(len(film.PROJECTIONS[name]))))
report={'passed':len(checks),'failed':0,'duration':film.DURATION,'checks':checks,'comparison':{'first_force_N':mass_first_g/1000*9.80665,'first_mass_g':mass_first_g,'reference_increment_g':.01,'ratio':.01/mass_first_g,'zero_equivalent_ratio':.01/zero_mass_g}}
(film.WORK/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({k:v for k,v in report.items() if k!='checks'},ensure_ascii=False))
