/*
 * Auxiliary functions
 */

const LinkedList = require('cose-base').layoutBase.LinkedList;

let auxiliary = {};

// get the top most nodes
auxiliary.getTopMostNodes = function(nodes) {
  let nodesMap = {};
  for (let i = 0; i < nodes.length; i++) {
      nodesMap[nodes[i].id()] = true;
  }
  let roots = nodes.filter(function (ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
      let parent = ele.parent()[0];
      while(parent != null){
        if(nodesMap[parent.id()]){
          return false;
        }
        parent = parent.parent()[0];
      }
      return true;
  });

  return roots;
};

// find disconnected components and create dummy nodes that connect them
auxiliary.connectComponents = function(cy, eles, topMostNodes, dummyNodes){
  let queue = new LinkedList();
  let visited = new Set();
  let visitedTopMostNodes = [];
  let currentNeighbor;
  let minDegreeNode;
  let minDegree;

  let isConnected = false;
  let count = 1;
  let nodesConnectedToDummy = [];
  let components = [];

  do{
    let cmpt = cy.collection();
    components.push(cmpt);
    
    let currentNode = topMostNodes[0];
    let childrenOfCurrentNode = cy.collection();
    childrenOfCurrentNode.merge(currentNode).merge(currentNode.descendants().intersection(eles));
    visitedTopMostNodes.push(currentNode);

    childrenOfCurrentNode.forEach(function(node) {
      queue.push(node);
      visited.add(node);
      cmpt.merge(node);
    });

    while(queue.length != 0){
      currentNode = queue.shift();

      // Traverse all neighbors of this node
      let neighborNodes = cy.collection();
      currentNode.neighborhood().nodes().forEach(function(node){
        if(eles.intersection(currentNode.edgesWith(node)).length > 0){
          neighborNodes.merge(node);
        }
      });

      for(let i = 0; i < neighborNodes.length; i++){
        let neighborNode = neighborNodes[i];
        currentNeighbor = topMostNodes.intersection(neighborNode.union(neighborNode.ancestors()));
        if(currentNeighbor != null && !visited.has(currentNeighbor[0])){
          let childrenOfNeighbor = currentNeighbor.union(currentNeighbor.descendants());

          childrenOfNeighbor.forEach(function(node){
            queue.push(node);
            visited.add(node);
            cmpt.merge(node);
            if(topMostNodes.has(node)){
              visitedTopMostNodes.push(node);
            }
          });

        }
      }
    }
    
    cmpt.forEach(node => {
      eles.intersection(node.connectedEdges()).forEach(e => { // connectedEdges() usually cached
        if( cmpt.has(e.source()) && cmpt.has(e.target()) ){ // has() is cheap
          cmpt.merge(e);
        }
      });
    });    

    if(visitedTopMostNodes.length == topMostNodes.length){
      isConnected = true;
    }

    if(!isConnected || (isConnected && count > 1)){
      minDegreeNode = visitedTopMostNodes[0];
      minDegree = minDegreeNode.connectedEdges().length;
      visitedTopMostNodes.forEach(function(node){
        if(node.connectedEdges().length < minDegree){
          minDegree = node.connectedEdges().length;
          minDegreeNode = node;
        }
      });
      nodesConnectedToDummy.push(minDegreeNode.id());
      // TO DO: Check efficiency of this part
      let temp = cy.collection();
      temp.merge(visitedTopMostNodes[0]);
      visitedTopMostNodes.forEach(function(node){
        temp.merge(node);
      });
      visitedTopMostNodes = [];
      topMostNodes = topMostNodes.difference(temp);
      count++;
    }

  }
  while(!isConnected);

  if(dummyNodes){
    if(nodesConnectedToDummy.length > 0 ){
        dummyNodes.set('dummy'+(dummyNodes.size+1), nodesConnectedToDummy);
    }
  }
  return components;
};

