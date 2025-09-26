var FDLayout = require('layout-base').FDLayout;
var CoSEGraphManager = require('./CoSEGraphManager');
var CoSEGraph = require('./CoSEGraph');
var CoSENode = require('./CoSENode');
var CoSEEdge = require('./CoSEEdge');
var CoSEConstants = require('./CoSEConstants');
var ConstraintHandler = require('./ConstraintHandler');
var FDLayoutConstants = require('layout-base').FDLayoutConstants;
var LayoutConstants = require('layout-base').LayoutConstants;
var Point = require('layout-base').Point;
var PointD = require('layout-base').PointD;
var DimensionD = require('layout-base').DimensionD;
var Layout = require('layout-base').Layout;
var Integer = require('layout-base').Integer;
var IGeometry = require('layout-base').IGeometry;
var LGraph = require('layout-base').LGraph;
var Transform = require('layout-base').Transform;
var LinkedList = require('layout-base').LinkedList;

function CoSELayout() {
  FDLayout.call(this);
  
  this.toBeTiled = {}; // Memorize if a node is to be tiled or is tiled
  this.constraints = {}; // keep layout constraints
}

CoSELayout.prototype = Object.create(FDLayout.prototype);

for (var prop in FDLayout) {
  CoSELayout[prop] = FDLayout[prop];
}

CoSELayout.prototype.newGraphManager = function () {
  var gm = new CoSEGraphManager(this);
  this.graphManager = gm;
  return gm;
};

CoSELayout.prototype.newGraph = function (vGraph) {
  return new CoSEGraph(null, this.graphManager, vGraph);
};

CoSELayout.prototype.newNode = function (vNode) {
  return new CoSENode(this.graphManager, vNode);
};

CoSELayout.prototype.newEdge = function (vEdge) {
  return new CoSEEdge(null, null, vEdge);
};

CoSELayout.prototype.initParameters = function () {
  FDLayout.prototype.initParameters.call(this, arguments);
  if (!this.isSubLayout) {
    if (CoSEConstants.DEFAULT_EDGE_LENGTH < 10)
    {
      this.idealEdgeLength = 10;
    }
    else
    {
      this.idealEdgeLength = CoSEConstants.DEFAULT_EDGE_LENGTH;
    }

    this.useSmartIdealEdgeLengthCalculation =
            CoSEConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION;
    this.gravityConstant =
            FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH;
    this.compoundGravityConstant =
            FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH;
    this.gravityRangeFactor =
            FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR;
    this.compoundGravityRangeFactor =
            FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR;
    
    // variables for tree reduction support
    this.prunedNodesAll = [];
    this.growTreeIterations = 0;
    this.afterGrowthIterations = 0;
    this.isTreeGrowing = false;
    this.isGrowthFinished = false;    
  }
};

// This method is used to set CoSE related parameters used by spring embedder.
CoSELayout.prototype.initSpringEmbedder = function () {
  FDLayout.prototype.initSpringEmbedder.call(this);

  // variables for cooling
  this.coolingCycle = 0;
  this.maxCoolingCycle = this.maxIterations/FDLayoutConstants.CONVERGENCE_CHECK_PERIOD;
  this.finalTemperature = 0.04;
  this.coolingAdjuster = 1;  
};

CoSELayout.prototype.layout = function () {
  var createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
  if (createBendsAsNeeded)
  {
    this.createBendpoints();
    this.graphManager.resetAllEdges();
  }

  this.level = 0;
  return this.classicLayout();
};

CoSELayout.prototype.classicLayout = function () {
  this.nodesWithGravity = this.calculateNodesToApplyGravitationTo();
  this.graphManager.setAllNodesToApplyGravitation(this.nodesWithGravity);
  this.calcNoOfChildrenForAllNodes();
  this.graphManager.calcLowestCommonAncestors();
  this.graphManager.calcInclusionTreeDepths();
  this.graphManager.getRoot().calcEstimatedSize();
  this.calcIdealEdgeLengths();
  
  if (!this.incremental)
  {
    var forest = this.getFlatForest();

    // The graph associated with this layout is flat and a forest
    if (forest.length > 0)
    {
      this.positionNodesRadially(forest);
    }
    // The graph associated with this layout is not flat or a forest
    else
    {
      // Reduce the trees when incremental mode is not enabled and graph is not a forest 
      this.reduceTrees();
      // Update nodes that gravity will be applied
      this.graphManager.resetAllNodesToApplyGravitation();
      var allNodes = new Set(this.getAllNodes());
      var intersection = this.nodesWithGravity.filter(x => allNodes.has(x));
      this.graphManager.setAllNodesToApplyGravitation(intersection);
      
      this.positionNodesRandomly();
    }
  }
  else {
    if(CoSEConstants.TREE_REDUCTION_ON_INCREMENTAL){
      // Reduce the trees in incremental mode if only this constant is set to true 
      this.reduceTrees();
      // Update nodes that gravity will be applied
      this.graphManager.resetAllNodesToApplyGravitation();
      var allNodes = new Set(this.getAllNodes());
      var intersection = this.nodesWithGravity.filter(x => allNodes.has(x));
      this.graphManager.setAllNodesToApplyGravitation(intersection);        
    }
  }

  if(Object.keys(this.constraints).length > 0){
    ConstraintHandler.handleConstraints(this);
    this.initConstraintVariables();
  }

  this.initSpringEmbedder();
  if (CoSEConstants.APPLY_LAYOUT) {
    this.runSpringEmbedder();
  }

  return true;
};

CoSELayout.prototype.tick = function() {
  this.totalIterations++;
  
  if (this.totalIterations === this.maxIterations && !this.isTreeGrowing && !this.isGrowthFinished) {
    if(this.prunedNodesAll.length > 0){
      this.isTreeGrowing = true;
    }
    else {
      return true;  
    }
  }
  
  if (this.totalIterations % FDLayoutConstants.CONVERGENCE_CHECK_PERIOD == 0  && !this.isTreeGrowing && !this.isGrowthFinished)
  {
    if (this.isConverged())
    {
      if(this.prunedNodesAll.length > 0){
        this.isTreeGrowing = true;
      }
      else {
        return true;  
      } 
    }
    
    this.coolingCycle++;

    if(this.layoutQuality == 0) {  
      // quality - "draft"
      this.coolingAdjuster = this.coolingCycle;
    }
    else if(this.layoutQuality == 1) { 
      // quality - "default"
      this.coolingAdjuster = this.coolingCycle / 3;
    }    

    // cooling schedule is based on http://www.btluke.com/simanf1.html -> cooling schedule 3
    this.coolingFactor = Math.max(this.initialCoolingFactor - Math.pow(this.coolingCycle, Math.log(100 * (this.initialCoolingFactor - this.finalTemperature)) / Math.log(this.maxCoolingCycle))/100 * this.coolingAdjuster, this.finalTemperature);
    this.animationPeriod = Math.ceil(this.initialAnimationPeriod * Math.sqrt(this.coolingFactor));
  }
  // Operations while tree is growing again 
  if(this.isTreeGrowing){
    if(this.growTreeIterations % 10 == 0){
      if(this.prunedNodesAll.length > 0) {
        this.graphManager.updateBounds();
        this.updateGrid();
        this.growTree(this.prunedNodesAll);
        // Update nodes that gravity will be applied
        this.graphManager.resetAllNodesToApplyGravitation();
        var allNodes = new Set(this.getAllNodes());
        var intersection = this.nodesWithGravity.filter(x => allNodes.has(x));
        this.graphManager.setAllNodesToApplyGravitation(intersection);
        
        this.graphManager.updateBounds();
        this.updateGrid();
        if(CoSEConstants.PURE_INCREMENTAL)
          this.coolingFactor = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL / 2;
        else
          this.coolingFactor = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL;
      }
      else {
        this.isTreeGrowing = false;  
        this.isGrowthFinished = true; 
      }
    }
    this.growTreeIterations++;
  }
  // Operations after growth is finished
  if(this.isGrowthFinished){
    if (this.isConverged())
    {
      return true;  
    }
    if(this.afterGrowthIterations % 10 == 0){
      this.graphManager.updateBounds();
      this.updateGrid(); 
    }
    if(CoSEConstants.PURE_INCREMENTAL)
      this.coolingFactor = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL / 2 * ((100 - this.afterGrowthIterations) / 100);
    else
      this.coolingFactor = FDLayoutConstants.DEFAULT_COOLING_FACTOR_INCREMENTAL * ((100 - this.afterGrowthIterations) / 100);
    this.afterGrowthIterations++;
  }
  
  var gridUpdateAllowed = !this.isTreeGrowing && !this.isGrowthFinished;
  var forceToNodeSurroundingUpdate = (this.growTreeIterations % 10 == 1 && this.isTreeGrowing) || (this.afterGrowthIterations % 10 == 1 && this.isGrowthFinished);
          
  this.totalDisplacement = 0;
  this.graphManager.updateBounds();
  this.calcSpringForces();
  this.calcRepulsionForces(gridUpdateAllowed, forceToNodeSurroundingUpdate);
  this.calcGravitationalForces();
  this.moveNodes();
  this.animate();
  
  return false; // Layout is not ended yet return false
};

