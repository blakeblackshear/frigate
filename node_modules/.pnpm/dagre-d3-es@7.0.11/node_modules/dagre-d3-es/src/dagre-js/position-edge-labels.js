import * as d3 from 'd3';
import * as util from './util.js';

export { positionEdgeLabels };

function positionEdgeLabels(selection, g) {
  var created = selection.filter(function () {
    return !d3.select(this).classed('update');
  });

  function translate(e) {
    var edge = g.edge(e);
    return Object.prototype.hasOwnProperty.call(edge, 'x')
      ? 'translate(' + edge.x + ',' + edge.y + ')'
      : '';
  }

  created.attr('transform', translate);

  util.applyTransition(selection, g).style('opacity', 1).attr('transform', translate);
}
