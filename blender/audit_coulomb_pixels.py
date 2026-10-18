"""Fully decode every PNG, beyond the frame header contract."""
import json
from pathlib import Path
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = False
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'media/lesson-dialogues/production/v3-6/coulomb/renders'
projection=json.loads((OUT/'projection.json').read_text(encoding='utf-8'))
bad=[];count=0
for shot,frames in projection['shots'].items():
    for i,frame in enumerate(frames):
        file=OUT/shot/f'{i:04}.png'
        try:
            with Image.open(file) as image:
                image.verify()
            with Image.open(file) as image:
                image.load()
                assert image.size==(1920,1080)
            count+=1
        except Exception as error:
            bad.append({'shot':shot,'frame':i,'u':frame['u'],'path':str(file),'error':str(error)})
    print(shot, 'checked',len(frames),'bad total',len(bad),flush=True)
report={'decoded':count,'bad':bad}
(OUT/'pixel-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