CoSELayout.prototype.getPositionsData = function() {
  var allNodes = this.graphManager.getAllNodes();
  var pData = {};
  for (var i = 0; i < allNodes.length; i++) {
    var rect = allNodes[i].rect;
    var id = allNodes[i].id;
    pData[id] = {
      id: id,
      x: rect.getCenterX(),
      y: rect.getCenterY(),
      w: rect.width,
      h: rect.height
    };
  }
  
  return pData;
};

CoSELayout.prototype.runSpringEmbedder = function () {
  this.initialAnimationPeriod = 25;
  this.animationPeriod = this.initialAnimationPeriod;
  var layoutEnded = false;
  
  // If aminate option is 'during' signal that layout is supposed to start iterating
  if ( FDLayoutConstants.ANIMATE === 'during' ) {
    this.emit('layoutstarted');
  }
  else {
    // If aminate option is 'during' tick() function will be called on index.js
    while (!layoutEnded) {
      layoutEnded = this.tick();
    }

    this.graphManager.updateBounds();
  }
};

// overrides moveNodes method in FDLayout
CoSELayout.prototype.moveNodes = function () {
  var lNodes = this.getAllNodes();
  var node;

  // calculate displacement for each node 
  for (var i = 0; i < lNodes.length; i++)
  {
    node = lNodes[i];
    node.calculateDisplacement();
  }
  
  if(Object.keys(this.constraints).length > 0){
    this.updateDisplacements();
  }

  // move each node
  for (var i = 0; i < lNodes.length; i++)
  {
    node = lNodes[i];
    node.move();
  }  
};

// constraint related methods: initConstraintVariables and updateDisplacements

// initialize constraint related variables
CoSELayout.prototype.initConstraintVariables = function () {
  var self = this;
  this.idToNodeMap = new Map();
  this.fixedNodeSet = new Set();

  var allNodes = this.graphManager.getAllNodes();

  // fill idToNodeMap
  for(var i = 0; i < allNodes.length; i++) {
    var node = allNodes[i];
    this.idToNodeMap.set(node.id, node);
  }

  // calculate fixed node weight for given compound node
  var calculateCompoundWeight = function(compoundNode) {
    var nodes = compoundNode.getChild().getNodes();
    var node;
    var fixedNodeWeight = 0;
    for (var i = 0; i < nodes.length; i++) {
      node = nodes[i];
      if (node.getChild() == null) {
        if(self.fixedNodeSet.has(node.id)) {
          fixedNodeWeight += 100;
        }
      } else {
        fixedNodeWeight += calculateCompoundWeight(node);
      }
    }
    return fixedNodeWeight;
  };

  if (this.constraints.fixedNodeConstraint) {
    // fill fixedNodeSet
    this.constraints.fixedNodeConstraint.forEach(function (nodeData) {
      self.fixedNodeSet.add(nodeData.nodeId);
    });

    // assign fixed node weights to compounds if they contain fixed nodes
    var allNodes = this.graphManager.getAllNodes();
    var node;

    for (var i = 0; i < allNodes.length; i++) {
      node = allNodes[i];
      if (node.getChild() != null) {
        let fixedNodeWeight = calculateCompoundWeight(node);
        if (fixedNodeWeight > 0) {
          node.fixedNodeWeight = fixedNodeWeight;
        }
      }
    }
  }
  
  if(this.constraints.relativePlacementConstraint) {         
    var nodeToDummyForVerticalAlignment = new Map();
    var nodeToDummyForHorizontalAlignment = new Map();
    this.dummyToNodeForVerticalAlignment = new Map();
    this.dummyToNodeForHorizontalAlignment = new Map();     
    this.fixedNodesOnHorizontal = new Set();
    this.fixedNodesOnVertical = new Set();

    // fill maps and sets
    this.fixedNodeSet.forEach(function(nodeId){
      self.fixedNodesOnHorizontal.add(nodeId);
      self.fixedNodesOnVertical.add(nodeId);
    });
    
    if(this.constraints.alignmentConstraint) {
      if(this.constraints.alignmentConstraint.vertical) {
        var verticalAlignment = this.constraints.alignmentConstraint.vertical;
        for(var i = 0; i < verticalAlignment.length; i++) {
          this.dummyToNodeForVerticalAlignment.set("dummy" + i, []);
          verticalAlignment[i].forEach(function(nodeId){
            nodeToDummyForVerticalAlignment.set(nodeId, "dummy" + i);
            self.dummyToNodeForVerticalAlignment.get("dummy" + i).push(nodeId);
            if(self.fixedNodeSet.has(nodeId)) {
              self.fixedNodesOnHorizontal.add("dummy" + i);
            }
          });
        }
      }
      if(this.constraints.alignmentConstraint.horizontal){
        var horizontalAlignment = this.constraints.alignmentConstraint.horizontal;
        for(var i = 0; i < horizontalAlignment.length; i++){
          this.dummyToNodeForHorizontalAlignment.set("dummy" + i, []);
          horizontalAlignment[i].forEach(function(nodeId){
            nodeToDummyForHorizontalAlignment.set(nodeId, "dummy" + i);
            self.dummyToNodeForHorizontalAlignment.get("dummy" + i).push(nodeId);
            if(self.fixedNodeSet.has(nodeId)){
              self.fixedNodesOnVertical.add("dummy" + i);
            }              
          });
        }
      }        
    }
    
    if(CoSEConstants.RELAX_MOVEMENT_ON_CONSTRAINTS) {
      
      this.shuffle = function (array) {
        var j, x, i;
        for (i = array.length - 1; i >= (2 * array.length / 3); i--) {
          j = Math.floor(Math.random() * (i + 1));
          x = array[i];
          array[i] = array[j];
          array[j] = x;
        }
        return array;
      };

      this.nodesInRelativeHorizontal = [];
      this.nodesInRelativeVertical = [];    
      this.nodeToRelativeConstraintMapHorizontal = new Map();
      this.nodeToRelativeConstraintMapVertical = new Map();
      this.nodeToTempPositionMapHorizontal = new Map();
      this.nodeToTempPositionMapVertical = new Map();

      // fill arrays and maps
      this.constraints.relativePlacementConstraint.forEach(function(constraint) {
        if(constraint.left) {
          let nodeIdLeft = nodeToDummyForVerticalAlignment.has(constraint.left) ? nodeToDummyForVerticalAlignment.get(constraint.left) : constraint.left;
          let nodeIdRight = nodeToDummyForVerticalAlignment.has(constraint.right) ? nodeToDummyForVerticalAlignment.get(constraint.right) : constraint.right;
          
          if(!self.nodesInRelativeHorizontal.includes(nodeIdLeft)) {
            self.nodesInRelativeHorizontal.push(nodeIdLeft);
            self.nodeToRelativeConstraintMapHorizontal.set(nodeIdLeft, []);            
            if(self.dummyToNodeForVerticalAlignment.has(nodeIdLeft)) {
              self.nodeToTempPositionMapHorizontal.set(nodeIdLeft, self.idToNodeMap.get(self.dummyToNodeForVerticalAlignment.get(nodeIdLeft)[0]).getCenterX());
            }
            else {
              self.nodeToTempPositionMapHorizontal.set(nodeIdLeft, self.idToNodeMap.get(nodeIdLeft).getCenterX());
            }
          }
          if(!self.nodesInRelativeHorizontal.includes(nodeIdRight)) {
            self.nodesInRelativeHorizontal.push(nodeIdRight);
            self.nodeToRelativeConstraintMapHorizontal.set(nodeIdRight, []);
            if(self.dummyToNodeForVerticalAlignment.has(nodeIdRight)) {
              self.nodeToTempPositionMapHorizontal.set(nodeIdRight, self.idToNodeMap.get(self.dummyToNodeForVerticalAlignment.get(nodeIdRight)[0]).getCenterX());
            }
            else {
              self.nodeToTempPositionMapHorizontal.set(nodeIdRight, self.idToNodeMap.get(nodeIdRight).getCenterX());
            }          
          }
          
          self.nodeToRelativeConstraintMapHorizontal.get(nodeIdLeft).push({right: nodeIdRight, gap: constraint.gap});
          self.nodeToRelativeConstraintMapHorizontal.get(nodeIdRight).push({left: nodeIdLeft, gap: constraint.gap});
        }
        else {
          let nodeIdTop = nodeToDummyForHorizontalAlignment.has(constraint.top) ? nodeToDummyForHorizontalAlignment.get(constraint.top) : constraint.top;
          let nodeIdBottom = nodeToDummyForHorizontalAlignment.has(constraint.bottom) ? nodeToDummyForHorizontalAlignment.get(constraint.bottom) : constraint.bottom;
          
          if(!self.nodesInRelativeVertical.includes(nodeIdTop)) {
            self.nodesInRelativeVertical.push(nodeIdTop);
            self.nodeToRelativeConstraintMapVertical.set(nodeIdTop, []);
            if(self.dummyToNodeForHorizontalAlignment.has(nodeIdTop)) {
              self.nodeToTempPositionMapVertical.set(nodeIdTop, self.idToNodeMap.get(self.dummyToNodeForHorizontalAlignment.get(nodeIdTop)[0]).getCenterY());
            }
            else {
              self.nodeToTempPositionMapVertical.set(nodeIdTop, self.idToNodeMap.get(nodeIdTop).getCenterY());
            }
          }
          if(!self.nodesInRelativeVertical.includes(nodeIdBottom)) {
            self.nodesInRelativeVertical.push(nodeIdBottom);
            self.nodeToRelativeConstraintMapVertical.set(nodeIdBottom, []);
            if(self.dummyToNodeForHorizontalAlignment.has(nodeIdBottom)) {
              self.nodeToTempPositionMapVertical.set(nodeIdBottom, self.idToNodeMap.get(self.dummyToNodeForHorizontalAlignment.get(nodeIdBottom)[0]).getCenterY());
            }
            else {
              self.nodeToTempPositionMapVertical.set(nodeIdBottom, self.idToNodeMap.get(nodeIdBottom).getCenterY());
            }          
          }          
          self.nodeToRelativeConstraintMapVertical.get(nodeIdTop).push({bottom: nodeIdBottom, gap: constraint.gap});
          self.nodeToRelativeConstraintMapVertical.get(nodeIdBottom).push({top: nodeIdTop, gap: constraint.gap});
        }
      });
    }
    else {
      var subGraphOnHorizontal = new Map(); // subgraph from vertical RP constraints
      var subGraphOnVertical = new Map(); // subgraph from vertical RP constraints

      // construct subgraphs from relative placement constraints 
      this.constraints.relativePlacementConstraint.forEach(function(constraint) {
        if(constraint.left) {
          var left = nodeToDummyForVerticalAlignment.has(constraint.left) ? nodeToDummyForVerticalAlignment.get(constraint.left) : constraint.left;
          var right = nodeToDummyForVerticalAlignment.has(constraint.right) ? nodeToDummyForVerticalAlignment.get(constraint.right) : constraint.right;
          if(subGraphOnHorizontal.has(left)) {
            subGraphOnHorizontal.get(left).push(right);
          }
          else {
            subGraphOnHorizontal.set(left, [right]); 
          }
          if(subGraphOnHorizontal.has(right)) {
            subGraphOnHorizontal.get(right).push(left);          
          }
          else {
            subGraphOnHorizontal.set(right, [left]);           
          }
        }
        else {
          var top = nodeToDummyForHorizontalAlignment.has(constraint.top) ? nodeToDummyForHorizontalAlignment.get(constraint.top) : constraint.top;
          var bottom = nodeToDummyForHorizontalAlignment.has(constraint.bottom) ? nodeToDummyForHorizontalAlignment.get(constraint.bottom) : constraint.bottom;        
          if(subGraphOnVertical.has(top)) {
            subGraphOnVertical.get(top).push(bottom);
          }
          else {
            subGraphOnVertical.set(top, [bottom]);          
          }        
          if(subGraphOnVertical.has(bottom)) {
            subGraphOnVertical.get(bottom).push(top);          
          }
          else {
            subGraphOnVertical.set(bottom, [top]);           
          }        
        }      
      });   

      // function to construct components from a given graph 
      // also returns an array that keeps whether each component contains fixed node
      var constructComponents = function(graph, fixedNodes){
        let components = [];
        let isFixed = [];
        let queue = new LinkedList();
        let visited = new Set();
        let count = 0;

        graph.forEach(function(value, key){
          if(!visited.has(key)){
            components[count] = [];
            isFixed[count] = false;
            let currentNode = key;
            queue.push(currentNode);
            visited.add(currentNode);
            components[count].push(currentNode);

            while(queue.length != 0){
              currentNode = queue.shift();
              if(fixedNodes.has(currentNode)) {
                isFixed[count] = true;
              }
              let neighbors = graph.get(currentNode);
              neighbors.forEach(function(neighbor){
                if(!visited.has(neighbor)){
                  queue.push(neighbor);
                  visited.add(neighbor);
                  components[count].push(neighbor);
                }
              });
            }
            count++;
          }
        });

        return { components: components, isFixed: isFixed };
      };

      var resultOnHorizontal = constructComponents(subGraphOnHorizontal, self.fixedNodesOnHorizontal);
      this.componentsOnHorizontal = resultOnHorizontal.components;
      this.fixedComponentsOnHorizontal = resultOnHorizontal.isFixed;
      var resultOnVertical = constructComponents(subGraphOnVertical, self.fixedNodesOnVertical);
      this.componentsOnVertical = resultOnVertical.components;
      this.fixedComponentsOnVertical = resultOnVertical.isFixed;   
    }
  }
};

