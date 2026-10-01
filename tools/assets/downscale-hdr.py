"""Make a half-size copy of a Radiance .hdr (box filter in linear light) for phones.

    python3 tools/assets/downscale-hdr.py assets/lighting/venice_sunset_1k.hdr assets/lighting/venice_sunset_512.hdr

Reads flat or new-style RLE RGBE, writes new-style RLE. Needs NumPy only. The image is a blurred environment
and backdrop, so the half-size map loses nothing you can see on a phone, at a quarter of the memory and bytes.
"""
import sys
import numpy as np


def read_hdr(path):
    data = open(path, 'rb').read()
    i = 0
    while data[i:i + 1] != b'\n' or data[i + 1:i + 2] != b'\n':
        i += 1  # header ends at the blank line
        if i > 4096:
            raise SystemExit('no header end')
    j = data.index(b'\n', i + 2)
    parts = data[i + 2:j].split()
    h, w = int(parts[1]), int(parts[3])
    p = j + 1
    out = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        if data[p] == 2 and data[p + 1] == 2 and (data[p + 2] << 8 | data[p + 3]) == w:
            p += 4
            for c in range(4):
                x = 0
                while x < w:
                    n = data[p]; p += 1
                    if n > 128:
                        n -= 128; out[y, x:x + n, c] = data[p]; p += 1
                    else:
                        out[y, x:x + n, c] = np.frombuffer(data[p:p + n], np.uint8); p += n
                    x += n
        else:
            out[y] = np.frombuffer(data[p:p + w * 4], np.uint8).reshape(w, 4); p += w * 4
    return out


def to_float(rgbe):
    e = rgbe[..., 3].astype(np.int32)
    f = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return rgbe[..., :3].astype(np.float64) * f[..., None]


def to_rgbe(img):
    m = img.max(axis=2)
    mant, exp = np.frexp(m)
    scale = np.where(m > 1e-32, mant * 256.0 / np.where(m > 0, m, 1), 0)
    out = np.zeros(img.shape[:2] + (4,), np.uint8)
    out[..., :3] = np.clip(img * scale[..., None], 0, 255).astype(np.uint8)
    out[..., 3] = np.where(m > 1e-32, exp + 128, 0).astype(np.uint8)
    return out


def rle_row(row):
    w = row.shape[0]
    out = bytearray([2, 2, w >> 8, w & 255])
    for c in range(4):
        ch = row[:, c].tobytes()
        x = 0
        while x < w:
            run = 1
            while x + run < w and run < 127 and ch[x + run] == ch[x]:
                run += 1
            if run >= 4:
                out += bytes([128 + run, ch[x]]); x += run
            else:
                n = 1
                while x + n < w and n < 128 and not (x + n + 3 < w and ch[x + n] == ch[x + n + 1] == ch[x + n + 2] == ch[x + n + 3]):
                    n += 1
                out += bytes([n]) + ch[x:x + n]; x += n
    return bytes(out)


def main(src, dst):
    img = to_float(read_hdr(src))
    h, w, _ = img.shape
    small = img[:h // 2 * 2, :w // 2 * 2].reshape(h // 2, 2, w // 2, 2, 3).mean(axis=(1, 3))
    rgbe = to_rgbe(small)
    with open(dst, 'wb') as f:
        f.write(b'#?RADIANCE\n# PARP half-size copy (tools/assets/downscale-hdr.py)\nFORMAT=32-bit_rle_rgbe\n\n')
        f.write(f'-Y {rgbe.shape[0]} +X {rgbe.shape[1]}\n'.encode())
        for row in rgbe:
            f.write(rle_row(row))
    print(dst, rgbe.shape[1], 'x', rgbe.shape[0])


if __name__ == '__main__':
    main(*sys.argv[1:3])
