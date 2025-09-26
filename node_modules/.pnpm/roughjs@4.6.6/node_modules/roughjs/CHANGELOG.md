# Change Log

All notable changes to this project will be documented in this file.

# [4.5.0] - 2021-05-09
* Better algorithm for nested and intersecting paths https://github.com/rough-stuff/rough/issues/183
* Improved zigzag fill for concave shapes and nested paths.
* Fixed "dots" fill when roughness was <1 Itw as creatings weird shapes https://github.com/rough-stuff/rough/issues/193
* Configure precision when rendering to canvas as well as SVG using `fixedDecimalPlaceDigits` property.
* Solid fill was broken for Arcs if arc angle was > 180 degrees
* Remove notch from ellipses when roughness = 0


# [4.4.0] - 2021-05-09

* Added `preserveVertices` option when drawing shapes. Especially useful in paths. When rendering a shape, the vertices or the end points of the shape are not randomized if this is set to TRUE. This allows connected segments to always be connected. 

## [4.3.0] - 2020-05-11

* Added options to draw dashed lines - *strokeLineDash, strokeLineDashOffset, fillLineDash, fillLineDashOffset*
* Added option to disable double stroking effect - *disableMultiStroke, disableMultiStrokeFill*.
* Bug fixes to solid fill in SVG which was not obeying evenodd rules by default

## [4.1.0] - 2020-01-13

* Added ability to **fill** non-svg curves

## [4.0.0] - 2020-01-13

* Add optional seeding for randomness to ensure shapes generated with same arguments result in same vectors
* Implemented a new algorithm for hachure generation based on scanlines. Smaller in code size, and about 20% faster
* Algorithm update - adjust shape randomness and curve-step-counts based on the size of the shape
* Removed async/worker builds - can be achieved in the app level, so no need to be in the lib
* Support no-stroke sketching. `stroke: "none"` will not generate outline vectors anymore
* Removed `sunburst` fill style - it had a lot of corner cases where it did not work, and not very popular.

## [3.1.0] - 2019-03-14

* Added three new fill styles: **sunburst**, **dashed**, and **zigzag-line**
* Added three new properties in *Options* to support these fill styles:
* **dashOffset** - length of dashes in dashed fill
* **dashGap** - length of gap between dashes in dashed fill
* **zigzagOffset** - width of zigzag triangle when using zigzag-lines fill



