"""Assemble the PNG layers from tools/assets/render-attachment-layers.mjs into a layered TIFF and a PSD.

    python3 tools/assets/layered-tiff.py build/layers-stg44 outbound/stg44-attachment-layers stg44-attachments

Adds a mount-points layer (a crosshair and the slot name where each slot sits), writes <name>.psd (psd-tools) and
<name>.tif: the flattened picture plus the same layers in Photoshop's layered-TIFF block (tag 37724,
ImageSourceData), big-endian so the block's byte order matches the file. Photoshop, GIMP 2.10+ and Affinity open
the layers; other viewers show the flattened image. Also writes preview.png and layers.json.
"""
import io
import json
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, TiffImagePlugin
from PIL.TiffImagePlugin import ImageFileDirectory_v2
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer

src, out, name = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
out.mkdir(parents=True, exist_ok=True)
d = json.loads((src / 'layers.json').read_text())
W, H = d['width'], d['height']
layers = [(l['name'], Image.open(src / l['file']).convert('RGBA')) for l in d['layers'] if 'Mount points' not in l['name']]

# mount points: crosshair and label per slot, labels staggered so neighbours do not collide
marks = Image.new('RGBA', (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(marks)
try:
    font = ImageFont.truetype('DejaVuSans-Bold.ttf', 26)
except OSError:
    font = ImageFont.load_default()
pink = (255, 42, 109, 255)
for i, m in enumerate(d['mounts']):
    x, y, dy = m['x'], m['y'], (1 if i % 2 else -1) * (40 + (i % 3) * 26)
    draw.ellipse((x - 9, y - 9, x + 9, y + 9), outline=pink, width=3)
    draw.line((x - 16, y, x + 16, y), fill=pink, width=2)
    draw.line((x, y - 16, x, y + 16), fill=pink, width=2)
    draw.line((x, y, x + 30, y + dy), fill=pink, width=2)
    draw.text((x + 34, y + dy - 14), m['label'], font=font, fill=pink, stroke_width=2, stroke_fill=(0, 0, 0, 255))
layers.append((f'{len(layers):02d} Mount points (where each slot sits)', marks))

# PSD
psd = PSDImage.new('RGBA', (W, H))
for lname, im in layers:
    box = im.getbbox()
    if box:
        psd.append(PixelLayer.frompil(im.crop(box), psd, lname.replace('×', 'x'), top=box[1], left=box[0]))
psd.save(out / f'{name}.psd')

# layered TIFF: flattened rifle and attachments (no labels) + the PSD's layer block
buf = io.BytesIO()
PSDImage.open(out / f'{name}.psd')._record.layer_and_mask_information.layer_info.write(buf, encoding='macroman', version=1, padding=4)
block = b'8BIM' + b'Layr' + buf.getvalue()
block += b'\x00' * (-len(block) % 4)
flat = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for _, im in layers[:-1]:
    flat.alpha_composite(im)
TiffImagePlugin.SAVE_INFO['RGBA'] = ('RGBA', b'MM', 2, 1, (8, 8, 8, 8), 2)
ifd = ImageFileDirectory_v2(prefix=b'MM')
ifd[37724] = b'Adobe Photoshop Document Data Block\x00' + block
ifd.tagtype[37724] = 7
flat.save(out / f'{name}.tif', tiffinfo=ifd, compression='tiff_adobe_deflate')

# preview and the layer list
prev = Image.new('RGBA', (W, H), (90, 95, 99, 255))
for _, im in layers:
    prev.alpha_composite(im)
prev.convert('RGB').resize((W // 2, H // 2)).save(out / 'preview.png')
(out / 'layers.json').write_text(json.dumps({**d, 'layers': [n for n, _ in layers]}, indent=1) + '\n')
print(f'{len(layers)} layers -> {out}/{name}.tif, .psd')
