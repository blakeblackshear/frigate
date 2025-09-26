(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("cose-base"));
	else if(typeof define === 'function' && define.amd)
		define(["cose-base"], factory);
	else if(typeof exports === 'object')
		exports["cytoscapeFcose"] = factory(require("cose-base"));
	else
		root["cytoscapeFcose"] = factory(root["coseBase"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE__140__) {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 658:
/***/ ((module) => {



// Simple, internal Object.assign() polyfill for options objects etc.

module.exports = Object.assign != null ? Object.assign.bind(Object) : function (tgt) {
  for (var _len = arguments.length, srcs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    srcs[_key - 1] = arguments[_key];
  }

  srcs.forEach(function (src) {
    Object.keys(src).forEach(function (k) {
      return tgt[k] = src[k];
    });
  });

  return tgt;
};

/***/ }),

/***/ 548:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

/*
 * Auxiliary functions
 */

var LinkedList = __webpack_require__(140).layoutBase.LinkedList;

var auxiliary = {};

// get the top most nodes
auxiliary.getTopMostNodes = function (nodes) {
  var nodesMap = {};
  for (var i = 0; i < nodes.length; i++) {
    nodesMap[nodes[i].id()] = true;
  }
  var roots = nodes.filter(function (ele, i) {
    if (typeof ele === "number") {
      ele = i;
    }
    var parent = ele.parent()[0];
    while (parent != null) {
      if (nodesMap[parent.id()]) {
        return false;
      }
      parent = parent.parent()[0];
    }
    return true;
  });

  return roots;
};

// find disconnected components and create dummy nodes that connect them
auxiliary.connectComponents = function (cy, eles, topMostNodes, dummyNodes) {
  var queue = new LinkedList();
  var visited = new Set();
  var visitedTopMostNodes = [];
  var currentNeighbor = void 0;
  var minDegreeNode = void 0;
  var minDegree = void 0;

  var isConnected = false;
  var count = 1;
  var nodesConnectedToDummy = [];
  var components = [];

  var _loop = function _loop() {
    var cmpt = cy.collection();
    components.push(cmpt);

    var currentNode = topMostNodes[0];
    var childrenOfCurrentNode = cy.collection();
    childrenOfCurrentNode.merge(currentNode).merge(currentNode.descendants().intersection(eles));
    visitedTopMostNodes.push(currentNode);

    childrenOfCurrentNode.forEach(function (node) {
      queue.push(node);
      visited.add(node);
      cmpt.merge(node);
    });

    var _loop2 = function _loop2() {
      currentNode = queue.shift();

      // Traverse all neighbors of this node
      var neighborNodes = cy.collection();
      currentNode.neighborhood().nodes().forEach(function (node) {
        if (eles.intersection(currentNode.edgesWith(node)).length > 0) {
          neighborNodes.merge(node);
        }
      });

      for (var i = 0; i < neighborNodes.length; i++) {
        var neighborNode = neighborNodes[i];
        currentNeighbor = topMostNodes.intersection(neighborNode.union(neighborNode.ancestors()));
        if (currentNeighbor != null && !visited.has(currentNeighbor[0])) {
          var childrenOfNeighbor = currentNeighbor.union(currentNeighbor.descendants());

          childrenOfNeighbor.forEach(function (node) {
            queue.push(node);
            visited.add(node);
            cmpt.merge(node);
            if (topMostNodes.has(node)) {
              visitedTopMostNodes.push(node);
            }
          });
        }
      }
    };

    while (queue.length != 0) {
      _loop2();
    }

    cmpt.forEach(function (node) {
      eles.intersection(node.connectedEdges()).forEach(function (e) {
        // connectedEdges() usually cached
        if (cmpt.has(e.source()) && cmpt.has(e.target())) {
          // has() is cheap
          cmpt.merge(e);
        }
      });
    });

    if (visitedTopMostNodes.length == topMostNodes.length) {
      isConnected = true;
    }

    if (!isConnected || isConnected && count > 1) {
      minDegreeNode = visitedTopMostNodes[0];
      minDegree = minDegreeNode.connectedEdges().length;
      visitedTopMostNodes.forEach(function (node) {
        if (node.connectedEdges().length < minDegree) {
          minDegree = node.connectedEdges().length;
          minDegreeNode = node;
        }
      });
      nodesConnectedToDummy.push(minDegreeNode.id());
      // TO DO: Check efficiency of this part
      var temp = cy.collection();
      temp.merge(visitedTopMostNodes[0]);
      visitedTopMostNodes.forEach(function (node) {
        temp.merge(node);
      });
      visitedTopMostNodes = [];
      topMostNodes = topMostNodes.difference(temp);
      count++;
    }
  };

  do {
    _loop();
  } while (!isConnected);

  if (dummyNodes) {
    if (nodesConnectedToDummy.length > 0) {
      dummyNodes.set('dummy' + (dummyNodes.size + 1), nodesConnectedToDummy);
    }
  }
  return components;
};

// relocates componentResult to originalCenter if there is no fixedNodeConstraint
auxiliary.relocateComponent = function (originalCenter, componentResult, options) {
  if (!options.fixedNodeConstraint) {
    var minXCoord = Number.POSITIVE_INFINITY;
    var maxXCoord = Number.NEGATIVE_INFINITY;
    var minYCoord = Number.POSITIVE_INFINITY;
    var maxYCoord = Number.NEGATIVE_INFINITY;
    if (options.quality == "draft") {
      // calculate current bounding box
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = componentResult.nodeIndexes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _ref = _step.value;

          var _ref2 = _slicedToArray(_ref, 2);

          var key = _ref2[0];
          var value = _ref2[1];

          var cyNode = options.cy.getElementById(key);
          if (cyNode) {
            var nodeBB = cyNode.boundingBox();
            var leftX = componentResult.xCoords[value] - nodeBB.w / 2;
            var rightX = componentResult.xCoords[value] + nodeBB.w / 2;
            var topY = componentResult.yCoords[value] - nodeBB.h / 2;
            var bottomY = componentResult.yCoords[value] + nodeBB.h / 2;

            if (leftX < minXCoord) minXCoord = leftX;
            if (rightX > maxXCoord) maxXCoord = rightX;
            if (topY < minYCoord) minYCoord = topY;
            if (bottomY > maxYCoord) maxYCoord = bottomY;
          }
        }
        // find difference between current and original center
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      var diffOnX = originalCenter.x - (maxXCoord + minXCoord) / 2;
      var diffOnY = originalCenter.y - (maxYCoord + minYCoord) / 2;
      // move component to original center
      componentResult.xCoords = componentResult.xCoords.map(function (x) {
        return x + diffOnX;
      });
      componentResult.yCoords = componentResult.yCoords.map(function (y) {
        return y + diffOnY;
      });
    } else {
      // calculate current bounding box
      Object.keys(componentResult).forEach(function (item) {
        var node = componentResult[item];
        var leftX = node.getRect().x;
        var rightX = node.getRect().x + node.getRect().width;
        var topY = node.getRect().y;
        var bottomY = node.getRect().y + node.getRect().height;

        if (leftX < minXCoord) minXCoord = leftX;
        if (rightX > maxXCoord) maxXCoord = rightX;
        if (topY < minYCoord) minYCoord = topY;
        if (bottomY > maxYCoord) maxYCoord = bottomY;
      });
      // find difference between current and original center
      var _diffOnX = originalCenter.x - (maxXCoord + minXCoord) / 2;
      var _diffOnY = originalCenter.y - (maxYCoord + minYCoord) / 2;
      // move component to original center
      Object.keys(componentResult).forEach(function (item) {
        var node = componentResult[item];
        node.setCenter(node.getCenterX() + _diffOnX, node.getCenterY() + _diffOnY);
      });
    }
  }
};

auxiliary.calcBoundingBox = function (parentNode, xCoords, yCoords, nodeIndexes) {
  // calculate bounds
  var left = Number.MAX_SAFE_INTEGER;
  var right = Number.MIN_SAFE_INTEGER;
  var top = Number.MAX_SAFE_INTEGER;
  var bottom = Number.MIN_SAFE_INTEGER;
  var nodeLeft = void 0;
  var nodeRight = void 0;
  var nodeTop = void 0;
  var nodeBottom = void 0;

  var nodes = parentNode.descendants().not(":parent");
  var s = nodes.length;
  for (var i = 0; i < s; i++) {
    var node = nodes[i];

    nodeLeft = xCoords[nodeIndexes.get(node.id())] - node.width() / 2;
    nodeRight = xCoords[nodeIndexes.get(node.id())] + node.width() / 2;
    nodeTop = yCoords[nodeIndexes.get(node.id())] - node.height() / 2;
    nodeBottom = yCoords[nodeIndexes.get(node.id())] + node.height() / 2;

    if (left > nodeLeft) {
      left = nodeLeft;
    }

    if (right < nodeRight) {
      right = nodeRight;
    }

    if (top > nodeTop) {
      top = nodeTop;
    }

    if (bottom < nodeBottom) {
      bottom = nodeBottom;
    }
  }

  var boundingBox = {};
  boundingBox.topLeftX = left;
  boundingBox.topLeftY = top;
  boundingBox.width = right - left;
  boundingBox.height = bottom - top;
  return boundingBox;
};

// This function finds and returns parent nodes whose all children are hidden
auxiliary.calcParentsWithoutChildren = function (cy, eles) {
  var parentsWithoutChildren = cy.collection();
  eles.nodes(':parent').forEach(function (parent) {
    var check = false;
    parent.children().forEach(function (child) {
      if (child.css('display') != 'none') {
        check = true;
      }
    });
    if (!check) {
      parentsWithoutChildren.merge(parent);
    }
  });

  return parentsWithoutChildren;
};

module.exports = auxiliary;

/***/ }),

