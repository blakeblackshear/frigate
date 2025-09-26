# svg.filter.js

A plugin for [svg.js](http://svgjs.com) adding filter functionality.

Svg.filter.js is licensed under the terms of the MIT License.

- [Examples](#examples)
- [Furthermore](#furthermore)
    - [unfilter](#unfilter)
    - [referencing the filter node](#referencing-the-filter-node)
    - [Animating filter values](#animating-filter-values)
    - [Chaining Effects](#chaining-effects)
- [Effect Classes](#effect-classes)

## Usage
Include this plugin after including the svg.js library in your html document.

For a few visual examples look at the [svg.js filter page](http://svgjs.com/filter).

Here is how each filter effect on the example page is achieved.


## Examples
- [gaussian blur](#gaussian-blur)
- [horizontal blur](#horizontal-blur)
- [desaturate](#desaturate)
- [contrast](#contrast)
- [sepiatone](#sepiatone)
- [hue rotate 180](#hue-rotate-180)
- [luminance to alpha](#luminance-to-alpha)
- [colorize](#colorize)
- [posterize](#posterize)
- [darken](#darken)
- [lighten](#lighten)
- [invert](#invert)
- [gamma correct 1](#gamma-correct-1)
- [gamma correct 2](#gamma-correct-2)
- [drop shadow](#drop-shadow)
- [extrude](#extrude)

### original

```javascript
var image = draw.image('path/to/image.jpg').size(300, 300)
```

### gaussian blur

```javascript
image.filter(function(add) {
  add.gaussianBlur(30)
})
```

### horizontal blur

```javascript
image.filter(function(add) {
  add.gaussianBlur(30, 0)
})
```

### desaturate

```javascript
image.filter(function(add) {
  add.colorMatrix('saturate', 0)
})
```

### contrast

```javascript
image.filter(function(add) {
  var amount = 1.5

  add.componentTransfer({
    rgb: { type: 'linear', slope: amount, intercept: -(0.3 * amount) + 0.3 }
  })
})
```

### sepiatone

```javascript
image.filter(function(add) {
  add.colorMatrix('matrix', [ .343, .669, .119, 0, 0
                            , .249, .626, .130, 0, 0
                            , .172, .334, .111, 0, 0
                            , .000, .000, .000, 1, 0 ])
})
```

### hue rotate 180

```javascript
image.filter(function(add) {
  add.colorMatrix('hueRotate', 180)
})
```

### luminance to alpha

```javascript
image.filter(function(add) {
  add.colorMatrix('luminanceToAlpha')
})
```

### colorize

```javascript
image.filter(function(add) {
  add.colorMatrix('matrix', [ 1.0, 0,   0,   0,   0
                            , 0,   0.2, 0,   0,   0
                            , 0,   0,   0.2, 0,   0
                            , 0,   0,   0,   1.0, 0 ])
})
```

### posterize

```javascript
image.filter(function(add) {
  add.componentTransfer({
    rgb: { type: 'discrete', tableValues: [0, 0.2, 0.4, 0.6, 0.8, 1] }
  })
})
```

### darken

```javascript
image.filter(function(add) {
  add.componentTransfer({
    rgb: { type: 'linear', slope: 0.2 }
  })
})
```

### lighten

```javascript
image.filter(function(add) {
  add.componentTransfer({
    rgb: { type: 'linear', slope: 1.5, intercept: 0.2 }
  })
})
```

### invert

```javascript
image.filter(function(add) {
  add.componentTransfer({
    rgb: { type: 'table', tableValues: [1, 0] }
  })
})
```

### gamma correct 1

```javascript
image.filter(function(add) {
  add.componentTransfer({
    g: { type: 'gamma', amplitude: 1, exponent: 0.5 }
  })
})
```

### gamma correct 2

```javascript
image.filter(function(add) {
  add.componentTransfer({
    g: { type: 'gamma', amplitude: 1, exponent: 0.5, offset: -0.1 }
  })
})
```


### drop shadow
You will notice that all the effect descriptions have a drop shadow. Here is how this drop shadow can be achieved:

```javascript
var text = draw.text('SVG text with drop shadow').fill('#fff')

text.filter(function(add) {
  var blur = add.offset(0, 1).in(add.sourceAlpha).gaussianBlur(1)

  add.blend(add.source, blur)
})
```

This technique can be achieved on any other shape of course:

```javascript
var rect = draw.rect(100,100).fill('#f09').stroke({ width: 3, color: '#0f9' }).move(10,10)

rect.filter(function(add) {
  var blur = add.offset(20, 20).in(add.sourceAlpha).gaussianBlur(5)

  add.blend(add.source, blur)

  this.size('200%','200%').move('-50%', '-50%')
})
```

If the drop shadow should get the colour of the shape so it appears like coloured glass:

```javascript
var rect = draw.rect(100,100).fill('#f09').stroke({ width: 3, color: '#0f9' }).move(10,10)

rect.filter(function(add) {
  var blur = add.offset(20, 20).gaussianBlur(5)

  add.blend(add.source, blur)

  this.size('200%','200%').move('-50%', '-50%')
})
```

### extrude
```javascript
image.filter(function(add){
  var matrix = add.convolveMatrix([
    1,0,0,0,0,0,
    0,1,0,0,0,0,
    0,0,1,0,0,0,
    0,0,0,1,0,0,
    0,0,0,0,1,0,
    0,0,0,0,0,1
  ]).attr({
    devisor: '2',
    preserveAlpha: 'false'
  }).in(add.sourceAlpha)

  //recolor it
  var color = add.composite(add.flood('#ff2222'),matrix,'in');

  //merge all of them toggether
  add.merge(color,add.source);
})
```


## Furthermore
Some more features you should know about.

### unfilter
The `unfilter` method removes the filter attribute from the node:

```javascript
image.unfilter()
```

This will return the element to its original state but will retain the filter in the defs node. If the filter node should be removed as well, simply pass the `true` as the first argument:

```javascript
image.unfilter(true)
```


### referencing the filter node
An internal reference to the filter node is made in the element:

```javascript
image.filterer
```

This can also be very useful to reuse an existing filter on various elements:

```javascript
otherImage.filter(image.filterer)
```

### Animating filter values
Every filter value can be animated as well:

```javascript
var hueRotate

image.filter(function(add) {
  hueRotate = add.colorMatrix('hueRotate', 0)
})

hueRotate.animate(3000).attr('values', 360)
```

### Chaining Effects

[Method chaining](https://en.wikipedia.org/wiki/Method_chaining) is a programing style where each function retures the object it blongs to, for an example look at JQuery.<br>
its posible to chain the effects on a filter when you are creating them, for example
```javascript
image.filter(function(add){
  add.flood('black',0.5).composite(add.sourceAlpha,'in').offset(10).merge(add.source)
})
```

this would create a basic shadow filter where the first input on the `composite` effect would be the `flood` effect, and the input on the offset effect would be the `composite` effect.<br>
same with the `merge` effect, its first input would be the `offset` effect, and its second input would be `add.source`

some effects like [Merge](#merge), [Blend](blend), [Composite](#composite), [DisplacementMap](displacementmap) have thier arguments changed when they are chained, for example
```javascript
image.filter(function(add){
  add.flood('black',0.5).composite(add.sourceAlpha,'in')
})
```
the `composite` effects first input is set to the `flood` effect and its second input becomes the first argument, this is the same for the merge, blend, composite, and displacmentMap effect. <br>
for more details check out each effects doc below

## Effect Classes

- [Base Effect Class](base-effect-class)
- [Blend](#blend)
- [ColorMatrix](#colormatrix)
- [ComponentTransfer](#componenttransfer)
- [Composite](#composite)
- [ConvolveMatrix](#convolvematrix)
- [DiffuseLighting](#diffuseLighting)
- [DisplacementMap](#displacementmap)
- [Flood](#flood)
- [GaussianBlur](#gaussianglur)
- [Image](#image)
- [Merge](#merge)
- [Morphology](#morphology)
- [Offset](#offset)
- [SpecularLighting](#specularlighting)
- [Tile](#tile)
- [Turbulence](#turbulence)

### Base Effect Class

#### in(effect)
  gets or sets the `in` attribute of the effect
  some effect like [Blend](blend), [Composite](#composite), [DisplacementMap](displacementmap) have a `in2` function, it works the same as the as

  - **effect:** this can be another effect or a string <br>
    if **effect** is not provided it will look for another effect on the same filter whos `result` is equal to this effects `in`, else it will return the value of the `in` attribute
    ```javascript
    image.filter(function(add){
      var offset = add.offset(10)

      //create the blur effect and then set its input
      var blur = add.gaussianBlur(3)

      //set the input to an effect
      blur.in(offset)

      //this will return the offset effect
      var input = blur.in()

      //set the input to a string
      blur.in('another-result-as-a-string')

      //this will return a string since there is no other effect which has a matching result attribute
      var input2 = blur.in()
    })
    ```

#### result(string)
  gets or sets the `result` attribute of the effect

  - **string:** if no string if provided it will act as a getter and return the value of the `result` attruibute

### Blend

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feBlendElement)

```javascript
filter.blend(in1, in2, mode)
//or
new SVG.BlendEffect(in1, in2, mode)
```

- **in1**: an effect or the result of effect
- **in2**: same as **in1**
- **mode**: "normal | multiply | screen | darken | lighten" defaults to "normal"

**chaining** when this effect is called right after another effect, for example:
```javascript
filter.offset(10).blend(filter.source)
```
the first input is set to the `offset` effect and the second input is set to `filter.source` or what ever was passed as the first argument, and the second input becomes the **mode**

### ColorMatrix

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feColorMatrixElement)

```javascript
filter.colorMatrix(type, values);
//or
new SVG.ColorMatrixEffect(type, values);
```

- **type**: "matrix | saturate | hueRotate | luminanceToAlpha"
- **values**
  - **type="matrix"**: values would be a matrix the size of 4x5
  - **type="saturate"**: number (0 to 1)
  - **type="hueRotate"**: number (0 to 360) deg
  - **type="luminanceToAlpha"**: value not needed

### ComponentTransfer

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feComponentTransferElement)

```javascript
filter.componentTransfer(components);
//or
new SVG.ComponentTransferEffect(components);
```

- **components**: an object with one `rgb` property for the (r, g and b) chanels or `r`, `g`, `b`, `a` properties for each chanel
  ```javascript
  {
    rgb: {
      type: "identity | table | discrete | linear | gamma",

      //type="table"
      tableValues: "0 0.5 2 1", //number sperated by spaces

      //type="linear"
      slope: 1, //number
      intercept: 3,//number

      //type="gamma"
      amplitude: 0, //number
      exponent: 0, //number
      offset: 0 //number
    }
  }
  ```

### Composite

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feCompositeElement)

```javascript
filter.composite(in1, in2, operator);
//or
new SVG.CompositeEffect(in1, in2, operator);
```

- **in1**: an effect or the result of an effect
- **in2**: same as **in1**
- **operator**: "over | in | out | atop | xor | arithmetic" defaults to "over"

**chaining** when this effect is called right after another effect, for example:
```javascript
filter.flood('black',0.5).composite(filter.sourceAlpha,'in')
```
the first input is set to the `flood` effect and the second input is set to `filter.sourceAlpha` or what ever was passed as the first argument.<br>
also the second argument becomes the **operator**

### ConvolveMatrix

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feConvolveMatrixElement)

```javascript
filter.convolveMatrix(matrix);
//or
new SVG.ConvolveMatrixEffect(matrix);
```

- **matrix**: a square matrix of numbers that will be applied to the image
  - exmaple:
  ```javascript
  [
    1,0,0,
    0,1,0,
    0,0,1
  ]
  ```

### DiffuseLighting

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feDiffuseLightingElement)

```javascript
filter.displacementMap(surfaceScale, diffuseConstant, kernelUnitLength);
//or
new SVG.DisplacementMapEffect(surfaceScale, diffuseConstant, kernelUnitLength);
```

***very complicated, just check out the W3 doc***

### DisplacementMap

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feDisplacementMapElement)

```javascript
filter.displacementMap(in1, in2, scale, xChannelSelector, yChannelSelector);
//or
new SVG.DisplacementMapEffect(in1, in2, scale, xChannelSelector, yChannelSelector);
```

***very complicated, just check out the W3 doc***

**chaining** when this effect is called right after another effect, for example:
```javascript
filter.offset(20,50).displacementMap(filter.source,2)
```
the first input is set to the `offset` effect and the second input is set to `filter.source` or what ever was passed as the first argument.<br>
also the second argument becomes the **scale**, and the third argument is the **xChannelSelector** and so on

### Flood

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feFloodElement)

```javascript
filter.flood(color,opacity);
//or
new SVG.FloodEffect(color,opacity);
```

- **color**: a named or hex color in string format
- **opacity**: number form 0 to 1

### GaussianBlur

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feGaussianBlurElement)

```javascript
filter.gaussianBlur(x, y);
//or
new SVG.GaussianBlurEffect(x, y);
```

- **x**: blur on the X
- **y**: blur on the y, will default to the **x** if not provided

### Image

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feImageElement)

```javascript
filter.image(src);
//or
new SVG.ImageEffect(src);
```

### Merge

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feMergeElement)

```javascript
filter.merge();
//or
new SVG.MergeEffect();
```

- **Array**: an Array of effects or effect results `filter.merge([effectOne,"result-two",another_effect])`
- **SVG.Set**: a set of effects
- **arguments**: pass each effect or result in as arguments `filter.merge(effect,"some-result",anotherEffect)`
- **chianing** you can also chian the merge effect `filter.offset(10).merge(anotherEffect)` will result in a merge effect with its first input set to the `offset` effect and its second input set to `anotherEffect`

### Morphology

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feMorphologyElement)

```javascript
filter.morphology(operator, radius);
//or
new SVG.MorphologyEffect(operator, radius);
```

- **operator**: "erode | dilate"
- **radius**: a single number or a string of two number sperated by a space
  - the first number is the X
  - the second number is the Y, if no provided it will default to the first number

### Offset

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feOffsetElement)

```javascript
filter.offset(x, y);
//or
new SVG.OffsetEffect(x, y);
```

- **x**: move on the X
- **y**: move on the y, will default to the **x** if not provided

### SpecularLighting

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feSpecularLightingElement)

```javascript
filter.specularLighting(surfaceScale, diffuseConstant, specularExponent, kernelUnitLength);
//or
new SVG.SpecularLightingEffect(surfaceScale, diffuseConstant, specularExponent, kernelUnitLength);
```

***very complicated, just check out the W3 doc***

### Tile

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feTileElement)

```javascript
filter.tile();
//or
new SVG.TileEffect();
```

***no arguments, but if you want to find out what it dose check out the W3 doc***

### Turbulence

[W3 doc](https://www.w3.org/TR/SVG/filters.html#feTurbulenceElement)

```javascript
filter.turbulence(baseFrequency, numOctaves, seed, stitchTiles, type);
//or
new SVG.TurbulenceEffect(baseFrequency, numOctaves, seed, stitchTiles, type);
```

***very complicated, just check out the W3 doc***