// updates node displacements based on constraints
CoSELayout.prototype.updateDisplacements = function () {
  var self = this;
  if(this.constraints.fixedNodeConstraint){
    this.constraints.fixedNodeConstraint.forEach(function(nodeData){
      var fixedNode = self.idToNodeMap.get(nodeData.nodeId);
      fixedNode.displacementX = 0;
      fixedNode.displacementY = 0;
    });
  }

  if(this.constraints.alignmentConstraint){
    if(this.constraints.alignmentConstraint.vertical){
      var allVerticalAlignments = this.constraints.alignmentConstraint.vertical;
      for(var i = 0; i < allVerticalAlignments.length; i++){
        var totalDisplacementX = 0;
        for(var j = 0; j < allVerticalAlignments[i].length; j++){
          if(this.fixedNodeSet.has(allVerticalAlignments[i][j])){
            totalDisplacementX = 0;
            break;
          }
          totalDisplacementX += this.idToNodeMap.get(allVerticalAlignments[i][j]).displacementX;
        }
        var averageDisplacementX = totalDisplacementX / allVerticalAlignments[i].length;
        for(var j = 0; j < allVerticalAlignments[i].length; j++){
          this.idToNodeMap.get(allVerticalAlignments[i][j]).displacementX = averageDisplacementX;
        }
      }
    }
    if(this.constraints.alignmentConstraint.horizontal){
      var allHorizontalAlignments = this.constraints.alignmentConstraint.horizontal;
      for(var i = 0; i < allHorizontalAlignments.length; i++){
        var totalDisplacementY = 0;
        for(var j = 0; j < allHorizontalAlignments[i].length; j++){
          if(this.fixedNodeSet.has(allHorizontalAlignments[i][j])){
            totalDisplacementY = 0;
            break;
          }
          totalDisplacementY += this.idToNodeMap.get(allHorizontalAlignments[i][j]).displacementY;
        }
        var averageDisplacementY = totalDisplacementY / allHorizontalAlignments[i].length;
        for(var j = 0; j < allHorizontalAlignments[i].length; j++){
          this.idToNodeMap.get(allHorizontalAlignments[i][j]).displacementY = averageDisplacementY;
        }
      }
    }
  }
  
  if(this.constraints.relativePlacementConstraint){
    
    if(CoSEConstants.RELAX_MOVEMENT_ON_CONSTRAINTS) {
      // shuffle array to randomize node processing order
      if (this.totalIterations % 10 == 0) {
        this.shuffle(this.nodesInRelativeHorizontal);
        this.shuffle(this.nodesInRelativeVertical);
      }      
      
      this.nodesInRelativeHorizontal.forEach(function(nodeId) {
        if(!self.fixedNodesOnHorizontal.has(nodeId)) {
          var displacement = 0;
          if(self.dummyToNodeForVerticalAlignment.has(nodeId)) {
            displacement = self.idToNodeMap.get(self.dummyToNodeForVerticalAlignment.get(nodeId)[0]).displacementX;
          }
          else {
            displacement = self.idToNodeMap.get(nodeId).displacementX;
          }    
          self.nodeToRelativeConstraintMapHorizontal.get(nodeId).forEach(function(constraint) {
            if(constraint.right) {
              var diff = (self.nodeToTempPositionMapHorizontal.get(constraint.right) - self.nodeToTempPositionMapHorizontal.get(nodeId)) - displacement;
              if(diff < constraint.gap) {
                displacement -= constraint.gap - diff;
              }
            }
            else {
              var diff = (self.nodeToTempPositionMapHorizontal.get(nodeId) - self.nodeToTempPositionMapHorizontal.get(constraint.left)) + displacement;
              if(diff < constraint.gap) {
                displacement += constraint.gap - diff;
              }          
            }
          });
          self.nodeToTempPositionMapHorizontal.set(nodeId, self.nodeToTempPositionMapHorizontal.get(nodeId) + displacement);
          if(self.dummyToNodeForVerticalAlignment.has(nodeId)) {
            self.dummyToNodeForVerticalAlignment.get(nodeId).forEach(function(nodeId){
              self.idToNodeMap.get(nodeId).displacementX = displacement;
            });
          }
          else {
            self.idToNodeMap.get(nodeId).displacementX = displacement;
          }         
        }
      });

      this.nodesInRelativeVertical.forEach(function(nodeId) {
        if(!self.fixedNodesOnHorizontal.has(nodeId)) {
          var displacement = 0;
          if(self.dummyToNodeForHorizontalAlignment.has(nodeId)) {
            displacement = self.idToNodeMap.get(self.dummyToNodeForHorizontalAlignment.get(nodeId)[0]).displacementY;
          }
          else {
            displacement = self.idToNodeMap.get(nodeId).displacementY;
          }    
          self.nodeToRelativeConstraintMapVertical.get(nodeId).forEach(function(constraint) {
            if(constraint.bottom) {
              var diff = (self.nodeToTempPositionMapVertical.get(constraint.bottom) - self.nodeToTempPositionMapVertical.get(nodeId)) - displacement;
              if(diff < constraint.gap) {
                displacement -= constraint.gap - diff;
              }
            }
            else {
              var diff = (self.nodeToTempPositionMapVertical.get(nodeId) - self.nodeToTempPositionMapVertical.get(constraint.top)) + displacement;
              if(diff < constraint.gap) {
                displacement += constraint.gap - diff;
              }          
            }
          });
          self.nodeToTempPositionMapVertical.set(nodeId, self.nodeToTempPositionMapVertical.get(nodeId) + displacement);
          if(self.dummyToNodeForHorizontalAlignment.has(nodeId)) {
            self.dummyToNodeForHorizontalAlignment.get(nodeId).forEach(function(nodeId){
              self.idToNodeMap.get(nodeId).displacementY = displacement;
            });
          }
          else {
            self.idToNodeMap.get(nodeId).displacementY = displacement;
          }        
        }
      });    
    }
    else {
      for(var i = 0; i < this.componentsOnHorizontal.length; i++) {
        var component = this.componentsOnHorizontal[i];
        if(this.fixedComponentsOnHorizontal[i]) {
          for(var j = 0; j < component.length; j++){ 
            if(this.dummyToNodeForVerticalAlignment.has(component[j])) {
              this.dummyToNodeForVerticalAlignment.get(component[j]).forEach(function(nodeId){
                self.idToNodeMap.get(nodeId).displacementX = 0;
              });
            }
            else {
              this.idToNodeMap.get(component[j]).displacementX = 0;
            }            
          }
        }
        else {
          var sum = 0;
          var count = 0;
          for(var j = 0; j < component.length; j++){
            if(this.dummyToNodeForVerticalAlignment.has(component[j])) {
              var actualNodes = this.dummyToNodeForVerticalAlignment.get(component[j]);
              sum += actualNodes.length * this.idToNodeMap.get(actualNodes[0]).displacementX;
              count += actualNodes.length;
            }
            else {
              sum += this.idToNodeMap.get(component[j]).displacementX;
              count++;
            }
          }
          var averageDisplacement = sum / count;
          for(var j = 0; j < component.length; j++){ 
            if(this.dummyToNodeForVerticalAlignment.has(component[j])) {
              this.dummyToNodeForVerticalAlignment.get(component[j]).forEach(function(nodeId){
                self.idToNodeMap.get(nodeId).displacementX = averageDisplacement;
              });
            }
            else {
              this.idToNodeMap.get(component[j]).displacementX = averageDisplacement;
            }            
          }        
        }
      }

      for(var i = 0; i < this.componentsOnVertical.length; i++) {
        var component = this.componentsOnVertical[i];
        if(this.fixedComponentsOnVertical[i]) {
          for(var j = 0; j < component.length; j++){ 
            if(this.dummyToNodeForHorizontalAlignment.has(component[j])) {
              this.dummyToNodeForHorizontalAlignment.get(component[j]).forEach(function(nodeId){
                self.idToNodeMap.get(nodeId).displacementY = 0;
              });
            }
            else {
              this.idToNodeMap.get(component[j]).displacementY = 0;
            }            
          }
        }
        else {
          var sum = 0;
          var count = 0;
          for(var j = 0; j < component.length; j++){
            if(this.dummyToNodeForHorizontalAlignment.has(component[j])) {
              var actualNodes = this.dummyToNodeForHorizontalAlignment.get(component[j]);
              sum += actualNodes.length * this.idToNodeMap.get(actualNodes[0]).displacementY;
              count += actualNodes.length;
            }
            else {
              sum += this.idToNodeMap.get(component[j]).displacementY;
              count++;
            }
          }
          var averageDisplacement = sum / count;
          for(var j = 0; j < component.length; j++){ 
            if(this.dummyToNodeForHorizontalAlignment.has(component[j])) {
              this.dummyToNodeForHorizontalAlignment.get(component[j]).forEach(function(nodeId){
                self.idToNodeMap.get(nodeId).displacementY = averageDisplacement;
              });
            }
            else {
              this.idToNodeMap.get(component[j]).displacementY = averageDisplacement;
            }            
          }        
        }
      }
    }
  }
};

