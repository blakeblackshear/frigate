[![NPM Version](https://img.shields.io/npm/v/@yr/monotone-cubic-spline.svg?style=flat)](https://npmjs.org/package/@yr/monotone-cubic-spline)
[![Build Status](https://img.shields.io/travis/YR/monotone-cubic-spline.svg?style=flat)](https://travis-ci.org/YR/monotone-cubic-spline?branch=master)

Convert a series of points to a monotone cubic spline (based on D3.js implementation)

## Usage

```js
const spline = require('@yr/monotone-cubic-spline');
const points = spline.points([[0,0], [1,1], [2,1], [3,0], [4,0]]);
const svgPath = spline.svgPath(points);

console.log(svgPath);
// => 'M0 0C0.08333333333333333, 0.08333333333333333, ...'
```

## API

**points(points)**: convert array of points (x,y) to array of bezier points (c1x,c1y,c2x,c2y,x,y)

**slice(points, start, end)**: slice a segment of converted points

**svgPath(points)**: convert array of bezier points to svg path (`d`) string