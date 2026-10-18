"""Lossless PNG compression only; preserve every RGBA pixel and file path."""
from pathlib import Path
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
import sys, json
root=Path('C:/Users/zhaos/.codex/visualizations/2026/10/14/01a13aae-1b5c-77e2-a65d-d4bd96773904/coulomb-v38-renders')
names=sys.argv[1:] or ['active-bottom-top','active-top','passive-bottom-top']
files=[p for name in names for p in (root/name).glob('*.png')]
def compress(path):
    temp=path.with_suffix('.png.tmp');before=path.stat().st_size
    with Image.open(path) as src:
        src.load();pixels=src.tobytes();mode=src.mode;size=src.size
        src.save(temp,format='PNG',optimize=True,compress_level=9)
    with Image.open(temp) as check:
        check.load();assert check.mode==mode and check.size==size and check.tobytes()==pixels
    after=temp.stat().st_size
    if after<before:temp.replace(path)
    else:temp.unlink();after=before
    return {'file':str(path),'before':before,'after':after,'rgba_pixels_equal':True}
with ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(compress,files))
print(json.dumps({'frames':len(results),'before_bytes':sum(r['before'] for r in results),'after_bytes':sum(r['after'] for r in results),'rgba_pixels_equal':all(r['rgba_pixels_equal'] for r in results)}))
