var LEdge = require('../LEdge');
var FDLayoutConstants = require('./FDLayoutConstants');

function FDLayoutEdge(source, target, vEdge) {
  LEdge.call(this, source, target, vEdge);
  
  // Ideal length and elasticity value for this edge
  this.idealLength = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
  this.edgeElasticity = FDLayoutConstants.DEFAULT_SPRING_STRENGTH;
}

FDLayoutEdge.prototype = Object.create(LEdge.prototype);

for (var prop in LEdge) {
  FDLayoutEdge[prop] = LEdge[prop];
}

module.exports = FDLayoutEdge;