// relocates componentResult to originalCenter if there is no fixedNodeConstraint
auxiliary.relocateComponent = function(originalCenter, componentResult, options) {
  if (!options.fixedNodeConstraint) {
    let minXCoord = Number.POSITIVE_INFINITY;
    let maxXCoord = Number.NEGATIVE_INFINITY;
    let minYCoord = Number.POSITIVE_INFINITY;
    let maxYCoord = Number.NEGATIVE_INFINITY;
    if (options.quality == "draft") {
      // calculate current bounding box
      for (let [key, value] of componentResult.nodeIndexes) {
        let cyNode = options.cy.getElementById(key);
        if (cyNode) {
          let nodeBB = cyNode.boundingBox();
          let leftX = componentResult.xCoords[value] - nodeBB.w / 2;
          let rightX = componentResult.xCoords[value] + nodeBB.w / 2;
          let topY = componentResult.yCoords[value] - nodeBB.h / 2;
          let bottomY = componentResult.yCoords[value] + nodeBB.h / 2;

          if (leftX < minXCoord)
            minXCoord = leftX;
          if (rightX > maxXCoord)
            maxXCoord = rightX;
          if (topY < minYCoord)
            minYCoord = topY;
          if (bottomY > maxYCoord)
            maxYCoord = bottomY;
        }
      }
      // find difference between current and original center
      let diffOnX = originalCenter.x - (maxXCoord + minXCoord) / 2;
      let diffOnY = originalCenter.y - (maxYCoord + minYCoord) / 2;
      // move component to original center
      componentResult.xCoords = componentResult.xCoords.map(x => x + diffOnX);
      componentResult.yCoords = componentResult.yCoords.map(y => y + diffOnY);
    }
    else {
      // calculate current bounding box
      Object.keys(componentResult).forEach(function (item) {
        let node = componentResult[item];
        let leftX = node.getRect().x;
        let rightX = node.getRect().x + node.getRect().width;
        let topY = node.getRect().y;
        let bottomY = node.getRect().y + node.getRect().height;

        if (leftX < minXCoord)
          minXCoord = leftX;
        if (rightX > maxXCoord)
          maxXCoord = rightX;
        if (topY < minYCoord)
          minYCoord = topY;
        if (bottomY > maxYCoord)
          maxYCoord = bottomY;
      });
      // find difference between current and original center
      let diffOnX = originalCenter.x - (maxXCoord + minXCoord) / 2;
      let diffOnY = originalCenter.y - (maxYCoord + minYCoord) / 2;
      // move component to original center
      Object.keys(componentResult).forEach(function (item) {
        let node = componentResult[item];
        node.setCenter(node.getCenterX() + diffOnX, node.getCenterY() + diffOnY);
      });
    }
  }
};

auxiliary.calcBoundingBox = function(parentNode, xCoords, yCoords, nodeIndexes){
    // calculate bounds
    let left = Number.MAX_SAFE_INTEGER;
    let right = Number.MIN_SAFE_INTEGER;
    let top = Number.MAX_SAFE_INTEGER;
    let bottom = Number.MIN_SAFE_INTEGER;
    let nodeLeft;
    let nodeRight;
    let nodeTop;
    let nodeBottom;

    let nodes = parentNode.descendants().not(":parent");
    let s = nodes.length;
    for (let i = 0; i < s; i++)
    {
      let node = nodes[i];

      nodeLeft = xCoords[nodeIndexes.get(node.id())] - node.width()/2;
      nodeRight = xCoords[nodeIndexes.get(node.id())] + node.width()/2;
      nodeTop = yCoords[nodeIndexes.get(node.id())] - node.height()/2;
      nodeBottom = yCoords[nodeIndexes.get(node.id())] + node.height()/2;

      if (left > nodeLeft)
      {
        left = nodeLeft;
      }

      if (right < nodeRight)
      {
        right = nodeRight;
      }

      if (top > nodeTop)
      {
        top = nodeTop;
      }

      if (bottom < nodeBottom)
      {
        bottom = nodeBottom;
      }
    }

    let boundingBox = {};
    boundingBox.topLeftX = left;
    boundingBox.topLeftY = top;
    boundingBox.width = right - left;
    boundingBox.height = bottom - top;
    return boundingBox;
};

// This function finds and returns parent nodes whose all children are hidden
auxiliary.calcParentsWithoutChildren = function(cy, eles){
  let parentsWithoutChildren = cy.collection();
  eles.nodes(':parent').forEach((parent) => {
    let check = false;
    parent.children().forEach((child) => {
      if(child.css('display') != 'none') {
        check = true;
      }
    });
    if(!check) {
      parentsWithoutChildren.merge(parent);
    }
  });

  return parentsWithoutChildren;
}

module.exports = auxiliary;