# points-on-path

This package calculate the points on a SVG Path with a certain tolerance. It can also simplify the shape to use fewer points. 
This can really usefule when estimating lines/polygons for paths in WebGL or for Hit/Cosllision detections. 

This package essentially combines packages [path-data-parser](https://github.com/pshihn/path-data-parser) and [points-on-curve](https://github.com/pshihn/bezier-points)

## Install

From npm

```
npm install --save points-on-path
```

The package is distributed as an ES6 module. 

## Usage

### pointsOnPath(path: string, tolerance?: number, distance?: number): PathPoints

Pass in a SVG path string and get back a `PathPoints` object. A `PathPoints` gives you a list of points (each being a an array of 2 numbers `[x, y]`), and a flag telling you if the path is actually composed of multiple disconnected paths. 

```javascript
PathPoints {
  points: Point[];
  continuous: boolean;
}
```

Take this path for example:

![points on path](https://user-images.githubusercontent.com/833927/79054782-ba8d0300-7bfc-11ea-8f16-ed36001c56c9.png)

and estimate the points on the path

```javascript
import { pointsOnPath } from 'points-on-path';

const points = pointsOnPath('M240,100c50,0,0,125,50,100s0,-125,50,-150s175,50,50,100s-175,50,-300,0s0,-125,50,-100s0,125,50,150s0,-100,50,-100');
// plotPoints(points);
```

![points on path](https://user-images.githubusercontent.com/833927/79054650-8d8c2080-7bfb-11ea-93cf-2c070dfe63c5.png)

The method also accepts two optional values `tolerance` and `distance`. These are described by [points-on-curve](https://github.com/pshihn/bezier-points); to estimate more tolerant and fewer points. 


![points on path](https://user-images.githubusercontent.com/833927/79054652-8e24b700-7bfb-11ea-8ff8-68dce51a3940.png)

![points on path](https://user-images.githubusercontent.com/833927/79054653-8ebd4d80-7bfb-11ea-8645-a5a0ed81cf84.png)

## License
[MIT License](https://github.com/pshihn/points-on-path/blob/master/LICENSE)

