# svg.easing.js

Additional easing equations for the fx module in the [svgjs.com](http://svgjs.com) library.

Svg.easing.js is licensed under the terms of the MIT License.

## Usage
Include this plugin after including the svg.js library in your html document.

To use the custom easing methods:

```javascript
var draw = SVG('paper').size(400, 400)
var rect = draw.rect(100, 100)

rect.animate(500, SVG.easing.bounce).move(300, 300)
```

Available easing methods are:
- `SVG.easing.quadIn`
- `SVG.easing.quadOut`
- `SVG.easing.quadInOut`
- `SVG.easing.cubicIn`
- `SVG.easing.cubicOut`
- `SVG.easing.cubicInOut`
- `SVG.easing.quartIn`
- `SVG.easing.quartOut`
- `SVG.easing.quartInOut`
- `SVG.easing.quintIn`
- `SVG.easing.quintOut`
- `SVG.easing.quintInOut`
- `SVG.easing.sineIn`
- `SVG.easing.sineOut`
- `SVG.easing.sineInOut`
- `SVG.easing.expoIn`
- `SVG.easing.expoOut`
- `SVG.easing.expoInOut`
- `SVG.easing.circIn`
- `SVG.easing.circOut`
- `SVG.easing.circInOut`
- `SVG.easing.backIn`
- `SVG.easing.backOut`
- `SVG.easing.backInOut`
- `SVG.easing.swingFromTo`
- `SVG.easing.swingFrom`
- `SVG.easing.swingTo`
- `SVG.easing.bounce`
- `SVG.easing.bounceOut`
- `SVG.easing.elastic`

