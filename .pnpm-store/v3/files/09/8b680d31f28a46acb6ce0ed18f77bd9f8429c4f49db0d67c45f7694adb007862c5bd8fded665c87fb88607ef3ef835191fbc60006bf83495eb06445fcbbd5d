<img style="width: 200px; height: 200px;" src="https://raw.githubusercontent.com/cytoscape/cytoscape.js/unstable/documentation/img/cytoscape-logo.png" width="200" height="200">

[![GitHub repo](https://img.shields.io/badge/Repo-GitHub-yellow.svg)](https://github.com/cytoscape/cytoscape.js)
[![Ask a question with Phind](https://img.shields.io/badge/Get%20help-Phind-yellow.svg)](https://www.phind.com/search?q=I%27m%20using%20the%20Cytoscape.js%20graph%20theory%20JS%20library.%20How%20do%20I%20create%20a%20graph%20in%20my%20HTML%20page)
[![News and tutorials](https://img.shields.io/badge/News%20%26%20tutorials-Blog-yellow.svg)](https://blog.js.cytoscape.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://raw.githubusercontent.com/cytoscape/cytoscape.js/master/LICENSE)
[![npm](https://img.shields.io/npm/v/cytoscape.svg)](https://www.npmjs.com/package/cytoscape)
[![DOI](https://zenodo.org/badge/2255947.svg)](https://zenodo.org/badge/latestdoi/2255947)
[![npm installs](https://img.shields.io/npm/dm/cytoscape.svg?label=npm%20installs)](https://www.npmjs.com/package/cytoscape)
[![Automated tests](https://github.com/cytoscape/cytoscape.js/actions/workflows/tests.yml/badge.svg)](https://github.com/cytoscape/cytoscape.js/actions/workflows/tests.yml)
[![Extensions](https://img.shields.io/badge/Extensions-70-brightgreen.svg)](https://js.cytoscape.org/#extensions)
[![Cloudflare](https://img.shields.io/badge/Powered%20by-Cloudflare-orange.svg)](https://cloudflare.com)


Created at the [University of Toronto](https://utoronto.ca) and published in [Oxford Bioinformatics](https://js.cytoscape.org/#introduction/citation) ([2016](https://academic.oup.com/bioinformatics/article/32/2/309/1744007), [2023](https://academic.oup.com/bioinformatics/article/39/1/btad031/6988031)). <br />
Authored by: [Max Franz](https://github.com/maxkfranz), [Christian Lopes](https://github.com/chrtannus), [Dylan Fong](https://github.com/d2fong), [Mike Kucera](https://github.com/mikekucera), ..., [Gary Bader](https://baderlab.org)

# Cytoscape.js

Graph theory (network) library for visualisation and analysis : [https://js.cytoscape.org](https://js.cytoscape.org)

## Description

Cytoscape.js is a fully featured [graph theory](https://en.wikipedia.org/wiki/Graph_theory) library.  Do you need to model and/or visualise relational data, like biological data or social networks?  If so, Cytoscape.js is just what you need.

Cytoscape.js contains a graph theory model and an optional renderer to display interactive graphs.  This library was designed to make it as easy as possible for programmers and scientists to use graph theory in their apps, whether it's for server-side analysis in a Node.js app or for a rich user interface.

You can get started with Cytoscape.js with one line:

```js
var cy = cytoscape({ elements: myElements, container: myDiv });
```

Learn more about the features of Cytoscape.js by reading [its documentation](https://js.cytoscape.org).


## Example

The Tokyo railway stations network can be visualised with Cytoscape:

<img style="width: 300px; height: 126px;" src="https://raw.githubusercontent.com/cytoscape/cytoscape.js/unstable/documentation/img/tokyo-big.png" width="300" height="126">

<img style="width: 300px; height: 126px;" src="https://raw.githubusercontent.com/cytoscape/cytoscape.js/unstable/documentation/img/tokyo-big-zoomed-in.png" width="300" height="126">

A [live demo](https://js.cytoscape.org/demos/tokyo-railways/) and [source code](https://github.com/cytoscape/cytoscape.js/tree/master/documentation/demos/tokyo-railways) are available for the Tokyo railway stations graph.  More demos are available in the [documentation](https://js.cytoscape.org/#demos).


## Documentation

You can find the documentation and downloads on the [project website](https://js.cytoscape.org).



## Roadmap

Future versions of Cytoscape.js are planned in the [milestones of the Github issue tracker](https://github.com/cytoscape/cytoscape.js/milestones).  You can use the milestones to see what's currently planned for future releases.




## Contributing to Cytoscape.js

Would you like to become a Cytoscape.js contributor?  You can contribute in technical roles (e.g. features, testing) or non-technical roles (e.g. documentation, outreach), depending on your interests.  [Get in touch with us by posting a GitHub discussion](https://github.com/cytoscape/cytoscape.js/discussions).

For the mechanics of contributing a pull request, refer to [CONTRIBUTING.md](CONTRIBUTING.md).

Feature releases are made monthly, while patch releases are made weekly.  This allows for rapid releases of first- and third-party contributions.



## Citation

To cite Cytoscape.js in a paper, please cite the Oxford Bioinformatics issue:

*Cytoscape.js: a graph theory library for visualisation and analysis*

Franz M, Lopes CT, Huck G, Dong Y, Sumer O, Bader GD

[Bioinformatics (2016) 32 (2): 309-311 first published online September 28, 2015 doi:10.1093/bioinformatics/btv557](https://bioinformatics.oxfordjournals.org/content/32/2/309) [(PDF)](http://bioinformatics.oxfordjournals.org/content/32/2/309.full.pdf)

- [PubMed abstract for the original 2016 article](http://www.ncbi.nlm.nih.gov/pubmed/26415722)
- [PubMed abstract for the 2023 update article](https://pubmed.ncbi.nlm.nih.gov/36645249)





## Build dependencies

Install `node` and `npm`.  Run `npm install` before using `npm run`.




## Build instructions

Run `npm run <target>` in the console.  The main targets are:

**Building:**

 * `build`: do all builds of the library (umd, min, umd, esm)
 * `build:min` : do the unminified build with bundled dependencies (for simple html pages, good for novices)
 * `build:umd` : do the umd (cjs/amd/globals) build
 * `build:esm` : do the esm (ES 2015 modules) build
 * `clean` : clean the `build` directory
 * `docs` : build the docs into `documentation`
 * `release` : build all release artifacts
 * `watch` : automatically build lib for debugging (with sourcemap, no babel, very quick)
   * good for general testing on `debug/index.html`
   * served on `http://localhost:8080` or the first available port thereafter, with livereload on `debug/index.html`
 * `watch:babel` : automatically build lib for debugging (with sourcemap, with babel, a bit slower)
   * good for testing performance or for testing out of date browsers
   * served on `http://localhost:8080` or the first available port thereafter, with livereload on `debug/index.html`
 * `watch:umd` : automatically build prod umd bundle (no sourcemap, with babel)
   * good for testing cytoscape in another project (with a `"cytoscape": "file:./path/to/cytoscape"` reference in your project's `package.json`)
   * no http server
 * `dist` : update the distribution js for npm etc.

**Testing:**

The default test scripts run directly against the source code.  Tests can alternatively be run on a built bundle.  The library can be built on `node>=6`, but the library's bundle can be tested on `node>=0.10`.

 * `test` : run all testing & linting
 * `test:js` : run the mocha tests on the public API of the lib (directly on source files)
   * `npm run test:js -- -g "my test name"` runs tests on only the matching test cases
 * `test:build` : run the mocha tests on the public API of the lib (on a built bundle) 
   * `npm run build` should be run beforehand on a recent version of node
   * `npm run test:build -- -g "my test name"` runs build tests on only the matching test cases
 * `test:modules` : run unit tests on private, internal API
   * `npm run test:modules -- -g "my test name"` runs modules tests on only the matching test cases
 * `lint` : lint the js sources via eslint
 * `benchmark` : run all benchmarks
 * `benchmark:single` : run benchmarks only for the suite specified in `benchmark/single`



## Release instructions

### Background

- Ensure that a milestone exists for the release you want to make, with all the issues for that release assigned in the milestone.
- Bug fixes should be applied to both the `master` and `unstable` branches.  PRs can go on either branch, with the patch applied to the other branch after merging.
- When a patch release is made concurrently with a feature release, the patch release should be made first.  Wait 5 minutes after the patch release completes before starting the feature release -- otherwise Zenodo doesn't pick up releases properly.

### Patch version

1. Go to [Actions > Patch release](https://github.com/cytoscape/cytoscape.js/actions/workflows/patch-release.yml)
1. Go to the 'Run workflow' dropdown
1. [Optional] The 'master' branch should be preselected for you
1. Press the green 'Run workflow' button
1. Close the milestone for the release

<img style="width: 300px; height: auto;" src="https://raw.githubusercontent.com/cytoscape/cytoscape.js/unstable/documentation/img/preview-patch.png" width="300">

### Feature version

1. Go to [Actions > Feature release](https://github.com/cytoscape/cytoscape.js/actions/workflows/feature-release.yml)
1. Go to the 'Run workflow' dropdown
1. [Optional] The 'unstable' branch should be preselected for you
1. Press the green 'Run workflow' button
1. Close the milestone for the release
1. Make the release announcement [on the blog](https://github.com/cytoscape/cytoscape.js-blog)

<img style="width: 300px; height: auto;" src="https://raw.githubusercontent.com/cytoscape/cytoscape.js/unstable/documentation/img/preview-feature.png" width="300">

### Notes on GitHub Actions UI

- 'Use workflow from' in the GitHub UI selects the branch from which the workflow YML file is selected.  Since the workflow files should usually be the same on the master and unstable branches, it shouldn't matter what's selected.
- 'Branch to run the action on' in the GitHub UI is preselected for you.  You don't need to change it.

## Tests

Mocha tests are found in the [test directory](https://github.com/cytoscape/cytoscape.js/tree/master/test).  The tests can be run in the browser or they can be run via Node.js (`npm run test:js`).
