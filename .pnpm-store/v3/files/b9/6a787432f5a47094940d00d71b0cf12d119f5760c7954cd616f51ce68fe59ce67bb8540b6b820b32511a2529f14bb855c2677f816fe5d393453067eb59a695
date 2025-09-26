import {
  Graph
} from "./chunk-CIBAI54N.mjs";
import {
  cloneDeep_default,
  defaults_default,
  filter_default,
  find_default,
  flatten_default,
  forEach_default,
  forIn_default,
  forOwn_default,
  has_default,
  isUndefined_default,
  last_default,
  mapValues_default,
  map_default,
  max_default,
  minBy_default,
  min_default,
  now_default,
  pick_default,
  range_default,
  reduce_default,
  size_default,
  sortBy_default,
  uniqueId_default,
  values_default,
  zipObject_default
} from "./chunk-ZZTYOBSU.mjs";
import {
  constant_default,
  isArray_default,
  merge_default
} from "./chunk-PEQZQI46.mjs";
import {
  __name
} from "./chunk-DLQEHMXD.mjs";

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/util.js
function addDummyNode(g, type, attrs, name) {
  var v;
  do {
    v = uniqueId_default(name);
  } while (g.hasNode(v));
  attrs.dummy = type;
  g.setNode(v, attrs);
  return v;
}
__name(addDummyNode, "addDummyNode");
function simplify(g) {
  var simplified = new Graph().setGraph(g.graph());
  forEach_default(g.nodes(), function(v) {
    simplified.setNode(v, g.node(v));
  });
  forEach_default(g.edges(), function(e) {
    var simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlen: 1 };
    var label = g.edge(e);
    simplified.setEdge(e.v, e.w, {
      weight: simpleLabel.weight + label.weight,
      minlen: Math.max(simpleLabel.minlen, label.minlen)
    });
  });
  return simplified;
}
__name(simplify, "simplify");
function asNonCompoundGraph(g) {
  var simplified = new Graph({ multigraph: g.isMultigraph() }).setGraph(g.graph());
  forEach_default(g.nodes(), function(v) {
    if (!g.children(v).length) {
      simplified.setNode(v, g.node(v));
    }
  });
  forEach_default(g.edges(), function(e) {
    simplified.setEdge(e, g.edge(e));
  });
  return simplified;
}
__name(asNonCompoundGraph, "asNonCompoundGraph");
function intersectRect(rect, point) {
  var x = rect.x;
  var y = rect.y;
  var dx = point.x - x;
  var dy = point.y - y;
  var w = rect.width / 2;
  var h = rect.height / 2;
  if (!dx && !dy) {
    throw new Error("Not possible to find intersection inside of the rectangle");
  }
  var sx, sy;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    if (dy < 0) {
      h = -h;
    }
    sx = h * dx / dy;
    sy = h;
  } else {
    if (dx < 0) {
      w = -w;
    }
    sx = w;
    sy = w * dy / dx;
  }
  return { x: x + sx, y: y + sy };
}
__name(intersectRect, "intersectRect");
function buildLayerMatrix(g) {
  var layering = map_default(range_default(maxRank(g) + 1), function() {
    return [];
  });
  forEach_default(g.nodes(), function(v) {
    var node = g.node(v);
    var rank2 = node.rank;
    if (!isUndefined_default(rank2)) {
      layering[rank2][node.order] = v;
    }
  });
  return layering;
}
__name(buildLayerMatrix, "buildLayerMatrix");
function normalizeRanks(g) {
  var min = min_default(
    map_default(g.nodes(), function(v) {
      return g.node(v).rank;
    })
  );
  forEach_default(g.nodes(), function(v) {
    var node = g.node(v);
    if (has_default(node, "rank")) {
      node.rank -= min;
    }
  });
}
__name(normalizeRanks, "normalizeRanks");
function removeEmptyRanks(g) {
  var offset = min_default(
    map_default(g.nodes(), function(v) {
      return g.node(v).rank;
    })
  );
  var layers = [];
  forEach_default(g.nodes(), function(v) {
    var rank2 = g.node(v).rank - offset;
    if (!layers[rank2]) {
      layers[rank2] = [];
    }
    layers[rank2].push(v);
  });
  var delta = 0;
  var nodeRankFactor = g.graph().nodeRankFactor;
  forEach_default(layers, function(vs, i) {
    if (isUndefined_default(vs) && i % nodeRankFactor !== 0) {
      --delta;
    } else if (delta) {
      forEach_default(vs, function(v) {
        g.node(v).rank += delta;
      });
    }
  });
}
__name(removeEmptyRanks, "removeEmptyRanks");
function addBorderNode(g, prefix, rank2, order2) {
  var node = {
    width: 0,
    height: 0
  };
  if (arguments.length >= 4) {
    node.rank = rank2;
    node.order = order2;
  }
  return addDummyNode(g, "border", node, prefix);
}
__name(addBorderNode, "addBorderNode");
function maxRank(g) {
  return max_default(
    map_default(g.nodes(), function(v) {
      var rank2 = g.node(v).rank;
      if (!isUndefined_default(rank2)) {
        return rank2;
      }
    })
  );
}
__name(maxRank, "maxRank");
function partition(collection, fn) {
  var result = { lhs: [], rhs: [] };
  forEach_default(collection, function(value) {
    if (fn(value)) {
      result.lhs.push(value);
    } else {
      result.rhs.push(value);
    }
  });
  return result;
}
__name(partition, "partition");
function time(name, fn) {
  var start = now_default();
  try {
    return fn();
  } finally {
    console.log(name + " time: " + (now_default() - start) + "ms");
  }
}
__name(time, "time");
function notime(name, fn) {
  return fn();
}
__name(notime, "notime");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/add-border-segments.js
function addBorderSegments(g) {
  function dfs3(v) {
    var children = g.children(v);
    var node = g.node(v);
    if (children.length) {
      forEach_default(children, dfs3);
    }
    if (Object.prototype.hasOwnProperty.call(node, "minRank")) {
      node.borderLeft = [];
      node.borderRight = [];
      for (var rank2 = node.minRank, maxRank2 = node.maxRank + 1; rank2 < maxRank2; ++rank2) {
        addBorderNode2(g, "borderLeft", "_bl", v, node, rank2);
        addBorderNode2(g, "borderRight", "_br", v, node, rank2);
      }
    }
  }
  __name(dfs3, "dfs");
  forEach_default(g.children(), dfs3);
}
__name(addBorderSegments, "addBorderSegments");
function addBorderNode2(g, prop, prefix, sg, sgNode, rank2) {
  var label = { width: 0, height: 0, rank: rank2, borderType: prop };
  var prev = sgNode[prop][rank2 - 1];
  var curr = addDummyNode(g, "border", label, prefix);
  sgNode[prop][rank2] = curr;
  g.setParent(curr, sg);
  if (prev) {
    g.setEdge(prev, curr, { weight: 1 });
  }
}
__name(addBorderNode2, "addBorderNode");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/coordinate-system.js
function adjust(g) {
  var rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === "lr" || rankDir === "rl") {
    swapWidthHeight(g);
  }
}
__name(adjust, "adjust");
function undo(g) {
  var rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === "bt" || rankDir === "rl") {
    reverseY(g);
  }
  if (rankDir === "lr" || rankDir === "rl") {
    swapXY(g);
    swapWidthHeight(g);
  }
}
__name(undo, "undo");
function swapWidthHeight(g) {
  forEach_default(g.nodes(), function(v) {
    swapWidthHeightOne(g.node(v));
  });
  forEach_default(g.edges(), function(e) {
    swapWidthHeightOne(g.edge(e));
  });
}
__name(swapWidthHeight, "swapWidthHeight");
function swapWidthHeightOne(attrs) {
  var w = attrs.width;
  attrs.width = attrs.height;
  attrs.height = w;
}
__name(swapWidthHeightOne, "swapWidthHeightOne");
function reverseY(g) {
  forEach_default(g.nodes(), function(v) {
    reverseYOne(g.node(v));
  });
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    forEach_default(edge.points, reverseYOne);
    if (Object.prototype.hasOwnProperty.call(edge, "y")) {
      reverseYOne(edge);
    }
  });
}
__name(reverseY, "reverseY");
function reverseYOne(attrs) {
  attrs.y = -attrs.y;
}
__name(reverseYOne, "reverseYOne");
function swapXY(g) {
  forEach_default(g.nodes(), function(v) {
    swapXYOne(g.node(v));
  });
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    forEach_default(edge.points, swapXYOne);
    if (Object.prototype.hasOwnProperty.call(edge, "x")) {
      swapXYOne(edge);
    }
  });
}
__name(swapXY, "swapXY");
function swapXYOne(attrs) {
  var x = attrs.x;
  attrs.x = attrs.y;
  attrs.y = x;
}
__name(swapXYOne, "swapXYOne");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/data/list.js
var List = class {
  static {
    __name(this, "List");
  }
  constructor() {
    var sentinel = {};
    sentinel._next = sentinel._prev = sentinel;
    this._sentinel = sentinel;
  }
  dequeue() {
    var sentinel = this._sentinel;
    var entry = sentinel._prev;
    if (entry !== sentinel) {
      unlink(entry);
      return entry;
    }
  }
  enqueue(entry) {
    var sentinel = this._sentinel;
    if (entry._prev && entry._next) {
      unlink(entry);
    }
    entry._next = sentinel._next;
    sentinel._next._prev = entry;
    sentinel._next = entry;
    entry._prev = sentinel;
  }
  toString() {
    var strs = [];
    var sentinel = this._sentinel;
    var curr = sentinel._prev;
    while (curr !== sentinel) {
      strs.push(JSON.stringify(curr, filterOutLinks));
      curr = curr._prev;
    }
    return "[" + strs.join(", ") + "]";
  }
};
function unlink(entry) {
  entry._prev._next = entry._next;
  entry._next._prev = entry._prev;
  delete entry._next;
  delete entry._prev;
}
__name(unlink, "unlink");
function filterOutLinks(k, v) {
  if (k !== "_next" && k !== "_prev") {
    return v;
  }
}
__name(filterOutLinks, "filterOutLinks");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/greedy-fas.js
var DEFAULT_WEIGHT_FN = constant_default(1);
function greedyFAS(g, weightFn) {
  if (g.nodeCount() <= 1) {
    return [];
  }
  var state = buildState(g, weightFn || DEFAULT_WEIGHT_FN);
  var results = doGreedyFAS(state.graph, state.buckets, state.zeroIdx);
  return flatten_default(
    map_default(results, function(e) {
      return g.outEdges(e.v, e.w);
    })
  );
}
__name(greedyFAS, "greedyFAS");
function doGreedyFAS(g, buckets, zeroIdx) {
  var results = [];
  var sources = buckets[buckets.length - 1];
  var sinks = buckets[0];
  var entry;
  while (g.nodeCount()) {
    while (entry = sinks.dequeue()) {
      removeNode(g, buckets, zeroIdx, entry);
    }
    while (entry = sources.dequeue()) {
      removeNode(g, buckets, zeroIdx, entry);
    }
    if (g.nodeCount()) {
      for (var i = buckets.length - 2; i > 0; --i) {
        entry = buckets[i].dequeue();
        if (entry) {
          results = results.concat(removeNode(g, buckets, zeroIdx, entry, true));
          break;
        }
      }
    }
  }
  return results;
}
__name(doGreedyFAS, "doGreedyFAS");
function removeNode(g, buckets, zeroIdx, entry, collectPredecessors) {
  var results = collectPredecessors ? [] : void 0;
  forEach_default(g.inEdges(entry.v), function(edge) {
    var weight = g.edge(edge);
    var uEntry = g.node(edge.v);
    if (collectPredecessors) {
      results.push({ v: edge.v, w: edge.w });
    }
    uEntry.out -= weight;
    assignBucket(buckets, zeroIdx, uEntry);
  });
  forEach_default(g.outEdges(entry.v), function(edge) {
    var weight = g.edge(edge);
    var w = edge.w;
    var wEntry = g.node(w);
    wEntry["in"] -= weight;
    assignBucket(buckets, zeroIdx, wEntry);
  });
  g.removeNode(entry.v);
  return results;
}
__name(removeNode, "removeNode");
function buildState(g, weightFn) {
  var fasGraph = new Graph();
  var maxIn = 0;
  var maxOut = 0;
  forEach_default(g.nodes(), function(v) {
    fasGraph.setNode(v, { v, in: 0, out: 0 });
  });
  forEach_default(g.edges(), function(e) {
    var prevWeight = fasGraph.edge(e.v, e.w) || 0;
    var weight = weightFn(e);
    var edgeWeight = prevWeight + weight;
    fasGraph.setEdge(e.v, e.w, edgeWeight);
    maxOut = Math.max(maxOut, fasGraph.node(e.v).out += weight);
    maxIn = Math.max(maxIn, fasGraph.node(e.w)["in"] += weight);
  });
  var buckets = range_default(maxOut + maxIn + 3).map(function() {
    return new List();
  });
  var zeroIdx = maxIn + 1;
  forEach_default(fasGraph.nodes(), function(v) {
    assignBucket(buckets, zeroIdx, fasGraph.node(v));
  });
  return { graph: fasGraph, buckets, zeroIdx };
}
__name(buildState, "buildState");
function assignBucket(buckets, zeroIdx, entry) {
  if (!entry.out) {
    buckets[0].enqueue(entry);
  } else if (!entry["in"]) {
    buckets[buckets.length - 1].enqueue(entry);
  } else {
    buckets[entry.out - entry["in"] + zeroIdx].enqueue(entry);
  }
}
__name(assignBucket, "assignBucket");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/acyclic.js
function run(g) {
  var fas = g.graph().acyclicer === "greedy" ? greedyFAS(g, weightFn(g)) : dfsFAS(g);
  forEach_default(fas, function(e) {
    var label = g.edge(e);
    g.removeEdge(e);
    label.forwardName = e.name;
    label.reversed = true;
    g.setEdge(e.w, e.v, label, uniqueId_default("rev"));
  });
  function weightFn(g2) {
    return function(e) {
      return g2.edge(e).weight;
    };
  }
  __name(weightFn, "weightFn");
}
__name(run, "run");
function dfsFAS(g) {
  var fas = [];
  var stack = {};
  var visited = {};
  function dfs3(v) {
    if (Object.prototype.hasOwnProperty.call(visited, v)) {
      return;
    }
    visited[v] = true;
    stack[v] = true;
    forEach_default(g.outEdges(v), function(e) {
      if (Object.prototype.hasOwnProperty.call(stack, e.w)) {
        fas.push(e);
      } else {
        dfs3(e.w);
      }
    });
    delete stack[v];
  }
  __name(dfs3, "dfs");
  forEach_default(g.nodes(), dfs3);
  return fas;
}
__name(dfsFAS, "dfsFAS");
function undo2(g) {
  forEach_default(g.edges(), function(e) {
    var label = g.edge(e);
    if (label.reversed) {
      g.removeEdge(e);
      var forwardName = label.forwardName;
      delete label.reversed;
      delete label.forwardName;
      g.setEdge(e.w, e.v, label, forwardName);
    }
  });
}
__name(undo2, "undo");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/normalize.js
function run2(g) {
  g.graph().dummyChains = [];
  forEach_default(g.edges(), function(edge) {
    normalizeEdge(g, edge);
  });
}
__name(run2, "run");
function normalizeEdge(g, e) {
  var v = e.v;
  var vRank = g.node(v).rank;
  var w = e.w;
  var wRank = g.node(w).rank;
  var name = e.name;
  var edgeLabel = g.edge(e);
  var labelRank = edgeLabel.labelRank;
  if (wRank === vRank + 1) return;
  g.removeEdge(e);
  var attrs = void 0;
  var dummy, i;
  for (i = 0, ++vRank; vRank < wRank; ++i, ++vRank) {
    edgeLabel.points = [];
    attrs = {
      width: 0,
      height: 0,
      edgeLabel,
      edgeObj: e,
      rank: vRank
    };
    dummy = addDummyNode(g, "edge", attrs, "_d");
    if (vRank === labelRank) {
      attrs.width = edgeLabel.width;
      attrs.height = edgeLabel.height;
      attrs.dummy = "edge-label";
      attrs.labelpos = edgeLabel.labelpos;
    }
    g.setEdge(v, dummy, { weight: edgeLabel.weight }, name);
    if (i === 0) {
      g.graph().dummyChains.push(dummy);
    }
    v = dummy;
  }
  g.setEdge(v, w, { weight: edgeLabel.weight }, name);
}
__name(normalizeEdge, "normalizeEdge");
function undo3(g) {
  forEach_default(g.graph().dummyChains, function(v) {
    var node = g.node(v);
    var origLabel = node.edgeLabel;
    var w;
    g.setEdge(node.edgeObj, origLabel);
    while (node.dummy) {
      w = g.successors(v)[0];
      g.removeNode(v);
      origLabel.points.push({ x: node.x, y: node.y });
      if (node.dummy === "edge-label") {
        origLabel.x = node.x;
        origLabel.y = node.y;
        origLabel.width = node.width;
        origLabel.height = node.height;
      }
      v = w;
      node = g.node(v);
    }
  });
}
__name(undo3, "undo");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/rank/util.js
function longestPath(g) {
  var visited = {};
  function dfs3(v) {
    var label = g.node(v);
    if (Object.prototype.hasOwnProperty.call(visited, v)) {
      return label.rank;
    }
    visited[v] = true;
    var rank2 = min_default(
      map_default(g.outEdges(v), function(e) {
        return dfs3(e.w) - g.edge(e).minlen;
      })
    );
    if (rank2 === Number.POSITIVE_INFINITY || // return value of _.map([]) for Lodash 3
    rank2 === void 0 || // return value of _.map([]) for Lodash 4
    rank2 === null) {
      rank2 = 0;
    }
    return label.rank = rank2;
  }
  __name(dfs3, "dfs");
  forEach_default(g.sources(), dfs3);
}
__name(longestPath, "longestPath");
function slack(g, e) {
  return g.node(e.w).rank - g.node(e.v).rank - g.edge(e).minlen;
}
__name(slack, "slack");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/rank/feasible-tree.js
function feasibleTree(g) {
  var t = new Graph({ directed: false });
  var start = g.nodes()[0];
  var size = g.nodeCount();
  t.setNode(start, {});
  var edge, delta;
  while (tightTree(t, g) < size) {
    edge = findMinSlackEdge(t, g);
    delta = t.hasNode(edge.v) ? slack(g, edge) : -slack(g, edge);
    shiftRanks(t, g, delta);
  }
  return t;
}
__name(feasibleTree, "feasibleTree");
function tightTree(t, g) {
  function dfs3(v) {
    forEach_default(g.nodeEdges(v), function(e) {
      var edgeV = e.v, w = v === edgeV ? e.w : edgeV;
      if (!t.hasNode(w) && !slack(g, e)) {
        t.setNode(w, {});
        t.setEdge(v, w, {});
        dfs3(w);
      }
    });
  }
  __name(dfs3, "dfs");
  forEach_default(t.nodes(), dfs3);
  return t.nodeCount();
}
__name(tightTree, "tightTree");
function findMinSlackEdge(t, g) {
  return minBy_default(g.edges(), function(e) {
    if (t.hasNode(e.v) !== t.hasNode(e.w)) {
      return slack(g, e);
    }
  });
}
__name(findMinSlackEdge, "findMinSlackEdge");
function shiftRanks(t, g, delta) {
  forEach_default(t.nodes(), function(v) {
    g.node(v).rank += delta;
  });
}
__name(shiftRanks, "shiftRanks");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/graphlib/alg/dijkstra.js
var DEFAULT_WEIGHT_FUNC = constant_default(1);

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/graphlib/alg/floyd-warshall.js
var DEFAULT_WEIGHT_FUNC2 = constant_default(1);

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/graphlib/alg/topsort.js
topsort.CycleException = CycleException;
function topsort(g) {
  var visited = {};
  var stack = {};
  var results = [];
  function visit(node) {
    if (Object.prototype.hasOwnProperty.call(stack, node)) {
      throw new CycleException();
    }
    if (!Object.prototype.hasOwnProperty.call(visited, node)) {
      stack[node] = true;
      visited[node] = true;
      forEach_default(g.predecessors(node), visit);
      delete stack[node];
      results.push(node);
    }
  }
  __name(visit, "visit");
  forEach_default(g.sinks(), visit);
  if (size_default(visited) !== g.nodeCount()) {
    throw new CycleException();
  }
  return results;
}
__name(topsort, "topsort");
function CycleException() {
}
__name(CycleException, "CycleException");
CycleException.prototype = new Error();

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/graphlib/alg/dfs.js
function dfs(g, vs, order2) {
  if (!isArray_default(vs)) {
    vs = [vs];
  }
  var navigation = (g.isDirected() ? g.successors : g.neighbors).bind(g);
  var acc = [];
  var visited = {};
  forEach_default(vs, function(v) {
    if (!g.hasNode(v)) {
      throw new Error("Graph does not have node: " + v);
    }
    doDfs(g, v, order2 === "post", visited, navigation, acc);
  });
  return acc;
}
__name(dfs, "dfs");
function doDfs(g, v, postorder3, visited, navigation, acc) {
  if (!Object.prototype.hasOwnProperty.call(visited, v)) {
    visited[v] = true;
    if (!postorder3) {
      acc.push(v);
    }
    forEach_default(navigation(v), function(w) {
      doDfs(g, w, postorder3, visited, navigation, acc);
    });
    if (postorder3) {
      acc.push(v);
    }
  }
}
__name(doDfs, "doDfs");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/graphlib/alg/postorder.js
function postorder(g, vs) {
  return dfs(g, vs, "post");
}
__name(postorder, "postorder");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/graphlib/alg/preorder.js
function preorder(g, vs) {
  return dfs(g, vs, "pre");
}
__name(preorder, "preorder");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/rank/network-simplex.js
networkSimplex.initLowLimValues = initLowLimValues;
networkSimplex.initCutValues = initCutValues;
networkSimplex.calcCutValue = calcCutValue;
networkSimplex.leaveEdge = leaveEdge;
networkSimplex.enterEdge = enterEdge;
networkSimplex.exchangeEdges = exchangeEdges;
function networkSimplex(g) {
  g = simplify(g);
  longestPath(g);
  var t = feasibleTree(g);
  initLowLimValues(t);
  initCutValues(t, g);
  var e, f;
  while (e = leaveEdge(t)) {
    f = enterEdge(t, g, e);
    exchangeEdges(t, g, e, f);
  }
}
__name(networkSimplex, "networkSimplex");
function initCutValues(t, g) {
  var vs = postorder(t, t.nodes());
  vs = vs.slice(0, vs.length - 1);
  forEach_default(vs, function(v) {
    assignCutValue(t, g, v);
  });
}
__name(initCutValues, "initCutValues");
function assignCutValue(t, g, child) {
  var childLab = t.node(child);
  var parent = childLab.parent;
  t.edge(child, parent).cutvalue = calcCutValue(t, g, child);
}
__name(assignCutValue, "assignCutValue");
function calcCutValue(t, g, child) {
  var childLab = t.node(child);
  var parent = childLab.parent;
  var childIsTail = true;
  var graphEdge = g.edge(child, parent);
  var cutValue = 0;
  if (!graphEdge) {
    childIsTail = false;
    graphEdge = g.edge(parent, child);
  }
  cutValue = graphEdge.weight;
  forEach_default(g.nodeEdges(child), function(e) {
    var isOutEdge = e.v === child, other = isOutEdge ? e.w : e.v;
    if (other !== parent) {
      var pointsToHead = isOutEdge === childIsTail, otherWeight = g.edge(e).weight;
      cutValue += pointsToHead ? otherWeight : -otherWeight;
      if (isTreeEdge(t, child, other)) {
        var otherCutValue = t.edge(child, other).cutvalue;
        cutValue += pointsToHead ? -otherCutValue : otherCutValue;
      }
    }
  });
  return cutValue;
}
__name(calcCutValue, "calcCutValue");
function initLowLimValues(tree, root) {
  if (arguments.length < 2) {
    root = tree.nodes()[0];
  }
  dfsAssignLowLim(tree, {}, 1, root);
}
__name(initLowLimValues, "initLowLimValues");
function dfsAssignLowLim(tree, visited, nextLim, v, parent) {
  var low = nextLim;
  var label = tree.node(v);
  visited[v] = true;
  forEach_default(tree.neighbors(v), function(w) {
    if (!Object.prototype.hasOwnProperty.call(visited, w)) {
      nextLim = dfsAssignLowLim(tree, visited, nextLim, w, v);
    }
  });
  label.low = low;
  label.lim = nextLim++;
  if (parent) {
    label.parent = parent;
  } else {
    delete label.parent;
  }
  return nextLim;
}
__name(dfsAssignLowLim, "dfsAssignLowLim");
function leaveEdge(tree) {
  return find_default(tree.edges(), function(e) {
    return tree.edge(e).cutvalue < 0;
  });
}
__name(leaveEdge, "leaveEdge");
function enterEdge(t, g, edge) {
  var v = edge.v;
  var w = edge.w;
  if (!g.hasEdge(v, w)) {
    v = edge.w;
    w = edge.v;
  }
  var vLabel = t.node(v);
  var wLabel = t.node(w);
  var tailLabel = vLabel;
  var flip = false;
  if (vLabel.lim > wLabel.lim) {
    tailLabel = wLabel;
    flip = true;
  }
  var candidates = filter_default(g.edges(), function(edge2) {
    return flip === isDescendant(t, t.node(edge2.v), tailLabel) && flip !== isDescendant(t, t.node(edge2.w), tailLabel);
  });
  return minBy_default(candidates, function(edge2) {
    return slack(g, edge2);
  });
}
__name(enterEdge, "enterEdge");
function exchangeEdges(t, g, e, f) {
  var v = e.v;
  var w = e.w;
  t.removeEdge(v, w);
  t.setEdge(f.v, f.w, {});
  initLowLimValues(t);
  initCutValues(t, g);
  updateRanks(t, g);
}
__name(exchangeEdges, "exchangeEdges");
function updateRanks(t, g) {
  var root = find_default(t.nodes(), function(v) {
    return !g.node(v).parent;
  });
  var vs = preorder(t, root);
  vs = vs.slice(1);
  forEach_default(vs, function(v) {
    var parent = t.node(v).parent, edge = g.edge(v, parent), flipped = false;
    if (!edge) {
      edge = g.edge(parent, v);
      flipped = true;
    }
    g.node(v).rank = g.node(parent).rank + (flipped ? edge.minlen : -edge.minlen);
  });
}
__name(updateRanks, "updateRanks");
function isTreeEdge(tree, u, v) {
  return tree.hasEdge(u, v);
}
__name(isTreeEdge, "isTreeEdge");
function isDescendant(tree, vLabel, rootLabel) {
  return rootLabel.low <= vLabel.lim && vLabel.lim <= rootLabel.lim;
}
__name(isDescendant, "isDescendant");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/rank/index.js
function rank(g) {
  switch (g.graph().ranker) {
    case "network-simplex":
      networkSimplexRanker(g);
      break;
    case "tight-tree":
      tightTreeRanker(g);
      break;
    case "longest-path":
      longestPathRanker(g);
      break;
    default:
      networkSimplexRanker(g);
  }
}
__name(rank, "rank");
var longestPathRanker = longestPath;
function tightTreeRanker(g) {
  longestPath(g);
  feasibleTree(g);
}
__name(tightTreeRanker, "tightTreeRanker");
function networkSimplexRanker(g) {
  networkSimplex(g);
}
__name(networkSimplexRanker, "networkSimplexRanker");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/nesting-graph.js
function run3(g) {
  var root = addDummyNode(g, "root", {}, "_root");
  var depths = treeDepths(g);
  var height = max_default(values_default(depths)) - 1;
  var nodeSep = 2 * height + 1;
  g.graph().nestingRoot = root;
  forEach_default(g.edges(), function(e) {
    g.edge(e).minlen *= nodeSep;
  });
  var weight = sumWeights(g) + 1;
  forEach_default(g.children(), function(child) {
    dfs2(g, root, nodeSep, weight, height, depths, child);
  });
  g.graph().nodeRankFactor = nodeSep;
}
__name(run3, "run");
function dfs2(g, root, nodeSep, weight, height, depths, v) {
  var children = g.children(v);
  if (!children.length) {
    if (v !== root) {
      g.setEdge(root, v, { weight: 0, minlen: nodeSep });
    }
    return;
  }
  var top = addBorderNode(g, "_bt");
  var bottom = addBorderNode(g, "_bb");
  var label = g.node(v);
  g.setParent(top, v);
  label.borderTop = top;
  g.setParent(bottom, v);
  label.borderBottom = bottom;
  forEach_default(children, function(child) {
    dfs2(g, root, nodeSep, weight, height, depths, child);
    var childNode = g.node(child);
    var childTop = childNode.borderTop ? childNode.borderTop : child;
    var childBottom = childNode.borderBottom ? childNode.borderBottom : child;
    var thisWeight = childNode.borderTop ? weight : 2 * weight;
    var minlen = childTop !== childBottom ? 1 : height - depths[v] + 1;
    g.setEdge(top, childTop, {
      weight: thisWeight,
      minlen,
      nestingEdge: true
    });
    g.setEdge(childBottom, bottom, {
      weight: thisWeight,
      minlen,
      nestingEdge: true
    });
  });
  if (!g.parent(v)) {
    g.setEdge(root, top, { weight: 0, minlen: height + depths[v] });
  }
}
__name(dfs2, "dfs");
function treeDepths(g) {
  var depths = {};
  function dfs3(v, depth) {
    var children = g.children(v);
    if (children && children.length) {
      forEach_default(children, function(child) {
        dfs3(child, depth + 1);
      });
    }
    depths[v] = depth;
  }
  __name(dfs3, "dfs");
  forEach_default(g.children(), function(v) {
    dfs3(v, 1);
  });
  return depths;
}
__name(treeDepths, "treeDepths");
function sumWeights(g) {
  return reduce_default(
    g.edges(),
    function(acc, e) {
      return acc + g.edge(e).weight;
    },
    0
  );
}
__name(sumWeights, "sumWeights");
function cleanup(g) {
  var graphLabel = g.graph();
  g.removeNode(graphLabel.nestingRoot);
  delete graphLabel.nestingRoot;
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    if (edge.nestingEdge) {
      g.removeEdge(e);
    }
  });
}
__name(cleanup, "cleanup");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/add-subgraph-constraints.js
function addSubgraphConstraints(g, cg, vs) {
  var prev = {}, rootPrev;
  forEach_default(vs, function(v) {
    var child = g.parent(v), parent, prevChild;
    while (child) {
      parent = g.parent(child);
      if (parent) {
        prevChild = prev[parent];
        prev[parent] = child;
      } else {
        prevChild = rootPrev;
        rootPrev = child;
      }
      if (prevChild && prevChild !== child) {
        cg.setEdge(prevChild, child);
        return;
      }
      child = parent;
    }
  });
}
__name(addSubgraphConstraints, "addSubgraphConstraints");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/build-layer-graph.js
function buildLayerGraph(g, rank2, relationship) {
  var root = createRootNode(g), result = new Graph({ compound: true }).setGraph({ root }).setDefaultNodeLabel(function(v) {
    return g.node(v);
  });
  forEach_default(g.nodes(), function(v) {
    var node = g.node(v), parent = g.parent(v);
    if (node.rank === rank2 || node.minRank <= rank2 && rank2 <= node.maxRank) {
      result.setNode(v);
      result.setParent(v, parent || root);
      forEach_default(g[relationship](v), function(e) {
        var u = e.v === v ? e.w : e.v, edge = result.edge(u, v), weight = !isUndefined_default(edge) ? edge.weight : 0;
        result.setEdge(u, v, { weight: g.edge(e).weight + weight });
      });
      if (Object.prototype.hasOwnProperty.call(node, "minRank")) {
        result.setNode(v, {
          borderLeft: node.borderLeft[rank2],
          borderRight: node.borderRight[rank2]
        });
      }
    }
  });
  return result;
}
__name(buildLayerGraph, "buildLayerGraph");
function createRootNode(g) {
  var v;
  while (g.hasNode(v = uniqueId_default("_root"))) ;
  return v;
}
__name(createRootNode, "createRootNode");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/cross-count.js
function crossCount(g, layering) {
  var cc = 0;
  for (var i = 1; i < layering.length; ++i) {
    cc += twoLayerCrossCount(g, layering[i - 1], layering[i]);
  }
  return cc;
}
__name(crossCount, "crossCount");
function twoLayerCrossCount(g, northLayer, southLayer) {
  var southPos = zipObject_default(
    southLayer,
    map_default(southLayer, function(v, i) {
      return i;
    })
  );
  var southEntries = flatten_default(
    map_default(northLayer, function(v) {
      return sortBy_default(
        map_default(g.outEdges(v), function(e) {
          return { pos: southPos[e.w], weight: g.edge(e).weight };
        }),
        "pos"
      );
    })
  );
  var firstIndex = 1;
  while (firstIndex < southLayer.length) firstIndex <<= 1;
  var treeSize = 2 * firstIndex - 1;
  firstIndex -= 1;
  var tree = map_default(new Array(treeSize), function() {
    return 0;
  });
  var cc = 0;
  forEach_default(
    // @ts-expect-error
    southEntries.forEach(function(entry) {
      var index = entry.pos + firstIndex;
      tree[index] += entry.weight;
      var weightSum = 0;
      while (index > 0) {
        if (index % 2) {
          weightSum += tree[index + 1];
        }
        index = index - 1 >> 1;
        tree[index] += entry.weight;
      }
      cc += entry.weight * weightSum;
    })
  );
  return cc;
}
__name(twoLayerCrossCount, "twoLayerCrossCount");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/init-order.js
function initOrder(g) {
  var visited = {};
  var simpleNodes = filter_default(g.nodes(), function(v) {
    return !g.children(v).length;
  });
  var maxRank2 = max_default(
    map_default(simpleNodes, function(v) {
      return g.node(v).rank;
    })
  );
  var layers = map_default(range_default(maxRank2 + 1), function() {
    return [];
  });
  function dfs3(v) {
    if (has_default(visited, v)) return;
    visited[v] = true;
    var node = g.node(v);
    layers[node.rank].push(v);
    forEach_default(g.successors(v), dfs3);
  }
  __name(dfs3, "dfs");
  var orderedVs = sortBy_default(simpleNodes, function(v) {
    return g.node(v).rank;
  });
  forEach_default(orderedVs, dfs3);
  return layers;
}
__name(initOrder, "initOrder");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/barycenter.js
function barycenter(g, movable) {
  return map_default(movable, function(v) {
    var inV = g.inEdges(v);
    if (!inV.length) {
      return { v };
    } else {
      var result = reduce_default(
        inV,
        function(acc, e) {
          var edge = g.edge(e), nodeU = g.node(e.v);
          return {
            sum: acc.sum + edge.weight * nodeU.order,
            weight: acc.weight + edge.weight
          };
        },
        { sum: 0, weight: 0 }
      );
      return {
        v,
        barycenter: result.sum / result.weight,
        weight: result.weight
      };
    }
  });
}
__name(barycenter, "barycenter");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/resolve-conflicts.js
function resolveConflicts(entries, cg) {
  var mappedEntries = {};
  forEach_default(entries, function(entry, i) {
    var tmp = mappedEntries[entry.v] = {
      indegree: 0,
      in: [],
      out: [],
      vs: [entry.v],
      i
    };
    if (!isUndefined_default(entry.barycenter)) {
      tmp.barycenter = entry.barycenter;
      tmp.weight = entry.weight;
    }
  });
  forEach_default(cg.edges(), function(e) {
    var entryV = mappedEntries[e.v];
    var entryW = mappedEntries[e.w];
    if (!isUndefined_default(entryV) && !isUndefined_default(entryW)) {
      entryW.indegree++;
      entryV.out.push(mappedEntries[e.w]);
    }
  });
  var sourceSet = filter_default(mappedEntries, function(entry) {
    return !entry.indegree;
  });
  return doResolveConflicts(sourceSet);
}
__name(resolveConflicts, "resolveConflicts");
function doResolveConflicts(sourceSet) {
  var entries = [];
  function handleIn(vEntry) {
    return function(uEntry) {
      if (uEntry.merged) {
        return;
      }
      if (isUndefined_default(uEntry.barycenter) || isUndefined_default(vEntry.barycenter) || uEntry.barycenter >= vEntry.barycenter) {
        mergeEntries(vEntry, uEntry);
      }
    };
  }
  __name(handleIn, "handleIn");
  function handleOut(vEntry) {
    return function(wEntry) {
      wEntry["in"].push(vEntry);
      if (--wEntry.indegree === 0) {
        sourceSet.push(wEntry);
      }
    };
  }
  __name(handleOut, "handleOut");
  while (sourceSet.length) {
    var entry = sourceSet.pop();
    entries.push(entry);
    forEach_default(entry["in"].reverse(), handleIn(entry));
    forEach_default(entry.out, handleOut(entry));
  }
  return map_default(
    filter_default(entries, function(entry2) {
      return !entry2.merged;
    }),
    function(entry2) {
      return pick_default(entry2, ["vs", "i", "barycenter", "weight"]);
    }
  );
}
__name(doResolveConflicts, "doResolveConflicts");
function mergeEntries(target, source) {
  var sum = 0;
  var weight = 0;
  if (target.weight) {
    sum += target.barycenter * target.weight;
    weight += target.weight;
  }
  if (source.weight) {
    sum += source.barycenter * source.weight;
    weight += source.weight;
  }
  target.vs = source.vs.concat(target.vs);
  target.barycenter = sum / weight;
  target.weight = weight;
  target.i = Math.min(source.i, target.i);
  source.merged = true;
}
__name(mergeEntries, "mergeEntries");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/sort.js
function sort(entries, biasRight) {
  var parts = partition(entries, function(entry) {
    return Object.prototype.hasOwnProperty.call(entry, "barycenter");
  });
  var sortable = parts.lhs, unsortable = sortBy_default(parts.rhs, function(entry) {
    return -entry.i;
  }), vs = [], sum = 0, weight = 0, vsIndex = 0;
  sortable.sort(compareWithBias(!!biasRight));
  vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
  forEach_default(sortable, function(entry) {
    vsIndex += entry.vs.length;
    vs.push(entry.vs);
    sum += entry.barycenter * entry.weight;
    weight += entry.weight;
    vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
  });
  var result = { vs: flatten_default(vs) };
  if (weight) {
    result.barycenter = sum / weight;
    result.weight = weight;
  }
  return result;
}
__name(sort, "sort");
function consumeUnsortable(vs, unsortable, index) {
  var last;
  while (unsortable.length && (last = last_default(unsortable)).i <= index) {
    unsortable.pop();
    vs.push(last.vs);
    index++;
  }
  return index;
}
__name(consumeUnsortable, "consumeUnsortable");
function compareWithBias(bias) {
  return function(entryV, entryW) {
    if (entryV.barycenter < entryW.barycenter) {
      return -1;
    } else if (entryV.barycenter > entryW.barycenter) {
      return 1;
    }
    return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
  };
}
__name(compareWithBias, "compareWithBias");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/sort-subgraph.js
function sortSubgraph(g, v, cg, biasRight) {
  var movable = g.children(v);
  var node = g.node(v);
  var bl = node ? node.borderLeft : void 0;
  var br = node ? node.borderRight : void 0;
  var subgraphs = {};
  if (bl) {
    movable = filter_default(movable, function(w) {
      return w !== bl && w !== br;
    });
  }
  var barycenters = barycenter(g, movable);
  forEach_default(barycenters, function(entry) {
    if (g.children(entry.v).length) {
      var subgraphResult = sortSubgraph(g, entry.v, cg, biasRight);
      subgraphs[entry.v] = subgraphResult;
      if (Object.prototype.hasOwnProperty.call(subgraphResult, "barycenter")) {
        mergeBarycenters(entry, subgraphResult);
      }
    }
  });
  var entries = resolveConflicts(barycenters, cg);
  expandSubgraphs(entries, subgraphs);
  var result = sort(entries, biasRight);
  if (bl) {
    result.vs = flatten_default([bl, result.vs, br]);
    if (g.predecessors(bl).length) {
      var blPred = g.node(g.predecessors(bl)[0]), brPred = g.node(g.predecessors(br)[0]);
      if (!Object.prototype.hasOwnProperty.call(result, "barycenter")) {
        result.barycenter = 0;
        result.weight = 0;
      }
      result.barycenter = (result.barycenter * result.weight + blPred.order + brPred.order) / (result.weight + 2);
      result.weight += 2;
    }
  }
  return result;
}
__name(sortSubgraph, "sortSubgraph");
function expandSubgraphs(entries, subgraphs) {
  forEach_default(entries, function(entry) {
    entry.vs = flatten_default(
      entry.vs.map(function(v) {
        if (subgraphs[v]) {
          return subgraphs[v].vs;
        }
        return v;
      })
    );
  });
}
__name(expandSubgraphs, "expandSubgraphs");
function mergeBarycenters(target, other) {
  if (!isUndefined_default(target.barycenter)) {
    target.barycenter = (target.barycenter * target.weight + other.barycenter * other.weight) / (target.weight + other.weight);
    target.weight += other.weight;
  } else {
    target.barycenter = other.barycenter;
    target.weight = other.weight;
  }
}
__name(mergeBarycenters, "mergeBarycenters");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/order/index.js
function order(g) {
  var maxRank2 = maxRank(g), downLayerGraphs = buildLayerGraphs(g, range_default(1, maxRank2 + 1), "inEdges"), upLayerGraphs = buildLayerGraphs(g, range_default(maxRank2 - 1, -1, -1), "outEdges");
  var layering = initOrder(g);
  assignOrder(g, layering);
  var bestCC = Number.POSITIVE_INFINITY, best;
  for (var i = 0, lastBest = 0; lastBest < 4; ++i, ++lastBest) {
    sweepLayerGraphs(i % 2 ? downLayerGraphs : upLayerGraphs, i % 4 >= 2);
    layering = buildLayerMatrix(g);
    var cc = crossCount(g, layering);
    if (cc < bestCC) {
      lastBest = 0;
      best = cloneDeep_default(layering);
      bestCC = cc;
    }
  }
  assignOrder(g, best);
}
__name(order, "order");
function buildLayerGraphs(g, ranks, relationship) {
  return map_default(ranks, function(rank2) {
    return buildLayerGraph(g, rank2, relationship);
  });
}
__name(buildLayerGraphs, "buildLayerGraphs");
function sweepLayerGraphs(layerGraphs, biasRight) {
  var cg = new Graph();
  forEach_default(layerGraphs, function(lg) {
    var root = lg.graph().root;
    var sorted = sortSubgraph(lg, root, cg, biasRight);
    forEach_default(sorted.vs, function(v, i) {
      lg.node(v).order = i;
    });
    addSubgraphConstraints(lg, cg, sorted.vs);
  });
}
__name(sweepLayerGraphs, "sweepLayerGraphs");
function assignOrder(g, layering) {
  forEach_default(layering, function(layer) {
    forEach_default(layer, function(v, i) {
      g.node(v).order = i;
    });
  });
}
__name(assignOrder, "assignOrder");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/parent-dummy-chains.js
function parentDummyChains(g) {
  var postorderNums = postorder2(g);
  forEach_default(g.graph().dummyChains, function(v) {
    var node = g.node(v);
    var edgeObj = node.edgeObj;
    var pathData = findPath(g, postorderNums, edgeObj.v, edgeObj.w);
    var path = pathData.path;
    var lca = pathData.lca;
    var pathIdx = 0;
    var pathV = path[pathIdx];
    var ascending = true;
    while (v !== edgeObj.w) {
      node = g.node(v);
      if (ascending) {
        while ((pathV = path[pathIdx]) !== lca && g.node(pathV).maxRank < node.rank) {
          pathIdx++;
        }
        if (pathV === lca) {
          ascending = false;
        }
      }
      if (!ascending) {
        while (pathIdx < path.length - 1 && g.node(pathV = path[pathIdx + 1]).minRank <= node.rank) {
          pathIdx++;
        }
        pathV = path[pathIdx];
      }
      g.setParent(v, pathV);
      v = g.successors(v)[0];
    }
  });
}
__name(parentDummyChains, "parentDummyChains");
function findPath(g, postorderNums, v, w) {
  var vPath = [];
  var wPath = [];
  var low = Math.min(postorderNums[v].low, postorderNums[w].low);
  var lim = Math.max(postorderNums[v].lim, postorderNums[w].lim);
  var parent;
  var lca;
  parent = v;
  do {
    parent = g.parent(parent);
    vPath.push(parent);
  } while (parent && (postorderNums[parent].low > low || lim > postorderNums[parent].lim));
  lca = parent;
  parent = w;
  while ((parent = g.parent(parent)) !== lca) {
    wPath.push(parent);
  }
  return { path: vPath.concat(wPath.reverse()), lca };
}
__name(findPath, "findPath");
function postorder2(g) {
  var result = {};
  var lim = 0;
  function dfs3(v) {
    var low = lim;
    forEach_default(g.children(v), dfs3);
    result[v] = { low, lim: lim++ };
  }
  __name(dfs3, "dfs");
  forEach_default(g.children(), dfs3);
  return result;
}
__name(postorder2, "postorder");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/position/bk.js
function findType1Conflicts(g, layering) {
  var conflicts = {};
  function visitLayer(prevLayer, layer) {
    var k0 = 0, scanPos = 0, prevLayerLength = prevLayer.length, lastNode = last_default(layer);
    forEach_default(layer, function(v, i) {
      var w = findOtherInnerSegmentNode(g, v), k1 = w ? g.node(w).order : prevLayerLength;
      if (w || v === lastNode) {
        forEach_default(layer.slice(scanPos, i + 1), function(scanNode) {
          forEach_default(g.predecessors(scanNode), function(u) {
            var uLabel = g.node(u), uPos = uLabel.order;
            if ((uPos < k0 || k1 < uPos) && !(uLabel.dummy && g.node(scanNode).dummy)) {
              addConflict(conflicts, u, scanNode);
            }
          });
        });
        scanPos = i + 1;
        k0 = k1;
      }
    });
    return layer;
  }
  __name(visitLayer, "visitLayer");
  reduce_default(layering, visitLayer);
  return conflicts;
}
__name(findType1Conflicts, "findType1Conflicts");
function findType2Conflicts(g, layering) {
  var conflicts = {};
  function scan(south, southPos, southEnd, prevNorthBorder, nextNorthBorder) {
    var v;
    forEach_default(range_default(southPos, southEnd), function(i) {
      v = south[i];
      if (g.node(v).dummy) {
        forEach_default(g.predecessors(v), function(u) {
          var uNode = g.node(u);
          if (uNode.dummy && (uNode.order < prevNorthBorder || uNode.order > nextNorthBorder)) {
            addConflict(conflicts, u, v);
          }
        });
      }
    });
  }
  __name(scan, "scan");
  function visitLayer(north, south) {
    var prevNorthPos = -1, nextNorthPos, southPos = 0;
    forEach_default(south, function(v, southLookahead) {
      if (g.node(v).dummy === "border") {
        var predecessors = g.predecessors(v);
        if (predecessors.length) {
          nextNorthPos = g.node(predecessors[0]).order;
          scan(south, southPos, southLookahead, prevNorthPos, nextNorthPos);
          southPos = southLookahead;
          prevNorthPos = nextNorthPos;
        }
      }
      scan(south, southPos, south.length, nextNorthPos, north.length);
    });
    return south;
  }
  __name(visitLayer, "visitLayer");
  reduce_default(layering, visitLayer);
  return conflicts;
}
__name(findType2Conflicts, "findType2Conflicts");
function findOtherInnerSegmentNode(g, v) {
  if (g.node(v).dummy) {
    return find_default(g.predecessors(v), function(u) {
      return g.node(u).dummy;
    });
  }
}
__name(findOtherInnerSegmentNode, "findOtherInnerSegmentNode");
function addConflict(conflicts, v, w) {
  if (v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }
  var conflictsV = conflicts[v];
  if (!conflictsV) {
    conflicts[v] = conflictsV = {};
  }
  conflictsV[w] = true;
}
__name(addConflict, "addConflict");
function hasConflict(conflicts, v, w) {
  if (v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }
  return !!conflicts[v] && Object.prototype.hasOwnProperty.call(conflicts[v], w);
}
__name(hasConflict, "hasConflict");
function verticalAlignment(g, layering, conflicts, neighborFn) {
  var root = {}, align = {}, pos = {};
  forEach_default(layering, function(layer) {
    forEach_default(layer, function(v, order2) {
      root[v] = v;
      align[v] = v;
      pos[v] = order2;
    });
  });
  forEach_default(layering, function(layer) {
    var prevIdx = -1;
    forEach_default(layer, function(v) {
      var ws = neighborFn(v);
      if (ws.length) {
        ws = sortBy_default(ws, function(w2) {
          return pos[w2];
        });
        var mp = (ws.length - 1) / 2;
        for (var i = Math.floor(mp), il = Math.ceil(mp); i <= il; ++i) {
          var w = ws[i];
          if (align[v] === v && prevIdx < pos[w] && !hasConflict(conflicts, v, w)) {
            align[w] = v;
            align[v] = root[v] = root[w];
            prevIdx = pos[w];
          }
        }
      }
    });
  });
  return { root, align };
}
__name(verticalAlignment, "verticalAlignment");
function horizontalCompaction(g, layering, root, align, reverseSep) {
  var xs = {}, blockG = buildBlockGraph(g, layering, root, reverseSep), borderType = reverseSep ? "borderLeft" : "borderRight";
  function iterate(setXsFunc, nextNodesFunc) {
    var stack = blockG.nodes();
    var elem = stack.pop();
    var visited = {};
    while (elem) {
      if (visited[elem]) {
        setXsFunc(elem);
      } else {
        visited[elem] = true;
        stack.push(elem);
        stack = stack.concat(nextNodesFunc(elem));
      }
      elem = stack.pop();
    }
  }
  __name(iterate, "iterate");
  function pass1(elem) {
    xs[elem] = blockG.inEdges(elem).reduce(function(acc, e) {
      return Math.max(acc, xs[e.v] + blockG.edge(e));
    }, 0);
  }
  __name(pass1, "pass1");
  function pass2(elem) {
    var min = blockG.outEdges(elem).reduce(function(acc, e) {
      return Math.min(acc, xs[e.w] - blockG.edge(e));
    }, Number.POSITIVE_INFINITY);
    var node = g.node(elem);
    if (min !== Number.POSITIVE_INFINITY && node.borderType !== borderType) {
      xs[elem] = Math.max(xs[elem], min);
    }
  }
  __name(pass2, "pass2");
  iterate(pass1, blockG.predecessors.bind(blockG));
  iterate(pass2, blockG.successors.bind(blockG));
  forEach_default(align, function(v) {
    xs[v] = xs[root[v]];
  });
  return xs;
}
__name(horizontalCompaction, "horizontalCompaction");
function buildBlockGraph(g, layering, root, reverseSep) {
  var blockGraph = new Graph(), graphLabel = g.graph(), sepFn = sep(graphLabel.nodesep, graphLabel.edgesep, reverseSep);
  forEach_default(layering, function(layer) {
    var u;
    forEach_default(layer, function(v) {
      var vRoot = root[v];
      blockGraph.setNode(vRoot);
      if (u) {
        var uRoot = root[u], prevMax = blockGraph.edge(uRoot, vRoot);
        blockGraph.setEdge(uRoot, vRoot, Math.max(sepFn(g, v, u), prevMax || 0));
      }
      u = v;
    });
  });
  return blockGraph;
}
__name(buildBlockGraph, "buildBlockGraph");
function findSmallestWidthAlignment(g, xss) {
  return minBy_default(values_default(xss), function(xs) {
    var max = Number.NEGATIVE_INFINITY;
    var min = Number.POSITIVE_INFINITY;
    forIn_default(xs, function(x, v) {
      var halfWidth = width(g, v) / 2;
      max = Math.max(x + halfWidth, max);
      min = Math.min(x - halfWidth, min);
    });
    return max - min;
  });
}
__name(findSmallestWidthAlignment, "findSmallestWidthAlignment");
function alignCoordinates(xss, alignTo) {
  var alignToVals = values_default(alignTo), alignToMin = min_default(alignToVals), alignToMax = max_default(alignToVals);
  forEach_default(["u", "d"], function(vert) {
    forEach_default(["l", "r"], function(horiz) {
      var alignment = vert + horiz, xs = xss[alignment], delta;
      if (xs === alignTo) return;
      var xsVals = values_default(xs);
      delta = horiz === "l" ? alignToMin - min_default(xsVals) : alignToMax - max_default(xsVals);
      if (delta) {
        xss[alignment] = mapValues_default(xs, function(x) {
          return x + delta;
        });
      }
    });
  });
}
__name(alignCoordinates, "alignCoordinates");
function balance(xss, align) {
  return mapValues_default(xss.ul, function(ignore, v) {
    if (align) {
      return xss[align.toLowerCase()][v];
    } else {
      var xs = sortBy_default(map_default(xss, v));
      return (xs[1] + xs[2]) / 2;
    }
  });
}
__name(balance, "balance");
function positionX(g) {
  var layering = buildLayerMatrix(g);
  var conflicts = merge_default(findType1Conflicts(g, layering), findType2Conflicts(g, layering));
  var xss = {};
  var adjustedLayering;
  forEach_default(["u", "d"], function(vert) {
    adjustedLayering = vert === "u" ? layering : values_default(layering).reverse();
    forEach_default(["l", "r"], function(horiz) {
      if (horiz === "r") {
        adjustedLayering = map_default(adjustedLayering, function(inner) {
          return values_default(inner).reverse();
        });
      }
      var neighborFn = (vert === "u" ? g.predecessors : g.successors).bind(g);
      var align = verticalAlignment(g, adjustedLayering, conflicts, neighborFn);
      var xs = horizontalCompaction(g, adjustedLayering, align.root, align.align, horiz === "r");
      if (horiz === "r") {
        xs = mapValues_default(xs, function(x) {
          return -x;
        });
      }
      xss[vert + horiz] = xs;
    });
  });
  var smallestWidth = findSmallestWidthAlignment(g, xss);
  alignCoordinates(xss, smallestWidth);
  return balance(xss, g.graph().align);
}
__name(positionX, "positionX");
function sep(nodeSep, edgeSep, reverseSep) {
  return function(g, v, w) {
    var vLabel = g.node(v);
    var wLabel = g.node(w);
    var sum = 0;
    var delta;
    sum += vLabel.width / 2;
    if (Object.prototype.hasOwnProperty.call(vLabel, "labelpos")) {
      switch (vLabel.labelpos.toLowerCase()) {
        case "l":
          delta = -vLabel.width / 2;
          break;
        case "r":
          delta = vLabel.width / 2;
          break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;
    sum += (vLabel.dummy ? edgeSep : nodeSep) / 2;
    sum += (wLabel.dummy ? edgeSep : nodeSep) / 2;
    sum += wLabel.width / 2;
    if (Object.prototype.hasOwnProperty.call(wLabel, "labelpos")) {
      switch (wLabel.labelpos.toLowerCase()) {
        case "l":
          delta = wLabel.width / 2;
          break;
        case "r":
          delta = -wLabel.width / 2;
          break;
      }
    }
    if (delta) {
      sum += reverseSep ? delta : -delta;
    }
    delta = 0;
    return sum;
  };
}
__name(sep, "sep");
function width(g, v) {
  return g.node(v).width;
}
__name(width, "width");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/position/index.js
function position(g) {
  g = asNonCompoundGraph(g);
  positionY(g);
  forOwn_default(positionX(g), function(x, v) {
    g.node(v).x = x;
  });
}
__name(position, "position");
function positionY(g) {
  var layering = buildLayerMatrix(g);
  var rankSep = g.graph().ranksep;
  var prevY = 0;
  forEach_default(layering, function(layer) {
    var maxHeight = max_default(
      map_default(layer, function(v) {
        return g.node(v).height;
      })
    );
    forEach_default(layer, function(v) {
      g.node(v).y = prevY + maxHeight / 2;
    });
    prevY += maxHeight + rankSep;
  });
}
__name(positionY, "positionY");

// ../../node_modules/.pnpm/dagre-d3-es@7.0.11/node_modules/dagre-d3-es/src/dagre/layout.js
function layout(g, opts) {
  var time2 = opts && opts.debugTiming ? time : notime;
  time2("layout", () => {
    var layoutGraph = time2("  buildLayoutGraph", () => buildLayoutGraph(g));
    time2("  runLayout", () => runLayout(layoutGraph, time2));
    time2("  updateInputGraph", () => updateInputGraph(g, layoutGraph));
  });
}
__name(layout, "layout");
function runLayout(g, time2) {
  time2("    makeSpaceForEdgeLabels", () => makeSpaceForEdgeLabels(g));
  time2("    removeSelfEdges", () => removeSelfEdges(g));
  time2("    acyclic", () => run(g));
  time2("    nestingGraph.run", () => run3(g));
  time2("    rank", () => rank(asNonCompoundGraph(g)));
  time2("    injectEdgeLabelProxies", () => injectEdgeLabelProxies(g));
  time2("    removeEmptyRanks", () => removeEmptyRanks(g));
  time2("    nestingGraph.cleanup", () => cleanup(g));
  time2("    normalizeRanks", () => normalizeRanks(g));
  time2("    assignRankMinMax", () => assignRankMinMax(g));
  time2("    removeEdgeLabelProxies", () => removeEdgeLabelProxies(g));
  time2("    normalize.run", () => run2(g));
  time2("    parentDummyChains", () => parentDummyChains(g));
  time2("    addBorderSegments", () => addBorderSegments(g));
  time2("    order", () => order(g));
  time2("    insertSelfEdges", () => insertSelfEdges(g));
  time2("    adjustCoordinateSystem", () => adjust(g));
  time2("    position", () => position(g));
  time2("    positionSelfEdges", () => positionSelfEdges(g));
  time2("    removeBorderNodes", () => removeBorderNodes(g));
  time2("    normalize.undo", () => undo3(g));
  time2("    fixupEdgeLabelCoords", () => fixupEdgeLabelCoords(g));
  time2("    undoCoordinateSystem", () => undo(g));
  time2("    translateGraph", () => translateGraph(g));
  time2("    assignNodeIntersects", () => assignNodeIntersects(g));
  time2("    reversePoints", () => reversePointsForReversedEdges(g));
  time2("    acyclic.undo", () => undo2(g));
}
__name(runLayout, "runLayout");
function updateInputGraph(inputGraph, layoutGraph) {
  forEach_default(inputGraph.nodes(), function(v) {
    var inputLabel = inputGraph.node(v);
    var layoutLabel = layoutGraph.node(v);
    if (inputLabel) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
      if (layoutGraph.children(v).length) {
        inputLabel.width = layoutLabel.width;
        inputLabel.height = layoutLabel.height;
      }
    }
  });
  forEach_default(inputGraph.edges(), function(e) {
    var inputLabel = inputGraph.edge(e);
    var layoutLabel = layoutGraph.edge(e);
    inputLabel.points = layoutLabel.points;
    if (Object.prototype.hasOwnProperty.call(layoutLabel, "x")) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
    }
  });
  inputGraph.graph().width = layoutGraph.graph().width;
  inputGraph.graph().height = layoutGraph.graph().height;
}
__name(updateInputGraph, "updateInputGraph");
var graphNumAttrs = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
var graphDefaults = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "tb" };
var graphAttrs = ["acyclicer", "ranker", "rankdir", "align"];
var nodeNumAttrs = ["width", "height"];
var nodeDefaults = { width: 0, height: 0 };
var edgeNumAttrs = ["minlen", "weight", "width", "height", "labeloffset"];
var edgeDefaults = {
  minlen: 1,
  weight: 1,
  width: 0,
  height: 0,
  labeloffset: 10,
  labelpos: "r"
};
var edgeAttrs = ["labelpos"];
function buildLayoutGraph(inputGraph) {
  var g = new Graph({ multigraph: true, compound: true });
  var graph = canonicalize(inputGraph.graph());
  g.setGraph(
    merge_default({}, graphDefaults, selectNumberAttrs(graph, graphNumAttrs), pick_default(graph, graphAttrs))
  );
  forEach_default(inputGraph.nodes(), function(v) {
    var node = canonicalize(inputGraph.node(v));
    g.setNode(v, defaults_default(selectNumberAttrs(node, nodeNumAttrs), nodeDefaults));
    g.setParent(v, inputGraph.parent(v));
  });
  forEach_default(inputGraph.edges(), function(e) {
    var edge = canonicalize(inputGraph.edge(e));
    g.setEdge(
      e,
      merge_default({}, edgeDefaults, selectNumberAttrs(edge, edgeNumAttrs), pick_default(edge, edgeAttrs))
    );
  });
  return g;
}
__name(buildLayoutGraph, "buildLayoutGraph");
function makeSpaceForEdgeLabels(g) {
  var graph = g.graph();
  graph.ranksep /= 2;
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    edge.minlen *= 2;
    if (edge.labelpos.toLowerCase() !== "c") {
      if (graph.rankdir === "TB" || graph.rankdir === "BT") {
        edge.width += edge.labeloffset;
      } else {
        edge.height += edge.labeloffset;
      }
    }
  });
}
__name(makeSpaceForEdgeLabels, "makeSpaceForEdgeLabels");
function injectEdgeLabelProxies(g) {
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    if (edge.width && edge.height) {
      var v = g.node(e.v);
      var w = g.node(e.w);
      var label = { rank: (w.rank - v.rank) / 2 + v.rank, e };
      addDummyNode(g, "edge-proxy", label, "_ep");
    }
  });
}
__name(injectEdgeLabelProxies, "injectEdgeLabelProxies");
function assignRankMinMax(g) {
  var maxRank2 = 0;
  forEach_default(g.nodes(), function(v) {
    var node = g.node(v);
    if (node.borderTop) {
      node.minRank = g.node(node.borderTop).rank;
      node.maxRank = g.node(node.borderBottom).rank;
      maxRank2 = max_default(maxRank2, node.maxRank);
    }
  });
  g.graph().maxRank = maxRank2;
}
__name(assignRankMinMax, "assignRankMinMax");
function removeEdgeLabelProxies(g) {
  forEach_default(g.nodes(), function(v) {
    var node = g.node(v);
    if (node.dummy === "edge-proxy") {
      g.edge(node.e).labelRank = node.rank;
      g.removeNode(v);
    }
  });
}
__name(removeEdgeLabelProxies, "removeEdgeLabelProxies");
function translateGraph(g) {
  var minX = Number.POSITIVE_INFINITY;
  var maxX = 0;
  var minY = Number.POSITIVE_INFINITY;
  var maxY = 0;
  var graphLabel = g.graph();
  var marginX = graphLabel.marginx || 0;
  var marginY = graphLabel.marginy || 0;
  function getExtremes(attrs) {
    var x = attrs.x;
    var y = attrs.y;
    var w = attrs.width;
    var h = attrs.height;
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2);
    maxY = Math.max(maxY, y + h / 2);
  }
  __name(getExtremes, "getExtremes");
  forEach_default(g.nodes(), function(v) {
    getExtremes(g.node(v));
  });
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    if (Object.prototype.hasOwnProperty.call(edge, "x")) {
      getExtremes(edge);
    }
  });
  minX -= marginX;
  minY -= marginY;
  forEach_default(g.nodes(), function(v) {
    var node = g.node(v);
    node.x -= minX;
    node.y -= minY;
  });
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    forEach_default(edge.points, function(p) {
      p.x -= minX;
      p.y -= minY;
    });
    if (Object.prototype.hasOwnProperty.call(edge, "x")) {
      edge.x -= minX;
    }
    if (Object.prototype.hasOwnProperty.call(edge, "y")) {
      edge.y -= minY;
    }
  });
  graphLabel.width = maxX - minX + marginX;
  graphLabel.height = maxY - minY + marginY;
}
__name(translateGraph, "translateGraph");
function assignNodeIntersects(g) {
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    var nodeV = g.node(e.v);
    var nodeW = g.node(e.w);
    var p1, p2;
    if (!edge.points) {
      edge.points = [];
      p1 = nodeW;
      p2 = nodeV;
    } else {
      p1 = edge.points[0];
      p2 = edge.points[edge.points.length - 1];
    }
    edge.points.unshift(intersectRect(nodeV, p1));
    edge.points.push(intersectRect(nodeW, p2));
  });
}
__name(assignNodeIntersects, "assignNodeIntersects");
function fixupEdgeLabelCoords(g) {
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    if (Object.prototype.hasOwnProperty.call(edge, "x")) {
      if (edge.labelpos === "l" || edge.labelpos === "r") {
        edge.width -= edge.labeloffset;
      }
      switch (edge.labelpos) {
        case "l":
          edge.x -= edge.width / 2 + edge.labeloffset;
          break;
        case "r":
          edge.x += edge.width / 2 + edge.labeloffset;
          break;
      }
    }
  });
}
__name(fixupEdgeLabelCoords, "fixupEdgeLabelCoords");
function reversePointsForReversedEdges(g) {
  forEach_default(g.edges(), function(e) {
    var edge = g.edge(e);
    if (edge.reversed) {
      edge.points.reverse();
    }
  });
}
__name(reversePointsForReversedEdges, "reversePointsForReversedEdges");
function removeBorderNodes(g) {
  forEach_default(g.nodes(), function(v) {
    if (g.children(v).length) {
      var node = g.node(v);
      var t = g.node(node.borderTop);
      var b = g.node(node.borderBottom);
      var l = g.node(last_default(node.borderLeft));
      var r = g.node(last_default(node.borderRight));
      node.width = Math.abs(r.x - l.x);
      node.height = Math.abs(b.y - t.y);
      node.x = l.x + node.width / 2;
      node.y = t.y + node.height / 2;
    }
  });
  forEach_default(g.nodes(), function(v) {
    if (g.node(v).dummy === "border") {
      g.removeNode(v);
    }
  });
}
__name(removeBorderNodes, "removeBorderNodes");
function removeSelfEdges(g) {
  forEach_default(g.edges(), function(e) {
    if (e.v === e.w) {
      var node = g.node(e.v);
      if (!node.selfEdges) {
        node.selfEdges = [];
      }
      node.selfEdges.push({ e, label: g.edge(e) });
      g.removeEdge(e);
    }
  });
}
__name(removeSelfEdges, "removeSelfEdges");
function insertSelfEdges(g) {
  var layers = buildLayerMatrix(g);
  forEach_default(layers, function(layer) {
    var orderShift = 0;
    forEach_default(layer, function(v, i) {
      var node = g.node(v);
      node.order = i + orderShift;
      forEach_default(node.selfEdges, function(selfEdge) {
        addDummyNode(
          g,
          "selfedge",
          {
            width: selfEdge.label.width,
            height: selfEdge.label.height,
            rank: node.rank,
            order: i + ++orderShift,
            e: selfEdge.e,
            label: selfEdge.label
          },
          "_se"
        );
      });
      delete node.selfEdges;
    });
  });
}
__name(insertSelfEdges, "insertSelfEdges");
function positionSelfEdges(g) {
  forEach_default(g.nodes(), function(v) {
    var node = g.node(v);
    if (node.dummy === "selfedge") {
      var selfNode = g.node(node.e.v);
      var x = selfNode.x + selfNode.width / 2;
      var y = selfNode.y;
      var dx = node.x - x;
      var dy = selfNode.height / 2;
      g.setEdge(node.e, node.label);
      g.removeNode(v);
      node.label.points = [
        { x: x + 2 * dx / 3, y: y - dy },
        { x: x + 5 * dx / 6, y: y - dy },
        { x: x + dx, y },
        { x: x + 5 * dx / 6, y: y + dy },
        { x: x + 2 * dx / 3, y: y + dy }
      ];
      node.label.x = node.x;
      node.label.y = node.y;
    }
  });
}
__name(positionSelfEdges, "positionSelfEdges");
function selectNumberAttrs(obj, attrs) {
  return mapValues_default(pick_default(obj, attrs), Number);
}
__name(selectNumberAttrs, "selectNumberAttrs");
function canonicalize(attrs) {
  var newAttrs = {};
  forEach_default(attrs, function(v, k) {
    newAttrs[k.toLowerCase()] = v;
  });
  return newAttrs;
}
__name(canonicalize, "canonicalize");

export {
  layout
};
