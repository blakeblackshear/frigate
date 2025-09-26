import * as d3 from 'd3';
import * as util from './util.js';

export { positionNodes };

function positionNodes(selection, g) {
  var created = selection.filter(function () {
    return !d3.select(this).classed('update');
  });

  function translate(v) {
    var node = g.node(v);
    return 'translate(' + node.x + ',' + node.y + ')';
  }

  created.attr('transform', translate);

  util.applyTransition(selection, g).style('opacity', 1).attr('transform', translate);
}
