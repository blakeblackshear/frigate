/**
  The implementation of the fcose layout algorithm
*/

const assign = require('../assign');
const aux = require('./auxiliary');
const { spectralLayout } = require('./spectral');
const { coseLayout } = require('./cose');

const defaults = Object.freeze({
  
  // 'draft', 'default' or 'proof' 
  // - 'draft' only applies spectral layout 
  // - 'default' improves the quality with subsequent CoSE layout (fast cooling rate)
  // - 'proof' improves the quality with subsequent CoSE layout (slow cooling rate) 
  quality: "default",
  // Use random node positions at beginning of layout
  // if this is set to false, then quality option must be "proof"
  randomize: true, 
  // Whether or not to animate the layout
  animate: true, 
  // Duration of animation in ms, if enabled
  animationDuration: 1000, 
  // Easing of animation, if enabled
  animationEasing: undefined, 
  // Fit the viewport to the repositioned nodes
  fit: true, 
  // Padding around layout
  padding: 30,
  // Whether to include labels in node dimensions. Valid in "proof" quality
  nodeDimensionsIncludeLabels: false,
  // Whether or not simple nodes (non-compound nodes) are of uniform dimensions
  uniformNodeDimensions: false,
  // Whether to pack disconnected components - valid only if randomize: true
  packComponents: true,
  // Layout step - all, transformed, enforced, cose - for debug purpose only
  step: "all",
  
  /* spectral layout options */
  
  // False for random, true for greedy
  samplingType: true,
  // Sample size to construct distance matrix
  sampleSize: 25,
  // Separation amount between nodes
  nodeSeparation: 75,
  // Power iteration tolerance
  piTol: 0.0000001,
  
  /* CoSE layout options */
  
  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: node => 4500,
  // Ideal edge (non nested) length
  idealEdgeLength: edge => 50,
  // Divisor to compute edge forces
  edgeElasticity: edge => 0.45,
  // Nesting factor (multiplier) to compute ideal edge length for nested edges
  nestingFactor: 0.1,
  // Gravity force (constant)
  gravity: 0.25,
  // Maximum number of iterations to perform
  numIter: 2500,
  // For enabling tiling
  tile: true,
  // The function that specifies the criteria for comparing nodes while sorting them during tiling operation.
  // Takes the node id as a parameter and the default tiling operation is perfomed when this option is not set.
  tilingCompareBy: undefined,  
  // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingVertical: 10,
  // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingHorizontal: 10,
  // Gravity range (constant) for compounds
  gravityRangeCompound: 1.5,
  // Gravity force (constant) for compounds
  gravityCompound: 1.0,
  // Gravity range (constant)
  gravityRange: 3.8, 
  // Initial cooling factor for incremental layout  
  initialEnergyOnIncremental: 0.3,
  
  /* constraint options */
  
  // Fix required nodes to predefined positions
  // [{nodeId: 'n1', position: {x: 100, y: 200}, {...}]
  fixedNodeConstraint: undefined,
  // Align required nodes in vertical/horizontal direction
  // {vertical: [['n1', 'n2')], ['n3', 'n4']], horizontal: ['n2', 'n4']}
  alignmentConstraint: undefined,
  // Place two nodes relatively in vertical/horizontal direction 
  // [{top: 'n1', bottom: 'n2', gap: 100}, {left: 'n3', right: 'n4', gap: 75}]
  relativePlacementConstraint: undefined,
  
  /* layout event callbacks */
  ready: () => {}, // on layoutready
  stop: () => {} // on layoutstop
});

class Layout {
  constructor( options ){
    this.options = assign( {}, defaults, options );
  }

