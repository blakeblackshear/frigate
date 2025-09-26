cytoscape-cose-bilkent
================================================================================

[![DOI](https://zenodo.org/badge/42200589.svg)](https://zenodo.org/badge/latestdoi/42200589)

## Description

The CoSE (Compound Spring Embedder) layout for Cytoscape.js developed by [i-Vis Lab](http://cs.bilkent.edu.tr/~ivis/) in Bilkent University is a spring embedder layout with support for compound graphs (nested structures) and varying (non-uniform) node dimensions.
([demo](https://raw.githack.com/cytoscape/cytoscape.js-cose-bilkent/master/demo.html), [compound demo](https://raw.githack.com/cytoscape/cytoscape.js-cose-bilkent/master/demo-compound.html))

Please cite the following when using this layout:

U. Dogrusoz, E. Giral, A. Cetintas, A. Civril, and E. Demir, "[A Layout Algorithm For Undirected Compound Graphs](http://www.sciencedirect.com/science/article/pii/S0020025508004799)", Information Sciences, 179, pp. 980-994, 2009.

## Dependencies

 * Cytoscape.js ^3.2.0
 * cose-base ^1.0.0


## Usage instructions

Download the library:
 * via npm: `npm install cytoscape-cose-bilkent`,
 * via bower: `bower install cytoscape-cose-bilkent`, or
 * via direct download in the repository (probably from a tag).

Import the library as appropriate for your project:

ES import:

```js
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use( coseBilkent );
```

CommonJS require:

```js
let cytoscape = require('cytoscape');
let coseBilkent = require('cytoscape-cose-bilkent');

cytoscape.use( coseBilkent ); // register extension
```

AMD:

```js
require(['cytoscape', 'cytoscape-cose-bilkent'], function( cytoscape, coseBilkent ){
  coseBilkent( cytoscape ); // register extension
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.


## API

When calling the layout, e.g. `cy.layout({ name: 'cose-bilkent', ... })`, the following options are supported:

```js
var defaultOptions = {
  // Called on `layoutready`
  ready: function () {
  },
  // Called on `layoutstop`
  stop: function () {
  },
  // 'draft', 'default' or 'proof" 
  // - 'draft' fast cooling rate 
  // - 'default' moderate cooling rate 
  // - "proof" slow cooling rate
  quality: 'default',
  // Whether to include labels in node dimensions. Useful for avoiding label overlap
  nodeDimensionsIncludeLabels: false,
  // number of ticks per frame; higher is faster but more jerky
  refresh: 30,
  // Whether to fit the network view after when done
  fit: true,
  // Padding on fit
  padding: 10,
  // Whether to enable incremental mode
  randomize: true,
  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: 4500,
  // Ideal (intra-graph) edge length
  idealEdgeLength: 50,
  // Divisor to compute edge forces
  edgeElasticity: 0.45,
  // Nesting factor (multiplier) to compute ideal edge length for inter-graph edges
  nestingFactor: 0.1,
  // Gravity force (constant)
  gravity: 0.25,
  // Maximum number of iterations to perform
  numIter: 2500,
  // Whether to tile disconnected nodes
  tile: true,
  // Type of layout animation. The option set is {'during', 'end', false}
  animate: 'end',
  // Duration for animate:end
  animationDuration: 500,
  // Amount of vertical space to put between degree zero nodes during tiling (can also be a function)
  tilingPaddingVertical: 10,
  // Amount of horizontal space to put between degree zero nodes during tiling (can also be a function)
  tilingPaddingHorizontal: 10,
  // Gravity range (constant) for compounds
  gravityRangeCompound: 1.5,
  // Gravity force (constant) for compounds
  gravityCompound: 1.0,
  // Gravity range (constant)
  gravityRange: 3.8,
  // Initial cooling factor for incremental layout
  initialEnergyOnIncremental: 0.5
};
```

*Note that this extension supports only relatively modern browsers.  Browsers like IE require significant shimming, for example with [core-js](https://www.npmjs.com/package/core-js).*

*Note that while running Cytoscape.js in headless mode, stylingEnabled option of Cytoscape.js should be set as true because this extension considers node dimensions and some other styling properties.*


## Build targets

* `npm run test` : Run Mocha tests in `./test`
* `npm run build` : Build `./src/**` into `cytoscape-cose-bilkent.js`
* `npm run watch` : Automatically build on changes with live reloading (N.b. you must already have an HTTP server running)
* `npm run dev` : Automatically build on changes with live reloading with webpack dev server
* `npm run lint` : Run eslint on the source

N.b. all builds use babel, so modern ES features can be used in the `src`.


## Publishing instructions

This project is set up to automatically be published to npm and bower.  To publish:

1. Build the extension : `npm run build:release`
1. Commit the build : `git commit -am "Build for release"`
1. Bump the version number and tag: `npm version major|minor|patch`
1. Push to origin: `git push && git push --tags`
1. Publish to npm: `npm publish .`
1. If publishing to bower for the first time, you'll need to run `bower register cytoscape-cose-bilkent https://github.com/cytoscape/cytoscape.js-cose-bilkent.git`
1. [Make a new release](https://github.com/cytoscape/cytoscape.js-cose-bilkent/releases/new) for Zenodo.
