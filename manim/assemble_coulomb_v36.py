"""Edit frozen, paid audio takes without regenerating or changing speech speed."""
from pathlib import Path
import json,wave,hashlib
ROOT=Path(__file__).resolve().parent.parent
PROD=ROOT/'media/lesson-dialogues/production'
OUT=PROD/'v3-6-edit/coulomb';OUT.mkdir(parents=True,exist_ok=True)
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
base=read(ROOT/'manim/coulomb-film-v36.json')
entries=[(s,PROD/'v3-6/coulomb',i+1,i) for i,s in enumerate(base)]
replacements=ROOT/'manim/coulomb-relative-narration-v36.json'
if replacements.exists():
 for take,script in enumerate(read(replacements),1):
  entries[script['base_id']]=(script,PROD/'v3-6-relative/coulomb',take,script['base_id'])
follow=read(ROOT/'manim/coulomb-follow-narration-v36.json')
equivalent=None
for take,script in enumerate(follow,1):
 entry=(script,PROD/'v3-6-follow/coulomb',take,script['base_id'])
 if script['base_id']=='equivalent':equivalent=entry
 else:entries[script['base_id']]=entry
assert equivalent
entries.insert(7,equivalent)
timeline=[];current=.35;metadata=[]
with wave.open(str(OUT/'dialogue.wav'),'wb') as output:
 output.setnchannels(2);output.setsampwidth(2);output.setframerate(48000)
 silence=lambda seconds:b'\0'*round(seconds*48000)*4
 output.writeframes(silence(current))
 for index,(script,folder,take,base_id) in enumerate(entries):
  pacing=folder/f'turn-{take:02}.pacing.json'
  if (folder/f'turn-{take:02}.recovered.pacing.json').exists():pacing=folder/f'turn-{take:02}.recovered.pacing.json'
  if (folder/f'turn-{take:02}.edit.pacing.json').exists():pacing=folder/f'turn-{take:02}.edit.pacing.json'
  voice=read(pacing)
  assert voice['text']==script['text']
  path=folder/f'turn-{take:02}.paced.wav'
  if pacing.name.endswith('.edit.pacing.json'):path=folder/f'turn-{take:02}.edit.wav'
  with wave.open(str(path),'rb') as audio:
   assert (audio.getnchannels(),audio.getsampwidth(),audio.getframerate())==(2,2,48000)
   pcm=audio.readframes(audio.getnframes());duration=audio.getnframes()/48000
  output.writeframes(pcm)
  timeline.append({**script,'index':index,'base_id':base_id,'start':current,'end':current+duration,'words':[{**w,'start':w['start']+current,'end':w['end']+current} for w in voice['words']]})
  metadata.append({'take':path.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(pcm).hexdigest(),'duration':duration,'pacing':pacing.relative_to(ROOT).as_posix(),'tempo_modified':path.name.endswith('.edit.wav'),'sentence_timing_recovered':'.recovered.' in pacing.name})
  gap=.35 if index<len(entries)-1 else .65
  output.writeframes(silence(gap));current+=duration+gap
(OUT/'timeline.json').write_text(json.dumps(timeline,ensure_ascii=False,indent=2),encoding='utf8')
(OUT/'manifest.json').write_text(json.dumps({'edition':'3.6.0','duration':current,'takes':metadata,'voice':'ICL_uranus_zh_male_chenwenyouya_tob','voice_name':'沉稳优雅 2.0','tempo_modified':any(m['tempo_modified'] for m in metadata),'source_timing':'Provider word times with recorded trim and edit offsets; per-take metadata identifies any additional processing'},ensure_ascii=False,indent=2),encoding='utf8')
print(f'Assembled {len(timeline)} frozen takes: {current:.6f} seconds')
