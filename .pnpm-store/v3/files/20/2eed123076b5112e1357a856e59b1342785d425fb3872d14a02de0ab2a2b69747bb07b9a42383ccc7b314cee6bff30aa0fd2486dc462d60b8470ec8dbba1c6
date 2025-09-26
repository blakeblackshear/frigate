# Change Log

All notable changes to this project will be documented in this file.

The document follows the conventions described in [“Keep a CHANGELOG”](http://keepachangelog.com).


====


## UNRELEASED 3.0.0

### Added
- added `'random'` option and `randomize()` method to `SVG.Color` -> __TODO!__
- added `precision()` method to round numeric element attributes -> __TODO!__
- added specs for `SVG.FX` -> __TODO!__

### Changed
- made transform-methods relative as default (breaking change)
- changed SVG() to use querySelector instead of getElementById (breaking change) -> __TODO!__
- made `parents()` method on `SVG.Element` return an instance of SVG.Set (breaking change) -> __TODO!__
- replaced static reference to `masker` in `SVG.Mask` with the `masker()` method (breaking change) -> __TODO!__
- replaced static reference to `clipper` in `SVG.ClipPath` with the `clipper()` method (breaking change) -> __TODO!__
- replaced static reference to `targets` in `SVG.Mask` and `SVG.ClipPath` with the `targets()` method (breaking change) -> __TODO!__
- moved all regexes to `SVG.regex` (in color, element, pointarray, style, transform and viewbox) -> __TODO!__

### Fixed
- fixed a bug in clipping and masking where empty nodes persists after removal -> __TODO!__
- fixed a bug in IE11 with `mouseenter` and `mouseleave` -> __TODO!__


## [2.7.1] - 2018-11-30

### Fixed
- CustomEvent-polyfill was not used (needed in IE) (#938)

## [2.7.0] - 2018-11-13

### Fixed
- fixed calling `parent()` on `documentFragment`s children (#927)
- parser is not focusable anymore (#908)
- `SVG.Element.click(null)` correctly unbinds the event (#878)
- fix memory leak (#905)

### Added
- `SVG.Set` now accepts another Set as input (#893)
- `on()/off()` accepts multiple event names as input (backport from 3.0)


## [2.6.6] - 2018-08-30

### Added
- added global reference to support 'window' in bundlers (#767)


## [2.6.5] - 2018-05-26

### Fixed
- fixed `element.parent()` which sometimes failed when used on detached documents (#759)
- fixed `SVG.Text.y()` which didnt work correctly with `SVG.Number` (#778)
- fixed `SVG.Doc.clone()` which throwed an error (#782)
- fixed `SVG.Mask.clone()` which throwed an error (#782)
- fixed `SVG.PointArray` having a reference to outside array in some cases (#803)
- fixed `reference()` which failed when trying to use a reference which does not exist in the attribuets (#840)
- fixed `animate().attr()` method which doenst work for `d` attribute of paths (#847)
- fixed problems with `CustomEvent` polyfill in IE11 (#852)

### Added
- added possibility to pass an array of point objects to SVG.PointArray (#803)

## [2.6.4] - 2018-02-07

### Fixed
- fixed memory leak when creating images (#805)

## [2.6.3] - 2017-07-21

### Fixed
- fixed error in parent method when hitting document node (#720)


## [2.6.2] - 2017-06-05

### Added
- added `width()` and `height()` methods to `SVG.FX`
- added the intended functionality to call animate functions with multiple parameter (#671)

### Changed
- updated Jasmine from 2.5.2 to 2.6.0
- removed the typeof check in the initialisation of SVG.Matrix

### Fixed
- fixed `SVG.FX.once` so that it add its callback on the last situation instead of the current one
- fixed `SVG.FX.step` so that the animation doesn't stop if an afterAll callback call animate (#677)


## [2.6.1] - 2017-04-25

### Fixed
- fixed a bug in path parser which made it stop parsing when hitting z command (#665)

## [2.6.0] - 2017-04-21

### Added
- added `options` object to `SVG.on()` and `el.on()` (#661)

### Changed
- back to sloppy mode because of problems with plugins (#660)


## [2.5.3] - 2017-04-15

### Added
- added gitter badge in readme


### Fixed
- fixed svg.js.d.ts (#644 #648)
- fixed bug in `el.flip()` which causes an error when calling flip without any argument

### Removed
- component.json (#652)


## [2.5.2] - 2017-04-11

### Changed
- SVG.js is now running in strict mode

### Fixed
- `clear()` does not remove the parser in svg documents anymore
- `len` not declared in FX module, making it a global variable (9737e8a)
- `bbox` not declared in SVG.Box.transform in the Box module (131df0f)
- `namespace` not declared in the Event module (e89c97e)


## [2.5.1] - 2017-03-27

### Changed
- make svgjs ready to be used on the server

### Fixed
- fixed `SVG.PathArray.parse` that did not correctly parsed flat arrays
- prevented unnecessary parsing of point or path strings


## [2.5.0] - 2017-03-10

### Added
- added a plot and array method to `SVG.TextPath` (#582)
- added `clone()` method to `SVG.Array/PointArray/PathArray` (#590)
- added `font()` method to `SVG.Tspan`
- added `SVG.Box()`
- added `transform()` method to boxes
- added `event()` to `SVG.Element` to retrieve the event that was fired last on the element (#550)

### Changed
- changed CHANGELOG to follow the conventions described in [“Keep a CHANGELOG”](http://keepachangelog.com) (#578)
- make the method plot a getter when no parameter is passed for `SVG.Polyline`,`SVG.Polygon`, `SVG.Line`, `SVG.Path` (related #547)
- allow `SVG.PointArray` to be passed flat array
- change the regexp `SVG.PointArray` use to parse string to allow more flexibility in the way spaces and commas can be used
- allow `plot` to be called with 4 parameters when animating an `SVG.Line`
- relative value for `SVG.Number` are now calculated in its `morph` method (related #547)
- clean up the implementation of the `initAnimation` method of the FX module (#547, #552, #584)
- deprecated `.tbox()`. `.tbox()` now map to `.rbox()`. If you are using `.tbox()`, you can substitute it with `.rbox()` (#594, #602)
- all boxes now accept 4 values or an object on creation
- `el.rbox()` now always returns the right boxes in screen coordinates and has an additional paramater to transform the box into other coordinate systems
- `font()` method can now be used like `attr()` method (#620)
- events are now cancelable by default (#550)

### Fixed
- fixed a bug in the plain morphing part of `SVG.MorphObj` that is in the FX module
- fixed bug which produces an error when removing an event from a node which was formerly removed with a global `off()` (#518)
- fixed a bug in `size()` for poly elements when their height/width is zero (#505)
- viewbox now also accepts strings and arrays as constructor arguments
- `SVG.Array` now accepts a comma seperated string and returns array of numbers instead of strings
- `SVG.Matrix` now accepts an array as input
- `SVG.Element.matrix()` now accepts also 6 values
- `dx()/dy()` now accepts percentage values, too but only if the value on the element is already percentage
- `flip()` now flips on both axis when no parameter is passed
- fixed bug with `documentElement.contains()` in IE
- fixed offset produced by svg parser (#553)
- fixed a bug with clone which didnt copy over dom data (#621)


## [2.4.0] - 2017-01-14

### Added
- added support for basic path animations (#561)


## [2.3.7] - 2017-01-14

### Added
- added code coverage https://coveralls.io/github/svgdotjs/svg.js (3e614d4)
- added `npm run test:quick` which aim at being fast rather than correct - great for git hooks (981ce24)

### Changed
- moved project to [svgdotjs](https://github.com/svgdotjs)
- made matrixify work with transformation chain separated by commas (#543)
- updated dev dependencies; request and gulp-chmod - `npm run build` now requires nodejs 4.x+

### Fixed
- fixed `SVG.Matrix.skew()` (#545)
- fixed broken animations, if using polyfills for es6/7 proposals (#504)
- fixed and improved `SVG.FX.dequeue()` (#546)
- fixed an error in `SVG.FX.step`, if custom properties is added to `Array.prototype` (#549)


## [2.3.6] - 2016-10-21

### Changed
- make SVG.FX.loop modify the last situation instead of the current one (#532)

### Fixed
- fixed leading and trailing space in SVG.PointArray would return NaN for some points (695f26a) (#529)
- fixed test of `SVG.FX.afterAll` (#534)
- fixed `SVG.FX.speed()` (#536)


## [2.3.5] - 2016-10-13

### Added
- added automated unit tests via [Travis](https://travis-ci.org/svgdotjs/svg.js) (#527)
- added `npm run build` to build a new version of SVG.js without requiring gulp to be globally installed

### Changed
- calling `fill()`, `stroke()` without an argument is now a nop
- Polygon now accepts comma less points to achieve parity with Adobe Illustrator (#529)
- updated dependencies


## [2.3.4] - 2016-08-04

### Changed
- reworked parent module for speed improvemenents
- reworked `filterSVGElements` utility to use a for loop instead of the native filter function


## [2.3.3] - 2016-08-02

### Added
- add error callback on image loading (#508)

### Fixed
- fixed bug when getting bbox of text elements which are not in the dom (#514)
- fixed bug when getting bbox of element which is hidden with css (#516)


## [2.3.2] - 2016-06-21

### Added
- added specs for `SVG.ViewBox`
- added `parent` parameter for `clone()`
- added spec for mentioned issue

### Fixed
- fixed string parsing in viewbox (#483)
- fixed bbox when element is not in the dom (#480)
- fixed line constructor which doesn't work with Array as input (#487)
- fixed problem in IE with `document.contains` (#490) related to (#480)
- fixed `undo` when undoing transformations (#494)


## [2.3.1] - 2016-05-05

### Added
- added typings for svg.js (#470)

### Fixed
- fixed `SVG.morph()` (#473)
- fixed parser error (#471)
- fixed bug in `SVG.Color` with new fx
- fixed `radius()` for circles when animating and other related code (#477)
- fixed bug where `stop(true)` throws an error when element is not animated (#475)
- fixed bug in `add()` when altering svgs with whitespaces
- fixed bug in `SVG.Doc().create` where size was set to 100% even if size was already specified
- fixed bug in `parse()` from `SVG.PathArray` which does not correctly handled `S` and `T` (#485)


## [2.3.0] - 2016-03-30

### Added
- added `SVG.Point` which serves as Wrapper to the native `SVGPoint` (#437)
- added `element.point(x,y)` which transforms a point from screen coordinates to the elements space (#403)
- added `element.is()` which helps to check for the object instance faster (instanceof check)
- added more fx specs

### Changed
- textpath now is a parent element, the lines method of text will return the tspans inside the textpath (#450)
- fx module rewritten to support animation chaining and several other stuff (see docs)

### Fixed
- fixed `svgjs:data` attribute which was not set properly in all browsers (#428)
- fixed `isNumber` and `numberAndUnit` regex (#405)
- fixed error where a parent node is not found when loading an image but the canvas was cleared (#447)
- fixed absolute transformation animations (not perfect but better)
- fixed event listeners which didnt work correctly when identic funtions used


## [2.2.5] - 2015-12-29

### Added
- added check for existence of node (#431)

### Changed
- `group.move()` now allows string numbers as input (#433)
- `matrixify()` will not apply the calculated matrix to the node anymore


## [2.2.4] - 2015-12-12

### Fixed
- fixed `transform()` which returns the matrix values (a-f) now, too (#423)
- double newlines (\n\n) are correctly handled as blank line from `text()`
- fixed use of scrollX vs pageXOffset in `rbox()` (#425)
- fixed target array in mask and clip which was removed instead of reinitialized (#429)


## [2.2.3] - 2015-11-30

### Fixed
- fixed null check in image (see 2.2.2)
- fixed bug related to the new path parser (see 2.2.2)
- fixed amd loader (#412)


## [2.2.2] - 2015-11-28

### Added
- added null check in image onload callback (#415)

### Changed
- documentation rework (#407) [thanks @snowyplover]

### Fixed
- fixed leading point bug in path parsing (#416)


## [2.2.1] - 2015-11-18

### Added
- added workaround for `SvgPathSeg` which is removed in Chrome 48 (#409)
- added `gbox()` to group to get bbox with translation included (#405)

### Fixed
- fixed dom data which was not cleaned up properly (#398)


## [2.2.0] - 2015-11-06

### Added
- added `ungroup()/flatten()` (#238), `toParent()` and `toDoc()`
- added UMD-Wrapper with possibility to pass custom window object (#352)
- added `morph()` method for paths via plugin [svg.pathmorphing.js](https://github.com/Fuzzyma/svg.pathmorphing.js)
- added support for css selectors within the `parent()` method
- added `parents()` method to get an array of all parenting elements

### Changed
- svgjs now saves crucial data in the dom before export and restores them when element is adopted

### Fixed
- fixed pattern and gradient animation (#385)
- fixed mask animation in Firefox (#287)
- fixed return value of `text()` after import/clone (#393)


## [2.1.1] - 2015-10-03

### Added
- added custom context binding to event callback (default is the element the event is bound to)


## [2.1.0] - 2015-09-20

### Added
- added transform to pattern and gradients (#383)

### Fixed
- fixed clone of textnodes (#369)
- fixed transformlists in IE (#372)
- fixed typo that leads to broken gradients (#370)
- fixed animate radius for circles (#367)


## [2.0.2] - 2015-06-22

### Fixed
- Fixed zoom consideration in circle and ellipse


## [2.0.1] - 2015-06-21

### Added
- added possibility to remove all events from a certain namespace

### Fixed
- fixed bug with `doc()` which always should return root svg
- fixed bug in `SVG.FX` when animating with `plot()`

### Removed
- removed target reference from use which caused bugs in `dmove()` and `use()` with external file
- removed scale consideration in `move()` duo to incompatibilities with other move-functions e.g. in `SVG.PointArray`


## [2.0.0] - 2015-06-11

### Added
- implemented an SVG adoption system to be able to manipulate existing SVG's not created with svg.js
- added polyfill for IE9 and IE10 custom events [thanks @Fuzzyma]
- added DOM query selector with the `select()` method globally or on parent elements
- added the intentionally neglected `SVG.Circle` element
- added `rx()` and `ry()` to `SVG.Rect`, `SVG.Circle`, `SVG.Ellispe` and `SVG.FX`
- added support to clone manually built text elements
- added `svg.wiml.js` plugin to plugins list
- added `ctm()` method to for matrix-centric transformations
- added `morph()` method to `SVG.Matrix`
- added support for new matrix system to `SVG.FX`
- added `native()` method to elements and matrix to get to the native api
- added `untransform()` method to remove all transformations
- added raw svg import functionality with the `svg()` method
- added coding style description to README
- added reverse functionality for animations
- documented the `situation` object in `SVG.FX`
- added distinction between relative and absolute matrix transformations
- implemented the `element()` method using the `SVG.Bare` class to create elements that are not described by SVG.js
- added `w` and `h` properties as shorthand for `width` and `height` to `SVG.BBox`
- added `SVG.TBox` to get a bounding box that is affected by transformation values
- added event-based or complete detaching of event listeners in `off()` method

### Changed
- changed `parent` reference on elements to `parent()` method
- using `CustomEvent` instead of `Event` to be able to fire events with a `detail` object [thanks @Fuzzyma]
- renamed `SVG.TSpan` class to `SVG.Tspan` to play nice with the adoption system
- completely reworked `clone()` method to use the adoption system
- completely reworked transformations to be chainable and more true to their nature
- changed `lines` reference to `lines()` on `SVG.Text`
- changed `track` reference to `track()` on `SVG.Text`
- changed `textPath` reference to `textPath()` on `SVG.Text`
- changed `array` reference to `array()` method on `SVG.Polyline`, `SVG.Polygon` and `SVG.Path`
- reworked sup-pixel offset implementation to be more compact
- switched from Ruby's `rake` to Node's `gulp` for building [thanks to Alex Ewerlöf]
- changed `to()` method to `at()` method in `SVG.FX`
- renamed `SVG.SetFX` to `SVG.FX.Set`
- reworked `SVG.Number` to return new instances with calculations rather than itself
- reworked animatable matrix rotations
- removed `SVG.Symbol` but kept the `symbol()` method using the new `element()` method

### Fixed
- fixed bug in `radius()` method when `y` value equals `0`
- fixed a bug where events are not detached properly


## [1.0.0-rc.9] - 2014-06-17

### Added
- added `SVG.Marker`
- added `SVG.Symbol`
- added `first()` and `last()` methods to `SVG.Set`
- added `length()` method to `SVG.Text` and `SVG.TSpan` to calculate total text length
- added `reference()` method to get referenced elements from a given attribute value

### Changed
- `SVG.get()` will now also fetch elements with a `xlink:href="#elementId"` or `url(#elementId)` value given

### Fixed
- fixed infinite loop in viewbox when element has a percentage width / height [thanks @shabegger]


## [1.0.0-rc.8] - 2014-06-12

### Fixed
- fixed bug in `SVG.off`
- fixed offset by window scroll position in `rbox()` [thanks @bryhoyt]


## [1.0.0-rc.7] - 2014-06-11

### Added
- added `classes()`, `hasClass()`, `addClass()`, `removeClass()` and `toggleClass()` [thanks @pklingem]

### Changed
- binding events listeners to svg.js instance
- calling `after()` when calling `stop(true)` (fulfill flag) [thanks @vird]
- text element fires `rebuild` event whenever the `rebuild()` method is called

### Fixed
- fixed a bug where `Element#style()` would not save empty values in IE11 [thanks @Shtong]
- fixed `SVG is not defined error` [thanks @anvaka]
- fixed a bug in `move()`on text elements with a string based value
- fix for `text()` method on text element when acting as getter [thanks @Lochemage]
- fix in `style()` method with a css string [thanks @TobiasHeckel]


## [1.0.0-rc.6] - 2014-03-03

### Added
- added `leading()` method to `SVG.FX`
- added `reverse()` method to `SVG.Array` (and thereby also to `SVG.PointArray` and `SVG.PathArray`)
- added `fulfill` option to `stop()` method in `SVG.FX` to finalise animations
- added more output values to `bbox()` and `rbox()` methods

### Changed
- fine-tuned text element positioning
- calling `at()` method directly on morphable svg.js instances in `SVG.FX` module
- moved most `_private` methods to local named functions
- moved helpers to a separate file

### Fixed
- fixed a bug in text `dy()` method

### Removed
- removed internal representation for `style`


## [1.0.0-rc.5] - 2014-02-14

### Added
- added `plain()` method to `SVG.Text` element to add plain text content, without tspans
- added `plain()` method to parent elements to create a text element without tspans
- added `build()` to enable/disable build mode

### Changed
- updated `SVG.TSpan` to accept nested tspan elements, not unlike the `text()` method in `SVG.Text`
- removed the `relative()` method in favour of `dx()`, `dy()` and `dmove()`
- switched form objects to arrays in `SVG.PathArray` for compatibility with other libraries and better performance on parsing and rendering (up-to 48% faster than 1.0.0-rc.4)
- refined docs on element-specific methods and `SVG.PathArray` structure
- reworked `leading()` implementation to be more font-size "aware"
- refactored the `attr` method on `SVG.Element`
- applied Helvetica as default font
- building `SVG.FX` class with `SVG.invent()` function

### Removed
- removed verbose style application to tspans


## [1.0.0-rc.4] - 2014-02-04

### Added
- automatic pattern creation by passing an image url or instance as `fill` attribute on elements
- added `loaded()` method to image tag
- added `pointAt()` method to `SVG.Path`, wrapping the native `getPointAtLength()`

### Changed
- switched to `MAJOR`.`MINOR`.`PATCH` versioning format to play nice with package managers
- made svg.pattern.js part of the core library
- moved `length()` method to sugar module

### Fixed
- fix in `animate('=').to()`
- fix for arcs in patharray `toString()` method [thanks @dotnetCarpenter]


## [v1.0rc3] - 2014-02-03

### Added
- added the `SVG.invent` function to ease invention of new elements
- added second values for `animate('2s')`
- added `length()` mehtod to path, wrapping the native `getTotalLength()`

### Changed
- using `SVG.invent` to generate core shapes as well for leaner code

### Fixed
- fix for html-less documents
- fix for arcs in patharray `toString()` method


## [v1.0rc2] - 2014-02-01

### Added
- added `index()` method to `SVG.Parent` and `SVG.Set`
- added `morph()` and `at()` methods to `SVG.Number` for unit morphing

### Changed
- modified `cx()` and `cy()` methods on elements with native `x`, `y`, `width` and `height` attributes for better performance


## [v1.0rc1] - 2014-01-31

### Added
- added `SVG.PathArray` for real path transformations
- added `bbox()` method to `SVG.Set`
- added `relative()` method for moves relative to the current position
- added `morph()` and `at()` methods to `SVG.Color` for color morphing

### Changed
- enabled proportional resizing on `size()` method with `null` for either `width` or `height` values
- moved data module to separate file
- `data()` method now accepts object for for multiple key / value assignments

### Removed
- removed `unbiased` system for paths


## [v0.38] - 2014-01-28

### Added
- added `loop()` method to `SVG.FX`

### Changed
- switched from `setInterval` to `requestAnimFrame` for animations


## [v0.37] - 2014-01-26

### Added
- added `get()` to `SVG.Set`

### Changed
- moved `SVG.PointArray` to a separate file


## [v0.36] - 2014-01-25

### Added
- added `linkTo()`, `addTo()` and `putIn()` methods on `SVG.Element`

### Changed
- provided more detailed documentation on parent elements

### Fixed


## [v0.35] - 2014-01-23

### Added
- added `SVG.A` element with the `link()`


## [v0.34] - 2014-01-23

### Added
- added `pause()` and `play()` to `SVG.FX`

### Changed
- storing animation values in `situation` object


## [v0.33] - 2014-01-22

### Added
- added `has()` method to `SVG.Set`
- added `width()` and `height()` as setter and getter methods on all shapes
- added `replace()` method to elements
- added `radius()` method to `SVG.Rect` and `SVG.Ellipse`
- added reference to parent node in defs

### Changed
- moved sub-pixel offset fix to be an optional method (e.g. `SVG('drawing').fixSubPixelOffset()`)
- merged plotable.js and path.js


## [v0.32]

### Added
- added library to [cdnjs](http://cdnjs.com)


<!-- Headings above link to the releases listed here -->
[2.7.1]: https://github.com/svgdotjs/svg.js/releases/tag/2.7.1
[2.7.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.7.0
[2.6.6]: https://github.com/svgdotjs/svg.js/releases/tag/2.6.6
[2.6.5]: https://github.com/svgdotjs/svg.js/releases/tag/2.6.5
[2.6.4]: https://github.com/svgdotjs/svg.js/releases/tag/2.6.4
[2.6.3]: https://github.com/svgdotjs/svg.js/releases/tag/2.6.3
[2.6.2]: https://github.com/svgdotjs/svg.js/releases/tag/2.6.2
[2.6.1]: https://github.com/svgdotjs/svg.js/releases/tag/2.6.1
[2.6.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.6.0

[2.5.3]: https://github.com/svgdotjs/svg.js/releases/tag/2.5.3
[2.5.2]: https://github.com/svgdotjs/svg.js/releases/tag/2.5.2
[2.5.1]: https://github.com/svgdotjs/svg.js/releases/tag/2.5.1
[2.5.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.5.0

[2.4.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.4.0

[2.3.7]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.7
[2.3.6]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.6
[2.3.5]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.5
[2.3.4]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.4
[2.3.3]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.3
[2.3.2]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.2
[2.3.1]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.1
[2.3.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.3.0

[2.2.5]: https://github.com/svgdotjs/svg.js/releases/tag/2.2.5
[2.2.4]: https://github.com/svgdotjs/svg.js/releases/tag/2.2.4
[2.2.3]: https://github.com/svgdotjs/svg.js/releases/tag/2.2.3
[2.2.2]: https://github.com/svgdotjs/svg.js/releases/tag/2.2.2
[2.2.1]: https://github.com/svgdotjs/svg.js/releases/tag/2.2.1
[2.2.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.2.0

[2.1.1]: https://github.com/svgdotjs/svg.js/releases/tag/2.1.1
[2.1.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.1.0

[2.0.2]: https://github.com/svgdotjs/svg.js/releases/tag/2.0.2
[2.0.1]: https://github.com/svgdotjs/svg.js/releases/tag/2.0.1
[2.0.0]: https://github.com/svgdotjs/svg.js/releases/tag/2.0.0

[1.0.0-rc.9]: https://github.com/svgdotjs/svg.js/releases/tag/1.0.0-rc.9
[1.0.0-rc.8]: https://github.com/svgdotjs/svg.js/releases/tag/1.0.0-rc.8
[1.0.0-rc.7]: https://github.com/svgdotjs/svg.js/releases/tag/1.0.0-rc.7
[1.0.0-rc.6]: https://github.com/svgdotjs/svg.js/releases/tag/1.0.0-rc.6
[1.0.0-rc.5]: https://github.com/svgdotjs/svg.js/releases/tag/1.0.0-rc.5
[1.0.0-rc.4]: https://github.com/svgdotjs/svg.js/releases/tag/1.0.0-rc.4
[v1.0rc3]: https://github.com/svgdotjs/svg.js/releases/tag/1.0rc3
[v1.0rc2]: https://github.com/svgdotjs/svg.js/releases/tag/1.0rc2
[v1.0rc1]: https://github.com/svgdotjs/svg.js/releases/tag/1.0rc1

[v0.38]: https://github.com/svgdotjs/svg.js/releases/tag/0.38
[v0.37]: https://github.com/svgdotjs/svg.js/releases/tag/0.37
[v0.36]: https://github.com/svgdotjs/svg.js/releases/tag/0.36
[v0.35]: https://github.com/svgdotjs/svg.js/releases/tag/0.35
[v0.34]: https://github.com/svgdotjs/svg.js/releases/tag/0.34
[v0.33]: https://github.com/svgdotjs/svg.js/releases/tag/0.33
[v0.32]: https://github.com/svgdotjs/svg.js/releases/tag/0.32
