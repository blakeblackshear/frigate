layout-base
================================================================================

## Description

This repository implements a basic layout model and some utilities for Cytoscape.js layout extensions. 

## Usage instructions

Add `layout-base` as a dependecy to your layout extension.

`require()` in the extension to reach functionality:

 * `var Integer = require(layout-base).Integer`,
 * `var Layout = require(layout-base).Layout`,
 * `...`
 
 For a usage example, see [cose-base](https://github.com/iVis-at-Bilkent/cose-base) or [avsdf-base](https://github.com/iVis-at-Bilkent/avsdf-base).
 
 ![](https://github.com/iVis-at-Bilkent/layout-base/blob/master/layout-schema.png)
