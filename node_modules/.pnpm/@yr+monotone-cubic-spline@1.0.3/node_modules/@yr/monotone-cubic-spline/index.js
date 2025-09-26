'use strict';

/**
 * Convert a series of points to a monotone cubic spline
 * Algorithm based on https://github.com/mbostock/d3
 * https://github.com/yr/monotone-cubic-spline
 * @copyright Yr
 * @license MIT
 */

var ε = 1e-6;

module.exports = {
  /**
   * Convert 'points' to bezier
   * @param {Array} points
   * @returns {Array}
   */
  points: function points(_points) {
    var tgts = tangents(_points);

    var p = _points[1];
    var p0 = _points[0];
    var pts = [];
    var t = tgts[1];
    var t0 = tgts[0];

    // Add starting 'M' and 'C' points
    pts.push(p0, [p0[0] + t0[0], p0[1] + t0[1], p[0] - t[0], p[1] - t[1], p[0], p[1]]);

    // Add 'S' points
    for (var i = 2, n = tgts.length; i < n; i++) {
      var _p = _points[i];
      var _t = tgts[i];

      pts.push([_p[0] - _t[0], _p[1] - _t[1], _p[0], _p[1]]);
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
  slice: function slice(points, start, end) {
    var pts = points.slice(start, end);

    if (start) {
      // Add additional 'C' points
      if (pts[1].length < 6) {
        var n = pts[0].length;

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
  svgPath: function svgPath(points) {
    var p = '';

    for (var i = 0; i < points.length; i++) {
      var point = points[i];
      var n = point.length;

      if (!i) {
        p += 'M' + point[n - 2] + ' ' + point[n - 1];
      } else if (n > 4) {
        p += 'C' + point[0] + ', ' + point[1];
        p += ', ' + point[2] + ', ' + point[3];
        p += ', ' + point[4] + ', ' + point[5];
      } else {
        p += 'S' + point[0] + ', ' + point[1];
        p += ', ' + point[2] + ', ' + point[3];
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
  var m = finiteDifferences(points);
  var n = points.length - 1;

  var tgts = [];
  var a = void 0,
      b = void 0,
      d = void 0,
      s = void 0;

  for (var i = 0; i < n; i++) {
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

  for (var _i = 0; _i <= n; _i++) {
    s = (points[Math.min(n, _i + 1)][0] - points[Math.max(0, _i - 1)][0]) / (6 * (1 + m[_i] * m[_i]));
    tgts.push([s || 0, m[_i] * s || 0]);
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
  var m = [];
  var p0 = points[0];
  var p1 = points[1];
  var d = m[0] = slope(p0, p1);
  var i = 1;

  for (var n = points.length - 1; i < n; i++) {
    p0 = p1;
    p1 = points[i + 1];
    m[i] = (d + (d = slope(p0, p1))) * 0.5;
  }
  m[i] = d;

  return m;
}