/***/ 816:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/**
  The implementation of the postprocessing part that applies CoSE layout over the spectral layout
*/

var aux = __webpack_require__(548);
var CoSELayout = __webpack_require__(140).CoSELayout;
var CoSENode = __webpack_require__(140).CoSENode;
var PointD = __webpack_require__(140).layoutBase.PointD;
var DimensionD = __webpack_require__(140).layoutBase.DimensionD;
var LayoutConstants = __webpack_require__(140).layoutBase.LayoutConstants;
var FDLayoutConstants = __webpack_require__(140).layoutBase.FDLayoutConstants;
var CoSEConstants = __webpack_require__(140).CoSEConstants;

// main function that cose layout is processed
var coseLayout = function coseLayout(options, spectralResult) {

  var cy = options.cy;
  var eles = options.eles;
  var nodes = eles.nodes();
  var edges = eles.edges();

  var nodeIndexes = void 0;
  var xCoords = void 0;
  var yCoords = void 0;
  var idToLNode = {};

  if (options.randomize) {
    nodeIndexes = spectralResult["nodeIndexes"];
    xCoords = spectralResult["xCoords"];
    yCoords = spectralResult["yCoords"];
  }

  var isFn = function isFn(fn) {
    return typeof fn === 'function';
  };

  var optFn = function optFn(opt, ele) {
    if (isFn(opt)) {
      return opt(ele);
    } else {
      return opt;
    }
  };

  /**** Postprocessing functions ****/

  var parentsWithoutChildren = aux.calcParentsWithoutChildren(cy, eles);

  // transfer cytoscape nodes to cose nodes
  var processChildrenList = function processChildrenList(parent, children, layout, options) {
    var size = children.length;
    for (var i = 0; i < size; i++) {
      var theChild = children[i];
      var children_of_children = null;
      if (theChild.intersection(parentsWithoutChildren).length == 0) {
        children_of_children = theChild.children();
      }
      var theNode = void 0;

      var dimensions = theChild.layoutDimensions({
        nodeDimensionsIncludeLabels: options.nodeDimensionsIncludeLabels
      });

      if (theChild.outerWidth() != null && theChild.outerHeight() != null) {
        if (options.randomize) {
          if (!theChild.isParent()) {
            theNode = parent.add(new CoSENode(layout.graphManager, new PointD(xCoords[nodeIndexes.get(theChild.id())] - dimensions.w / 2, yCoords[nodeIndexes.get(theChild.id())] - dimensions.h / 2), new DimensionD(parseFloat(dimensions.w), parseFloat(dimensions.h))));
          } else {
            var parentInfo = aux.calcBoundingBox(theChild, xCoords, yCoords, nodeIndexes);
            if (theChild.intersection(parentsWithoutChildren).length == 0) {
              theNode = parent.add(new CoSENode(layout.graphManager, new PointD(parentInfo.topLeftX, parentInfo.topLeftY), new DimensionD(parentInfo.width, parentInfo.height)));
            } else {
              // for the parentsWithoutChildren
              theNode = parent.add(new CoSENode(layout.graphManager, new PointD(parentInfo.topLeftX, parentInfo.topLeftY), new DimensionD(parseFloat(dimensions.w), parseFloat(dimensions.h))));
            }
          }
        } else {
          theNode = parent.add(new CoSENode(layout.graphManager, new PointD(theChild.position('x') - dimensions.w / 2, theChild.position('y') - dimensions.h / 2), new DimensionD(parseFloat(dimensions.w), parseFloat(dimensions.h))));
        }
      } else {
        theNode = parent.add(new CoSENode(this.graphManager));
      }
      // Attach id to the layout node and repulsion value
      theNode.id = theChild.data("id");
      theNode.nodeRepulsion = optFn(options.nodeRepulsion, theChild);
      // Attach the paddings of cy node to layout node
      theNode.paddingLeft = parseInt(theChild.css('padding'));
      theNode.paddingTop = parseInt(theChild.css('padding'));
      theNode.paddingRight = parseInt(theChild.css('padding'));
      theNode.paddingBottom = parseInt(theChild.css('padding'));

      //Attach the label properties to both compound and simple nodes if labels will be included in node dimensions
      //These properties will be used while updating bounds of compounds during iterations or tiling
      //and will be used for simple nodes while transferring final positions to cytoscape
      if (options.nodeDimensionsIncludeLabels) {
        theNode.labelWidth = theChild.boundingBox({ includeLabels: true, includeNodes: false, includeOverlays: false }).w;
        theNode.labelHeight = theChild.boundingBox({ includeLabels: true, includeNodes: false, includeOverlays: false }).h;
        theNode.labelPosVertical = theChild.css("text-valign");
        theNode.labelPosHorizontal = theChild.css("text-halign");
      }

      // Map the layout node
      idToLNode[theChild.data("id")] = theNode;

      if (isNaN(theNode.rect.x)) {
        theNode.rect.x = 0;
      }

      if (isNaN(theNode.rect.y)) {
        theNode.rect.y = 0;
      }

      if (children_of_children != null && children_of_children.length > 0) {
        var theNewGraph = void 0;
        theNewGraph = layout.getGraphManager().add(layout.newGraph(), theNode);
        processChildrenList(theNewGraph, children_of_children, layout, options);
      }
    }
  };

  // transfer cytoscape edges to cose edges
  var processEdges = function processEdges(layout, gm, edges) {
    var idealLengthTotal = 0;
    var edgeCount = 0;
    for (var i = 0; i < edges.length; i++) {
      var edge = edges[i];
      var sourceNode = idToLNode[edge.data("source")];
      var targetNode = idToLNode[edge.data("target")];
      if (sourceNode && targetNode && sourceNode !== targetNode && sourceNode.getEdgesBetween(targetNode).length == 0) {
        var e1 = gm.add(layout.newEdge(), sourceNode, targetNode);
        e1.id = edge.id();
        e1.idealLength = optFn(options.idealEdgeLength, edge);
        e1.edgeElasticity = optFn(options.edgeElasticity, edge);
        idealLengthTotal += e1.idealLength;
        edgeCount++;
      }
    }
    // we need to update the ideal edge length constant with the avg. ideal length value after processing edges
    // in case there is no edge, use other options
    if (options.idealEdgeLength != null) {
      if (edgeCount > 0) CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = idealLengthTotal / edgeCount;else if (!isFn(options.idealEdgeLength)) // in case there is no edge, but option gives a value to use
        CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = options.idealEdgeLength;else // in case there is no edge and we cannot get a value from option (because it's a function)
        CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = 50;
      // we need to update these constant values based on the ideal edge length constant
      CoSEConstants.MIN_REPULSION_DIST = FDLayoutConstants.MIN_REPULSION_DIST = FDLayoutConstants.DEFAULT_EDGE_LENGTH / 10.0;
      CoSEConstants.DEFAULT_RADIAL_SEPARATION = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
    }
  };

  // transfer cytoscape constraints to cose layout
  var processConstraints = function processConstraints(layout, options) {
    // get nodes to be fixed
    if (options.fixedNodeConstraint) {
      layout.constraints["fixedNodeConstraint"] = options.fixedNodeConstraint;
    }
    // get nodes to be aligned
    if (options.alignmentConstraint) {
      layout.constraints["alignmentConstraint"] = options.alignmentConstraint;
    }
    // get nodes to be relatively placed
    if (options.relativePlacementConstraint) {
      layout.constraints["relativePlacementConstraint"] = options.relativePlacementConstraint;
    }
  };

  /**** Apply postprocessing ****/
  if (options.nestingFactor != null) CoSEConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = options.nestingFactor;
  if (options.gravity != null) CoSEConstants.DEFAULT_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH = options.gravity;
  if (options.numIter != null) CoSEConstants.MAX_ITERATIONS = FDLayoutConstants.MAX_ITERATIONS = options.numIter;
  if (options.gravityRange != null) CoSEConstants.DEFAULT_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR = options.gravityRange;
  if (options.gravityCompound != null) CoSEConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = options.gravityCompound;
  if (options.gravityRangeCompound != null) CoSEConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = options.gravityRangeCompound;
  if (options.initialEnergyOnIncremental != null) CoSEConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL = options.initialEnergyOnIncremental;

  if (options.tilingCompareBy != null) CoSEConstants.TILING_COMPARE_BY = options.tilingCompareBy;

  if (options.quality == 'proof') LayoutConstants.QUALITY = 2;else LayoutConstants.QUALITY = 0;

  CoSEConstants.NODE_DIMENSIONS_INCLUDE_LABELS = FDLayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS = LayoutConstants.NODE_DIMENSIONS_INCLUDE_LABELS = options.nodeDimensionsIncludeLabels;
  CoSEConstants.DEFAULT_INCREMENTAL = FDLayoutConstants.DEFAULT_INCREMENTAL = LayoutConstants.DEFAULT_INCREMENTAL = !options.randomize;
  CoSEConstants.ANIMATE = FDLayoutConstants.ANIMATE = LayoutConstants.ANIMATE = options.animate;
  CoSEConstants.TILE = options.tile;
  CoSEConstants.TILING_PADDING_VERTICAL = typeof options.tilingPaddingVertical === 'function' ? options.tilingPaddingVertical.call() : options.tilingPaddingVertical;
  CoSEConstants.TILING_PADDING_HORIZONTAL = typeof options.tilingPaddingHorizontal === 'function' ? options.tilingPaddingHorizontal.call() : options.tilingPaddingHorizontal;

  CoSEConstants.DEFAULT_INCREMENTAL = FDLayoutConstants.DEFAULT_INCREMENTAL = LayoutConstants.DEFAULT_INCREMENTAL = true;
  CoSEConstants.PURE_INCREMENTAL = !options.randomize;
  LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES = options.uniformNodeDimensions;

  // This part is for debug/demo purpose
  if (options.step == "transformed") {
    CoSEConstants.TRANSFORM_ON_CONSTRAINT_HANDLING = true;
    CoSEConstants.ENFORCE_CONSTRAINTS = false;
    CoSEConstants.APPLY_LAYOUT = false;
  }
  if (options.step == "enforced") {
    CoSEConstants.TRANSFORM_ON_CONSTRAINT_HANDLING = false;
    CoSEConstants.ENFORCE_CONSTRAINTS = true;
    CoSEConstants.APPLY_LAYOUT = false;
  }
  if (options.step == "cose") {
    CoSEConstants.TRANSFORM_ON_CONSTRAINT_HANDLING = false;
    CoSEConstants.ENFORCE_CONSTRAINTS = false;
    CoSEConstants.APPLY_LAYOUT = true;
  }
  if (options.step == "all") {
    if (options.randomize) CoSEConstants.TRANSFORM_ON_CONSTRAINT_HANDLING = true;else CoSEConstants.TRANSFORM_ON_CONSTRAINT_HANDLING = false;
    CoSEConstants.ENFORCE_CONSTRAINTS = true;
    CoSEConstants.APPLY_LAYOUT = true;
  }

  if (options.fixedNodeConstraint || options.alignmentConstraint || options.relativePlacementConstraint) {
    CoSEConstants.TREE_REDUCTION_ON_INCREMENTAL = false;
  } else {
    CoSEConstants.TREE_REDUCTION_ON_INCREMENTAL = true;
  }

  var coseLayout = new CoSELayout();
  var gm = coseLayout.newGraphManager();

  processChildrenList(gm.addRoot(), aux.getTopMostNodes(nodes), coseLayout, options);
  processEdges(coseLayout, gm, edges);
  processConstraints(coseLayout, options);

  coseLayout.runLayout();

  return idToLNode;
};

