import * as d3 from 'd3';
import { addLabel } from './label/add-label.js';
import * as util from './util.js';

export { createClusters, setCreateClusters };

var createClusters = function (selection, g) {
  var clusters = g.nodes().filter(function (v) {
    return util.isSubgraph(g, v);
  });
  var svgClusters = selection.selectAll('g.cluster').data(clusters, function (v) {
    return v;
  });

  util.applyTransition(svgClusters.exit(), g).style('opacity', 0).remove();

  var enterSelection = svgClusters
    .enter()
    .append('g')
    .attr('class', 'cluster')
    .attr('id', function (v) {
      var node = g.node(v);
      return node.id;
    })
    .style('opacity', 0)
    .each(function (v) {
      var node = g.node(v);
      var thisGroup = d3.select(this);
      d3.select(this).append('rect');
      var labelGroup = thisGroup.append('g').attr('class', 'label');
      addLabel(labelGroup, node, node.clusterLabelPos);
    });

  svgClusters = svgClusters.merge(enterSelection);

  svgClusters = util.applyTransition(svgClusters, g).style('opacity', 1);

  svgClusters.selectAll('rect').each(function (c) {
    var node = g.node(c);
    var domCluster = d3.select(this);
    util.applyStyle(domCluster, node.style);
  });

  return svgClusters;
};

function setCreateClusters(value) {
  createClusters = value;
}
