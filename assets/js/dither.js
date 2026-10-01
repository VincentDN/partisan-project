// Ordered (Bayer 4x4) dithering of an image to a two-tone LCD palette. Pure functions are exported
// for tests; drawDithered() is the browser wrapper.
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** @param {Uint8ClampedArray} rgba @returns {Uint8Array} 1 = ink, 0 = paper (length w*h) */
export function ditherToMask(rgba, w, h, {contrast = 1.25, bias = 0} = {}) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let l = (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;
      l = Math.min(1, Math.max(0, (l - 0.5) * contrast + 0.5 + bias));
      const threshold = (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
      out[y * w + x] = l < threshold ? 1 : 0;
    }
  return out;
}

export async function drawDithered(canvas, src, {ink = '#16200f', paper = '#b5c79a', width = 120, ...opts} = {}) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const h = Math.round((width * img.naturalHeight) / img.naturalWidth);
  canvas.width = width;
  canvas.height = h;
  const g = canvas.getContext('2d', {willReadFrequently: true});
  g.drawImage(img, 0, 0, width, h);
  const mask = ditherToMask(g.getImageData(0, 0, width, h).data, width, h, opts);
  const out = g.createImageData(width, h);
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const I = hex(ink),
    P = hex(paper);
  for (let i = 0; i < mask.length; i++) {
    const c = mask[i] ? I : P;
    out.data.set([c[0], c[1], c[2], 255], i * 4);
  }
  g.putImageData(out, 0, 0);
}
