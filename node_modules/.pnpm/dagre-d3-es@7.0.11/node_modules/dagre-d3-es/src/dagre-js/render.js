import * as d3 from 'd3';
import { defaults } from 'lodash-es';
import { layout } from '../dagre/index.js';
import { arrows, setArrows } from './arrows.js';
import { createClusters, setCreateClusters } from './create-clusters.js';
import { createEdgeLabels, setCreateEdgeLabels } from './create-edge-labels.js';
import { createEdgePaths, setCreateEdgePaths } from './create-edge-paths.js';
import { createNodes, setCreateNodes } from './create-nodes.js';
import { positionClusters } from './position-clusters.js';
import { positionEdgeLabels } from './position-edge-labels.js';
import { positionNodes } from './position-nodes.js';
import { shapes, setShapes } from './shapes.js';

export { render };

// This design is based on http://bost.ocks.org/mike/chart/.
function render() {
  var fn = function (svg, g) {
    preProcessGraph(g);

    var outputGroup = createOrSelectGroup(svg, 'output');
    var clustersGroup = createOrSelectGroup(outputGroup, 'clusters');
    var edgePathsGroup = createOrSelectGroup(outputGroup, 'edgePaths');
    var edgeLabels = createEdgeLabels(createOrSelectGroup(outputGroup, 'edgeLabels'), g);
    var nodes = createNodes(createOrSelectGroup(outputGroup, 'nodes'), g, shapes);

    layout(g);

    positionNodes(nodes, g);
    positionEdgeLabels(edgeLabels, g);
    createEdgePaths(edgePathsGroup, g, arrows);

    var clusters = createClusters(clustersGroup, g);
    positionClusters(clusters, g);

    postProcessGraph(g);
  };

  fn.createNodes = function (value) {
    if (!arguments.length) return createNodes;
    setCreateNodes(value);
    return fn;
  };

  fn.createClusters = function (value) {
    if (!arguments.length) return createClusters;
    setCreateClusters(value);
    return fn;
  };

  fn.createEdgeLabels = function (value) {
    if (!arguments.length) return createEdgeLabels;
    setCreateEdgeLabels(value);
    return fn;
  };

  fn.createEdgePaths = function (value) {
    if (!arguments.length) return createEdgePaths;
    setCreateEdgePaths(value);
    return fn;
  };

  fn.shapes = function (value) {
    if (!arguments.length) return shapes;
    setShapes(value);
    return fn;
  };

  fn.arrows = function (value) {
    if (!arguments.length) return arrows;
    setArrows(value);
    return fn;
  };

  return fn;
}

var NODE_DEFAULT_ATTRS = {
  paddingLeft: 10,
  paddingRight: 10,
  paddingTop: 10,
  paddingBottom: 10,
  rx: 0,
  ry: 0,
  shape: 'rect',
};

var EDGE_DEFAULT_ATTRS = {
  arrowhead: 'normal',
  curve: d3.curveLinear,
};

/**
 * @typedef {Object} Node
 * @property {string} label - The label of the node.
 * @property {number} [paddingX] - The horizontal padding of the node.
 * @property {number} [paddingY] - The vertical padding of the node.
 * @property {number} [padding] - The padding of the node for all directions. Overrides `paddingX` and `paddingY`.
 * @property {number} [paddingLeft] - The left padding of the node.
 * @property {number} [paddingRight] - The right padding of the node.
 * @property {number} [_prevWidth]
 * @property {number} [width]
 * @property {number} [_prevHeight]
 * @property {number} [height]
 */

/**
 * Pre-processes the graph by setting default labels and padding for nodes.
 * @param {Object} g - The graph object.
 */
function preProcessGraph(g) {
  g.nodes().forEach((v) => {
    /** @type {Node} */
    const node = g.node(v);
    if (!Object.prototype.hasOwnProperty.call(node, 'label') && !g.children(v).length) {
      node.label = v;
    }

    if (Object.prototype.hasOwnProperty.call(node, 'paddingX')) {
      defaults(node, {
        paddingLeft: node.paddingX,
        paddingRight: node.paddingX,
      });
    }

    if (Object.prototype.hasOwnProperty.call(node, 'paddingY')) {
      defaults(node, {
        paddingTop: node.paddingY,
        paddingBottom: node.paddingY,
      });
    }

    if (Object.prototype.hasOwnProperty.call(node, 'padding')) {
      defaults(node, {
        paddingLeft: node.padding,
        paddingRight: node.padding,
        paddingTop: node.padding,
        paddingBottom: node.padding,
      });
    }

    defaults(node, NODE_DEFAULT_ATTRS);

    ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].forEach((k) => {
      node[k] = Number(node[k]);
    });

    // Save dimensions for restore during post-processing
    if (Object.prototype.hasOwnProperty.call(node, 'width')) {
      node._prevWidth = node.width;
    }
    if (Object.prototype.hasOwnProperty.call(node, 'height')) {
      node._prevHeight = node.height;
    }
  });

  g.edges().forEach(function (e) {
    var edge = g.edge(e);
    if (!Object.prototype.hasOwnProperty.call(edge, 'label')) {
      edge.label = '';
    }
    defaults(edge, EDGE_DEFAULT_ATTRS);
  });
}

function postProcessGraph(g) {
  g.nodes().forEach((v) => {
    /** @type {Node} */
    var node = g.node(v);

    // Restore original dimensions
    if (Object.prototype.hasOwnProperty.call(node, '_prevWidth')) {
      node.width = node._prevWidth;
    } else {
      delete node.width;
    }

    if (Object.prototype.hasOwnProperty.call(node, '_prevHeight')) {
      node.height = node._prevHeight;
    } else {
      delete node.height;
    }

    delete node._prevWidth;
    delete node._prevHeight;
  });
}

function createOrSelectGroup(root, name) {
  var selection = root.select('g.' + name);
  if (selection.empty()) {
    selection = root.append('g').attr('class', name);
  }
  return selection;
}