CoSELayout.prototype.calculateNodesToApplyGravitationTo = function () {
  var nodeList = [];
  var graph;

  var graphs = this.graphManager.getGraphs();
  var size = graphs.length;
  var i;
  for (i = 0; i < size; i++)
  {
    graph = graphs[i];

    graph.updateConnected();

    if (!graph.isConnected)
    {
      nodeList = nodeList.concat(graph.getNodes());
    }
  }

  return nodeList;
};

CoSELayout.prototype.createBendpoints = function () {
  var edges = [];
  edges = edges.concat(this.graphManager.getAllEdges());
  var visited = new Set();
  var i;
  for (i = 0; i < edges.length; i++)
  {
    var edge = edges[i];

    if (!visited.has(edge))
    {
      var source = edge.getSource();
      var target = edge.getTarget();

      if (source == target)
      {
        edge.getBendpoints().push(new PointD());
        edge.getBendpoints().push(new PointD());
        this.createDummyNodesForBendpoints(edge);
        visited.add(edge);
      }
      else
      {
        var edgeList = [];

        edgeList = edgeList.concat(source.getEdgeListToNode(target));
        edgeList = edgeList.concat(target.getEdgeListToNode(source));

        if (!visited.has(edgeList[0]))
        {
          if (edgeList.length > 1)
          {
            var k;
            for (k = 0; k < edgeList.length; k++)
            {
              var multiEdge = edgeList[k];
              multiEdge.getBendpoints().push(new PointD());
              this.createDummyNodesForBendpoints(multiEdge);
            }
          }
          edgeList.forEach(function(edge){
            visited.add(edge);
          });
        }
      }
    }

    if (visited.size == edges.length)
    {
      break;
    }
  }
};

CoSELayout.prototype.positionNodesRadially = function (forest) {
  // We tile the trees to a grid row by row; first tree starts at (0,0)
  var currentStartingPoint = new Point(0, 0);
  var numberOfColumns = Math.ceil(Math.sqrt(forest.length));
  var height = 0;
  var currentY = 0;
  var currentX = 0;
  var point = new PointD(0, 0);

  for (var i = 0; i < forest.length; i++)
  {
    if (i % numberOfColumns == 0)
    {
      // Start of a new row, make the x coordinate 0, increment the
      // y coordinate with the max height of the previous row
      currentX = 0;
      currentY = height;

      if (i != 0)
      {
        currentY += CoSEConstants.DEFAULT_COMPONENT_SEPERATION;
      }

      height = 0;
    }

    var tree = forest[i];

    // Find the center of the tree
    var centerNode = Layout.findCenterOfTree(tree);

    // Set the staring point of the next tree
    currentStartingPoint.x = currentX;
    currentStartingPoint.y = currentY;

    // Do a radial layout starting with the center
    point =
            CoSELayout.radialLayout(tree, centerNode, currentStartingPoint);

    if (point.y > height)
    {
      height = Math.floor(point.y);
    }

    currentX = Math.floor(point.x + CoSEConstants.DEFAULT_COMPONENT_SEPERATION);
  }

  this.transform(
          new PointD(LayoutConstants.WORLD_CENTER_X - point.x / 2,
                  LayoutConstants.WORLD_CENTER_Y - point.y / 2));
};

CoSELayout.radialLayout = function (tree, centerNode, startingPoint) {
  var radialSep = Math.max(this.maxDiagonalInTree(tree),
          CoSEConstants.DEFAULT_RADIAL_SEPARATION);
  CoSELayout.branchRadialLayout(centerNode, null, 0, 359, 0, radialSep);
  var bounds = LGraph.calculateBounds(tree);

  var transform = new Transform();
  transform.setDeviceOrgX(bounds.getMinX());
  transform.setDeviceOrgY(bounds.getMinY());
  transform.setWorldOrgX(startingPoint.x);
  transform.setWorldOrgY(startingPoint.y);

  for (var i = 0; i < tree.length; i++)
  {
    var node = tree[i];
    node.transform(transform);
  }

  var bottomRight =
          new PointD(bounds.getMaxX(), bounds.getMaxY());

  return transform.inverseTransformPoint(bottomRight);
};

