# svg.draggable.js

A plugin for the [svgdotjs.github.io](https://svgdotjs.github.io/) library to make elements draggable.

Svg.draggable.js is licensed under the terms of the MIT License.

## Usage

Install the plugin:

    bower install svg.draggable.js

Include this plugin after including the svg.js library in your html document.

```html
<script src="svg.js"></script>
<script src="svg.draggable.js"></script>
```

To make an element draggable just call `draggable()` in the element

```javascript
var draw = SVG('canvas').size(400, 400)
var rect = draw.rect(100, 100)

rect.draggable()
```

Yes indeed, that's it! Now the `rect` is draggable.

## Events
The Plugin fires 4 different events

- beforedrag (cancelable)
- dragstart
- dragmove (cancelable)
- dragend

You can bind/unbind listeners to this events:

```javascript
// bind
rect.on('dragstart.namespace', function(event){

	// event.detail.event hold the given data explained below

})

// unbind
rect.off('dragstart.namespace')
```

### event.detail

`beforedrag`, `dragstart`, `dragmove` and `dragend` gives you the `event` and the `handler` which calculates the drag.
Except for `beforedrag` the events also give you:

 - `detail.m` transformation matrix to calculate screen coords to coords in the elements userspace
 - `detail.p` pageX and pageY transformed into the elements userspace

### cancelable events

You can prevent the default action of `beforedrag` and `dragmove` with a call to `event.preventDefault()` in the callback function.
The shape won't be dragged in this case. That is helpfull if you want to implement your own drag handling.

```javascript
rect.draggable().on('beforedrag', function(e){
  e.preventDefault()
  // no other events are bound
  // drag was completely prevented
})

rect.draggable().on('dragmove', function(e){
  e.preventDefault()
  this.move(e.detail.p.x, e.detail.p.y)
  // events are still bound e.g. dragend will fire anyway
})
```
 
## Constraint
The drag functionality can be limited within a given box. You can pass the the constraint values as an object:

```javascript
rect.draggable({
  minX: 10
, minY: 15
, maxX: 200
, maxY: 100
, snapToGrid: 20 
})
```

For more dynamic constraints a function can be passed as well:

```javascript
rect.draggable(function(x, y) {
  return { x: x < 1000, y: y < 300 }
})
```

**Note** that every constraint given is evaluated in the elements coordinate system and not in the screen-space

## Remove
The draggable functionality can be removed calling draggable again with false as argument:

```javascript
rect.draggable(false)
```


## Restrictions

- If your root-svg is transformed this plugin won't work properly (Viewbox is possible)
- Furthermore it is not possible to move a rotated or flipped group properly. However transformed nested SVGs are possible and should be used instead.


## Dependencies
This module requires svg.js >= v2.0.1