module.exports = { coseLayout: coseLayout };

/***/ }),

/***/ 212:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
  The implementation of the fcose layout algorithm
*/

var assign = __webpack_require__(658);
var aux = __webpack_require__(548);

var _require = __webpack_require__(657),
    spectralLayout = _require.spectralLayout;

var _require2 = __webpack_require__(816),
    coseLayout = _require2.coseLayout;

var defaults = Object.freeze({

  // 'draft', 'default' or 'proof' 
  // - 'draft' only applies spectral layout 
  // - 'default' improves the quality with subsequent CoSE layout (fast cooling rate)
  // - 'proof' improves the quality with subsequent CoSE layout (slow cooling rate) 
  quality: "default",
  // Use random node positions at beginning of layout
  // if this is set to false, then quality option must be "proof"
  randomize: true,
  // Whether or not to animate the layout
  animate: true,
  // Duration of animation in ms, if enabled
  animationDuration: 1000,
  // Easing of animation, if enabled
  animationEasing: undefined,
  // Fit the viewport to the repositioned nodes
  fit: true,
  // Padding around layout
  padding: 30,
  // Whether to include labels in node dimensions. Valid in "proof" quality
  nodeDimensionsIncludeLabels: false,
  // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
  uniformNodeDimensions: false,
  // Whether to pack disconnected components - valid only if randomize: true
  packComponents: true,
  // Layout step - all, transformed, enforced, cose - for debug purpose only
  step: "all",

  /* spectral layout options */

  // False for random, true for greedy
  samplingType: true,
  // Sample size to construct distance matrix
  sampleSize: 25,
  // Separation amount between nodes
  nodeSeparation: 75,
  // Power iteration tolerance
  piTol: 0.0000001,

  /* CoSE layout options */

  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: function nodeRepulsion(node) {
    return 4500;
  },
  // Ideal edge (non nested) length
  idealEdgeLength: function idealEdgeLength(edge) {
    return 50;
  },
  // Divisor to compute edge forces
  edgeElasticity: function edgeElasticity(edge) {
    return 0.45;
  },
  // Nesting factor (multiplier) to compute ideal edge length for nested edges
  nestingFactor: 0.1,
  // Gravity force (constant)
  gravity: 0.25,
  // Maximum number of iterations to perform
  numIter: 2500,
  // For enabling tiling
  tile: true,
  // The function that specifies the criteria for comparing nodes while sorting them during tiling operation.
  // Takes the node id as a parameter and the default tiling operation is perfomed when this option is not set.
  tilingCompareBy: undefined,
  // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingVertical: 10,
  // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingHorizontal: 10,
  // Gravity range (constant) for compounds
  gravityRangeCompound: 1.5,
  // Gravity force (constant) for compounds
  gravityCompound: 1.0,
  // Gravity range (constant)
  gravityRange: 3.8,
  // Initial cooling factor for incremental layout  
  initialEnergyOnIncremental: 0.3,

  /* constraint options */

  // Fix required nodes to predefined positions
  // [{nodeId: 'n1', position: {x: 100, y: 200}, {...}]
  fixedNodeConstraint: undefined,
  // Align required nodes in vertical/horizontal direction
  // {vertical: [['n1', 'n2')], ['n3', 'n4']], horizontal: ['n2', 'n4']}
  alignmentConstraint: undefined,
  // Place two nodes relatively in vertical/horizontal direction 
  // [{top: 'n1', bottom: 'n2', gap: 100}, {left: 'n3', right: 'n4', gap: 75}]
  relativePlacementConstraint: undefined,

  /* layout event callbacks */
  ready: function ready() {}, // on layoutready
  stop: function stop() {} // on layoutstop
});

