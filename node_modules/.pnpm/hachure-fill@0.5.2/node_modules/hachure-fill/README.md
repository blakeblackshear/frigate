# hachure-fill

[Demo](https://hachure-fill.pages.dev/)

This package calculates the hachure lined to fill a polygon. The **angle** of the lines and the **gap** between lines can be configured.

The algorithm works on convex, concave, simple, complex polygons, and polygons with holes. 

![preview of a polygon](https://user-images.githubusercontent.com/833927/242424090-90e60c00-c87b-4033-ae63-c0f38fa5d291.png)


## Install

From npm

```
npm install --save hachure-fill
```

The package is distributed as an ES6 module. 

## Usage

### hachureFill(points: Point[], angle: number, gap: number): Line[];

The function takes in a polygon, which is represented as an array of points (each point being a an array of 2 numbers `[x, y]`). 

The **angle** sets the angle of the hachure lines in degrees. 

The  **gap** arguments sets the distance between each hachure line. 

The function returns an array of lines. Each line is an array of two points. 

```javascript
import { hachureFill } from 'hachure-fill';

// Polygon vertices
const vertices = [
  [10, 10],
  [200, 10],
  [100, 100],
  [300, 100],
  [60, 200]
];

// Lines filling the polygon 
// at an angle of 45 degrees. 
// Lines are 10px apart.
const lines = hachureFill(vertices, 45, 10);

// Draw lines...
```

### hachureFill(points: Point[][], angle: number, gap: number): Line[];

When dealing with Polygon with holes, you can provide an array of polygons. The outer polygon, and polygones represented each of the holes. 
The polygons need not be nested, but if they are, even-odd rules apply to fill the shape. 
