# robust-predicates

Fast robust predicates for computational geometry in JavaScript. Provides reliable 2D and 3D point orientation tests (`orient2d`, `orient3d`, `incircle`, `insphere`) that are not susceptible to floating point errors (without sacrificing performance). A modern port of [Jonathan R Shewchuk's C code](https://www.cs.cmu.edu/~quake/robust.html), an industry standard since 1996.

<a href="https://observablehq.com/@mourner/non-robust-arithmetic-as-art"><img width="600" height="200" src="predicates.png" /></a>

_Figure: non-robust vs robust `orient2d` test for points within a tiny range (2<sup>-42</sup>)._

[![Build Status](https://github.com/mourner/robust-predicates/workflows/Node/badge.svg?branch=master)](https://github.com/mourner/robust-predicates/actions)
[![Simply Awesome](https://img.shields.io/badge/simply-awesome-brightgreen.svg)](https://github.com/mourner/projects)
[![Browser Build](https://badgen.net/bundlephobia/minzip/robust-predicates)](https://unpkg.com/robust-predicates)

## [Demo](https://observablehq.com/@mourner/non-robust-arithmetic-as-art)

## API

Note: unlike J. Shewchuk's original code, all the functions in this library assume `y` axis is oriented _downwards_ &darr;, so the semantics are different.

### `orient2d(ax,ay, bx,by, cx,cy)`

- Returns a *positive* value if the points `a`, `b`, and `c` occur in _counterclockwise_ order (`c` lies to the left of the directed line defined by points `a` and `b`).
- Returns a *negative* value if they occur in _clockwise_ order (`c` lies to the right of the directed line `ab`).
- Returns *zero* if they are _collinear_.

The result is also an approximation of twice the signed area of the triangle defined by the three points.

### `incircle(ax,ay, bx,by, cx,cy, dx,dy)`

- Returns a _positive_ value if the point `d` lies _outside_ the circle passing through `a`, `b`, and `c`.
- Returns a _negative_ value if it lies _inside_.
- Returns _zero_ if the four points are _cocircular_.

The points `a`, `b`, and `c` must be in _counterclockwise_ order, or the sign of the result will be reversed.

### `orient3d(ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz)`

- Returns a _positive_ value if the point `d` lies _above_ the plane passing through `a`, `b`, and `c`, meaning that `a`, `b`, and `c` appear in counterclockwise order when viewed from `d`.
- Returns a _negative_ value if `d` lies _below_ the plane.
- Returns _zero_ if the points are _coplanar_.

The result is also an approximation of six times the signed volume of the tetrahedron defined by the four points.

### `insphere(ax,ay,az, bx,by,bz, cx,cy,cz, dx,dy,dz, ex,ey,ez)`

- Returns a _positive_ value if the point `e` lies _outside_ the sphere passing through `a`, `b`, `c`, and `d`.
- Returns a _negative_ value if it lies _inside_.
- Returns _zero_ if the five points are _cospherical_.

The points `a`, `b`, `c`, and `d` must be ordered so that they have a _positive orientation_
(as defined by `orient3d`), or the sign of the result will be reversed.

### `orient2dfast`, `orient3dfast`, `incirclefast`, `inspherefast`

Simple, approximate, non-robust versions of predicates above. Use when robustness isn't needed.

## Example

```js
import {orient2d} from 'robust-predicates';

const ccw = orient2d(ax, ay, bx, by, cx, cy) > 0;
````

## Install

Install with `npm install robust-predicates` or `yarn add robust-predicates`, or use one of the browser builds:

- [predicates.min.js](https://unpkg.com/robust-predicates/umd/predicates.min.js) (all predicates)
- [orient2d.min.js](https://unpkg.com/robust-predicates/umd/orient2d.min.js) (`orient2d`, `orient2dfast`)
- [orient3d.min.js](https://unpkg.com/robust-predicates/umd/orient3d.min.js) (`orient3d`, `orient3dfast`)
- [incircle.min.js](https://unpkg.com/robust-predicates/umd/incircle.min.js) (`incircle`, `incirclefast`)
- [insphere.min.js](https://unpkg.com/robust-predicates/umd/insphere.min.js) (`insphere`, `inspherefast`)

## Thanks

This project is just a port — all the brilliant, hard work was done by [Jonathan Richard Shewchuk](https://people.eecs.berkeley.edu/~jrs/).

The port was also inspired by [Mikola Lysenko](https://twitter.com/MikolaLysenko)'s excellent [Robust Arithmetic Notes](https://github.com/mikolalysenko/robust-arithmetic-notes) and related projects like [robust-orientation](https://github.com/mikolalysenko/robust-orientation) and [robust-in-sphere](https://github.com/mikolalysenko/robust-in-sphere).

## License

Since the original code is in the public domain, this project follows the same choice. See [Unlicense](https://unlicense.org).