CoSELayout.branchRadialLayout = function (node, parentOfNode, startAngle, endAngle, distance, radialSeparation) {
  // First, position this node by finding its angle.
  var halfInterval = ((endAngle - startAngle) + 1) / 2;

  if (halfInterval < 0)
  {
    halfInterval += 180;
  }

  var nodeAngle = (halfInterval + startAngle) % 360;
  var teta = (nodeAngle * IGeometry.TWO_PI) / 360;

  // Make polar to java cordinate conversion.
  var cos_teta = Math.cos(teta);
  var x_ = distance * Math.cos(teta);
  var y_ = distance * Math.sin(teta);

  node.setCenter(x_, y_);

  // Traverse all neighbors of this node and recursively call this
  // function.
  var neighborEdges = [];
  neighborEdges = neighborEdges.concat(node.getEdges());
  var childCount = neighborEdges.length;

  if (parentOfNode != null)
  {
    childCount--;
  }

  var branchCount = 0;

  var incEdgesCount = neighborEdges.length;
  var startIndex;

  var edges = node.getEdgesBetween(parentOfNode);

  // If there are multiple edges, prune them until there remains only one
  // edge.
  while (edges.length > 1)
  {
    //neighborEdges.remove(edges.remove(0));
    var temp = edges[0];
    edges.splice(0, 1);
    var index = neighborEdges.indexOf(temp);
    if (index >= 0) {
      neighborEdges.splice(index, 1);
    }
    incEdgesCount--;
    childCount--;
  }

  if (parentOfNode != null)
  {
    //assert edges.length == 1;
    startIndex = (neighborEdges.indexOf(edges[0]) + 1) % incEdgesCount;
  }
  else
  {
    startIndex = 0;
  }

  var stepAngle = Math.abs(endAngle - startAngle) / childCount;

  for (var i = startIndex;
          branchCount != childCount;
          i = (++i) % incEdgesCount)
  {
    var currentNeighbor =
            neighborEdges[i].getOtherEnd(node);

    // Don't back traverse to root node in current tree.
    if (currentNeighbor == parentOfNode)
    {
      continue;
    }

    var childStartAngle =
            (startAngle + branchCount * stepAngle) % 360;
    var childEndAngle = (childStartAngle + stepAngle) % 360;

    CoSELayout.branchRadialLayout(currentNeighbor,
            node,
            childStartAngle, childEndAngle,
            distance + radialSeparation, radialSeparation);

    branchCount++;
  }
};

CoSELayout.maxDiagonalInTree = function (tree) {
  var maxDiagonal = Integer.MIN_VALUE;

  for (var i = 0; i < tree.length; i++)
  {
    var node = tree[i];
    var diagonal = node.getDiagonal();

    if (diagonal > maxDiagonal)
    {
      maxDiagonal = diagonal;
    }
  }

  return maxDiagonal;
};

CoSELayout.prototype.calcRepulsionRange = function () {
  // formula is 2 x (level + 1) x idealEdgeLength
  return (2 * (this.level + 1) * this.idealEdgeLength);
};

// Tiling methods

// Group zero degree members whose parents are not to be tiled, create dummy parents where needed and fill memberGroups by their dummp parent id's
CoSELayout.prototype.groupZeroDegreeMembers = function () {
  var self = this;
  // array of [parent_id x oneDegreeNode_id]
  var tempMemberGroups = {}; // A temporary map of parent node and its zero degree members
  this.memberGroups = {}; // A map of dummy parent node and its zero degree members whose parents are not to be tiled
  this.idToDummyNode = {}; // A map of id to dummy node 
  
  var zeroDegree = []; // List of zero degree nodes whose parents are not to be tiled
  var allNodes = this.graphManager.getAllNodes();

  // Fill zero degree list
  for (var i = 0; i < allNodes.length; i++) {
    var node = allNodes[i];
    var parent = node.getParent();
    // If a node has zero degree and its parent is not to be tiled if exists add that node to zeroDegres list
    if (this.getNodeDegreeWithChildren(node) === 0 && ( parent.id == undefined || !this.getToBeTiled(parent) ) ) {
      zeroDegree.push(node);
    }
  }

  // Create a map of parent node and its zero degree members
  for (var i = 0; i < zeroDegree.length; i++)
  {
    var node = zeroDegree[i]; // Zero degree node itself
    var p_id = node.getParent().id; // Parent id

    if (typeof tempMemberGroups[p_id] === "undefined")
      tempMemberGroups[p_id] = [];

    tempMemberGroups[p_id] = tempMemberGroups[p_id].concat(node); // Push node to the list belongs to its parent in tempMemberGroups
  }

  // If there are at least two nodes at a level, create a dummy compound for them
  Object.keys(tempMemberGroups).forEach(function(p_id) {
    if (tempMemberGroups[p_id].length > 1) {
      var dummyCompoundId = "DummyCompound_" + p_id; // The id of dummy compound which will be created soon
      self.memberGroups[dummyCompoundId] = tempMemberGroups[p_id]; // Add dummy compound to memberGroups

      var parent = tempMemberGroups[p_id][0].getParent(); // The parent of zero degree nodes will be the parent of new dummy compound

      // Create a dummy compound with calculated id
      var dummyCompound = new CoSENode(self.graphManager);
      dummyCompound.id = dummyCompoundId;
      dummyCompound.paddingLeft = parent.paddingLeft || 0;
      dummyCompound.paddingRight = parent.paddingRight || 0;
      dummyCompound.paddingBottom = parent.paddingBottom || 0;
      dummyCompound.paddingTop = parent.paddingTop || 0;
      
      self.idToDummyNode[dummyCompoundId] = dummyCompound;
      
      var dummyParentGraph = self.getGraphManager().add(self.newGraph(), dummyCompound);
      var parentGraph = parent.getChild();

      // Add dummy compound to parent the graph
      parentGraph.add(dummyCompound);

      // For each zero degree node in this level remove it from its parent graph and add it to the graph of dummy parent
      for (var i = 0; i < tempMemberGroups[p_id].length; i++) {
        var node = tempMemberGroups[p_id][i];
        
        parentGraph.remove(node);
        dummyParentGraph.add(node);
      }
    }
  });
};

CoSELayout.prototype.clearCompounds = function () {
  var childGraphMap = {};
  var idToNode = {};

  // Get compound ordering by finding the inner one first
  this.performDFSOnCompounds();

  for (var i = 0; i < this.compoundOrder.length; i++) {
    
    idToNode[this.compoundOrder[i].id] = this.compoundOrder[i];
    childGraphMap[this.compoundOrder[i].id] = [].concat(this.compoundOrder[i].getChild().getNodes());

    // Remove children of compounds
    this.graphManager.remove(this.compoundOrder[i].getChild());
    this.compoundOrder[i].child = null;
  }
  
  this.graphManager.resetAllNodes();
  
  // Tile the removed children
  this.tileCompoundMembers(childGraphMap, idToNode);
};

CoSELayout.prototype.clearZeroDegreeMembers = function () {
  var self = this;
  var tiledZeroDegreePack = this.tiledZeroDegreePack = [];

  Object.keys(this.memberGroups).forEach(function(id) {
    var compoundNode = self.idToDummyNode[id]; // Get the dummy compound

    tiledZeroDegreePack[id] = self.tileNodes(self.memberGroups[id], compoundNode.paddingLeft + compoundNode.paddingRight);

    // Set the width and height of the dummy compound as calculated
    compoundNode.rect.width = tiledZeroDegreePack[id].width;
    compoundNode.rect.height = tiledZeroDegreePack[id].height;
    compoundNode.setCenter(tiledZeroDegreePack[id].centerX, tiledZeroDegreePack[id].centerY);

    // compound left and top margings for labels
    // when node labels are included, these values may be set to different values below and are used in tilingPostLayout,
    // otherwise they stay as zero
    compoundNode.labelMarginLeft = 0;
    compoundNode.labelMarginTop = 0;

    // Update compound bounds considering its label properties and set label margins for left and top
    if(CoSEConstants.NODE_DIMENSIONS_INCLUDE_LABELS){

      var width = compoundNode.rect.width;
      var height = compoundNode.rect.height;

      if(compoundNode.labelWidth){
        if(compoundNode.labelPosHorizontal == "left"){
          compoundNode.rect.x -= (compoundNode.labelWidth);
          compoundNode.setWidth(width + compoundNode.labelWidth);
          compoundNode.labelMarginLeft = compoundNode.labelWidth;
        }
        else if(compoundNode.labelPosHorizontal == "center" && compoundNode.labelWidth > width){
          compoundNode.rect.x -= (compoundNode.labelWidth - width) / 2;
          compoundNode.setWidth(compoundNode.labelWidth);
          compoundNode.labelMarginLeft = (compoundNode.labelWidth - width) / 2;
        }
        else if(compoundNode.labelPosHorizontal == "right"){
          compoundNode.setWidth(width + compoundNode.labelWidth);
        }
      }

      if(compoundNode.labelHeight){
        if(compoundNode.labelPosVertical == "top"){
          compoundNode.rect.y -= (compoundNode.labelHeight);
          compoundNode.setHeight(height + compoundNode.labelHeight);
          compoundNode.labelMarginTop = compoundNode.labelHeight;
        }
        else if(compoundNode.labelPosVertical == "center" && compoundNode.labelHeight > height){
          compoundNode.rect.y -= (compoundNode.labelHeight - height) / 2;
          compoundNode.setHeight(compoundNode.labelHeight);
          compoundNode.labelMarginTop = (compoundNode.labelHeight - height) / 2;
        }
        else if(compoundNode.labelPosVertical == "bottom"){
          compoundNode.setHeight(height + compoundNode.labelHeight);
        }
      }
    }
  });
};

CoSELayout.prototype.repopulateCompounds = function () {
  for (var i = this.compoundOrder.length - 1; i >= 0; i--) {
    var lCompoundNode = this.compoundOrder[i];
    var id = lCompoundNode.id;
    var horizontalMargin = lCompoundNode.paddingLeft;
    var verticalMargin = lCompoundNode.paddingTop;
    var labelMarginLeft = lCompoundNode.labelMarginLeft;
    var labelMarginTop = lCompoundNode.labelMarginTop;

    this.adjustLocations(this.tiledMemberPack[id], lCompoundNode.rect.x, lCompoundNode.rect.y, horizontalMargin, verticalMargin, labelMarginLeft, labelMarginTop);
  }
};

