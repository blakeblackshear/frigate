# d3-chord

Visualize relationships or network flow with an aesthetically-pleasing circular layout.

[<img alt="Chord Diagram" src="https://raw.githubusercontent.com/d3/d3-chord/master/img/chord.png" width="480" height="480">](https://observablehq.com/@d3/chord-diagram)

## Installing

If you use npm, `npm install d3-chord`. You can also download the [latest release on GitHub](https://github.com/d3/d3-chord/releases/latest). For vanilla HTML in modern browsers, import d3-chord from Skypack:

```html
<script type="module">

import {chord} from "https://cdn.skypack.dev/d3-chord@3";

const c = chord();

</script>
```

For legacy environments, you can load d3-chord’s UMD bundle from an npm-based CDN such as jsDelivr; a `d3` global is exported:

```html
<script src="https://cdn.jsdelivr.net/npm/d3-path@3"></script>
<script src="https://cdn.jsdelivr.net/npm/d3-chord@3"></script>
<script>

const chord = d3.chord();

</script>
```

## API Reference

<a href="#chord" name="chord">#</a> d3.<b>chord</b>() · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js)

Constructs a new chord layout with the default settings.

<a href="#_chord" name="_chord">#</a> <i>chord</i>(<i>matrix</i>) · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js)

Computes the chord layout for the specified square *matrix* of size *n*×*n*, where the *matrix* represents the directed flow amongst a network (a complete digraph) of *n* nodes. The given *matrix* must be an array of length *n*, where each element *matrix*[*i*] is an array of *n* numbers, where each *matrix*[*i*][*j*] represents the flow from the *i*th node in the network to the *j*th node. Each number *matrix*[*i*][*j*] must be nonnegative, though it can be zero if there is no flow from node *i* to node *j*. From the [Circos tableviewer example](http://mkweb.bcgsc.ca/circos/guide/tables/):

```js
const matrix = [
  [11975,  5871, 8916, 2868],
  [ 1951, 10048, 2060, 6171],
  [ 8010, 16145, 8090, 8045],
  [ 1013,   990,  940, 6907]
];
```

The return value of *chord*(*matrix*) is an array of *chords*, where each chord represents the combined bidirectional flow between two nodes *i* and *j* (where *i* may be equal to *j*) and is an object with the following properties:

* `source` - the source subgroup
* `target` - the target subgroup

Each source and target subgroup is also an object with the following properties:

* `startAngle` - the start angle in radians
* `endAngle` - the end angle in radians
* `value` - the flow value *matrix*[*i*][*j*]
* `index` - the node index *i*

The chords are typically passed to [d3.ribbon](#ribbon) to display the network relationships. The returned array includes only chord objects for which the value *matrix*[*i*][*j*] or *matrix*[*j*][*i*] is non-zero. Furthermore, the returned array only contains unique chords: a given chord *ij* represents the bidirectional flow from *i* to *j* *and* from *j* to *i*, and does not contain a duplicate chord *ji*; *i* and *j* are chosen such that the chord’s source always represents the larger of *matrix*[*i*][*j*] and *matrix*[*j*][*i*].

The *chords* array also defines a secondary array of length *n*, *chords*.groups, where each group represents the combined outflow for node *i*, corresponding to the elements *matrix*[*i*][0 … *n* - 1], and is an object with the following properties:

* `startAngle` - the start angle in radians
* `endAngle` - the end angle in radians
* `value` - the total outgoing flow value for node *i*
* `index` - the node index *i*

The groups are typically passed to [d3.arc](https://github.com/d3/d3-shape#arc) to produce a donut chart around the circumference of the chord layout.

<a href="#chord_padAngle" name="chord_padAngle">#</a> <i>chord</i>.<b>padAngle</b>([<i>angle</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js)

If *angle* is specified, sets the pad angle between adjacent groups to the specified number in radians and returns this chord layout. If *angle* is not specified, returns the current pad angle, which defaults to zero.

<a href="#chord_sortGroups" name="chord_sortGroups">#</a> <i>chord</i>.<b>sortGroups</b>([<i>compare</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js)

If *compare* is specified, sets the group comparator to the specified function or null and returns this chord layout. If *compare* is not specified, returns the current group comparator, which defaults to null. If the group comparator is non-null, it is used to sort the groups by their total outflow. See also [d3.ascending](https://github.com/d3/d3-array/blob/master/README.md#ascending) and [d3.descending](https://github.com/d3/d3-array/blob/master/README.md#descending).

<a href="#chord_sortSubgroups" name="chord_sortSubgroups">#</a> <i>chord</i>.<b>sortSubgroups</b>([<i>compare</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js)

If *compare* is specified, sets the subgroup comparator to the specified function or null and returns this chord layout. If *compare* is not specified, returns the current subgroup comparator, which defaults to null. If the subgroup comparator is non-null, it is used to sort the subgroups corresponding to *matrix*[*i*][0 … *n* - 1] for a given group *i* by their total outflow. See also [d3.ascending](https://github.com/d3/d3-array/blob/master/README.md#ascending) and [d3.descending](https://github.com/d3/d3-array/blob/master/README.md#descending).

<a href="#chord_sortChords" name="chord_sortChords">#</a> <i>chord</i>.<b>sortChords</b>([<i>compare</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js)

If *compare* is specified, sets the chord comparator to the specified function or null and returns this chord layout. If *compare* is not specified, returns the current chord comparator, which defaults to null. If the chord comparator is non-null, it is used to sort the [chords](#_chord) by their combined flow; this only affects the *z*-order of the chords. See also [d3.ascending](https://github.com/d3/d3-array/blob/master/README.md#ascending) and [d3.descending](https://github.com/d3/d3-array/blob/master/README.md#descending).

<a href="#chordDirected" name="chordDirected">#</a> d3.<b>chordDirected</b>() · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js), [Examples](https://observablehq.com/@d3/directed-chord-diagram)

A chord layout for directional flows. The chord from *i* to *j* is generated from the value in *matrix*[*i*][*j*] only.

<a href="#chordTranspose" name="chordTranspose">#</a> d3.<b>chordTranspose</b>() · [Source](https://github.com/d3/d3-chord/blob/master/src/chord.js)

A transposed chord layout. Useful to highlight outgoing (rather than incoming) flows.

<a href="#ribbon" name="ribbon">#</a> d3.<b>ribbon</b>() · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

Creates a new ribbon generator with the default settings.

<a href="#_ribbon" name="_ribbon">#</a> <i>ribbon</i>(<i>arguments…</i>) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

Generates a ribbon for the given *arguments*. The *arguments* are arbitrary; they are simply propagated to the ribbon generator’s accessor functions along with the `this` object. For example, with the default settings, a [chord object](#_chord) expected:

```js
const ribbon = d3.ribbon();

ribbon({
  source: {startAngle: 0.7524114, endAngle: 1.1212972, radius: 240},
  target: {startAngle: 1.8617078, endAngle: 1.9842927, radius: 240}
}); // "M164.0162810494058,-175.21032946354026A240,240,0,0,1,216.1595644740915,-104.28347273835429Q0,0,229.9158815306728,68.8381247563705A240,240,0,0,1,219.77316791012538,96.43523560788266Q0,0,164.0162810494058,-175.21032946354026Z"
```

Or equivalently if the radius is instead defined as a constant:

```js
const ribbon = d3.ribbon()
    .radius(240);

ribbon({
  source: {startAngle: 0.7524114, endAngle: 1.1212972},
  target: {startAngle: 1.8617078, endAngle: 1.9842927}
}); // "M164.0162810494058,-175.21032946354026A240,240,0,0,1,216.1595644740915,-104.28347273835429Q0,0,229.9158815306728,68.8381247563705A240,240,0,0,1,219.77316791012538,96.43523560788266Q0,0,164.0162810494058,-175.21032946354026Z"
```

If the ribbon generator has a context, then the ribbon is rendered to this context as a sequence of path method calls and this function returns void. Otherwise, a path data string is returned.

<a href="#ribbon_source" name="ribbon_source">#</a> <i>ribbon</i>.<b>source</b>([<i>source</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *source* is specified, sets the source accessor to the specified function and returns this ribbon generator. If *source* is not specified, returns the current source accessor, which defaults to:

```js
function source(d) {
  return d.source;
}
```

<a href="#ribbon_target" name="ribbon_target">#</a> <i>ribbon</i>.<b>target</b>([<i>target</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *target* is specified, sets the target accessor to the specified function and returns this ribbon generator. If *target* is not specified, returns the current target accessor, which defaults to:

```js
function target(d) {
  return d.target;
}
```

<a href="#ribbon_radius" name="ribbon_radius">#</a> <i>ribbon</i>.<b>radius</b>([<i>radius</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *radius* is specified, sets the source and target radius accessor to the specified function and returns this ribbon generator. If *radius* is not specified, returns the current source radius accessor, which defaults to:

```js
function radius(d) {
  return d.radius;
}
```

<a href="#ribbon_sourceRadius" name="ribbon_sourceRadius">#</a> <i>ribbon</i>.<b>sourceRadius</b>([<i>radius</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *radius* is specified, sets the source radius accessor to the specified function and returns this ribbon generator. If *radius* is not specified, returns the current source radius accessor, which defaults to:

```js
function radius(d) {
  return d.radius;
}
```

<a href="#ribbon_targetRadius" name="ribbon_targetRadius">#</a> <i>ribbon</i>.<b>targetRadius</b>([<i>radius</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *radius* is specified, sets the target radius accessor to the specified function and returns this ribbon generator. If *radius* is not specified, returns the current target radius accessor, which defaults to:

```js
function radius(d) {
  return d.radius;
}
```

By convention, the target radius in asymmetric chord diagrams is typically inset from the source radius, resulting in a gap between the end of the directed link and its associated group arc.

<a href="#ribbon_startAngle" name="ribbon_startAngle">#</a> <i>ribbon</i>.<b>startAngle</b>([<i>angle</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *angle* is specified, sets the start angle accessor to the specified function and returns this ribbon generator. If *angle* is not specified, returns the current start angle accessor, which defaults to:

```js
function startAngle(d) {
  return d.startAngle;
}
```

The *angle* is specified in radians, with 0 at -*y* (12 o’clock) and positive angles proceeding clockwise.

<a href="#ribbon_endAngle" name="ribbon_endAngle">#</a> <i>ribbon</i>.<b>endAngle</b>([<i>angle</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *angle* is specified, sets the end angle accessor to the specified function and returns this ribbon generator. If *angle* is not specified, returns the current end angle accessor, which defaults to:

```js
function endAngle(d) {
  return d.endAngle;
}
```

The *angle* is specified in radians, with 0 at -*y* (12 o’clock) and positive angles proceeding clockwise.

<a href="#ribbon_padAngle" name="ribbon_padAngle">#</a> <i>ribbon</i>.<b>padAngle</b>([<i>angle</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *angle* is specified, sets the pad angle accessor to the specified function and returns this ribbon generator. If *angle* is not specified, returns the current pad angle accessor, which defaults to:

```js
function padAngle() {
  return 0;
}
```

The pad angle specifies the angular gap between adjacent ribbons.

<a href="#ribbon_context" name="ribbon_context">#</a> <i>ribbon</i>.<b>context</b>([<i>context</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *context* is specified, sets the context and returns this ribbon generator. If *context* is not specified, returns the current context, which defaults to null. If the context is not null, then the [generated ribbon](#_ribbon) is rendered to this context as a sequence of [path method](http://www.w3.org/TR/2dcontext/#canvaspathmethods) calls. Otherwise, a [path data](http://www.w3.org/TR/SVG/paths.html#PathData) string representing the generated ribbon is returned. See also [d3-path](https://github.com/d3/d3-path).

<a href="#ribbonArrow" name="ribbonArrow">#</a> d3.<b>ribbonArrow</b>() · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

Creates a new arrow ribbon generator with the default settings.

<a href="#ribbonArrow_headRadius" name="ribbonArrow_headRadius">#</a> <i>ribbonArrow</i>.<b>headRadius</b>([<i>radius</i>]) · [Source](https://github.com/d3/d3-chord/blob/master/src/ribbon.js)

If *radius* is specified, sets the arrowhead radius accessor to the specified function and returns this ribbon generator. If *radius* is not specified, returns the current arrowhead radius accessor, which defaults to:

```js
function headRadius() {
  return 10;
}
```
