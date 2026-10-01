"""Generate lighting/studio.hdr: an original product-studio environment (Radiance RGBE).

Four soft-edged softboxes on a dim gradient, in linear HDR values well above 1.
Mapping matches three.js equirectangular UVs: azimuth = atan2(z, x), top row = up.
Run: python3 generate-studio-hdr.py  (needs NumPy). Writes ../lighting/studio.hdr.
"""
from pathlib import Path
import numpy as np

W, H = 1024, 512
# name: (azimuth deg, elevation deg, half-width deg, half-height deg, intensity, rgb)
# The key sits front-right of the rifle (+x muzzle, +z right side); viewer.js aims its
# shadow light at the same KEY direction.
SOFTBOXES = {
    'key':  (58, 32, 22, 15, 26.0, (1.0, .95, .88)),
    'rim':  (-122, 22, 8, 26, 14.0, (.85, .92, 1.0)),
    'fill': (150, 6, 30, 10, 3.5, (1.0, 1.0, 1.0)),
    'top':  (0, 82, 40, 6, 6.0, (1.0, 1.0, 1.0)),
}

cols = (np.arange(W) + .5) / W
rows = (np.arange(H) + .5) / H
az = (cols - .5) * 2 * np.pi                      # -pi..pi
el = (.5 - rows) * np.pi                          # +pi/2 at the top row
AZ, EL = np.meshgrid(az, el)

# Dim studio cyclorama: slightly brighter overhead, dark floor.
up = np.clip(np.sin(EL), -1, 1)
base = np.where(up > 0, .05 + .22 * np.clip(up, 0, 1) ** 1.5, .045 + .02 * up)
img = np.repeat(base[..., None], 3, axis=2) * np.array([1.0, 1.0, 1.03])

def smooth(x, edge=.18):
    """1 inside |x|<1-edge, fading to 0 at |x|=1."""
    t = np.clip((1 - np.abs(x)) / edge, 0, 1)
    return t * t * (3 - 2 * t)

for a, e, hw, hh, power, rgb in SOFTBOXES.values():
    a, e = np.radians(a), np.radians(e)
    d_az = (AZ - a + np.pi) % (2 * np.pi) - np.pi
    mask = smooth(d_az * np.cos(EL) / np.radians(hw)) * smooth((EL - e) / np.radians(hh))
    img += mask[..., None] * power * np.array(rgb)

def rgbe(pixels):
    m = pixels.max(axis=-1)
    out = np.zeros(pixels.shape[:-1] + (4,), np.uint8)
    lit = m > 1e-32
    mant, exp = np.frexp(m[lit])
    scale = mant * 256 / m[lit]
    out[lit, :3] = np.clip(pixels[lit] * scale[:, None], 0, 255).astype(np.uint8)
    out[lit, 3] = (exp + 128).astype(np.uint8)
    return out

def rle(channel):
    """Radiance new-style run-length encoding of one scanline channel."""
    out, i, n = bytearray(), 0, len(channel)
    while i < n:
        run = 1
        while i + run < n and run < 127 and channel[i + run] == channel[i]:
            run += 1
        if run > 2:
            out += bytes([128 + run, channel[i]])
            i += run
            continue
        start = i
        while i < n and i - start < 128:
            if i + 2 < n and channel[i] == channel[i + 1] == channel[i + 2]:
                break
            i += 1
        out += bytes([i - start]) + bytes(channel[start:i])
    return out

data = rgbe(img.astype(np.float32))
body = bytearray()
for row in data:
    body += bytes([2, 2, W >> 8, W & 255])
    for c in range(4):
        body += rle(row[:, c].tolist())

out = Path(__file__).resolve().parent.parent / 'lighting' / 'studio.hdr'
out.parent.mkdir(exist_ok=True)
out.write_bytes(b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n' + f'-Y {H} +X {W}\n'.encode() + bytes(body))
print(out, out.stat().st_size, 'bytes, peak', float(img.max()))
