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

- points: Points should be drawn (default `true`)
- classRect: Classname of the rect from the bounding Box (default `svg_select_boundingRect`)
- classPoints: Classname/Prefix of the Points (default `svg_select_points`)
- radius: Radius of the points (default `7`)
- rotationPoint: Draws the point for doing rotation (default `true`)
- deepSelect: Only for polygon/polyline/line. Selects the points itself (default `false`)