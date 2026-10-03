#!/usr/bin/env python3
"""Flatten every PSD under a folder to a PNG next to it (one go), so the Pages build can ship them.

  pip install psd-tools pillow
  python flatten-psd.py                       (defaults to "inbound/Placeholder Assets" from the repo root)
  python flatten-psd.py <folder> [--force] [--max-px 2048]

- Existing PNGs are kept (use --force to rewrite).
- Images wider or taller than --max-px are scaled down so the site stays small.
- Falls back to ImageMagick (`magick` or `convert`) when psd-tools cannot read a file.
- The PSDs stay where they are; the build skips them (tools/build-site.mjs).
"""
import os, shutil, subprocess, sys
from concurrent.futures import ProcessPoolExecutor

def flatten(args):
    src, force, max_px = args
    dst = os.path.splitext(src)[0] + '.png'
    if os.path.exists(dst) and not force:
        return 'skip', src
    try:
        from psd_tools import PSDImage
        img = PSDImage.open(src).composite()
        if img is None:
            raise ValueError('empty composite')
        if max(img.size) > max_px:
            img.thumbnail((max_px, max_px))
        img.save(dst, optimize=True)
        return 'ok', src
    except Exception as e:
        tool = shutil.which('magick') or shutil.which('convert')
        if not tool:
            return 'fail', f'{src}: {e}'
        r = subprocess.run([tool, src + '[0]', '-background', 'none', '-resize', f'{max_px}x{max_px}>', dst], capture_output=True)
        return ('ok', src) if r.returncode == 0 else ('fail', f'{src}: {r.stderr.decode()[:120]}')

def main():
    argv = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    max_px = int(sys.argv[sys.argv.index('--max-px') + 1]) if '--max-px' in sys.argv else 2048
    argv = [a for a in argv if not a.isdigit()]
    root = argv[0] if argv else os.path.join('inbound', 'Placeholder Assets')
    files = [os.path.join(d, f) for d, _, fs in os.walk(root) for f in fs if f.lower().endswith('.psd')]
    print(f'{len(files)} PSD files under {root}')
    counts = {'ok': 0, 'skip': 0, 'fail': 0}
    with ProcessPoolExecutor() as ex:
        for i, (status, msg) in enumerate(ex.map(flatten, [(f, force, max_px) for f in files], chunksize=4), 1):
            counts[status] += 1
            if status == 'fail':
                print('FAIL', msg)
            if i % 200 == 0:
                print(f'  {i}/{len(files)}')
    print(counts)

if __name__ == '__main__':
    main()