var Layout = function () {
  function Layout(options) {
    _classCallCheck(this, Layout);

    this.options = assign({}, defaults, options);
  }

  _createClass(Layout, [{
    key: 'run',
    value: function run() {
      var layout = this;
      var options = this.options;
      var cy = options.cy;
      var eles = options.eles;

      var spectralResult = [];
      var xCoords = void 0;
      var yCoords = void 0;
      var coseResult = [];
      var components = void 0;
      var componentCenters = [];

      // basic validity check for constraint inputs 
      if (options.fixedNodeConstraint && (!Array.isArray(options.fixedNodeConstraint) || options.fixedNodeConstraint.length == 0)) {
        options.fixedNodeConstraint = undefined;
      }

      if (options.alignmentConstraint) {
        if (options.alignmentConstraint.vertical && (!Array.isArray(options.alignmentConstraint.vertical) || options.alignmentConstraint.vertical.length == 0)) {
          options.alignmentConstraint.vertical = undefined;
        }
        if (options.alignmentConstraint.horizontal && (!Array.isArray(options.alignmentConstraint.horizontal) || options.alignmentConstraint.horizontal.length == 0)) {
          options.alignmentConstraint.horizontal = undefined;
        }
      }

      if (options.relativePlacementConstraint && (!Array.isArray(options.relativePlacementConstraint) || options.relativePlacementConstraint.length == 0)) {
        options.relativePlacementConstraint = undefined;
      }

      // if any constraint exists, set some options
      var constraintExist = options.fixedNodeConstraint || options.alignmentConstraint || options.relativePlacementConstraint;
      if (constraintExist) {
        // constraints work with these options
        options.tile = false;
        options.packComponents = false;
      }

      // decide component packing is enabled or not
      var layUtil = void 0;
      var packingEnabled = false;
      if (cy.layoutUtilities && options.packComponents) {
        layUtil = cy.layoutUtilities("get");
        if (!layUtil) layUtil = cy.layoutUtilities();
        packingEnabled = true;
      }

      if (eles.nodes().length > 0) {
        // if packing is not enabled, perform layout on the whole graph
        if (!packingEnabled) {
          // store component center
          var boundingBox = options.eles.boundingBox();
          componentCenters.push({ x: boundingBox.x1 + boundingBox.w / 2, y: boundingBox.y1 + boundingBox.h / 2 });
          // apply spectral layout
          if (options.randomize) {
            var result = spectralLayout(options);
            spectralResult.push(result);
          }
          // apply cose layout as postprocessing
          if (options.quality == "default" || options.quality == "proof") {
            coseResult.push(coseLayout(options, spectralResult[0]));
            aux.relocateComponent(componentCenters[0], coseResult[0], options); // relocate center to original position
          } else {
            aux.relocateComponent(componentCenters[0], spectralResult[0], options); // relocate center to original position
          }
        } else {
          // packing is enabled
          var topMostNodes = aux.getTopMostNodes(options.eles.nodes());
          components = aux.connectComponents(cy, options.eles, topMostNodes);
          // store component centers
          components.forEach(function (component) {
            var boundingBox = component.boundingBox();
            componentCenters.push({ x: boundingBox.x1 + boundingBox.w / 2, y: boundingBox.y1 + boundingBox.h / 2 });
          });

          //send each component to spectral layout if randomized
          if (options.randomize) {
            components.forEach(function (component) {
              options.eles = component;
              spectralResult.push(spectralLayout(options));
            });
          }

          if (options.quality == "default" || options.quality == "proof") {
            var toBeTiledNodes = cy.collection();
            if (options.tile) {
              // behave nodes to be tiled as one component
              var nodeIndexes = new Map();
              var _xCoords = [];
              var _yCoords = [];
              var count = 0;
              var tempSpectralResult = { nodeIndexes: nodeIndexes, xCoords: _xCoords, yCoords: _yCoords };
              var indexesToBeDeleted = [];
              components.forEach(function (component, index) {
                if (component.edges().length == 0) {
                  component.nodes().forEach(function (node, i) {
                    toBeTiledNodes.merge(component.nodes()[i]);
                    if (!node.isParent()) {
                      tempSpectralResult.nodeIndexes.set(component.nodes()[i].id(), count++);
                      tempSpectralResult.xCoords.push(component.nodes()[0].position().x);
                      tempSpectralResult.yCoords.push(component.nodes()[0].position().y);
                    }
                  });
                  indexesToBeDeleted.push(index);
                }
              });
              if (toBeTiledNodes.length > 1) {
                var _boundingBox = toBeTiledNodes.boundingBox();
                componentCenters.push({ x: _boundingBox.x1 + _boundingBox.w / 2, y: _boundingBox.y1 + _boundingBox.h / 2 });
                components.push(toBeTiledNodes);
                spectralResult.push(tempSpectralResult);
                for (var i = indexesToBeDeleted.length - 1; i >= 0; i--) {
                  components.splice(indexesToBeDeleted[i], 1);
                  spectralResult.splice(indexesToBeDeleted[i], 1);
                  componentCenters.splice(indexesToBeDeleted[i], 1);
                };
              }
            }
            components.forEach(function (component, index) {
              // send each component to cose layout
              options.eles = component;
              coseResult.push(coseLayout(options, spectralResult[index]));
              aux.relocateComponent(componentCenters[index], coseResult[index], options); // relocate center to original position
            });
          } else {
            components.forEach(function (component, index) {
              aux.relocateComponent(componentCenters[index], spectralResult[index], options); // relocate center to original position
            });
          }

          // packing
          var componentsEvaluated = new Set();
          if (components.length > 1) {
            var subgraphs = [];
            var hiddenEles = eles.filter(function (ele) {
              return ele.css('display') == 'none';
            });
            components.forEach(function (component, index) {
              var nodeIndexes = void 0;
              if (options.quality == "draft") {
                nodeIndexes = spectralResult[index].nodeIndexes;
              }

              if (component.nodes().not(hiddenEles).length > 0) {
                var subgraph = {};
                subgraph.edges = [];
                subgraph.nodes = [];
                var nodeIndex = void 0;
                component.nodes().not(hiddenEles).forEach(function (node) {
                  if (options.quality == "draft") {
                    if (!node.isParent()) {
                      nodeIndex = nodeIndexes.get(node.id());
                      subgraph.nodes.push({ x: spectralResult[index].xCoords[nodeIndex] - node.boundingbox().w / 2, y: spectralResult[index].yCoords[nodeIndex] - node.boundingbox().h / 2, width: node.boundingbox().w, height: node.boundingbox().h });
                    } else {
                      var parentInfo = aux.calcBoundingBox(node, spectralResult[index].xCoords, spectralResult[index].yCoords, nodeIndexes);
                      subgraph.nodes.push({ x: parentInfo.topLeftX, y: parentInfo.topLeftY, width: parentInfo.width, height: parentInfo.height });
                    }
                  } else {
                    if (coseResult[index][node.id()]) {
                      subgraph.nodes.push({ x: coseResult[index][node.id()].getLeft(), y: coseResult[index][node.id()].getTop(), width: coseResult[index][node.id()].getWidth(), height: coseResult[index][node.id()].getHeight() });
                    }
                  }
                });
                component.edges().forEach(function (edge) {
                  var source = edge.source();
                  var target = edge.target();
                  if (source.css("display") != "none" && target.css("display") != "none") {
                    if (options.quality == "draft") {
                      var sourceNodeIndex = nodeIndexes.get(source.id());
                      var targetNodeIndex = nodeIndexes.get(target.id());
                      var sourceCenter = [];
                      var targetCenter = [];
                      if (source.isParent()) {
                        var parentInfo = aux.calcBoundingBox(source, spectralResult[index].xCoords, spectralResult[index].yCoords, nodeIndexes);
                        sourceCenter.push(parentInfo.topLeftX + parentInfo.width / 2);
                        sourceCenter.push(parentInfo.topLeftY + parentInfo.height / 2);
                      } else {
                        sourceCenter.push(spectralResult[index].xCoords[sourceNodeIndex]);
                        sourceCenter.push(spectralResult[index].yCoords[sourceNodeIndex]);
                      }
                      if (target.isParent()) {
                        var _parentInfo = aux.calcBoundingBox(target, spectralResult[index].xCoords, spectralResult[index].yCoords, nodeIndexes);
                        targetCenter.push(_parentInfo.topLeftX + _parentInfo.width / 2);
                        targetCenter.push(_parentInfo.topLeftY + _parentInfo.height / 2);
                      } else {
                        targetCenter.push(spectralResult[index].xCoords[targetNodeIndex]);
                        targetCenter.push(spectralResult[index].yCoords[targetNodeIndex]);
                      }
                      subgraph.edges.push({ startX: sourceCenter[0], startY: sourceCenter[1], endX: targetCenter[0], endY: targetCenter[1] });
                    } else {
                      if (coseResult[index][source.id()] && coseResult[index][target.id()]) {
                        subgraph.edges.push({ startX: coseResult[index][source.id()].getCenterX(), startY: coseResult[index][source.id()].getCenterY(), endX: coseResult[index][target.id()].getCenterX(), endY: coseResult[index][target.id()].getCenterY() });
                      }
                    }
                  }
                });
                if (subgraph.nodes.length > 0) {
                  subgraphs.push(subgraph);
                  componentsEvaluated.add(index);
                }
              }
            });
            var shiftResult = layUtil.packComponents(subgraphs, options.randomize).shifts;
            if (options.quality == "draft") {
              spectralResult.forEach(function (result, index) {
                var newXCoords = result.xCoords.map(function (x) {
                  return x + shiftResult[index].dx;
                });
                var newYCoords = result.yCoords.map(function (y) {
                  return y + shiftResult[index].dy;
                });
                result.xCoords = newXCoords;
                result.yCoords = newYCoords;
              });
            } else {
              var _count = 0;
              componentsEvaluated.forEach(function (index) {
                Object.keys(coseResult[index]).forEach(function (item) {
                  var nodeRectangle = coseResult[index][item];
                  nodeRectangle.setCenter(nodeRectangle.getCenterX() + shiftResult[_count].dx, nodeRectangle.getCenterY() + shiftResult[_count].dy);
                });
                _count++;
              });
            }
          }
        }
      }

      // get each element's calculated position
      var getPositions = function getPositions(ele, i) {
        if (options.quality == "default" || options.quality == "proof") {
          if (typeof ele === "number") {
            ele = i;
          }
          var pos = void 0;
          var node = void 0;
          var theId = ele.data('id');
          coseResult.forEach(function (result) {
            if (theId in result) {
              pos = { x: result[theId].getRect().getCenterX(), y: result[theId].getRect().getCenterY() };
              node = result[theId];
            }
          });
          if (options.nodeDimensionsIncludeLabels) {
            if (node.labelWidth) {
              if (node.labelPosHorizontal == "left") {
                pos.x += node.labelWidth / 2;
              } else if (node.labelPosHorizontal == "right") {
                pos.x -= node.labelWidth / 2;
              }
            }
            if (node.labelHeight) {
              if (node.labelPosVertical == "top") {
                pos.y += node.labelHeight / 2;
              } else if (node.labelPosVertical == "bottom") {
                pos.y -= node.labelHeight / 2;
              }
            }
          }
          if (pos == undefined) pos = { x: ele.position("x"), y: ele.position("y") };
          return {
            x: pos.x,
            y: pos.y
          };
        } else {
          var _pos = void 0;
          spectralResult.forEach(function (result) {
            var index = result.nodeIndexes.get(ele.id());
            if (index != undefined) {
              _pos = { x: result.xCoords[index], y: result.yCoords[index] };
            }
          });
          if (_pos == undefined) _pos = { x: ele.position("x"), y: ele.position("y") };
          return {
            x: _pos.x,
            y: _pos.y
          };
        }
      };

      // quality = "draft" and randomize = false are contradictive so in that case positions don't change
      if (options.quality == "default" || options.quality == "proof" || options.randomize) {
        // transfer calculated positions to nodes (positions of only simple nodes are evaluated, compounds are positioned automatically)
        var parentsWithoutChildren = aux.calcParentsWithoutChildren(cy, eles);
        var _hiddenEles = eles.filter(function (ele) {
          return ele.css('display') == 'none';
        });
        options.eles = eles.not(_hiddenEles);

        eles.nodes().not(":parent").not(_hiddenEles).layoutPositions(layout, options, getPositions);

        if (parentsWithoutChildren.length > 0) {
          parentsWithoutChildren.forEach(function (ele) {
            ele.position(getPositions(ele));
          });
        }
      } else {
        console.log("If randomize option is set to false, then quality option must be 'default' or 'proof'.");
      }
    }
  }]);

  return Layout;
}();