CoSELayout.prototype.repopulateZeroDegreeMembers = function () {
  var self = this;
  var tiledPack = this.tiledZeroDegreePack;
  
  Object.keys(tiledPack).forEach(function(id) {
    var compoundNode = self.idToDummyNode[id]; // Get the dummy compound by its id
    var horizontalMargin = compoundNode.paddingLeft;
    var verticalMargin = compoundNode.paddingTop;
    var labelMarginLeft = compoundNode.labelMarginLeft;
    var labelMarginTop = compoundNode.labelMarginTop;

    // Adjust the positions of nodes wrt its compound
    self.adjustLocations(tiledPack[id], compoundNode.rect.x, compoundNode.rect.y, horizontalMargin, verticalMargin, labelMarginLeft, labelMarginTop);
  });
};

CoSELayout.prototype.getToBeTiled = function (node) {
  var id = node.id;
  //firstly check the previous results
  if (this.toBeTiled[id] != null) {
    return this.toBeTiled[id];
  }

  //only compound nodes are to be tiled
  var childGraph = node.getChild();
  if (childGraph == null) {
    this.toBeTiled[id] = false;
    return false;
  }

  var children = childGraph.getNodes(); // Get the children nodes

  //a compound node is not to be tiled if all of its compound children are not to be tiled
  for (var i = 0; i < children.length; i++) {
    var theChild = children[i];

    if (this.getNodeDegree(theChild) > 0) {
      this.toBeTiled[id] = false;
      return false;
    }

    //pass the children not having the compound structure
    if (theChild.getChild() == null) {
      this.toBeTiled[theChild.id] = false;
      continue;
    }

    if (!this.getToBeTiled(theChild)) {
      this.toBeTiled[id] = false;
      return false;
    }
  }
  this.toBeTiled[id] = true;
  return true;
};

// Get degree of a node depending of its edges and independent of its children
CoSELayout.prototype.getNodeDegree = function (node) {
  var id = node.id;
  var edges = node.getEdges();
  var degree = 0;
  
  // For the edges connected
  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    if (edge.getSource().id !== edge.getTarget().id) {
      degree = degree + 1;
    }
  }
  return degree;
};

// Get degree of a node with its children
CoSELayout.prototype.getNodeDegreeWithChildren = function (node) {
  var degree = this.getNodeDegree(node);
  if (node.getChild() == null) {
    return degree;
  }
  var children = node.getChild().getNodes();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    degree += this.getNodeDegreeWithChildren(child);
  }
  return degree;
};

CoSELayout.prototype.performDFSOnCompounds = function () {
  this.compoundOrder = [];
  this.fillCompexOrderByDFS(this.graphManager.getRoot().getNodes());
};

CoSELayout.prototype.fillCompexOrderByDFS = function (children) {
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.getChild() != null) {
      this.fillCompexOrderByDFS(child.getChild().getNodes());
    }
    if (this.getToBeTiled(child)) {
      this.compoundOrder.push(child);
    }
  }
};

/**
* This method places each zero degree member wrt given (x,y) coordinates (top left).
*/
CoSELayout.prototype.adjustLocations = function (organization, x, y, compoundHorizontalMargin, compoundVerticalMargin, compoundLabelMarginLeft, compoundLabelMarginTop) {
  x += compoundHorizontalMargin + compoundLabelMarginLeft;
  y += compoundVerticalMargin + compoundLabelMarginTop;

  var left = x;

  for (var i = 0; i < organization.rows.length; i++) {
    var row = organization.rows[i];
    x = left;
    var maxHeight = 0;

    for (var j = 0; j < row.length; j++) {
      var lnode = row[j];

      lnode.rect.x = x;// + lnode.rect.width / 2;
      lnode.rect.y = y;// + lnode.rect.height / 2;

      x += lnode.rect.width + organization.horizontalPadding;

      if (lnode.rect.height > maxHeight)
        maxHeight = lnode.rect.height;
    }

    y += maxHeight + organization.verticalPadding;
  }
};

CoSELayout.prototype.tileCompoundMembers = function (childGraphMap, idToNode) {
  var self = this;
  this.tiledMemberPack = [];

  Object.keys(childGraphMap).forEach(function(id) {
    // Get the compound node
    var compoundNode = idToNode[id];

    self.tiledMemberPack[id] = self.tileNodes(childGraphMap[id], compoundNode.paddingLeft + compoundNode.paddingRight);

    compoundNode.rect.width = self.tiledMemberPack[id].width;
    compoundNode.rect.height = self.tiledMemberPack[id].height;
    compoundNode.setCenter(self.tiledMemberPack[id].centerX, self.tiledMemberPack[id].centerY);

    // compound left and top margings for labels
    // when node labels are included, these values may be set to different values below and are used in tilingPostLayout,
    // otherwise they stay as zero
    compoundNode.labelMarginLeft = 0;
    compoundNode.labelMarginTop = 0;

    // Update compound bounds considering its label properties and set label margins for left and top
    if(CoSEConstants.NODE_DIMENSIONS_INCLUDE_LABELS){

      var width = compoundNode.rect.width;
      var height = compoundNode.rect.height;

      if(compoundNode.labelWidth){
        if(compoundNode.labelPosHorizontal == "left"){
          compoundNode.rect.x -= (compoundNode.labelWidth);
          compoundNode.setWidth(width + compoundNode.labelWidth);
          compoundNode.labelMarginLeft = compoundNode.labelWidth;
        }
        else if(compoundNode.labelPosHorizontal == "center" && compoundNode.labelWidth > width){
          compoundNode.rect.x -= (compoundNode.labelWidth - width) / 2;
          compoundNode.setWidth(compoundNode.labelWidth);
          compoundNode.labelMarginLeft = (compoundNode.labelWidth - width) / 2;
        }
        else if(compoundNode.labelPosHorizontal == "right"){
          compoundNode.setWidth(width + compoundNode.labelWidth);
        }
      }

      if(compoundNode.labelHeight){
        if(compoundNode.labelPosVertical == "top"){
          compoundNode.rect.y -= (compoundNode.labelHeight);
          compoundNode.setHeight(height + compoundNode.labelHeight);
          compoundNode.labelMarginTop = compoundNode.labelHeight;
        }
        else if(compoundNode.labelPosVertical == "center" && compoundNode.labelHeight > height){
          compoundNode.rect.y -= (compoundNode.labelHeight - height) / 2;
          compoundNode.setHeight(compoundNode.labelHeight);
          compoundNode.labelMarginTop = (compoundNode.labelHeight - height) / 2;
        }
        else if(compoundNode.labelPosVertical == "bottom"){
          compoundNode.setHeight(height + compoundNode.labelHeight);
        }
      }
    }
  });
};

CoSELayout.prototype.tileNodes = function (nodes, minWidth) {
  var horizontalOrg = this.tileNodesByFavoringDim(nodes, minWidth, true);
  var verticalOrg = this.tileNodesByFavoringDim(nodes, minWidth, false);

  var horizontalRatio = this.getOrgRatio(horizontalOrg);
  var verticalRatio = this.getOrgRatio(verticalOrg);
  var bestOrg;

  // the best ratio is the one that is closer to 1 since the ratios are already normalized
  // and the best organization is the one that has the best ratio
  if (verticalRatio < horizontalRatio) {
    bestOrg = verticalOrg;
  } else {
    bestOrg = horizontalOrg;
  }

  return bestOrg;
};

// get the width/height ratio of the organization that is normalized so that it will not be less than 1
CoSELayout.prototype.getOrgRatio = function (organization) {
  // get dimensions and calculate the initial ratio
  var width = organization.width;
  var height = organization.height;
  var ratio = width / height;

  // if the initial ratio is less then 1 then inverse it
  if (ratio < 1) {
    ratio = 1 / ratio;
  }

  // return the normalized ratio
  return ratio;
};

/*
 * Calculates the ideal width for the rows. This method assumes that
 * each node has the same sizes and calculates the ideal row width that
 * approximates a square shaped complex accordingly. However, since nodes would
 * have different sizes some rows would have different sizes and the resulting
 * shape would not be an exact square.
 */
