# d3-sankey

Sankey diagrams visualize the directed flow between nodes in an acyclic network. For example, this diagram shows a possible scenario of UK energy production and consumption in 2050:

[<img alt="Sankey diagram" src="https://raw.githubusercontent.com/d3/d3-sankey/master/img/energy.png" width="960">](https://observablehq.com/@d3/sankey-diagram)

Source: Department of Energy & Climate Change, Tom Counsell.

**For an interactive editor, see [Flow-o-Matic](https://observablehq.com/@mbostock/flow-o-matic).**

## Installing

If you use NPM, `npm install d3-sankey`. Otherwise, download the [latest release](https://github.com/d3/d3-sankey/releases/latest). You can also load directly from [unpkg.com](https://unpkg.com/d3-sankey/). AMD, CommonJS, and vanilla environments are supported. In vanilla, a `d3` global is exported:

```html
<script src="https://unpkg.com/d3-array@1"></script>
<script src="https://unpkg.com/d3-collection@1"></script>
<script src="https://unpkg.com/d3-path@1"></script>
<script src="https://unpkg.com/d3-shape@1"></script>
<script src="https://unpkg.com/d3-sankey@0"></script>
<script>

var sankey = d3.sankey();

</script>
```

## API Reference

<a href="#sankey" name="sankey">#</a> d3.<b>sankey</b>() [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

Constructs a new Sankey generator with the default settings.

<a href="#_sankey" name="_sankey">#</a> <i>sankey</i>(<i>arguments</i>…) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

Computes the node and link positions for the given *arguments*, returning a *graph* representing the Sankey layout. The returned *graph* has the following properties:

* *graph*.nodes - the array of [nodes](#sankey_nodes)
* *graph*.links - the array of [links](#sankey_links)

<a href="#sankey_update" name="sankey_update">#</a> <i>sankey</i>.<b>update</b>(<i>graph</i>) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

Recomputes the specified *graph*’s links’ positions, updating the following properties of each *link*:

* *link*.y0 - the link’s vertical starting position (at source node)
* *link*.y1 - the link’s vertical end position (at target node)

This method is intended to be called after computing the initial [Sankey layout](#_sankey), for example when the diagram is repositioned interactively.

<a name="sankey_nodes" href="#sankey_nodes">#</a> <i>sankey</i>.<b>nodes</b>([<i>nodes</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *nodes* is specified, sets the Sankey generator’s nodes accessor to the specified function or array and returns this Sankey generator. If *nodes* is not specified, returns the current nodes accessor, which defaults to:

```js
function nodes(graph) {
  return graph.nodes;
}
```

If *nodes* is specified as a function, the function is invoked when the Sankey layout is [generated](#_sankey), being passed any arguments passed to the Sankey generator. This function must return an array of nodes. If *nodes* is not a function, it must be a constant array of *nodes*.

Each *node* must be an object. The following properties are assigned by the [Sankey generator](#_sankey):

* *node*.sourceLinks - the array of outgoing [links](#sankey_links) which have this node as their source
* *node*.targetLinks - the array of incoming [links](#sankey_links) which have this node as their target
* *node*.value - the node’s value; this is the sum of *link*.value for the node’s incoming [links](#sankey_links), or *node*.fixedValue if defined
* *node*.index - the node’s zero-based index within the array of nodes
* *node*.depth - the node’s zero-based graph depth, derived from the graph topology
* *node*.height - the node’s zero-based graph height, derived from the graph topology
* *node*.layer - the node’s zero-based column index, corresponding to its horizontal position
* *node*.x0 - the node’s minimum horizontal position, derived from *node*.depth
* *node*.x1 - the node’s maximum horizontal position (*node*.x0 + [*sankey*.nodeWidth](#sankey_nodeWidth))
* *node*.y0 - the node’s minimum vertical position
* *node*.y1 - the node’s maximum vertical position (*node*.y1 - *node*.y0 is proportional to *node*.value)

See also [*sankey*.links](#sankey_links).

<a name="sankey_links" href="#sankey_links">#</a> <i>sankey</i>.<b>links</b>([<i>links</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *links* is specified, sets the Sankey generator’s links accessor to the specified function or array and returns this Sankey generator. If *links* is not specified, returns the current links accessor, which defaults to:

```js
function links(graph) {
  return graph.links;
}
```

If *links* is specified as a function, the function is invoked when the Sankey layout is [generated](#_sankey), being passed any arguments passed to the Sankey generator. This function must return an array of links. If *links* is not a function, it must be a constant array of *links*.

Each *link* must be an object with the following properties:

* *link*.source - the link’s source [node](#sankey_nodes)
* *link*.target - the link’s target [node](#sankey_nodes)
* *link*.value - the link’s numeric value

For convenience, a link’s source and target may be initialized using numeric or string identifiers rather than object references; see [*sankey*.nodeId](#sankey_nodeId). The following properties are assigned to each link by the [Sankey generator](#_sankey):

* *link*.y0 - the link’s vertical starting position (at source node)
* *link*.y1 - the link’s vertical end position (at target node)
* *link*.width - the link’s width (proportional to *link*.value)
* *link*.index - the zero-based index of *link* within the array of links

<a name="sankey_linkSort" href="#sankey_linkSort">#</a> <i>sankey</i>.<b>linkSort</b>([<i>sort</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *sort* is specified, sets the link sort method and returns this Sankey generator. If *sort* is not specified, returns the current link sort method, which defaults to *undefined*, indicating that vertical order of links within each node will be determined automatically by the layout. If *sort* is null, the order is fixed by the input. Otherwise, the specified *sort* function determines the order; the function is passed two links, and must return a value less than 0 if the first link should be above the second, and a value greater than 0 if the second link should be above the first, or 0 if the order is not specified.

<a name="sankey_nodeId" href="#sankey_nodeId">#</a> <i>sankey</i>.<b>nodeId</b>([<i>id</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *id* is specified, sets the node id accessor to the specified function and returns this Sankey generator. If *id* is not specified, returns the current node id accessor, which defaults to the numeric *node*.index:

```js
function id(d) {
  return d.index;
}
```

The default id accessor allows each link’s source and target to be specified as a zero-based index into the [nodes](#sankey_nodes) array. For example:

```js
var nodes = [
  {"id": "Alice"},
  {"id": "Bob"},
  {"id": "Carol"}
];

var links = [
  {"source": 0, "target": 1}, // Alice → Bob
  {"source": 1, "target": 2} // Bob → Carol
];
```

Now consider a different id accessor that returns a string:

```js
function id(d) {
  return d.id;
}
```

With this accessor, you can use named sources and targets:

```js
var nodes = [
  {"id": "Alice"},
  {"id": "Bob"},
  {"id": "Carol"}
];

var links = [
  {"source": "Alice", "target": "Bob"},
  {"source": "Bob", "target": "Carol"}
];
```

This is particularly useful when representing graphs in JSON, as JSON does not allow references. See [this example](https://bl.ocks.org/mbostock/f584aa36df54c451c94a9d0798caed35).

<a name="sankey_nodeAlign" href="#sankey_nodeAlign">#</a> <i>sankey</i>.<b>nodeAlign</b>([<i>align</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *align* is specified, sets the node [alignment method](#alignments) to the specified function and returns this Sankey generator. If *align* is not specified, returns the current node alignment method, which defaults to [d3.sankeyJustify](#sankeyJustify). The specified function is evaluated for each input *node* in order, being passed the current *node* and the total depth *n* of the graph (one plus the maximum *node*.depth), and must return an integer between 0 and *n* - 1 that indicates the desired horizontal position of the node in the generated Sankey diagram.

<a name="sankey_nodeSort" href="#sankey_nodeSort">#</a> <i>sankey</i>.<b>nodeSort</b>([<i>sort</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *sort* is specified, sets the node sort method and returns this Sankey generator. If *sort* is not specified, returns the current node sort method, which defaults to *undefined*, indicating that vertical order of nodes within each column will be determined automatically by the layout. If *sort* is null, the order is fixed by the input. Otherwise, the specified *sort* function determines the order; the function is passed two nodes, and must return a value less than 0 if the first node should be above the second, and a value greater than 0 if the second node should be above the first, or 0 if the order is not specified.

<a name="sankey_nodeWidth" href="#sankey_nodeWidth">#</a> <i>sankey</i>.<b>nodeWidth</b>([<i>width</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *width* is specified, sets the node width to the specified number and returns this Sankey generator. If *width* is not specified, returns the current node width, which defaults to 24.

<a name="sankey_nodePadding" href="#sankey_nodePadding">#</a> <i>sankey</i>.<b>nodePadding</b>([<i>padding</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *padding* is specified, sets the vertical separation between nodes at each column to the specified number and returns this Sankey generator. If *padding* is not specified, returns the current node padding, which defaults to 8.

<a name="sankey_extent" href="#sankey_extent">#</a> <i>sankey</i>.<b>extent</b>([<i>extent</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *extent* is specified, sets the extent of the Sankey layout to the specified bounds and returns the layout. The *extent* bounds are specified as an array \[\[<i>x0</i>, <i>y0</i>\], \[<i>x1</i>, <i>y1</i>\]\], where *x0* is the left side of the extent, *y0* is the top, *x1* is the right and *y1* is the bottom. If *extent* is not specified, returns the current extent which defaults to [[0, 0], [1, 1]].

<a name="sankey_size" href="#sankey_size">#</a> <i>sankey</i>.<b>size</b>([<i>size</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

An alias for [*sankey*.extent](#sankey_extent) where the minimum *x* and *y* of the extent are ⟨0,0⟩. Equivalent to:

```js
sankey.extent([[0, 0], size]);
```

<a name="sankey_iterations" href="#sankey_iterations">#</a> <i>sankey</i>.<b>iterations</b>([<i>iterations</i>]) [<>](https://github.com/d3/d3-sankey/blob/master/src/sankey.js "Source")

If *iterations* is specified, sets the number of relaxation iterations when [generating the layout](#_sankey) and returns this Sankey generator. If *iterations* is not specified, returns the current number of relaxation iterations, which defaults to 6.

### Alignments

See [*sankey*.nodeAlign](#sankey_nodeAlign).

<a name="sankeyLeft" href="#sankeyLeft">#</a> d3.<b>sankeyLeft</b>(<i>node</i>, <i>n</i>) [<>](https://github.com/d3/d3-sankey/blob/master/src/align.js "Source")

[<img alt="left" src="https://raw.githubusercontent.com/d3/d3-sankey/master/img/align-left.png" width="480">](https://observablehq.com/@d3/sankey-diagram?align=left)

Returns *node*.depth.

<a name="sankeyRight" href="#sankeyRight">#</a> d3.<b>sankeyRight</b>(<i>node</i>, <i>n</i>) [<>](https://github.com/d3/d3-sankey/blob/master/src/align.js "Source")

[<img alt="right" src="https://raw.githubusercontent.com/d3/d3-sankey/master/img/align-right.png" width="480">](https://observablehq.com/@d3/sankey-diagram?align=right)

Returns *n* - 1 - *node*.height.

<a name="sankeyCenter" href="#sankeyCenter">#</a> d3.<b>sankeyCenter</b>(<i>node</i>, <i>n</i>) [<>](https://github.com/d3/d3-sankey/blob/master/src/align.js "Source")

[<img alt="center" src="https://raw.githubusercontent.com/d3/d3-sankey/master/img/align-center.png" width="480">](https://observablehq.com/@d3/sankey-diagram?align=center)

Like [d3.sankeyLeft](#sankeyLeft), except that nodes without any incoming links are moved as right as possible.

<a name="sankeyJustify" href="#sankeyJustify">#</a> d3.<b>sankeyJustify</b>(<i>node</i>, <i>n</i>) [<>](https://github.com/d3/d3-sankey/blob/master/src/align.js "Source")

[<img alt="justify" src="https://raw.githubusercontent.com/d3/d3-sankey/master/img/energy.png" width="480">](https://observablehq.com/@d3/sankey-diagram)

Like [d3.sankeyLeft](#sankeyLeft), except that nodes without any outgoing links are moved to the far right.

### Links

<a name="sankeyLinkHorizontal" href="#sankeyLinkHorizontal">#</a> d3.<b>sankeyLinkHorizontal</b>() [<>](https://github.com/d3/d3-sankey/blob/master/src/sankeyLinkHorizontal.js "Source")

Returns a [horizontal link shape](https://github.com/d3/d3-shape/blob/master/README.md#linkHorizontal) suitable for a Sankey diagram. The [source accessor](https://github.com/d3/d3-shape/blob/master/README.md#link_source) is defined as:

```js
function source(d) {
  return [d.source.x1, d.y0];
}
```

The [target accessor](https://github.com/d3/d3-shape/blob/master/README.md#link_target) is defined as:

```js
function target(d) {
  return [d.target.x0, d.y1];
}
```

For example, to render the links of a Sankey diagram in SVG, you might say:

```js
svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#000")
    .attr("stroke-opacity", 0.2)
  .selectAll("path")
  .data(graph.links)
  .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke-width", function(d) { return d.width; });
```