  run(){
    let layout = this;
    let options = this.options;
    let cy = options.cy;
    let eles = options.eles;
   
    let spectralResult = [];
    let xCoords;
    let yCoords;
    let coseResult = [];
    let components;
    let componentCenters = [];
    
    // basic validity check for constraint inputs 
    if(options.fixedNodeConstraint && (!Array.isArray(options.fixedNodeConstraint) || options.fixedNodeConstraint.length == 0)){
      options.fixedNodeConstraint = undefined;
    }
    
    if(options.alignmentConstraint){
      if(options.alignmentConstraint.vertical && (!Array.isArray(options.alignmentConstraint.vertical) || options.alignmentConstraint.vertical.length == 0)){
        options.alignmentConstraint.vertical = undefined;
      }
      if(options.alignmentConstraint.horizontal && (!Array.isArray(options.alignmentConstraint.horizontal) || options.alignmentConstraint.horizontal.length == 0)){
        options.alignmentConstraint.horizontal = undefined;
      }      
      
    }
    
    if(options.relativePlacementConstraint && (!Array.isArray(options.relativePlacementConstraint) || options.relativePlacementConstraint.length == 0)){
      options.relativePlacementConstraint = undefined;
    }    
    
    // if any constraint exists, set some options
    let constraintExist = options.fixedNodeConstraint || options.alignmentConstraint || options.relativePlacementConstraint;    
    if(constraintExist){    
      // constraints work with these options
      options.tile = false;
      options.packComponents = false;
    }       
    
    // decide component packing is enabled or not
    let layUtil;
    let packingEnabled = false;
    if(cy.layoutUtilities && options.packComponents){
      layUtil = cy.layoutUtilities("get");
      if(!layUtil)
        layUtil = cy.layoutUtilities();        
      packingEnabled = true;      
    }
    
    if(eles.nodes().length > 0) {
      // if packing is not enabled, perform layout on the whole graph
      if(!packingEnabled){
        // store component center
        let boundingBox = options.eles.boundingBox();
        componentCenters.push({x: boundingBox.x1 + boundingBox.w / 2, y: boundingBox.y1 + boundingBox.h / 2});
        // apply spectral layout
        if(options.randomize){
          let result = spectralLayout(options);
          spectralResult.push(result);
        }
        // apply cose layout as postprocessing
        if(options.quality == "default" || options.quality == "proof"){
          coseResult.push(coseLayout(options, spectralResult[0]));
          aux.relocateComponent(componentCenters[0], coseResult[0], options); // relocate center to original position
        }
        else{
          aux.relocateComponent(componentCenters[0], spectralResult[0], options); // relocate center to original position
        }
      }
      else{ // packing is enabled
        let topMostNodes = aux.getTopMostNodes(options.eles.nodes());
        components = aux.connectComponents(cy, options.eles, topMostNodes);
        // store component centers
        components.forEach(function(component){
          let boundingBox = component.boundingBox();
          componentCenters.push({x: boundingBox.x1 + boundingBox.w / 2, y: boundingBox.y1 + boundingBox.h / 2});
        });

        //send each component to spectral layout if randomized
        if(options.randomize){
          components.forEach(function(component){
            options.eles = component;
            spectralResult.push(spectralLayout(options));
          });
        }
      
        if(options.quality == "default" || options.quality == "proof"){
          let toBeTiledNodes = cy.collection();
          if(options.tile){  // behave nodes to be tiled as one component
            let nodeIndexes = new Map();
            let xCoords = [];
            let yCoords = [];
            let count = 0;
            let tempSpectralResult = {nodeIndexes: nodeIndexes, xCoords: xCoords, yCoords: yCoords};
            let indexesToBeDeleted = [];
            components.forEach(function(component, index){
              if(component.edges().length == 0){
                component.nodes().forEach(function(node, i){
                  toBeTiledNodes.merge(component.nodes()[i]);
                  if(!node.isParent()){
                    tempSpectralResult.nodeIndexes.set(component.nodes()[i].id(), count++);
                    tempSpectralResult.xCoords.push(component.nodes()[0].position().x);
                    tempSpectralResult.yCoords.push(component.nodes()[0].position().y);
                  }
                });
                indexesToBeDeleted.push(index);
              }              
            });
            if(toBeTiledNodes.length > 1){
              let boundingBox = toBeTiledNodes.boundingBox();
              componentCenters.push({x: boundingBox.x1 + boundingBox.w / 2, y: boundingBox.y1 + boundingBox.h / 2});
              components.push(toBeTiledNodes);
              spectralResult.push(tempSpectralResult);
              for(let i = indexesToBeDeleted.length-1; i >= 0; i--){
                components.splice(indexesToBeDeleted[i], 1);
                spectralResult.splice(indexesToBeDeleted[i], 1);
                componentCenters.splice(indexesToBeDeleted[i], 1);
              };
            }
          }
          components.forEach(function(component, index){ // send each component to cose layout
            options.eles = component;
            coseResult.push(coseLayout(options, spectralResult[index]));
            aux.relocateComponent(componentCenters[index], coseResult[index], options); // relocate center to original position
          });  
        }
        else {
          components.forEach(function(component, index){
            aux.relocateComponent(componentCenters[index], spectralResult[index], options); // relocate center to original position
          });
        }

        // packing
        let componentsEvaluated = new Set();
        if(components.length > 1){
          let subgraphs = [];
          let hiddenEles = eles.filter((ele) => {return ele.css('display') == 'none'});
          components.forEach(function(component, index){
            let nodeIndexes;
            if(options.quality == "draft"){
              nodeIndexes = spectralResult[index].nodeIndexes;
            }
            
            if(component.nodes().not(hiddenEles).length > 0) {
              let subgraph = {};
              subgraph.edges = [];
              subgraph.nodes = [];
              let nodeIndex;
              component.nodes().not(hiddenEles).forEach(function (node) {
                if(options.quality == "draft"){
                  if(!node.isParent()){
                    nodeIndex = nodeIndexes.get(node.id());
                    subgraph.nodes.push({x: spectralResult[index].xCoords[nodeIndex] - node.boundingbox().w/2, y: spectralResult[index].yCoords[nodeIndex] - node.boundingbox().h/2, width: node.boundingbox().w, height: node.boundingbox().h});
                  }
                  else{
                    let parentInfo = aux.calcBoundingBox(node, spectralResult[index].xCoords, spectralResult[index].yCoords, nodeIndexes);
                    subgraph.nodes.push({x: parentInfo.topLeftX, y: parentInfo.topLeftY, width: parentInfo.width, height: parentInfo.height});
                  }
                }
                else{
                  if(coseResult[index][node.id()]) {
                    subgraph.nodes.push({x: coseResult[index][node.id()].getLeft(), y: coseResult[index][node.id()].getTop(), width: coseResult[index][node.id()].getWidth(), height: coseResult[index][node.id()].getHeight()});
                  }
                }
              });
              component.edges().forEach(function (edge) {
                let source = edge.source();
                let target = edge.target();
                if(source.css("display") != "none" && target.css("display") != "none") {
                  if(options.quality == "draft"){
                    let sourceNodeIndex = nodeIndexes.get(source.id());
                    let targetNodeIndex = nodeIndexes.get(target.id());
                    let sourceCenter = [];
                    let targetCenter = [];
                    if(source.isParent()){
                      let parentInfo = aux.calcBoundingBox(source, spectralResult[index].xCoords, spectralResult[index].yCoords, nodeIndexes);
                      sourceCenter.push(parentInfo.topLeftX + parentInfo.width / 2);
                      sourceCenter.push(parentInfo.topLeftY + parentInfo.height / 2);
                    }
                    else{
                      sourceCenter.push(spectralResult[index].xCoords[sourceNodeIndex]);
                      sourceCenter.push(spectralResult[index].yCoords[sourceNodeIndex]);
                    }
                    if(target.isParent()){
                      let parentInfo = aux.calcBoundingBox(target, spectralResult[index].xCoords, spectralResult[index].yCoords, nodeIndexes);
                      targetCenter.push(parentInfo.topLeftX + parentInfo.width / 2);
                      targetCenter.push(parentInfo.topLeftY + parentInfo.height / 2);
                    }
                    else{
                      targetCenter.push(spectralResult[index].xCoords[targetNodeIndex]);
                      targetCenter.push(spectralResult[index].yCoords[targetNodeIndex]);
                    }
                    subgraph.edges.push({startX: sourceCenter[0], startY: sourceCenter[1], endX: targetCenter[0], endY: targetCenter[1]});
                  }
                  else{
                    if(coseResult[index][source.id()] && coseResult[index][target.id()]) {
                      subgraph.edges.push({startX: coseResult[index][source.id()].getCenterX(), startY: coseResult[index][source.id()].getCenterY(), endX: coseResult[index][target.id()].getCenterX(), endY: coseResult[index][target.id()].getCenterY()});
                    }
                  }
                }
              });
              if(subgraph.nodes.length > 0) {
                subgraphs.push(subgraph);
                componentsEvaluated.add(index);
              }
            }
          });
          let shiftResult = layUtil.packComponents(subgraphs, options.randomize).shifts;
          if(options.quality == "draft"){
            spectralResult.forEach(function(result, index){
              let newXCoords = result.xCoords.map(x => x + shiftResult[index].dx);
              let newYCoords = result.yCoords.map(y => y + shiftResult[index].dy);
              result.xCoords = newXCoords;
              result.yCoords = newYCoords;
            });
          }
          else{
            let count = 0; 
            componentsEvaluated.forEach((index) => {
              Object.keys(coseResult[index]).forEach(function (item) {
                let nodeRectangle = coseResult[index][item];
                nodeRectangle.setCenter(nodeRectangle.getCenterX() + shiftResult[count].dx, nodeRectangle.getCenterY() + shiftResult[count].dy);
              });
              count++;
            })
          }
        }
      }
    }
    
    // get each element's calculated position
    let getPositions = function(ele, i ){
      if(options.quality == "default" || options.quality == "proof") {
        if(typeof ele === "number") {
          ele = i;
        }
        let pos;
        let node;
        let theId = ele.data('id');
        coseResult.forEach(function(result){
          if (theId in result){
            pos = {x: result[theId].getRect().getCenterX(), y: result[theId].getRect().getCenterY()};
            node = result[theId];
          }
        });
        if(options.nodeDimensionsIncludeLabels){
          if(node.labelWidth){
            if(node.labelPosHorizontal == "left"){
              pos.x += node.labelWidth/2;
            }
            else if(node.labelPosHorizontal == "right"){
              pos.x -= node.labelWidth/2;
            }
          }
          if(node.labelHeight){
            if(node.labelPosVertical == "top"){
              pos.y += node.labelHeight/2;
            }
            else if(node.labelPosVertical == "bottom"){
              pos.y -= node.labelHeight/2;
            }
          }
        }
        if(pos == undefined)
          pos = {x: ele.position("x"), y: ele.position("y")};
        return {
          x: pos.x,
          y: pos.y
        };
      }
      else{
        let pos;
        spectralResult.forEach(function(result){
          let index = result.nodeIndexes.get(ele.id());
          if(index != undefined){
            pos = {x: result.xCoords[index], y: result.yCoords[index]};
          }
        });
        if(pos == undefined)
          pos = {x: ele.position("x"), y: ele.position("y")};
        return {
          x: pos.x,
          y: pos.y
        };
      }
    }; 
    
    // quality = "draft" and randomize = false are contradictive so in that case positions don't change
    if(options.quality == "default" || options.quality == "proof" || options.randomize) {
      // transfer calculated positions to nodes (positions of only simple nodes are evaluated, compounds are positioned automatically)
      let parentsWithoutChildren = aux.calcParentsWithoutChildren(cy, eles);
      let hiddenEles = eles.filter((ele) => {return ele.css('display') == 'none'}); 
      options.eles = eles.not(hiddenEles);

      eles.nodes().not(":parent").not(hiddenEles).layoutPositions(layout, options, getPositions);
      
      if(parentsWithoutChildren.length > 0){
        parentsWithoutChildren.forEach((ele) => {
          ele.position(getPositions(ele));
        });
      }
    }
    else{
      console.log("If randomize option is set to false, then quality option must be 'default' or 'proof'.");
    }  
    
  }
}

module.exports = Layout;