CoSELayout.prototype.calcIdealRowWidth = function (members, favorHorizontalDim) {
  // To approximate a square shaped complex we need to make complex width equal to complex height.
  // To achieve this we need to solve the following equation system for hc:
  // (x + bx) * hc - bx = (y + by) * vc - by, hc * vc = n
  // where x is the avarage width of the nodes, y is the avarage height of nodes
  // bx and by are the buffer sizes in horizontal and vertical dimensions accordingly,
  // hc and vc are the number of rows in horizontal and vertical dimensions
  // n is number of members.

  var verticalPadding = CoSEConstants.TILING_PADDING_VERTICAL;
  var horizontalPadding = CoSEConstants.TILING_PADDING_HORIZONTAL;

  // number of members
  var membersSize = members.length;

  // sum of the width of all members
  var totalWidth = 0;

  // sum of the height of all members
  var totalHeight = 0;

  var maxWidth = 0;

  // traverse all members to calculate total width and total height and get the maximum members width
  members.forEach(function (node) {
    totalWidth += node.getWidth();
    totalHeight += node.getHeight();

    if (node.getWidth() > maxWidth) {
      maxWidth = node.getWidth();
    }
  });

  // average width of the members
  var averageWidth = totalWidth / membersSize;

  // average height of the members
  var averageHeight = totalHeight / membersSize;

  // solving the initial equation system for the hc yields the following second degree equation:
  // hc^2 * (x+bx) + hc * (by - bx) - n * (y + by) = 0

  // the delta value to solve the equation above for hc
  var delta = Math.pow(verticalPadding - horizontalPadding, 2) + 4 * (averageWidth + horizontalPadding) * (averageHeight + verticalPadding) * membersSize;

  // solve the equation using delta value to calculate the horizontal count
  // that represents the number of nodes in an ideal row
  var horizontalCountDouble = (horizontalPadding - verticalPadding + Math.sqrt(delta)) / (2 * (averageWidth + horizontalPadding));
  // round the calculated horizontal count up or down according to the favored dimension
  var horizontalCount;

  if (favorHorizontalDim) {
    horizontalCount = Math.ceil(horizontalCountDouble);
    // if horizontalCount count is not a float value then both of rounding to floor and ceil
    // will yield the same values. Instead of repeating the same calculation try going up
    // while favoring horizontal dimension in such cases
    if ( horizontalCount == horizontalCountDouble ) {
      horizontalCount++;
    }
  } else {
    horizontalCount = Math.floor(horizontalCountDouble);
  }

  // ideal width to be calculated
  var idealWidth = horizontalCount * (averageWidth + horizontalPadding) - horizontalPadding;

  // if max width is bigger than calculated ideal width reset ideal width to it
  if (maxWidth > idealWidth) {
    idealWidth = maxWidth;
  }

  // add the left-right margins to the ideal row width
  idealWidth += horizontalPadding * 2;

  // return the ideal row width1
  return idealWidth;
};

CoSELayout.prototype.tileNodesByFavoringDim = function (nodes, minWidth, favorHorizontalDim) {
  var verticalPadding = CoSEConstants.TILING_PADDING_VERTICAL;
  var horizontalPadding = CoSEConstants.TILING_PADDING_HORIZONTAL;
  var tilingCompareBy = CoSEConstants.TILING_COMPARE_BY;
  var organization = {
    rows: [],
    rowWidth: [],
    rowHeight: [],
    width: 0,
    height: minWidth, // assume minHeight equals to minWidth
    verticalPadding: verticalPadding,
    horizontalPadding: horizontalPadding,
    centerX: 0,
    centerY: 0
  };

  if (tilingCompareBy) {
    organization.idealRowWidth = this.calcIdealRowWidth(nodes, favorHorizontalDim);
  }

  var getNodeArea = function( n ) {
    return n.rect.width * n.rect.height;
  };

  var areaCompareFcn = function(n1, n2){
    return getNodeArea( n2 ) - getNodeArea( n1 );
  };

  // Sort the nodes in descending order of their areas
  nodes.sort(function (n1, n2) {
    var cmpBy = areaCompareFcn;
    if ( organization.idealRowWidth ) {
      cmpBy = tilingCompareBy;
      return cmpBy( n1.id, n2.id );
    }
    return cmpBy( n1, n2 );
  });

  // Create the organization -> calculate compound center
  var sumCenterX = 0;
  var sumCenterY = 0;
  for (var i = 0; i < nodes.length; i++) {
    var lNode = nodes[i];

    sumCenterX += lNode.getCenterX();
    sumCenterY += lNode.getCenterY();
  }

  organization.centerX = sumCenterX / nodes.length;
  organization.centerY = sumCenterY / nodes.length;

  // Create the organization -> tile members
  for (var i = 0; i < nodes.length; i++) {
    var lNode = nodes[i];
    
    if (organization.rows.length == 0) {
      this.insertNodeToRow(organization, lNode, 0, minWidth);
    }
    else if (this.canAddHorizontal(organization, lNode.rect.width, lNode.rect.height)) {
      var rowIndex = organization.rows.length - 1;
      if (!organization.idealRowWidth) {
        rowIndex = this.getShortestRowIndex(organization);
      }
      this.insertNodeToRow(organization, lNode, rowIndex, minWidth);
    }
    else {
      this.insertNodeToRow(organization, lNode, organization.rows.length, minWidth);
    }

    this.shiftToLastRow(organization);
  }

  return organization;
};

CoSELayout.prototype.insertNodeToRow = function (organization, node, rowIndex, minWidth) {
  var minCompoundSize = minWidth;

  // Add new row if needed
  if (rowIndex == organization.rows.length) {
    var secondDimension = [];

    organization.rows.push(secondDimension);
    organization.rowWidth.push(minCompoundSize);
    organization.rowHeight.push(0);
  }

  // Update row width
  var w = organization.rowWidth[rowIndex] + node.rect.width;

  if (organization.rows[rowIndex].length > 0) {
    w += organization.horizontalPadding;
  }

  organization.rowWidth[rowIndex] = w;
  // Update compound width
  if (organization.width < w) {
    organization.width = w;
  }

  // Update height
  var h = node.rect.height;
  if (rowIndex > 0)
    h += organization.verticalPadding;

  var extraHeight = 0;
  if (h > organization.rowHeight[rowIndex]) {
    extraHeight = organization.rowHeight[rowIndex];
    organization.rowHeight[rowIndex] = h;
    extraHeight = organization.rowHeight[rowIndex] - extraHeight;
  }

  organization.height += extraHeight;

  // Insert node
  organization.rows[rowIndex].push(node);
};

//Scans the rows of an organization and returns the one with the min width
CoSELayout.prototype.getShortestRowIndex = function (organization) {
  var r = -1;
  var min = Number.MAX_VALUE;

  for (var i = 0; i < organization.rows.length; i++) {
    if (organization.rowWidth[i] < min) {
      r = i;
      min = organization.rowWidth[i];
    }
  }
  return r;
};

//Scans the rows of an organization and returns the one with the max width
CoSELayout.prototype.getLongestRowIndex = function (organization) {
  var r = -1;
  var max = Number.MIN_VALUE;

  for (var i = 0; i < organization.rows.length; i++) {

    if (organization.rowWidth[i] > max) {
      r = i;
      max = organization.rowWidth[i];
    }
  }

  return r;
};

/**
* This method checks whether adding extra width to the organization violates
* the aspect ratio(1) or not.
*/
CoSELayout.prototype.canAddHorizontal = function (organization, extraWidth, extraHeight) {

  // if there is an ideal row width specified use it instead of checking the aspect ratio
  if (organization.idealRowWidth) {
    var lastRowIndex = organization.rows.length - 1;
    var lastRowWidth = organization.rowWidth[lastRowIndex];

    // check and return if ideal row width will be exceed if the node is added to the row
    return lastRowWidth + extraWidth + organization.horizontalPadding <= organization.idealRowWidth;
  }

  var sri = this.getShortestRowIndex(organization);

  if (sri < 0) {
    return true;
  }

  var min = organization.rowWidth[sri];

  if (min + organization.horizontalPadding + extraWidth <= organization.width)
    return true;

  var hDiff = 0;

  // Adding to an existing row
  if (organization.rowHeight[sri] < extraHeight) {
    if (sri > 0)
      hDiff = extraHeight + organization.verticalPadding - organization.rowHeight[sri];
  }

  var add_to_row_ratio;
  if (organization.width - min >= extraWidth + organization.horizontalPadding) {
    add_to_row_ratio = (organization.height + hDiff) / (min + extraWidth + organization.horizontalPadding);
  } else {
    add_to_row_ratio = (organization.height + hDiff) / organization.width;
  }

  // Adding a new row for this node
  hDiff = extraHeight + organization.verticalPadding;
  var add_new_row_ratio;
  if (organization.width < extraWidth) {
    add_new_row_ratio = (organization.height + hDiff) / extraWidth;
  } else {
    add_new_row_ratio = (organization.height + hDiff) / organization.width;
  }

  if (add_new_row_ratio < 1)
    add_new_row_ratio = 1 / add_new_row_ratio;

  if (add_to_row_ratio < 1)
    add_to_row_ratio = 1 / add_to_row_ratio;

  return add_to_row_ratio < add_new_row_ratio;
};

//If moving the last node from the longest row and adding it to the last
//row makes the bounding box smaller, do it.
CoSELayout.prototype.shiftToLastRow = function (organization) {
  var longest = this.getLongestRowIndex(organization);
  var last = organization.rowWidth.length - 1;
  var row = organization.rows[longest];
  var node = row[row.length - 1];

  var diff = node.width + organization.horizontalPadding;

  // Check if there is enough space on the last row
  if (organization.width - organization.rowWidth[last] > diff && longest != last) {
    // Remove the last element of the longest row
    row.splice(-1, 1);

    // Push it to the last row
    organization.rows[last].push(node);

    organization.rowWidth[longest] = organization.rowWidth[longest] - diff;
    organization.rowWidth[last] = organization.rowWidth[last] + diff;
    organization.width = organization.rowWidth[instance.getLongestRowIndex(organization)];

    // Update heights of the organization
    var maxHeight = Number.MIN_VALUE;
    for (var i = 0; i < row.length; i++) {
      if (row[i].height > maxHeight)
        maxHeight = row[i].height;
    }
    if (longest > 0)
      maxHeight += organization.verticalPadding;

    var prevTotal = organization.rowHeight[longest] + organization.rowHeight[last];

    organization.rowHeight[longest] = maxHeight;
    if (organization.rowHeight[last] < node.height + organization.verticalPadding)
      organization.rowHeight[last] = node.height + organization.verticalPadding;

    var finalTotal = organization.rowHeight[longest] + organization.rowHeight[last];
    organization.height += (finalTotal - prevTotal);

    this.shiftToLastRow(organization);
  }
};

