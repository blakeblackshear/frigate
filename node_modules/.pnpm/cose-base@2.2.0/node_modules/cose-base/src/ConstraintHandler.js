var CoSEConstants = require('./CoSEConstants');
var LinkedList = require('layout-base').LinkedList;
var Matrix = require('layout-base').Matrix;
var SVD = require('layout-base').SVD;

function ConstraintHandler() {
}

ConstraintHandler.handleConstraints = function (layout)
{
//  let layout = this.graphManager.getLayout();
  
  // get constraints from layout
  let constraints = {};
  constraints.fixedNodeConstraint = layout.constraints.fixedNodeConstraint;
  constraints.alignmentConstraint = layout.constraints.alignmentConstraint;
  constraints.relativePlacementConstraint = layout.constraints.relativePlacementConstraint;
  
  let idToNodeMap = new Map();
  let nodeIndexes = new Map();
  let xCoords = [];
  let yCoords = [];  
  
  let allNodes = layout.getAllNodes();
  let index = 0;
  // fill index map and coordinates
  for (let i = 0; i < allNodes.length; i++) {
    let node = allNodes[i];
    if (node.getChild() == null) {
      nodeIndexes.set(node.id, index++);
      xCoords.push(node.getCenterX());
      yCoords.push(node.getCenterY());
      idToNodeMap.set(node.id, node);
    }
  }
  
  // if there exists relative placement constraint without gap value, set it to default 
  if (constraints.relativePlacementConstraint) {
    constraints.relativePlacementConstraint.forEach(function(constraint) {
      if (!constraint.gap && constraint.gap != 0) {
        if (constraint.left) {
          constraint.gap = CoSEConstants.DEFAULT_EDGE_LENGTH + idToNodeMap.get(constraint.left).getWidth()/2 + idToNodeMap.get(constraint.right).getWidth()/2;
        }
        else {
          constraint.gap = CoSEConstants.DEFAULT_EDGE_LENGTH + idToNodeMap.get(constraint.top).getHeight()/2 + idToNodeMap.get(constraint.bottom).getHeight()/2;
        }
      }
    });
  }
  
  /* auxiliary functions */
 
  // calculate difference between two position objects
  let calculatePositionDiff = function(pos1, pos2) {
    return {x: pos1.x - pos2.x, y: pos1.y - pos2.y};
  };
  
  // calculate average position of the nodes
  let calculateAvgPosition = function(nodeIdSet) {
    let xPosSum = 0;
    let yPosSum = 0;    
    nodeIdSet.forEach(function(nodeId) {
      xPosSum += xCoords[nodeIndexes.get(nodeId)];
      yPosSum += yCoords[nodeIndexes.get(nodeId)];
    });
    
    return {x: xPosSum / nodeIdSet.size, y: yPosSum / nodeIdSet.size};
  };
  
  // find an appropriate positioning for the nodes in a given graph according to relative placement constraints
  // this function also takes the fixed nodes and alignment constraints into account
  // graph: dag to be evaluated, direction: "horizontal" or "vertical", 
  // fixedNodes: set of fixed nodes to consider during evaluation, dummyPositions: appropriate coordinates of the dummy nodes  
  let findAppropriatePositionForRelativePlacement = function(graph, direction, fixedNodes, dummyPositions, componentSources) {
    
    // find union of two sets
    function setUnion(setA, setB) {
      let union = new Set(setA);
      for (let elem of setB) {
          union.add(elem);
      }
      return union;
    }
    
    // find indegree count for each node
    let inDegrees = new Map();

    graph.forEach(function(value, key) {
      inDegrees.set(key, 0);
    });      
    graph.forEach(function(value, key) {
      value.forEach(function(adjacent) {
        inDegrees.set(adjacent.id, inDegrees.get(adjacent.id) + 1);  
      });       
    });

    let positionMap = new Map(); // keeps the position for each node
    let pastMap = new Map();  // keeps the predecessors(past) of a node
    let queue = new LinkedList();
    inDegrees.forEach(function(value, key) {
      if (value == 0) {
        queue.push(key);
        if (!fixedNodes) {
          if (direction == "horizontal") {
            positionMap.set(key, nodeIndexes.has(key) ? xCoords[nodeIndexes.get(key)] : dummyPositions.get(key));
          }
          else {
            positionMap.set(key, nodeIndexes.has(key) ? yCoords[nodeIndexes.get(key)] : dummyPositions.get(key));
          }
        }
      }
      else {
        positionMap.set(key, Number.NEGATIVE_INFINITY);       
      }
      if (fixedNodes) {
        pastMap.set(key, new Set([key]));
      }
    });
    
    // align sources of each component in enforcement phase
    if (fixedNodes) {
      componentSources.forEach(function(component) {
        let fixedIds = [];
        component.forEach(function(nodeId) {
          if (fixedNodes.has(nodeId)) {
            fixedIds.push(nodeId);
          }          
        });
        if (fixedIds.length > 0) {
          let position = 0;
          fixedIds.forEach(function(fixedId) {
            if (direction == "horizontal") {
              positionMap.set(fixedId, nodeIndexes.has(fixedId) ? xCoords[nodeIndexes.get(fixedId)] : dummyPositions.get(fixedId));
              position += positionMap.get(fixedId);
            }
            else {
              positionMap.set(fixedId, nodeIndexes.has(fixedId) ? yCoords[nodeIndexes.get(fixedId)] : dummyPositions.get(fixedId));
              position += positionMap.get(fixedId);
            }            
          });
          position = position / fixedIds.length;
          component.forEach(function(nodeId) {
            if (!fixedNodes.has(nodeId)) {
              positionMap.set(nodeId, position);
            }          
          });          
        }
        else {
          let position = 0;
          component.forEach(function(nodeId) {
            if (direction == "horizontal") {
              position += nodeIndexes.has(nodeId) ? xCoords[nodeIndexes.get(nodeId)] : dummyPositions.get(nodeId);
            }
            else {
              position += nodeIndexes.has(nodeId) ? yCoords[nodeIndexes.get(nodeId)] : dummyPositions.get(nodeId);
            }
          });
          position = position / component.length;
          component.forEach(function(nodeId) {
            positionMap.set(nodeId, position);     
          });
        }
      });
    }

    // calculate positions of the nodes
    while (queue.length != 0) {
      let currentNode = queue.shift();
      let neighbors = graph.get(currentNode);
      neighbors.forEach(function(neighbor) {
        if (positionMap.get(neighbor.id) < (positionMap.get(currentNode) + neighbor.gap)) {
          if (fixedNodes && fixedNodes.has(neighbor.id)) {
            let fixedPosition;
            if (direction == "horizontal") {
              fixedPosition = nodeIndexes.has(neighbor.id) ? xCoords[nodeIndexes.get(neighbor.id)] : dummyPositions.get(neighbor.id);
            }
            else {
              fixedPosition = nodeIndexes.has(neighbor.id) ? yCoords[nodeIndexes.get(neighbor.id)] : dummyPositions.get(neighbor.id);
            }
            positionMap.set(neighbor.id, fixedPosition); // TODO: may do unnecessary work
            if (fixedPosition < (positionMap.get(currentNode) + neighbor.gap)) {
              let diff = (positionMap.get(currentNode) + neighbor.gap) - fixedPosition;
              pastMap.get(currentNode).forEach(function(nodeId) {
                positionMap.set(nodeId, positionMap.get(nodeId) - diff);
              });
            }            
          }
          else {
            positionMap.set(neighbor.id, positionMap.get(currentNode) + neighbor.gap);
          }
        }
        inDegrees.set(neighbor.id, inDegrees.get(neighbor.id) - 1);
        if (inDegrees.get(neighbor.id) == 0) {
          queue.push(neighbor.id);
        }
        if (fixedNodes) {
          pastMap.set(neighbor.id, setUnion(pastMap.get(currentNode), pastMap.get(neighbor.id)));
        }
      });
    }

    // readjust position of the nodes after enforcement
    if (fixedNodes) {
      // find indegree count for each node
      let sinkNodes = new Set();

      graph.forEach(function(value, key) {
        if (value.length == 0) {
          sinkNodes.add(key);
        }
      });

      let components = [];
      pastMap.forEach(function(value, key) {
        if (sinkNodes.has(key)) {
          let isFixedComponent = false;
          for (let nodeId of value) {
            if (fixedNodes.has(nodeId)) {
              isFixedComponent = true;
            }
          }
          if (!isFixedComponent) {
            let isExist = false;
            let existAt;
            components.forEach(function(component, index) {
              if (component.has([...value][0])) {
                isExist = true;
                existAt = index;
              }
            });
            if (!isExist) {
              components.push(new Set(value));
            }
            else {
              value.forEach(function(ele) {
                components[existAt].add(ele);
              });              
            }
          }
        }
      });

      components.forEach(function(component, index) {
        let minBefore = Number.POSITIVE_INFINITY;
        let minAfter = Number.POSITIVE_INFINITY;
        let maxBefore = Number.NEGATIVE_INFINITY;
        let maxAfter = Number.NEGATIVE_INFINITY;

        for (let nodeId of component) {
          let posBefore;
          if (direction == "horizontal") {
            posBefore = nodeIndexes.has(nodeId) ? xCoords[nodeIndexes.get(nodeId)] : dummyPositions.get(nodeId);
          }
          else {
            posBefore = nodeIndexes.has(nodeId) ? yCoords[nodeIndexes.get(nodeId)] : dummyPositions.get(nodeId);
          }
          let posAfter = positionMap.get(nodeId);
          if (posBefore < minBefore) {
            minBefore = posBefore;
          }
          if (posBefore > maxBefore) {
            maxBefore = posBefore;
          }
          if (posAfter < minAfter) {
            minAfter = posAfter;
          }
          if (posAfter > maxAfter) {
            maxAfter = posAfter;
          }
        }
        let diff = (minBefore + maxBefore) / 2 - (minAfter + maxAfter) / 2;

        for (let nodeId of component) {
          positionMap.set(nodeId, positionMap.get(nodeId) + diff);
        }
      });
    }

    return positionMap;
  };
  
  // find transformation based on rel. placement constraints if there are both alignment and rel. placement constraints
  // or if there are only rel. placement contraints where the largest component isn't sufficiently large
  let applyReflectionForRelativePlacement = function (relativePlacementConstraints) {
    // variables to count votes
    let reflectOnY = 0, notReflectOnY = 0;
    let reflectOnX = 0, notReflectOnX = 0;

    relativePlacementConstraints.forEach(function(constraint) {
      if (constraint.left) {
        (xCoords[nodeIndexes.get(constraint.left)] - xCoords[nodeIndexes.get(constraint.right)] >= 0) ? reflectOnY++ : notReflectOnY++;
      }
      else {
        (yCoords[nodeIndexes.get(constraint.top)] - yCoords[nodeIndexes.get(constraint.bottom)] >= 0) ? reflectOnX++ : notReflectOnX++;
      }
    });

    if (reflectOnY > notReflectOnY && reflectOnX > notReflectOnX) {
      for (let i = 0; i < nodeIndexes.size; i++) {
        xCoords[i] = -1 * xCoords[i];
        yCoords[i] = -1 * yCoords[i];
      }
    }
    else if (reflectOnY > notReflectOnY) {
      for (let i = 0; i < nodeIndexes.size; i++) {
        xCoords[i] = -1 * xCoords[i];
      }
    }
    else if (reflectOnX > notReflectOnX) {
      for (let i = 0; i < nodeIndexes.size; i++) {
        yCoords[i] = -1 * yCoords[i];
      }
    }
  };
  
  // find weakly connected components in undirected graph
  let findComponents = function(graph) {
    // find weakly connected components in dag
    let components = [];
    let queue = new LinkedList();
    let visited = new Set();
    let count = 0;
    
    graph.forEach(function(value, key) {
      if (!visited.has(key)) {
        components[count] = [];
        let currentNode = key;
        queue.push(currentNode);
        visited.add(currentNode);
        components[count].push(currentNode);

        while (queue.length != 0) {
          currentNode = queue.shift();
          let neighbors = graph.get(currentNode);
          neighbors.forEach(function(neighbor) {
            if (!visited.has(neighbor.id)) {
              queue.push(neighbor.id);
              visited.add(neighbor.id);
              components[count].push(neighbor.id);
            }
          });
        }
        count++;
      }
    });
    return components;
  };
  
  // return undirected version of given dag
  let dagToUndirected = function(dag) {
    let undirected = new Map();
    
    dag.forEach(function(value, key) {
      undirected.set(key, []);
    });
    
    dag.forEach(function(value, key) {
      value.forEach(function(adjacent) {
        undirected.get(key).push(adjacent);
        undirected.get(adjacent.id).push({id: key, gap: adjacent.gap, direction: adjacent.direction});
      });
    });    
    
    return undirected;
  };
  
  // return reversed (directions inverted) version of given dag
  let dagToReversed = function(dag) {
    let reversed = new Map();
    
    dag.forEach(function(value, key) {
      reversed.set(key, []);
    });
    
    dag.forEach(function(value, key) {
      value.forEach(function(adjacent) {
        reversed.get(adjacent.id).push({id: key, gap: adjacent.gap, direction: adjacent.direction});
      });
    });    
    
    return reversed;
  };  
  
  /****  apply transformation to the initial draft layout to better align with constrained nodes ****/
  // solve the Orthogonal Procrustean Problem to rotate and/or reflect initial draft layout
  // here we follow the solution in Chapter 20.2 of Borg, I. & Groenen, P. (2005) Modern Multidimensional Scaling: Theory and Applications 
  
  /* construct source and target configurations */
  
  let targetMatrix = []; // A - target configuration
  let sourceMatrix = []; // B - source configuration 
  let standardTransformation = false; // false for no transformation, true for standart (Procrustes) transformation (rotation and/or reflection)
  let reflectionType = false; // false/true for reflection check, 'reflectOnX', 'reflectOnY' or 'reflectOnBoth' for reflection type if necessary
  let fixedNodes = new Set();
  let dag = new Map(); // adjacency list to keep directed acyclic graph (dag) that consists of relative placement constraints
  let dagUndirected = new Map(); // undirected version of the dag
  let components = []; // weakly connected components
  
  // fill fixedNodes collection to use later
  if (constraints.fixedNodeConstraint) {
    constraints.fixedNodeConstraint.forEach(function(nodeData) {
      fixedNodes.add(nodeData.nodeId);
    });
  }
  
  // construct dag from relative placement constraints 
  if (constraints.relativePlacementConstraint) {
    // construct both directed and undirected version of the dag
    constraints.relativePlacementConstraint.forEach(function(constraint) {
      if (constraint.left) {
        if (dag.has(constraint.left)) {
          dag.get(constraint.left).push({id: constraint.right, gap: constraint.gap, direction: "horizontal"});
        }
        else {
          dag.set(constraint.left, [{id: constraint.right, gap: constraint.gap, direction: "horizontal"}]); 
        }
        if (!dag.has(constraint.right)) {
          dag.set(constraint.right, []);         
        }
      }
      else {
        if (dag.has(constraint.top)) {
          dag.get(constraint.top).push({id: constraint.bottom, gap: constraint.gap, direction: "vertical"});
        }
        else {
          dag.set(constraint.top, [{id: constraint.bottom, gap: constraint.gap, direction: "vertical"}]);        
        }        
        if (!dag.has(constraint.bottom)) {
          dag.set(constraint.bottom, []);         
        }      
      }      
    });
    
    dagUndirected = dagToUndirected(dag);
    components = findComponents(dagUndirected);   
  }
  
  if (CoSEConstants.TRANSFORM_ON_CONSTRAINT_HANDLING) {
    // first check fixed node constraint
    if (constraints.fixedNodeConstraint && constraints.fixedNodeConstraint.length > 1) {
      constraints.fixedNodeConstraint.forEach(function(nodeData, i) {
        targetMatrix[i] = [nodeData.position.x, nodeData.position.y];
        sourceMatrix[i] = [xCoords[nodeIndexes.get(nodeData.nodeId)], yCoords[nodeIndexes.get(nodeData.nodeId)]];
      });
      standardTransformation = true;
    }
    else if (constraints.alignmentConstraint) {  // then check alignment constraint
      let count = 0;
      if (constraints.alignmentConstraint.vertical) {
        let verticalAlign = constraints.alignmentConstraint.vertical;
        for (let i = 0; i < verticalAlign.length; i++) {
          let alignmentSet = new Set();
          verticalAlign[i].forEach(function(nodeId) {
            alignmentSet.add(nodeId);
          });
          let intersection = new Set([...alignmentSet].filter(x => fixedNodes.has(x)));
          let xPos;
          if (intersection.size > 0)
            xPos = xCoords[nodeIndexes.get(intersection.values().next().value)];
          else
            xPos = calculateAvgPosition(alignmentSet).x;

          verticalAlign[i].forEach(function(nodeId) {
            targetMatrix[count] = [xPos, yCoords[nodeIndexes.get(nodeId)]];
            sourceMatrix[count] = [xCoords[nodeIndexes.get(nodeId)], yCoords[nodeIndexes.get(nodeId)]];
            count++;
          });
        }
        standardTransformation = true;
      }
      if (constraints.alignmentConstraint.horizontal) {
        let horizontalAlign = constraints.alignmentConstraint.horizontal;
        for (let i = 0; i < horizontalAlign.length; i++) {
          let alignmentSet = new Set();
          horizontalAlign[i].forEach(function(nodeId) {
            alignmentSet.add(nodeId);
          });
          let intersection = new Set([...alignmentSet].filter(x => fixedNodes.has(x)));
          let yPos;
          if (intersection.size > 0)
            yPos = xCoords[nodeIndexes.get(intersection.values().next().value)];
          else
            yPos = calculateAvgPosition(alignmentSet).y;

          horizontalAlign[i].forEach(function(nodeId) {
            targetMatrix[count] = [xCoords[nodeIndexes.get(nodeId)], yPos];
            sourceMatrix[count] = [xCoords[nodeIndexes.get(nodeId)], yCoords[nodeIndexes.get(nodeId)]];
            count++;
          });
        }
        standardTransformation = true;
      }
      if (constraints.relativePlacementConstraint) {
        reflectionType = true;
      }
    }
    else if (constraints.relativePlacementConstraint) {  // finally check relative placement constraint
      // find largest component in dag
      let largestComponentSize = 0;
      let largestComponentIndex = 0;
      for (let i = 0; i < components.length; i++) {
        if (components[i].length > largestComponentSize) {
          largestComponentSize = components[i].length;
          largestComponentIndex = i;
        }
      }
      // if largest component isn't dominant, then take the votes for reflection
      if (largestComponentSize < (dagUndirected.size / 2)) {
        applyReflectionForRelativePlacement(constraints.relativePlacementConstraint);
        standardTransformation = false;
        reflectionType = false;
      }
      else { // use largest component for transformation
        // construct horizontal and vertical subgraphs in the largest component
        let subGraphOnHorizontal = new Map();
        let subGraphOnVertical = new Map();
        let constraintsInlargestComponent = [];

        components[largestComponentIndex].forEach(function(nodeId) {
          dag.get(nodeId).forEach(function(adjacent) {
            if (adjacent.direction == "horizontal") {
              if (subGraphOnHorizontal.has(nodeId)) {
                subGraphOnHorizontal.get(nodeId).push(adjacent);
              }
              else {
                subGraphOnHorizontal.set(nodeId, [adjacent]);
              }
              if (!subGraphOnHorizontal.has(adjacent.id)) {
                subGraphOnHorizontal.set(adjacent.id, []);
              }
              constraintsInlargestComponent.push({left: nodeId, right: adjacent.id});
            }
            else {
              if (subGraphOnVertical.has(nodeId)) {
                subGraphOnVertical.get(nodeId).push(adjacent);
              }
              else {
                subGraphOnVertical.set(nodeId, [adjacent]);
              }
              if (!subGraphOnVertical.has(adjacent.id)) {
                subGraphOnVertical.set(adjacent.id, []);
              }
              constraintsInlargestComponent.push({top: nodeId, bottom: adjacent.id});
            }
          });
        });

        applyReflectionForRelativePlacement(constraintsInlargestComponent);
        reflectionType = false;

        // calculate appropriate positioning for subgraphs
        let positionMapHorizontal = findAppropriatePositionForRelativePlacement(subGraphOnHorizontal, "horizontal");
        let positionMapVertical = findAppropriatePositionForRelativePlacement(subGraphOnVertical, "vertical");

        // construct source and target configuration
        components[largestComponentIndex].forEach(function(nodeId, i) {
          sourceMatrix[i] = [xCoords[nodeIndexes.get(nodeId)], yCoords[nodeIndexes.get(nodeId)]];
          targetMatrix[i] = [];
          if (positionMapHorizontal.has(nodeId)) {
            targetMatrix[i][0] = positionMapHorizontal.get(nodeId);
          }
          else {
            targetMatrix[i][0] = xCoords[nodeIndexes.get(nodeId)];
          }
          if (positionMapVertical.has(nodeId)) {
            targetMatrix[i][1] = positionMapVertical.get(nodeId);
          }
          else {
            targetMatrix[i][1] = yCoords[nodeIndexes.get(nodeId)];
          }
        });

        standardTransformation = true;
      }
    }

    // if transformation is required, then calculate and apply transformation matrix
    if (standardTransformation) {
      /* calculate transformation matrix */
      let transformationMatrix;
      let targetMatrixTranspose = Matrix.transpose(targetMatrix);  // A'
      let sourceMatrixTranspose = Matrix.transpose(sourceMatrix);  // B'

      // centralize transpose matrices
      for (let i = 0; i < targetMatrixTranspose.length; i++) {
        targetMatrixTranspose[i] = Matrix.multGamma(targetMatrixTranspose[i]);
        sourceMatrixTranspose[i] = Matrix.multGamma(sourceMatrixTranspose[i]);
      }

      // do actual calculation for transformation matrix
      let tempMatrix = Matrix.multMat(targetMatrixTranspose, Matrix.transpose(sourceMatrixTranspose)); // tempMatrix = A'B
      let SVDResult = SVD.svd(tempMatrix); // SVD(A'B) = USV', svd function returns U, S and V 
      transformationMatrix = Matrix.multMat(SVDResult.V, Matrix.transpose(SVDResult.U)); // transformationMatrix = T = VU'

      /* apply found transformation matrix to obtain final draft layout */
      for (let i = 0; i < nodeIndexes.size; i++) {
        let temp1 = [xCoords[i], yCoords[i]];
        let temp2 = [transformationMatrix[0][0], transformationMatrix[1][0]];
        let temp3 = [transformationMatrix[0][1], transformationMatrix[1][1]];
        xCoords[i] = Matrix.dotProduct(temp1, temp2);
        yCoords[i] = Matrix.dotProduct(temp1, temp3);
      }

      // applied only both alignment and rel. placement constraints exist
      if (reflectionType) {
        applyReflectionForRelativePlacement(constraints.relativePlacementConstraint);
      }
    }
  }
  
  if (CoSEConstants.ENFORCE_CONSTRAINTS) {  
    /****  enforce constraints on the transformed draft layout ****/

    /* first enforce fixed node constraint */
    
    if (constraints.fixedNodeConstraint && constraints.fixedNodeConstraint.length > 0) { 
      let translationAmount = { x: 0, y: 0 };
      constraints.fixedNodeConstraint.forEach(function(nodeData, i) {
        let posInTheory = {x: xCoords[nodeIndexes.get(nodeData.nodeId)], y: yCoords[nodeIndexes.get(nodeData.nodeId)]};
        let posDesired = nodeData.position;
        let posDiff = calculatePositionDiff(posDesired, posInTheory);
        translationAmount.x += posDiff.x;
        translationAmount.y += posDiff.y;
      });
      translationAmount.x /= constraints.fixedNodeConstraint.length;
      translationAmount.y /= constraints.fixedNodeConstraint.length;

      xCoords.forEach(function(value, i) {
        xCoords[i] += translationAmount.x; 
      });

      yCoords.forEach(function(value, i) {
        yCoords[i] += translationAmount.y; 
      });

      constraints.fixedNodeConstraint.forEach(function(nodeData) {
        xCoords[nodeIndexes.get(nodeData.nodeId)] = nodeData.position.x;
        yCoords[nodeIndexes.get(nodeData.nodeId)] = nodeData.position.y;
      });
    }

    /* then enforce alignment constraint */

    if (constraints.alignmentConstraint) {
      if (constraints.alignmentConstraint.vertical) {
        let xAlign = constraints.alignmentConstraint.vertical;
        for (let i = 0; i < xAlign.length; i++) {
          let alignmentSet = new Set();
          xAlign[i].forEach(function(nodeId) {
            alignmentSet.add(nodeId);
          });
          let intersection = new Set([...alignmentSet].filter(x => fixedNodes.has(x)));
          let xPos;
          if (intersection.size > 0)
            xPos = xCoords[nodeIndexes.get(intersection.values().next().value)];
          else
            xPos = calculateAvgPosition(alignmentSet).x;
          
          alignmentSet.forEach(function(nodeId) {
            if (!fixedNodes.has(nodeId))
              xCoords[nodeIndexes.get(nodeId)] = xPos;            
          });
        }
      }
      if (constraints.alignmentConstraint.horizontal) {
        let yAlign = constraints.alignmentConstraint.horizontal;
        for (let i = 0; i < yAlign.length; i++) {
          let alignmentSet = new Set();
          yAlign[i].forEach(function(nodeId) {
            alignmentSet.add(nodeId);
          });
          let intersection = new Set([...alignmentSet].filter(x => fixedNodes.has(x)));
          let yPos;
          if (intersection.size > 0)
            yPos = yCoords[nodeIndexes.get(intersection.values().next().value)];
          else
            yPos = calculateAvgPosition(alignmentSet).y;

          alignmentSet.forEach(function(nodeId) {
            if (!fixedNodes.has(nodeId))
              yCoords[nodeIndexes.get(nodeId)] = yPos;            
          });
        }
      }    
    }
    
    /* finally enforce relative placement constraint */    

    if (constraints.relativePlacementConstraint) {
      let nodeToDummyForVerticalAlignment = new Map();
      let nodeToDummyForHorizontalAlignment = new Map();
      let dummyToNodeForVerticalAlignment = new Map();
      let dummyToNodeForHorizontalAlignment = new Map();      
      let dummyPositionsForVerticalAlignment = new Map();
      let dummyPositionsForHorizontalAlignment = new Map();
      let fixedNodesOnHorizontal = new Set();
      let fixedNodesOnVertical = new Set();
      
      // fill maps and sets      
      fixedNodes.forEach(function(nodeId) {
        fixedNodesOnHorizontal.add(nodeId);
        fixedNodesOnVertical.add(nodeId);
      });
      
      if (constraints.alignmentConstraint) {
        if (constraints.alignmentConstraint.vertical) {
          let verticalAlignment = constraints.alignmentConstraint.vertical;
          for (let i = 0; i < verticalAlignment.length; i++) {
            dummyToNodeForVerticalAlignment.set("dummy" + i, []);
            verticalAlignment[i].forEach(function(nodeId) {
              nodeToDummyForVerticalAlignment.set(nodeId, "dummy" + i);
              dummyToNodeForVerticalAlignment.get("dummy" + i).push(nodeId);
              if (fixedNodes.has(nodeId)) {
                fixedNodesOnHorizontal.add("dummy" + i);
              }
            });
            dummyPositionsForVerticalAlignment.set("dummy" + i, xCoords[nodeIndexes.get(verticalAlignment[i][0])]);
          }
        }
        if (constraints.alignmentConstraint.horizontal) {
          let horizontalAlignment = constraints.alignmentConstraint.horizontal;
          for (let i = 0; i < horizontalAlignment.length; i++) {
            dummyToNodeForHorizontalAlignment.set("dummy" + i, []);
            horizontalAlignment[i].forEach(function(nodeId) {
              nodeToDummyForHorizontalAlignment.set(nodeId, "dummy" + i);
              dummyToNodeForHorizontalAlignment.get("dummy" + i).push(nodeId);
              if (fixedNodes.has(nodeId)) {
                fixedNodesOnVertical.add("dummy" + i);
              }              
            });
            dummyPositionsForHorizontalAlignment.set("dummy" + i, yCoords[nodeIndexes.get(horizontalAlignment[i][0])]);
          }
        }        
      }
      
      // construct horizontal and vertical dags (subgraphs) from overall dag
      let dagOnHorizontal = new Map();
      let dagOnVertical = new Map();

      for (let nodeId of dag.keys()) {
        dag.get(nodeId).forEach(function(adjacent) {
          let sourceId;
          let targetNode;
          if (adjacent["direction"] == "horizontal") {
            sourceId = nodeToDummyForVerticalAlignment.get(nodeId) ? nodeToDummyForVerticalAlignment.get(nodeId) : nodeId;                        
            if (nodeToDummyForVerticalAlignment.get(adjacent.id)) {
              targetNode = {id: nodeToDummyForVerticalAlignment.get(adjacent.id), gap: adjacent.gap, direction: adjacent.direction};
            }
            else {
              targetNode = adjacent;
            }            
            if (dagOnHorizontal.has(sourceId)) {
              dagOnHorizontal.get(sourceId).push(targetNode);
            }
            else {
              dagOnHorizontal.set(sourceId, [targetNode]);
            }
            if (!dagOnHorizontal.has(targetNode.id)) {
              dagOnHorizontal.set(targetNode.id, []);
            }
          }
          else {
            sourceId = nodeToDummyForHorizontalAlignment.get(nodeId) ? nodeToDummyForHorizontalAlignment.get(nodeId) : nodeId;                        
            if (nodeToDummyForHorizontalAlignment.get(adjacent.id)) {
              targetNode = {id: nodeToDummyForHorizontalAlignment.get(adjacent.id), gap: adjacent.gap, direction: adjacent.direction};
            }
            else {
              targetNode = adjacent;
            }             
            if (dagOnVertical.has(sourceId)) {
              dagOnVertical.get(sourceId).push(targetNode);
            }
            else {
              dagOnVertical.set(sourceId, [targetNode]);
            }
            if (!dagOnVertical.has(targetNode.id)) {
              dagOnVertical.set(targetNode.id, []);
            }              
          }
        });
      }
      
      // find source nodes of each component in horizontal and vertical dags
      let undirectedOnHorizontal = dagToUndirected(dagOnHorizontal);
      let undirectedOnVertical = dagToUndirected(dagOnVertical);
      let componentsOnHorizontal = findComponents(undirectedOnHorizontal);
      let componentsOnVertical = findComponents(undirectedOnVertical);
      let reversedDagOnHorizontal = dagToReversed(dagOnHorizontal);
      let reversedDagOnVertical = dagToReversed(dagOnVertical);
      let componentSourcesOnHorizontal = [];
      let componentSourcesOnVertical = [];
      
      componentsOnHorizontal.forEach(function(component, index) {
        componentSourcesOnHorizontal[index] = [];
        component.forEach(function(nodeId) {
          if (reversedDagOnHorizontal.get(nodeId).length == 0) {
            componentSourcesOnHorizontal[index].push(nodeId);
          }
        });
      });
      
      componentsOnVertical.forEach(function(component, index) {
        componentSourcesOnVertical[index] = [];
        component.forEach(function(nodeId) {
          if (reversedDagOnVertical.get(nodeId).length == 0) {
            componentSourcesOnVertical[index].push(nodeId);
          }
        });
      });      
      
      // calculate appropriate positioning for subgraphs
      let positionMapHorizontal = findAppropriatePositionForRelativePlacement(dagOnHorizontal, "horizontal", fixedNodesOnHorizontal, dummyPositionsForVerticalAlignment, componentSourcesOnHorizontal);
      let positionMapVertical = findAppropriatePositionForRelativePlacement(dagOnVertical, "vertical", fixedNodesOnVertical, dummyPositionsForHorizontalAlignment, componentSourcesOnVertical);      

      // update positions of the nodes based on relative placement constraints
      for (let key of positionMapHorizontal.keys()) {
        if (dummyToNodeForVerticalAlignment.get(key)) {
          dummyToNodeForVerticalAlignment.get(key).forEach(function(nodeId) {
            xCoords[nodeIndexes.get(nodeId)] = positionMapHorizontal.get(key);
          });
        }
        else {
          xCoords[nodeIndexes.get(key)] = positionMapHorizontal.get(key);
        }        
      }
      for (let key of positionMapVertical.keys()) {
        if (dummyToNodeForHorizontalAlignment.get(key)) {
          dummyToNodeForHorizontalAlignment.get(key).forEach(function(nodeId) {
            yCoords[nodeIndexes.get(nodeId)] = positionMapVertical.get(key);
          });
        }
        else {
          yCoords[nodeIndexes.get(key)] = positionMapVertical.get(key);
        }        
      }      
    }    
  }  
  
  // assign new coordinates to nodes after constraint handling
  for (let i = 0; i < allNodes.length; i++) {
    let node = allNodes[i];
    if (node.getChild() == null) {
      node.setCenter(xCoords[nodeIndexes.get(node.id)], yCoords[nodeIndexes.get(node.id)]);
    }
  }  
};

module.exports = ConstraintHandler;