var FDLayoutNode = require('layout-base').FDLayoutNode;
var IMath = require('layout-base').IMath;

function CoSENode(gm, loc, size, vNode) {
  FDLayoutNode.call(this, gm, loc, size, vNode);
}

CoSENode.prototype = Object.create(FDLayoutNode.prototype);
for (var prop in FDLayoutNode) {
  CoSENode[prop] = FDLayoutNode[prop];
}

CoSENode.prototype.calculateDisplacement = function ()
{
  var layout = this.graphManager.getLayout();
  // this check is for compound nodes that contain fixed nodes
  if (this.getChild() != null && this.fixedNodeWeight) {
    this.displacementX += layout.coolingFactor *
            (this.springForceX + this.repulsionForceX + this.gravitationForceX) / this.fixedNodeWeight;
    this.displacementY += layout.coolingFactor *
            (this.springForceY + this.repulsionForceY + this.gravitationForceY) / this.fixedNodeWeight;
  }
  else {
    this.displacementX += layout.coolingFactor *
            (this.springForceX + this.repulsionForceX + this.gravitationForceX) / this.noOfChildren;
    this.displacementY += layout.coolingFactor *
            (this.springForceY + this.repulsionForceY + this.gravitationForceY) / this.noOfChildren;
  }

  if (Math.abs(this.displacementX) > layout.coolingFactor * layout.maxNodeDisplacement)
  {
    this.displacementX = layout.coolingFactor * layout.maxNodeDisplacement *
            IMath.sign(this.displacementX);
  }

  if (Math.abs(this.displacementY) > layout.coolingFactor * layout.maxNodeDisplacement)
  {
    this.displacementY = layout.coolingFactor * layout.maxNodeDisplacement *
            IMath.sign(this.displacementY);
  }
  
  // non-empty compound node, propogate movement to children as well
  if(this.child && this.child.getNodes().length > 0)
  {
    this.propogateDisplacementToChildren(this.displacementX,
            this.displacementY);
  }
 
};

CoSENode.prototype.propogateDisplacementToChildren = function (dX, dY)
{
  var nodes = this.getChild().getNodes();
  var node;
  for (var i = 0; i < nodes.length; i++)
  {
    node = nodes[i];
    if (node.getChild() == null)
    {
      node.displacementX += dX;
      node.displacementY += dY;      
    }
    else
    {
      node.propogateDisplacementToChildren(dX, dY);
    }
  }
};

CoSENode.prototype.move = function ()
{
  var layout = this.graphManager.getLayout();
  
  // a simple node or an empty compound node, move it
  if (this.child == null || this.child.getNodes().length == 0)
  {
    this.moveBy(this.displacementX, this.displacementY);

    layout.totalDisplacement += Math.abs(this.displacementX) + Math.abs(this.displacementY);
  }

  this.springForceX = 0;
  this.springForceY = 0;
  this.repulsionForceX = 0;
  this.repulsionForceY = 0;
  this.gravitationForceX = 0;
  this.gravitationForceY = 0;
  this.displacementX = 0;
  this.displacementY = 0;  
};

CoSENode.prototype.setPred1 = function (pred1)
{
  this.pred1 = pred1;
};

CoSENode.prototype.getPred1 = function ()
{
  return pred1;
};

CoSENode.prototype.getPred2 = function ()
{
  return pred2;
};

CoSENode.prototype.setNext = function (next)
{
  this.next = next;
};

CoSENode.prototype.getNext = function ()
{
  return next;
};

CoSENode.prototype.setProcessed = function (processed)
{
  this.processed = processed;
};

CoSENode.prototype.isProcessed = function ()
{
  return processed;
};

module.exports = CoSENode;