CoSELayout.prototype.tilingPreLayout = function() {
  if (CoSEConstants.TILE) {
    // Find zero degree nodes and create a compound for each level
    this.groupZeroDegreeMembers();
    // Tile and clear children of each compound
    this.clearCompounds();
    // Separately tile and clear zero degree nodes for each level
    this.clearZeroDegreeMembers();
  }
};

CoSELayout.prototype.tilingPostLayout = function() {
  if (CoSEConstants.TILE) {
    this.repopulateZeroDegreeMembers();
    this.repopulateCompounds();
  }
};

// -----------------------------------------------------------------------------
// Section: Tree Reduction methods
// -----------------------------------------------------------------------------
// Reduce trees 
CoSELayout.prototype.reduceTrees = function ()
{
  var prunedNodesAll = [];
  var containsLeaf = true;
  var node;
  
  while(containsLeaf) {
    var allNodes = this.graphManager.getAllNodes();
    var prunedNodesInStepTemp = [];
    containsLeaf = false;
    
    for (var i = 0; i < allNodes.length; i++) {
      node = allNodes[i];
      if(node.getEdges().length == 1 && !node.getEdges()[0].isInterGraph && node.getChild() == null){
        if(CoSEConstants.PURE_INCREMENTAL) {
          var otherEnd = node.getEdges()[0].getOtherEnd(node);
          var relativePosition = new DimensionD(node.getCenterX() - otherEnd.getCenterX(), node.getCenterY() - otherEnd.getCenterY());
          prunedNodesInStepTemp.push([node, node.getEdges()[0], node.getOwner(), relativePosition]);
        }
        else {
          prunedNodesInStepTemp.push([node, node.getEdges()[0], node.getOwner()]);
        }
        containsLeaf = true;
      }  
    }
    if(containsLeaf == true){
      var prunedNodesInStep = [];
      for(var j = 0; j < prunedNodesInStepTemp.length; j++){
        if(prunedNodesInStepTemp[j][0].getEdges().length == 1){
          prunedNodesInStep.push(prunedNodesInStepTemp[j]);  
          prunedNodesInStepTemp[j][0].getOwner().remove(prunedNodesInStepTemp[j][0]);
        }
      }
      prunedNodesAll.push(prunedNodesInStep);
      this.graphManager.resetAllNodes();
      this.graphManager.resetAllEdges();
    }
  }
  this.prunedNodesAll = prunedNodesAll;
};

// Grow tree one step 
CoSELayout.prototype.growTree = function(prunedNodesAll)
{
  var lengthOfPrunedNodesInStep = prunedNodesAll.length; 
  var prunedNodesInStep = prunedNodesAll[lengthOfPrunedNodesInStep - 1];  

  var nodeData;  
  for(var i = 0; i < prunedNodesInStep.length; i++){
    nodeData = prunedNodesInStep[i];
    
    this.findPlaceforPrunedNode(nodeData);
    
    nodeData[2].add(nodeData[0]);
    nodeData[2].add(nodeData[1], nodeData[1].source, nodeData[1].target);
  }

  prunedNodesAll.splice(prunedNodesAll.length-1, 1);
  this.graphManager.resetAllNodes();
  this.graphManager.resetAllEdges();
};

// Find an appropriate position to replace pruned node, this method can be improved
CoSELayout.prototype.findPlaceforPrunedNode = function(nodeData){
  
  var gridForPrunedNode;  
  var nodeToConnect;
  var prunedNode = nodeData[0];
  if(prunedNode == nodeData[1].source){
    nodeToConnect = nodeData[1].target;
  }
  else {
    nodeToConnect = nodeData[1].source;  
  }
  
  if(CoSEConstants.PURE_INCREMENTAL) {
    prunedNode.setCenter(nodeToConnect.getCenterX() + nodeData[3].getWidth(),
                         nodeToConnect.getCenterY() + nodeData[3].getHeight());
  }
  else {
    var startGridX = nodeToConnect.startX;
    var finishGridX = nodeToConnect.finishX;
    var startGridY = nodeToConnect.startY;
    var finishGridY = nodeToConnect.finishY; 

    var upNodeCount = 0;
    var downNodeCount = 0;
    var rightNodeCount = 0;
    var leftNodeCount = 0;
    var controlRegions = [upNodeCount, rightNodeCount, downNodeCount, leftNodeCount]

    if(startGridY > 0){
      for(var i = startGridX; i <= finishGridX; i++ ){
        controlRegions[0] += (this.grid[i][startGridY - 1].length + this.grid[i][startGridY].length - 1);   
      }
    }
    if(finishGridX < this.grid.length - 1){
      for(var i = startGridY; i <= finishGridY; i++ ){
        controlRegions[1] += (this.grid[finishGridX + 1][i].length + this.grid[finishGridX][i].length - 1);   
      }
    }
    if(finishGridY < this.grid[0].length - 1){
      for(var i = startGridX; i <= finishGridX; i++ ){
        controlRegions[2] += (this.grid[i][finishGridY + 1].length + this.grid[i][finishGridY].length - 1);   
      }
    }
    if(startGridX > 0){
      for(var i = startGridY; i <= finishGridY; i++ ){
        controlRegions[3] += (this.grid[startGridX - 1][i].length + this.grid[startGridX][i].length - 1);   
      }
    }
    var min = Integer.MAX_VALUE;
    var minCount;
    var minIndex;
    for(var j = 0; j < controlRegions.length; j++){
      if(controlRegions[j] < min){
        min = controlRegions[j];
        minCount = 1;
        minIndex = j;
      }  
      else if(controlRegions[j] == min){
        minCount++;  
      }
    }

    if(minCount == 3 && min == 0){
      if(controlRegions[0] == 0 && controlRegions[1] == 0 && controlRegions[2] == 0){
        gridForPrunedNode = 1;    
      }
      else if(controlRegions[0] == 0 && controlRegions[1] == 0 && controlRegions[3] == 0){
        gridForPrunedNode = 0;  
      }
      else if(controlRegions[0] == 0 && controlRegions[2] == 0 && controlRegions[3] == 0){
        gridForPrunedNode = 3;  
      }
      else if(controlRegions[1] == 0 && controlRegions[2] == 0 && controlRegions[3] == 0){
        gridForPrunedNode = 2;  
      }
    }
    else if(minCount == 2 && min == 0){
      var random = Math.floor(Math.random() * 2);
      if(controlRegions[0] == 0 && controlRegions[1] == 0){;
        if(random == 0){
          gridForPrunedNode = 0;
        }
        else{
          gridForPrunedNode = 1;
        }
      }
      else if(controlRegions[0] == 0 && controlRegions[2] == 0){
        if(random == 0){
          gridForPrunedNode = 0;
        }
        else{
          gridForPrunedNode = 2;
        }
      }
      else if(controlRegions[0] == 0 && controlRegions[3] == 0){
        if(random == 0){
          gridForPrunedNode = 0;
        }
        else{
          gridForPrunedNode = 3;
        }
      }
      else if(controlRegions[1] == 0 && controlRegions[2] == 0){
        if(random == 0){
          gridForPrunedNode = 1;
        }
        else{
          gridForPrunedNode = 2;
        }
      }
      else if(controlRegions[1] == 0 && controlRegions[3] == 0){
        if(random == 0){
          gridForPrunedNode = 1;
        }
        else{
          gridForPrunedNode = 3;
        }
      }
      else {
        if(random == 0){
          gridForPrunedNode = 2;
        }
        else{
          gridForPrunedNode = 3;
        }
      }
    }
    else if(minCount == 4 && min == 0){
      var random = Math.floor(Math.random() * 4);
      gridForPrunedNode = random;  
    }
    else {
      gridForPrunedNode = minIndex;
    }

    if(gridForPrunedNode == 0) {
      prunedNode.setCenter(nodeToConnect.getCenterX(),
                           nodeToConnect.getCenterY() - nodeToConnect.getHeight()/2 - FDLayoutConstants.DEFAULT_EDGE_LENGTH - prunedNode.getHeight()/2);  
    }
    else if(gridForPrunedNode == 1) {
      prunedNode.setCenter(nodeToConnect.getCenterX() + nodeToConnect.getWidth()/2 + FDLayoutConstants.DEFAULT_EDGE_LENGTH + prunedNode.getWidth()/2,
                           nodeToConnect.getCenterY());  
    }
    else if(gridForPrunedNode == 2) {
      prunedNode.setCenter(nodeToConnect.getCenterX(),
                           nodeToConnect.getCenterY() + nodeToConnect.getHeight()/2 + FDLayoutConstants.DEFAULT_EDGE_LENGTH + prunedNode.getHeight()/2);  
    }
    else { 
      prunedNode.setCenter(nodeToConnect.getCenterX() - nodeToConnect.getWidth()/2 - FDLayoutConstants.DEFAULT_EDGE_LENGTH - prunedNode.getWidth()/2,
                           nodeToConnect.getCenterY());  
    }
  }
};

module.exports = CoSELayout;
