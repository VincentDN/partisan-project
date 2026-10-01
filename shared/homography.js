// Projective mapping of a rectangle onto an arbitrary quad, as a CSS matrix3d. Lets a flat HTML element sit exactly on a
// surface that is drawn in perspective in a WebGL scene (the Nokia screen lying on the workbench).
// Pure functions: no DOM, no three.js.

/** Solve A x = b by Gaussian elimination with partial pivoting (small dense systems). */
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new Error('degenerate quad');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

/**
 * 3x3 homography H (row-major, h33 = 1) mapping src[i] -> dst[i] for four point pairs.
 * @param {number[][]} src  [[x,y] x4]
 * @param {number[][]} dst  [[x,y] x4]
 * @returns {number[]} 9 numbers
 */
export function homography(src, dst) {
  const A = [],
    b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i],
      [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(u, v);
  }
  const [a, b2, c, d, e, f, g, h] = solve(A, b);
  return [a, b2, c, d, e, f, g, h, 1];
}

/** Apply a homography to a point. */
export function apply(H, [x, y]) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

/** CSS `matrix3d(...)` for H (use with transform-origin: 0 0). */
export function toMatrix3d(H) {
  const [a, b, c, d, e, f, g, h] = H;
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].map(v => +v.toPrecision(10)).join(',')})`;
}

/** The transform that puts a w x h element exactly on `quad` ([[x,y] x4]: top-left, top-right, bottom-right, bottom-left, in px). */
export function quadTransform(w, h, quad) {
  return toMatrix3d(
    homography(
      [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ],
      quad,
    ),
  );
}
