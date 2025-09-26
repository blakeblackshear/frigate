svg.resize.js
=============

An extension of [svg.js](https://github.com/svgdotjs/svg.js) which allows to resize elements which are selected with [svg.select.js](https://github.com/svgdotjs/svg.select.js)

# Demo

For a demo see http://svgdotjs.github.io/svg.resize.js/

# Get Started

- Install `svg.resize.js` using bower:

		bower install svg.resize.js

- Include the script after svg.js and svg.select.js into your page

		<script src="svg.js"></script>
		<script src="svg.select.js"></script>
		<script src="svg.resize.js"></script>

- Select a rectangle and make it resizeable:

		<div id="myDrawing"></div>

		var drawing = new SVG('myDrawing').size(500, 500);
		drawing.rect(50,50).selectize().resize()

# Usage

Activate resizing

    var draw = SVG('drawing');
	var rect = draw.rect(100,100);
    rect.selectize().resize();

Deactivate resizing

	rect.resize('stop');

Keep element within constrained box

	var draw = SVG('drawing');
	var rect = draw.rect(100, 100);
	var opt = {
		constraint: {
			minX: 0,
			minY: 0,
			maxX: 200,
			maxY: 300
		}
	};
	rect.selectize().resize(opt)


# Options

- `snapToGrid`: Snaps the shape to a virtual grid while resizing (default `1`)
- `snapToAngle`: Snaps to an angle when rotating (default `0.1`)
- `constraint`: Keep element within constrained box (see usage above); The box snaps to the grid defined by `snapToGrid`.
- `saveAspectRatio`: Save aspect ratio of the element while resizing with left-top, left-bottom, right-top, right-bottom points.


# Events

- `resizing`: Fired when changes occur
- `resizedone`: Fired when resizing is done

# Known Issues

- resize nested svgs does not work