module.exports = Layout;

/***/ }),

/***/ 657:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/**
  The implementation of the spectral layout that is the first part of the fcose layout algorithm
*/

var aux = __webpack_require__(548);
var Matrix = __webpack_require__(140).layoutBase.Matrix;
var SVD = __webpack_require__(140).layoutBase.SVD;

// main function that spectral layout is processed
var spectralLayout = function spectralLayout(options) {

  var cy = options.cy;
  var eles = options.eles;
  var nodes = eles.nodes();
  var parentNodes = eles.nodes(":parent");

  var dummyNodes = new Map(); // map to keep dummy nodes and their neighbors
  var nodeIndexes = new Map(); // map to keep indexes to nodes
  var parentChildMap = new Map(); // mapping btw. compound and its representative node 
  var allNodesNeighborhood = []; // array to keep neighborhood of all nodes
  var xCoords = [];
  var yCoords = [];

  var samplesColumn = []; // sampled vertices
  var minDistancesColumn = [];
  var C = []; // column sampling matrix
  var PHI = []; // intersection of column and row sampling matrices 
  var INV = []; // inverse of PHI 

  var firstSample = void 0; // the first sampled node
  var nodeSize = void 0;

  var infinity = 100000000;
  var small = 0.000000001;

  var piTol = options.piTol;
  var samplingType = options.samplingType; // false for random, true for greedy
  var nodeSeparation = options.nodeSeparation;
  var sampleSize = void 0;

  /**** Spectral-preprocessing functions ****/

  /**** Spectral layout functions ****/

  // determine which columns to be sampled
  var randomSampleCR = function randomSampleCR() {
    var sample = 0;
    var count = 0;
    var flag = false;

    while (count < sampleSize) {
      sample = Math.floor(Math.random() * nodeSize);

      flag = false;
      for (var i = 0; i < count; i++) {
        if (samplesColumn[i] == sample) {
          flag = true;
          break;
        }
      }

      if (!flag) {
        samplesColumn[count] = sample;
        count++;
      } else {
        continue;
      }
    }
  };

  // takes the index of the node(pivot) to initiate BFS as a parameter
  var BFS = function BFS(pivot, index, samplingMethod) {
    var path = []; // the front of the path
    var front = 0; // the back of the path
    var back = 0;
    var current = 0;
    var temp = void 0;
    var distance = [];

    var max_dist = 0; // the furthest node to be returned
    var max_ind = 1;

    for (var i = 0; i < nodeSize; i++) {
      distance[i] = infinity;
    }

    path[back] = pivot;
    distance[pivot] = 0;

    while (back >= front) {
      current = path[front++];
      var neighbors = allNodesNeighborhood[current];
      for (var _i = 0; _i < neighbors.length; _i++) {
        temp = nodeIndexes.get(neighbors[_i]);
        if (distance[temp] == infinity) {
          distance[temp] = distance[current] + 1;
          path[++back] = temp;
        }
      }
      C[current][index] = distance[current] * nodeSeparation;
    }

    if (samplingMethod) {
      for (var _i2 = 0; _i2 < nodeSize; _i2++) {
        if (C[_i2][index] < minDistancesColumn[_i2]) minDistancesColumn[_i2] = C[_i2][index];
      }

      for (var _i3 = 0; _i3 < nodeSize; _i3++) {
        if (minDistancesColumn[_i3] > max_dist) {
          max_dist = minDistancesColumn[_i3];
          max_ind = _i3;
        }
      }
    }
    return max_ind;
  };

  // apply BFS to all nodes or selected samples
  var allBFS = function allBFS(samplingMethod) {

    var sample = void 0;

    if (!samplingMethod) {
      randomSampleCR();

      // call BFS
      for (var i = 0; i < sampleSize; i++) {
        BFS(samplesColumn[i], i, samplingMethod, false);
      }
    } else {
      sample = Math.floor(Math.random() * nodeSize);
      firstSample = sample;

      for (var _i4 = 0; _i4 < nodeSize; _i4++) {
        minDistancesColumn[_i4] = infinity;
      }

      for (var _i5 = 0; _i5 < sampleSize; _i5++) {
        samplesColumn[_i5] = sample;
        sample = BFS(sample, _i5, samplingMethod);
      }
    }

    // form the squared distances for C
    for (var _i6 = 0; _i6 < nodeSize; _i6++) {
      for (var j = 0; j < sampleSize; j++) {
        C[_i6][j] *= C[_i6][j];
      }
    }

    // form PHI
    for (var _i7 = 0; _i7 < sampleSize; _i7++) {
      PHI[_i7] = [];
    }

    for (var _i8 = 0; _i8 < sampleSize; _i8++) {
      for (var _j = 0; _j < sampleSize; _j++) {
        PHI[_i8][_j] = C[samplesColumn[_j]][_i8];
      }
    }
  };

  // perform the SVD algorithm and apply a regularization step
  var sample = function sample() {

    var SVDResult = SVD.svd(PHI);

    var a_q = SVDResult.S;
    var a_u = SVDResult.U;
    var a_v = SVDResult.V;

    var max_s = a_q[0] * a_q[0] * a_q[0];

    var a_Sig = [];

    //  regularization
    for (var i = 0; i < sampleSize; i++) {
      a_Sig[i] = [];
      for (var j = 0; j < sampleSize; j++) {
        a_Sig[i][j] = 0;
        if (i == j) {
          a_Sig[i][j] = a_q[i] / (a_q[i] * a_q[i] + max_s / (a_q[i] * a_q[i]));
        }
      }
    }

    INV = Matrix.multMat(Matrix.multMat(a_v, a_Sig), Matrix.transpose(a_u));
  };

  // calculate final coordinates 
  var powerIteration = function powerIteration() {
    // two largest eigenvalues
    var theta1 = void 0;
    var theta2 = void 0;

    // initial guesses for eigenvectors
    var Y1 = [];
    var Y2 = [];

    var V1 = [];
    var V2 = [];

    for (var i = 0; i < nodeSize; i++) {
      Y1[i] = Math.random();
      Y2[i] = Math.random();
    }

    Y1 = Matrix.normalize(Y1);
    Y2 = Matrix.normalize(Y2);

    var count = 0;
    // to keep track of the improvement ratio in power iteration
    var current = small;
    var previous = small;

    var temp = void 0;

    while (true) {
      count++;

      for (var _i9 = 0; _i9 < nodeSize; _i9++) {
        V1[_i9] = Y1[_i9];
      }

      Y1 = Matrix.multGamma(Matrix.multL(Matrix.multGamma(V1), C, INV));
      theta1 = Matrix.dotProduct(V1, Y1);
      Y1 = Matrix.normalize(Y1);

      current = Matrix.dotProduct(V1, Y1);

      temp = Math.abs(current / previous);

      if (temp <= 1 + piTol && temp >= 1) {
        break;
      }

      previous = current;
    }

    for (var _i10 = 0; _i10 < nodeSize; _i10++) {
      V1[_i10] = Y1[_i10];
    }

    count = 0;
    previous = small;
    while (true) {
      count++;

      for (var _i11 = 0; _i11 < nodeSize; _i11++) {
        V2[_i11] = Y2[_i11];
      }

      V2 = Matrix.minusOp(V2, Matrix.multCons(V1, Matrix.dotProduct(V1, V2)));
      Y2 = Matrix.multGamma(Matrix.multL(Matrix.multGamma(V2), C, INV));
      theta2 = Matrix.dotProduct(V2, Y2);
      Y2 = Matrix.normalize(Y2);

      current = Matrix.dotProduct(V2, Y2);

      temp = Math.abs(current / previous);

      if (temp <= 1 + piTol && temp >= 1) {
        break;
      }

      previous = current;
    }

    for (var _i12 = 0; _i12 < nodeSize; _i12++) {
      V2[_i12] = Y2[_i12];
    }

    // theta1 now contains dominant eigenvalue
    // theta2 now contains the second-largest eigenvalue
    // V1 now contains theta1's eigenvector
    // V2 now contains theta2's eigenvector

    //populate the two vectors
    xCoords = Matrix.multCons(V1, Math.sqrt(Math.abs(theta1)));
    yCoords = Matrix.multCons(V2, Math.sqrt(Math.abs(theta2)));
  };

  /**** Preparation for spectral layout (Preprocessing) ****/

  // connect disconnected components (first top level, then inside of each compound node)
  aux.connectComponents(cy, eles, aux.getTopMostNodes(nodes), dummyNodes);

  parentNodes.forEach(function (ele) {
    aux.connectComponents(cy, eles, aux.getTopMostNodes(ele.descendants().intersection(eles)), dummyNodes);
  });

  // assign indexes to nodes (first real, then dummy nodes)
  var index = 0;
  for (var i = 0; i < nodes.length; i++) {
    if (!nodes[i].isParent()) {
      nodeIndexes.set(nodes[i].id(), index++);
    }
  }

  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = dummyNodes.keys()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var key = _step.value;

      nodeIndexes.set(key, index++);
    }

    // instantiate the neighborhood matrix
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  for (var _i13 = 0; _i13 < nodeIndexes.size; _i13++) {
    allNodesNeighborhood[_i13] = [];
  }

  // form a parent-child map to keep representative node of each compound node  
  parentNodes.forEach(function (ele) {
    var children = ele.children().intersection(eles);

    //      let random = 0;
    while (children.nodes(":childless").length == 0) {
      //        random = Math.floor(Math.random() * children.nodes().length); // if all children are compound then proceed randomly
      children = children.nodes()[0].children().intersection(eles);
    }
    //  select the representative node - we can apply different methods here
    //      random = Math.floor(Math.random() * children.nodes(":childless").length);
    var index = 0;
    var min = children.nodes(":childless")[0].connectedEdges().length;
    children.nodes(":childless").forEach(function (ele2, i) {
      if (ele2.connectedEdges().length < min) {
        min = ele2.connectedEdges().length;
        index = i;
      }
    });
    parentChildMap.set(ele.id(), children.nodes(":childless")[index].id());
  });

  // add neighborhood relations (first real, then dummy nodes)
  nodes.forEach(function (ele) {
    var eleIndex = void 0;

    if (ele.isParent()) eleIndex = nodeIndexes.get(parentChildMap.get(ele.id()));else eleIndex = nodeIndexes.get(ele.id());

    ele.neighborhood().nodes().forEach(function (node) {
      if (eles.intersection(ele.edgesWith(node)).length > 0) {
        if (node.isParent()) allNodesNeighborhood[eleIndex].push(parentChildMap.get(node.id()));else allNodesNeighborhood[eleIndex].push(node.id());
      }
    });
  });

  var _loop = function _loop(_key) {
    var eleIndex = nodeIndexes.get(_key);
    var disconnectedId = void 0;
    dummyNodes.get(_key).forEach(function (id) {
      if (cy.getElementById(id).isParent()) disconnectedId = parentChildMap.get(id);else disconnectedId = id;

      allNodesNeighborhood[eleIndex].push(disconnectedId);
      allNodesNeighborhood[nodeIndexes.get(disconnectedId)].push(_key);
    });
  };

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = dummyNodes.keys()[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var _key = _step2.value;

      _loop(_key);
    }

    // nodeSize now only considers the size of transformed graph
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  nodeSize = nodeIndexes.size;

  var spectralResult = void 0;

  // If number of nodes in transformed graph is 1 or 2, either SVD or powerIteration causes problem
  // So skip spectral and layout the graph with cose
  if (nodeSize > 2) {
    // if # of nodes in transformed graph is smaller than sample size,
    // then use # of nodes as sample size
    sampleSize = nodeSize < options.sampleSize ? nodeSize : options.sampleSize;

    // instantiates the partial matrices that will be used in spectral layout
    for (var _i14 = 0; _i14 < nodeSize; _i14++) {
      C[_i14] = [];
    }
    for (var _i15 = 0; _i15 < sampleSize; _i15++) {
      INV[_i15] = [];
    }

    /**** Apply spectral layout ****/

    if (options.quality == "draft" || options.step == "all") {
      allBFS(samplingType);
      sample();
      powerIteration();

      spectralResult = { nodeIndexes: nodeIndexes, xCoords: xCoords, yCoords: yCoords };
    } else {
      nodeIndexes.forEach(function (value, key) {
        xCoords.push(cy.getElementById(key).position("x"));
        yCoords.push(cy.getElementById(key).position("y"));
      });
      spectralResult = { nodeIndexes: nodeIndexes, xCoords: xCoords, yCoords: yCoords };
    }
    return spectralResult;
  } else {
    var iterator = nodeIndexes.keys();
    var firstNode = cy.getElementById(iterator.next().value);
    var firstNodePos = firstNode.position();
    var firstNodeWidth = firstNode.outerWidth();
    xCoords.push(firstNodePos.x);
    yCoords.push(firstNodePos.y);
    if (nodeSize == 2) {
      var secondNode = cy.getElementById(iterator.next().value);
      var secondNodeWidth = secondNode.outerWidth();
      xCoords.push(firstNodePos.x + firstNodeWidth / 2 + secondNodeWidth / 2 + options.idealEdgeLength);
      yCoords.push(firstNodePos.y);
    }

    spectralResult = { nodeIndexes: nodeIndexes, xCoords: xCoords, yCoords: yCoords };
    return spectralResult;
  }
};

module.exports = { spectralLayout: spectralLayout };

/***/ }),

/***/ 579:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var impl = __webpack_require__(212);

// registers the extension on a cytoscape lib ref
var register = function register(cytoscape) {
  if (!cytoscape) {
    return;
  } // can't register if cytoscape unspecified

  cytoscape('layout', 'fcose', impl); // register with cytoscape.js
};

if (typeof cytoscape !== 'undefined') {
  // expose to global cytoscape (i.e. window.cytoscape)
  register(cytoscape);
}

module.exports = register;

/***/ }),

/***/ 140:
/***/ ((module) => {

module.exports = __WEBPACK_EXTERNAL_MODULE__140__;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(579);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});