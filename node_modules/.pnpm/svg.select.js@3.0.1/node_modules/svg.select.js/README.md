svg.select.js
=============

An extension of [svg.js](https://github.com/svgdotjs/svg.js) which allows to select elements with mouse

**Note:** Duo to naming conflicts the exported method was renamed from `select()` to `selectize()`.

# Demo

For a demo see http://svgdotjs.github.io/svg.select.js/

# Get Started

- Install `svg.select.js` using bower:

		bower install svg.select.js

- Include the script after svg.js into your page

		<script src="svg.js"></script>
		<script src="svg.select.js"></script>

- Select a rectangle using this simple piece of code:

		<div id="myDrawing"></div>

		var drawing = new SVG('myDrawing').size(500, 500);
		drawing.rect(50,50).selectize()

# Usage

Select

    var draw = SVG('drawing');
	var rect = draw.rect(100,100);
    rect.selectize();

	// or deepSelect
	rect.selectize({deepSelect:true});

Unselect

    rect.selectize(false);

	// or deepSelect
	rect.selectize(false, {deepSelect:true});

You can specify which points to be drawn (default all will be drawn)

The list can be an array of strings or a comma separated list / string, representing each position, in correspondence with the classes:

* `lt` - left top
* `rt` - right top
* `rb` - right bottom
* `lb` - left bottom
* `t` - top
* `r` - right
* `b` - bottom
* `l` - left

Example of drawing only `top` and `right` points:

    rect.selectize({
      points: ['t', 'r'] // or 't, r'
    })

There is also an extra option called `pointsExclude` which can be a list of points to be excluded from the `points` list.

So let's say that you need all the points except `top` and `right`:

    rect.selectize({
      pointsExclude: ['t', 'r'] // or 't, r'
    })

You can style the selection with the classes

- `svg_select_boundingRect`
- `svg_select_points`
- `svg_select_points_lt` - *left top*
- `svg_select_points_rt` - *right top*
- `svg_select_points_rb` - *right bottom*
- `svg_select_points_lb` - *left bottom*
- `svg_select_points_t`  - *top*
- `svg_select_points_r`  - *right*
- `svg_select_points_b`  - *bottom*
- `svg_select_points_l`  - *left*
- `svg_select_points_rot` - *rotation point*
- `svg_select_points_point` - *deepSelect points*


# Options

- points: Points should be drawn (default `['lt', 'rt', 'rb', 'lb', 't', 'r', 'b', 'l']`)
- pointsExclude: Same as points option, only thing that this excludes listed points, you can use (default `[]`)
- classRect: Classname of the rect from the bounding Box (default `svg_select_boundingRect`)
- classPoints: Classname/Prefix of the Points (default `svg_select_points`)
- pointSize: Size of the point. Radius for the `pointType: 'circle'` or size of a rect for `pointType: 'rect'` (default `7`)
- rotationPoint: Draws the point for doing rotation (default `true`)
- deepSelect: Only for polygon/polyline/line. Selects the points itself (default `false`)
- pointType: Type of a point, `circle` or `rect` or function (see functions for drawing [circle](src/svg.select.js#L188) or [rect](src/svg.select.js#L194) points) (default `circle`)