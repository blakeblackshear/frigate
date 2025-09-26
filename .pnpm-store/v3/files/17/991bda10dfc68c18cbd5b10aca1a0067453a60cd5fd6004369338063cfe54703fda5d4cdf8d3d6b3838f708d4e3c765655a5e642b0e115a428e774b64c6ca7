# Rough.js

<b>Rough.js</b> is a small (\<9 kB) graphics library that lets you draw in a _sketchy_, _hand-drawn-like_, style.
The library defines primitives to draw lines, curves, arcs, polygons, circles, and ellipses. It also supports drawing [SVG paths](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths).

Rough.js works with both [Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) and [SVG](https://developer.mozilla.org/en-US/docs/Web/SVG).

![Rough.js sample](https://roughjs.com/images/cap_demo.png)

[@RoughLib](https://twitter.com/RoughLib) on Twitter.

## Install

from npm:

```
npm install --save roughjs
```

Or get the latest using unpkg: https://unpkg.com/roughjs@latest/bundled/rough.js


If you are looking for bundled version in different formats, the npm package will have these in the following locations:

CommonJS: `roughjs/bundled/rough.cjs.js`

ESM: `roughjs/bundled/rough.esm.js`

Browser IIFE: `roughjs/bundled/rough.js`


## Usage

![Rough.js rectangle](https://roughjs.com/images/m1.png)

```js
const rc = rough.canvas(document.getElementById('canvas'));
rc.rectangle(10, 10, 200, 200); // x, y, width, height
```

or SVG

```js
const rc = rough.svg(svg);
let node = rc.rectangle(10, 10, 200, 200); // x, y, width, height
svg.appendChild(node);
```

### Lines and Ellipses

![Rough.js rectangle](https://roughjs.com/images/m2.png)

```js
rc.circle(80, 120, 50); // centerX, centerY, diameter
rc.ellipse(300, 100, 150, 80); // centerX, centerY, width, height
rc.line(80, 120, 300, 100); // x1, y1, x2, y2
```

### Filling

![Rough.js rectangle](https://roughjs.com/images/m3.png)

```js
rc.circle(50, 50, 80, { fill: 'red' }); // fill with red hachure
rc.rectangle(120, 15, 80, 80, { fill: 'red' });
rc.circle(50, 150, 80, {
  fill: "rgb(10,150,10)",
  fillWeight: 3 // thicker lines for hachure
});
rc.rectangle(220, 15, 80, 80, {
  fill: 'red',
  hachureAngle: 60, // angle of hachure,
  hachureGap: 8
});
rc.rectangle(120, 105, 80, 80, {
  fill: 'rgba(255,0,200,0.2)',
  fillStyle: 'solid' // solid fill
});
```

Fill styles can be: **hachure**(default), **solid**, **zigzag**, **cross-hatch**, **dots**, **dashed**, or **zigzag-line**

![Rough.js fill examples](https://roughjs.com/images/m14.png)

### Sketching style

![Rough.js rectangle](https://roughjs.com/images/m4.png)

```js
rc.rectangle(15, 15, 80, 80, { roughness: 0.5, fill: 'red' });
rc.rectangle(120, 15, 80, 80, { roughness: 2.8, fill: 'blue' });
rc.rectangle(220, 15, 80, 80, { bowing: 6, stroke: 'green', strokeWidth: 3 });
```

### SVG Paths

![Rough.js paths](https://roughjs.com/images/m5.png)

```js
rc.path('M80 80 A 45 45, 0, 0, 0, 125 125 L 125 80 Z', { fill: 'green' });
rc.path('M230 80 A 45 45, 0, 1, 0, 275 125 L 275 80 Z', { fill: 'purple' });
rc.path('M80 230 A 45 45, 0, 0, 1, 125 275 L 125 230 Z', { fill: 'red' });
rc.path('M230 230 A 45 45, 0, 1, 1, 275 275 L 275 230 Z', { fill: 'blue' });
```

SVG Path with simplification:

![Rough.js texas map](https://roughjs.com/images/m9.png) ![Rough.js texas map](https://roughjs.com/images/m10.png)

## Examples

![Rough.js US map](https://roughjs.com/images/m6.png)

[View examples here](https://github.com/pshihn/rough/wiki/Examples)

## API & Documentation

[Full Rough.js API](https://github.com/pshihn/rough/wiki)

## Credits

Some of the core algorithms were adapted from [handy](https://www.gicentre.net/software/#/handy/) processing lib.

Algorithm to convert SVG arcs to Canvas [described here](https://www.w3.org/TR/SVG/implnote.html) was adapted from [Mozilla codebase](https://hg.mozilla.org/mozilla-central/file/17156fbebbc8/content/svg/content/src/nsSVGPathDataParser.cpp#l887)

## Contributors

### Financial Contributors

Become a financial contributor and help us sustain our community. [[Contribute](https://opencollective.com/rough/contribute)]

#### Individuals

<a href="https://opencollective.com/rough"><img src="https://opencollective.com/rough/individuals.svg?width=890"></a>

#### Organizations

Support this project with your organization. Your logo will show up here with a link to your website. [[Contribute](https://opencollective.com/rough/contribute)]

<a href="https://excalidraw.com/"><img src="https://avatars.githubusercontent.com/u/59452120?s=64&v=4"></a>
<a href="https://www.diagrams.net/"><img src="https://avatars.githubusercontent.com/u/1769238?s=64&v=4"></a>
<a href="https://terrastruct.com/"><img width="64" height="64" src="https://roughjs.com/images/sponsors/terrastruct.png"></a>
<a href="https://opencollective.com/rough/organization/0/website"><img src="https://opencollective.com/rough/organization/0/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/1/website"><img src="https://opencollective.com/rough/organization/1/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/2/website"><img src="https://opencollective.com/rough/organization/2/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/3/website"><img src="https://opencollective.com/rough/organization/3/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/4/website"><img src="https://opencollective.com/rough/organization/4/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/5/website"><img src="https://opencollective.com/rough/organization/5/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/6/website"><img src="https://opencollective.com/rough/organization/6/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/7/website"><img src="https://opencollective.com/rough/organization/7/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/8/website"><img src="https://opencollective.com/rough/organization/8/avatar.svg"></a>
<a href="https://opencollective.com/rough/organization/9/website"><img src="https://opencollective.com/rough/organization/9/avatar.svg"></a>

## License
[MIT License](https://github.com/pshihn/rough/blob/master/LICENSE) (c) [Preet Shihn](https://twitter.com/preetster)
