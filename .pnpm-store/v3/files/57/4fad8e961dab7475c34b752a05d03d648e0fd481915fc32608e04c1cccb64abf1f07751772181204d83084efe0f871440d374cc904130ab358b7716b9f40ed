/**
 * 
 * @yr/monotone-cubic-spline (https://github.com/YR/monotone-cubic-spline)
 * 
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 yr.no
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * Generate tangents for 'points'
 * @param {Array} points
 * @returns {Array}
 */
export const tangents = (points) => {
  const m = finiteDifferences(points)
  const n = points.length - 1

  const ε = 1e-6

  const tgts = []
  let a, b, d, s

  for (let i = 0; i < n; i++) {
    d = slope(points[i], points[i + 1])

    if (Math.abs(d) < ε) {
      m[i] = m[i + 1] = 0
    } else {
      a = m[i] / d
      b = m[i + 1] / d
      s = a * a + b * b
      if (s > 9) {
        s = (d * 3) / Math.sqrt(s)
        m[i] = s * a
        m[i + 1] = s * b
      }
    }
  }

  for (let i = 0; i <= n; i++) {
    s =
      (points[Math.min(n, i + 1)][0] - points[Math.max(0, i - 1)][0]) /
      (6 * (1 + m[i] * m[i]))
    tgts.push([s || 0, m[i] * s || 0])
  }

  return tgts
}

/**
 * Convert 'points' to svg path
 * @param {Array} points
 * @returns {String}
 */
export const svgPath = (points) => {
  let p = ''

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    const n = point.length

    if (n > 4) {
      p += `C${point[0]}, ${point[1]}`
      p += `, ${point[2]}, ${point[3]}`
      p += `, ${point[4]}, ${point[5]}`
    } else if (n > 2) {
      p += `S${point[0]}, ${point[1]}`
      p += `, ${point[2]}, ${point[3]}`
    }
  }

  return p
}

export const spline = {
  /**
   * Convert 'points' to bezier
   * @param {Array} points
   * @returns {Array}
   */
  points(points) {
    const tgts = tangents(points)

    const p = points[1]
    const p0 = points[0]
    const pts = []
    const t = tgts[1]
    const t0 = tgts[0]

    // Add starting 'M' and 'C' points
    pts.push(p0, [
      p0[0] + t0[0],
      p0[1] + t0[1],
      p[0] - t[0],
      p[1] - t[1],
      p[0],
      p[1],
    ])

    // Add 'S' points
    for (let i = 2, n = tgts.length; i < n; i++) {
      const p = points[i]
      const t = tgts[i]

      pts.push([p[0] - t[0], p[1] - t[1], p[0], p[1]])
    }

    return pts
  },

  /**
   * Slice out a segment of 'points'
   * @param {Array} points
   * @param {Number} start
   * @param {Number} end
   * @returns {Array}
   */
  slice(points, start, end) {
    const pts = points.slice(start, end)

    if (start) {
      // Add additional 'C' points
      if (end - start > 1 && pts[1].length < 6) {
        const n = pts[0].length

        pts[1] = [
          pts[0][n - 2] * 2 - pts[0][n - 4],
          pts[0][n - 1] * 2 - pts[0][n - 3],
        ].concat(pts[1])
      }
      // Remove control points for 'M'
      pts[0] = pts[0].slice(-2)
    }

    return pts
  },
}

/**
 * Compute slope from point 'p0' to 'p1'
 * @param {Array} p0
 * @param {Array} p1
 * @returns {Number}
 */
function slope(p0, p1) {
  return (p1[1] - p0[1]) / (p1[0] - p0[0])
}

/**
 * Compute three-point differences for 'points'
 * @param {Array} points
 * @returns {Array}
 */
function finiteDifferences(points) {
  const m = []
  let p0 = points[0]
  let p1 = points[1]
  let d = (m[0] = slope(p0, p1))
  let i = 1

  for (let n = points.length - 1; i < n; i++) {
    p0 = p1
    p1 = points[i + 1]
    m[i] = (d + (d = slope(p0, p1))) * 0.5
  }
  m[i] = d

  return m
}
