'use strict';

/**
 * Convert a series of points to a monotone cubic spline
 * Algorithm based on https://github.com/mbostock/d3
 * https://github.com/yr/monotone-cubic-spline
 * @copyright Yr
 * @license MIT
 */

const ε = 1e-6;

module.exports = {
  /**
   * Convert 'points' to bezier
   * @param {Array} points
   * @returns {Array}
   */
  points(points) {
    const tgts = tangents(points);

    const p = points[1];
    const p0 = points[0];
    const pts = [];
    const t = tgts[1];
    const t0 = tgts[0];

    // Add starting 'M' and 'C' points
    pts.push(p0, [p0[0] + t0[0], p0[1] + t0[1], p[0] - t[0], p[1] - t[1], p[0], p[1]]);

    // Add 'S' points
    for (let i = 2, n = tgts.length; i < n; i++) {
      const p = points[i];
      const t = tgts[i];

      pts.push([p[0] - t[0], p[1] - t[1], p[0], p[1]]);
    }

    return pts;
  },

  /**
   * Slice out a segment of 'points'
   * @param {Array} points
   * @param {Number} start
   * @param {Number} end
   * @returns {Array}
   */
  slice(points, start, end) {
    const pts = points.slice(start, end);

    if (start) {
      // Add additional 'C' points
      if (pts[1].length < 6) {
        const n = pts[0].length;

        pts[1] = [pts[0][n - 2] * 2 - pts[0][n - 4], pts[0][n - 1] * 2 - pts[0][n - 3]].concat(pts[1]);
      }
      // Remove control points for 'M'
      pts[0] = pts[0].slice(-2);
    }

    return pts;
  },

  /**
   * Convert 'points' to svg path
   * @param {Array} points
   * @returns {String}
   */
  svgPath(points) {
    let p = '';

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const n = point.length;

      if (!i) {
        p += `M${point[n - 2]} ${point[n - 1]}`;
      } else if (n > 4) {
        p += `C${point[0]}, ${point[1]}`;
        p += `, ${point[2]}, ${point[3]}`;
        p += `, ${point[4]}, ${point[5]}`;
      } else {
        p += `S${point[0]}, ${point[1]}`;
        p += `, ${point[2]}, ${point[3]}`;
      }
    }

    return p;
  }
};

/**
 * Generate tangents for 'points'
 * @param {Array} points
 * @returns {Array}
 */
function tangents(points) {
  const m = finiteDifferences(points);
  const n = points.length - 1;

  const tgts = [];
  let a, b, d, s;

  for (let i = 0; i < n; i++) {
    d = slope(points[i], points[i + 1]);

    if (Math.abs(d) < ε) {
      m[i] = m[i + 1] = 0;
    } else {
      a = m[i] / d;
      b = m[i + 1] / d;
      s = a * a + b * b;
      if (s > 9) {
        s = d * 3 / Math.sqrt(s);
        m[i] = s * a;
        m[i + 1] = s * b;
      }
    }
  }

  for (let i = 0; i <= n; i++) {
    s = (points[Math.min(n, i + 1)][0] - points[Math.max(0, i - 1)][0]) / (6 * (1 + m[i] * m[i]));
    tgts.push([s || 0, m[i] * s || 0]);
  }

  return tgts;
}

/**
 * Compute slope from point 'p0' to 'p1'
 * @param {Array} p0
 * @param {Array} p1
 * @returns {Number}
 */
function slope(p0, p1) {
  return (p1[1] - p0[1]) / (p1[0] - p0[0]);
}

/**
 * Compute three-point differences for 'points'
 * @param {Array} points
 * @returns {Array}
 */
function finiteDifferences(points) {
  const m = [];
  let p0 = points[0];
  let p1 = points[1];
  let d = (m[0] = slope(p0, p1));
  let i = 1;

  for (let n = points.length - 1; i < n; i++) {
    p0 = p1;
    p1 = points[i + 1];
    m[i] = (d + (d = slope(p0, p1))) * 0.5;
  }
  m[i] = d;

  return m;
}
