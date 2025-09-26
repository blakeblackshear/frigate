var FDLayoutConstants = require('layout-base').FDLayoutConstants;

function CoSEConstants() {
}

//CoSEConstants inherits static props in FDLayoutConstants
for (var prop in FDLayoutConstants) {
  CoSEConstants[prop] = FDLayoutConstants[prop];
}

CoSEConstants.DEFAULT_USE_MULTI_LEVEL_SCALING = false;
CoSEConstants.DEFAULT_RADIAL_SEPARATION = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
CoSEConstants.DEFAULT_COMPONENT_SEPERATION = 60;
CoSEConstants.TILE = true;
CoSEConstants.TILING_PADDING_VERTICAL = 10;
CoSEConstants.TILING_PADDING_HORIZONTAL = 10;
CoSEConstants.TRANSFORM_ON_CONSTRAINT_HANDLING = true;
CoSEConstants.ENFORCE_CONSTRAINTS = true;
CoSEConstants.APPLY_LAYOUT = true;
CoSEConstants.RELAX_MOVEMENT_ON_CONSTRAINTS = true;
CoSEConstants.TREE_REDUCTION_ON_INCREMENTAL = true;  // this should be set to false if there will be a constraint
// This constant is for differentiating whether actual layout algorithm that uses cose-base wants to apply only incremental layout or 
// an incremental layout on top of a randomized layout. If it is only incremental layout, then this constant should be true.
CoSEConstants.PURE_INCREMENTAL = CoSEConstants.DEFAULT_INCREMENTAL;

module.exports = CoSEConstants;
