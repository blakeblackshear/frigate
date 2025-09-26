// define default stylesheet
let defaultStylesheet =  [
  {
    selector: 'node',
    style: {
      'background-color': '#bdd3d4',
      'label': 'data(id)',
      'text-valign': 'center',
      'background-opacity': 0.7
    }
  },         

  {
  selector: ':parent',
    style: {
//      'background-opacity': 0.333,
      'background-color': '#e8e8e8',
      'border-color': '#DADADA',
//      'border-width': 3,
      'text-valign': 'bottom'
    }
  },

  {
    selector: 'edge',
    style: {
      'curve-style': 'straight',
      'line-color': '#bdd3d4'
    }
  },

  {
    selector: 'node:selected',
    style: {
      'background-color': '#33ff00',
      'border-color': '#22ee00'
    }
  },
  
  {
    selector: 'node.fixed',
    style: {
      'shape': 'diamond',
      'background-color': '#9D9696',
    }
  }, 
  
  {
    selector: 'node.fixed:selected',
    style: {
      'background-color': '#33ff00',
    }
  },
  
  {
    selector: 'node.alignment',
    style: {
      'shape': 'round-heptagon',
      'background-color': '#fef2d1',
    }
  }, 
  
  {
    selector: 'node.alignment:selected',
    style: {
      'background-color': '#33ff00',
    }
  },  

  {
    selector: 'node.relative',
    style: {
      'shape': 'rectangle',
      'background-color': '#fed3d1',
    }
  }, 
  
  {
    selector: 'node.relative:selected',
    style: {
      'background-color': '#33ff00',
    }
  },

  {
    selector: 'edge:selected',
    style: {
      'line-color': '#33ff00'
    }
  }                 
];

let cy = window.cy = cytoscape({
  container: document.getElementById('cy'),
  ready: function(){              
    let layoutUtilities = this.layoutUtilities({
      desiredAspectRatio: this.width()/this.height()
    });

    this.nodes().forEach(function(node){
      let size = Math.random()*40+30;
      node.css("width", size);
      node.css("height", size);
    });

    let initialLayout = this.layout({name: 'fcose', step: 'all', animationEasing: 'ease-out'});
    initialLayout.pon('layoutstart').then(function( event ){
      constraints.fixedNodeConstraint = JSON.parse(JSON.stringify(sample1_constraints.fixedNodeConstraint));
      clearConstraintListTable();
      fillConstraintListTableFromConstraints(); 
    });
    initialLayout.run();     
  },
  layout: {name: 'preset'},
  style: defaultStylesheet,
  elements: {
        nodes: [
      {data: {id: 'n1'}},
      {data: {id: 'n2'}},
      {data: {id: 'n3', parent: 'n8'}},
      {data: {id: 'n5'}},
      {data: {id: 'n6', parent: 'n8'}},
      {data: {id: 'n7', parent: 'n8'}},
      {data: {id: 'n8'}},
      {data: {id: 'f1'}, classes: ['fixed']},
      {data: {id: 'f2'}, classes: ['fixed']},
      {data: {id: 'f3', parent: 'n8'}, classes: ['fixed']}, 
    ],
    edges: [
      {data: {source: 'n1', target: 'f1'}},
      {data: {source: 'n1', target: 'n3'}},
      {data: {source: 'f1', target: 'n2'}},
      {data: {source: 'f1', target: 'n3'}},
      {data: {source: 'n3', target: 'f2'}},
      {data: {source: 'f2', target: 'n5'}},
      {data: {source: 'n5', target: 'n8'}},
      {data: {source: 'n6', target: 'n3'}},
      {data: {source: 'n6', target: 'n7'}},
      {data: {source: 'n6', target: 'f3'}}
    ]
  },
  wheelSensitivity: 0.3
});

let constraints = {
  fixedNodeConstraint: undefined,
  alignmentConstraint: undefined,
  relativePlacementConstraint: undefined
};

// Handle Menu ------------------------------------------

// Graph file input
document.getElementById("openFile").addEventListener("click", function () {
  document.getElementById("inputFile").click();
});

$("body").on("change", "#inputFile", function (e, fileObject) {
  var inputFile = this.files[0] || fileObject;

  if (inputFile) {
    var fileExtension = inputFile.name.split('.').pop();
    var r = new FileReader();
    r.onload = function (e) {
      cy.remove(cy.elements());
      var content = e.target.result;
      if (fileExtension == "graphml" || fileExtension == "xml") {
        cy.graphml({layoutBy: 'null'});
        cy.graphml(content);
//        updateGraphStyle();
      } else if (fileExtension == "json") {
        cy.json({elements: JSON.parse(content)});
//        updateGraphStyle();
      } else {
        var tsv = cy.tsv();
        tsv.importTo(content);
      }
    };
    r.addEventListener('loadend', function () {      
      onLoad();
      clearConstraintListTable();      
      constraints.fixedNodeConstraint = undefined;
      constraints.alignmentConstraint = undefined;
      constraints.relativePlacementConstraint = undefined;
      
      document.getElementById("nodeList").addEventListener("change", function(){
        document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
        document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
      });
      
//      if (inputFile.name == "samples/sample1.graphml") {
//        cy.nodes().forEach(function (node, i) {
//          let width = [30, 70, 110];
//          let size = width[i % 3];
//          node.css("width", size);
//          node.css("height", size);
//        });
//      }
       
    });
    r.readAsText(inputFile);
  } else {
    alert("Failed to load file");
  }
  $("#inputFile").val(null);
});

let updateGraphStyle = function () {
  cy.nodes().forEach(function (node) {
    node.style({
      'background-image': node.data('background-image'),
      'width': node.data('bbox').w,
      'height': node.data('bbox').h,
      "border-width": node.data('border-width'),
      "border-color": node.data('border-color'),
      "background-color": node.data('background-color'),
      "background-opacity": node.data('background-opacity'),
      "background-fit": "cover",
      "background-position-x": "50%",
      "background-position-y": "50%",
      "text-wrap": "wrap",
      "font-size": node.data('font-size'),
      "color": node.data('color')
    });

    if (node.data('label')) {
      node.style({
        'label': node.data('label')
      });
    }
  });

  cy.edges().forEach(function (edge) {
    edge.style({
      'width': edge.data('width'),
      "line-color": edge.data('line-color')
    });
  });
};

$("body").on("change", "#inputConstraint", function (e, fileObject) {
  var inputFile = this.files[0] || fileObject;

  if (inputFile) {
    var fileExtension = inputFile.name.split('.').pop();
    var r = new FileReader();
    r.onload = function (e) {
      var content = e.target.result;
      if (fileExtension == "json") {
        constraints.fixedNodeConstraint = undefined;
        constraints.alignmentConstraint = undefined;
        constraints.relativePlacementConstraint = undefined;        
        let constraintObject = JSON.parse( content );
        if(constraintObject.fixedNodeConstraint)
          constraints.fixedNodeConstraint = constraintObject.fixedNodeConstraint;
        if(constraintObject.alignmentConstraint)
          constraints.alignmentConstraint = constraintObject.alignmentConstraint;
        if(constraintObject.relativePlacementConstraint)
          constraints.relativePlacementConstraint = constraintObject.relativePlacementConstraint;
        clearConstraintListTable();
        fillConstraintListTableFromConstraints();
      }
    };
    r.addEventListener('loadend', function () {          
    });
    r.readAsText(inputFile);
  } else {
    alert("Failed to load file");
  }
  $("#inputFile").val(null);
});

document.getElementById("exportConstraint").addEventListener("click", function(){
  let constraintString = JSON.stringify(constraints, null, 2);
  download('constraint.json', constraintString);
});

let download = function(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);

    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    }
    else {
        pom.click();
    }
};

/*
// SVG
document.getElementById("saveAsSVG").addEventListener("click", function(){
    let svgContent = cy.svg({scale: 1, full: true});
    let blob = new Blob([svgContent], {type:"image/svg+xml;charset=utf-8"});
    saveAs(blob, "graph.svg");
});

// see http://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
let b64toBlob = function(b64Data, contentType, sliceSize) {
  contentType = contentType || '';
  sliceSize = sliceSize || 512;

  var byteCharacters = atob(b64Data);
  var byteArrays = [];

  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    var slice = byteCharacters.slice(offset, offset + sliceSize);

    var byteNumbers = new Array(slice.length);
    for (var i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    var byteArray = new Uint8Array(byteNumbers);

    byteArrays.push(byteArray);
  }

  var blob = new Blob(byteArrays, {type: contentType});
  return blob;
}
*/

// Sample File Changer
let sampleFileNames = {
    "sample5" : unix,
    "sample5_constraints" : unix_constraints,
    "sample6" : chalk,
    "sample6_constraints" : chalk_constraints,    
    "sample7" : uwsn,
    "sample7_constraints" : uwsn_constraints,
    "sample8" : call_graph,
    "sample8_constraints" : callGraph_constraints,
    "sample9" : wsn,
    "sample9_constraints" : wsn_constraints,
};

document.getElementById("sample").addEventListener("change", function(){
  cy.startBatch();
  cy.elements().remove();
  cy.style().clear();
  
  var selectionObject = document.getElementById("sample");
  
  var selected = selectionObject.options[selectionObject.selectedIndex].index;
  if(selected == 0){
    cy.add(elements1);
    applyPostLoadOperations(selected);
  }
  else if(selected == 1){
    cy.add(elements2);
    applyPostLoadOperations(selected);
  }
  else if(selected == 2){
    cy.add(elements3);
    applyPostLoadOperations(selected);
  }
  else if(selected == 3){
    cy.add(elements4);
    applyPostLoadOperations(selected);
  }
  else if(selected == 4){
    cy.add(elements5);
    applyPostLoadOperations(selected);
  }    

  function applyPostLoadOperations(selected){
    cy.nodes().forEach(function(node){
      let size = Math.random()*40+30;
      node.css("width", size);
      node.css("height", size);   
    });
    cy.style(defaultStylesheet);
    
    clearConstraintListTable();
    constraints.fixedNodeConstraint = undefined;
    constraints.alignmentConstraint = undefined;
    constraints.relativePlacementConstraint = undefined;
    
    if(selected == 0){
      if(sample1_constraints.fixedNodeConstraint)
        constraints.fixedNodeConstraint = JSON.parse(JSON.stringify(sample1_constraints.fixedNodeConstraint));
      clearConstraintListTable();
      fillConstraintListTableFromConstraints(); 
    }    
    if(selected == 1){
      if(sample2_constraints.alignmentConstraint)
        constraints.alignmentConstraint = JSON.parse(JSON.stringify(sample2_constraints.alignmentConstraint));
      clearConstraintListTable();
      fillConstraintListTableFromConstraints(); 
    }
    if(selected == 2){
      if(sample3_constraints.relativePlacementConstraint)
        constraints.relativePlacementConstraint = JSON.parse(JSON.stringify(sample3_constraints.relativePlacementConstraint));
      clearConstraintListTable();
      fillConstraintListTableFromConstraints(); 
    }    
    if(selected == 3){
      if(sample4_constraints.fixedNodeConstraint)
        constraints.fixedNodeConstraint = JSON.parse(JSON.stringify(sample4_constraints.fixedNodeConstraint));
      if(sample4_constraints.alignmentConstraint)
        constraints.alignmentConstraint = JSON.parse(JSON.stringify(sample4_constraints.alignmentConstraint));
      if(sample4_constraints.relativePlacementConstraint)
        constraints.relativePlacementConstraint = JSON.parse(JSON.stringify(sample4_constraints.relativePlacementConstraint));
      clearConstraintListTable();
      fillConstraintListTableFromConstraints(); 
    }     
  }
  
  if (sampleFileNames[selectionObject.value]) {
    //$.getJSON("samples/" + sampleFileNames[selectionObject.value] + ".json", function(json) {
        let json = sampleFileNames[selectionObject.value];
        cy.json(json);
        cy.nodes().forEach(function (node) {
          node.style({
            'width': node.data('bbox').w,
            'height': node.data('bbox').h,
            "border-width": node.data('border-width'),
//            "border-color": node.data('border-color'),
          });

          if (node.data('class') === 'process' || node.data('class') === 'association' || node.data('class') === "dissociation") {
            node.style({
              'background-color': node.data('background-color'),
              'background-opacity': 0.3
            });
          } else {
            node.style({
              'background-image': node.data('background-image'),
//              'background-color': node.data('background-color'),
              'background-opacity': node.data('background-opacity'),
              'background-fit': 'contain',
              'background-position-x': '50%',
              'background-position-y': '50%',
            });
          }

          if (node.data('label')) {
            node.style({
              'label': node.data('label'),
              'text-wrap': 'wrap',
              'font-size': node.data('font-size'),
              'color': node.data('color')
            });
          }
        });
        
        constraints.fixedNodeConstraint = undefined;
        constraints.alignmentConstraint = undefined;
        constraints.relativePlacementConstraint = undefined; 
        
        let constraintObject = sampleFileNames[selectionObject.value + "_constraints"];
        if(constraintObject.fixedNodeConstraint)
          constraints.fixedNodeConstraint = JSON.parse(JSON.stringify(constraintObject.fixedNodeConstraint));
        if(constraintObject.alignmentConstraint)
          constraints.alignmentConstraint = JSON.parse(JSON.stringify(constraintObject.alignmentConstraint));
        if(constraintObject.relativePlacementConstraint)
          constraints.relativePlacementConstraint = JSON.parse(JSON.stringify(constraintObject.relativePlacementConstraint));
        clearConstraintListTable();
        fillConstraintListTableFromConstraints(); 
     // });

  }
  cy.endBatch();

  if(selected == 4){  
    cy.nodes().not(":parent").positions(function(node, i){
      return {
        x: elements5_positions[i].x,
        y: elements5_positions[i].y
      };    
    });
    cy.layout({name: "preset", fit:true, animate:true, animationDuration: 1000, animationEasing: undefined}).run();
  }
  else {
    let finalOptions = Object.assign({}, options);
    finalOptions.step = "all";
    cy.layout(finalOptions).run();
  }
//  cy.layout({name: 'random', padding: 100}).run();
  onLoad();  

  document.getElementById("nodeList").addEventListener("change", function(){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });
});

// Layout buttons

let options = {
  name: 'fcose',
  quality: "default",
  randomize: true,
  animate: true,
  animationDuration: 1000,
  animationEasing: undefined,
  fit: true,
  padding: 30,
  nestingFactor: 0.1,
  gravityRangeCompound: 1.5,
  gravityCompound: 1.0
};

// Randomize
document.getElementById("randomizeButton").addEventListener("click", function () {
  var layout = cy.layout({
    name: 'random',
    animate: true
  });

  layout.run();
});

// Fcose
document.getElementById("fcoseButton").addEventListener("click", function(){
  let finalOptions = Object.assign({}, options);
  finalOptions.step = "all";
  finalOptions.randomize = !(document.getElementById("incremental").checked);
  
  if(document.getElementById("sample").value == "sample6"){
    finalOptions.nestingFactor = 0.4;
    finalOptions.gravityRangeCompound = 0;
    finalOptions.gravityCompound = 3.0;
  }
  
  if(document.getElementById("sample").value == "sample8"){
    finalOptions.idealEdgeLength = 70; 
  }  
  
  finalOptions.fixedNodeConstraint = constraints.fixedNodeConstraint ? constraints.fixedNodeConstraint : undefined;
  finalOptions.alignmentConstraint = constraints.alignmentConstraint ? constraints.alignmentConstraint : undefined;
  finalOptions.relativePlacementConstraint = constraints.relativePlacementConstraint ? constraints.relativePlacementConstraint : undefined;
  let layout = cy.layout(finalOptions);
  layout.one("layoutstop", function( event ){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });
  cy.layoutUtilities("get").setOption("randomize", finalOptions.randomize);
//  let start = performance.now();
  layout.run();
//  console.log((performance.now() - start) + " ms" );
});

/*
// CoLa
document.getElementById("colaButton").addEventListener("click", function(){
  
  if(constraints.fixedNodeConstraint) {
    constraints.fixedNodeConstraint.forEach(function(constraint){
      cy.getElementById(constraint.nodeId).position({x: constraint.position.x, y: constraint.position.y});
      cy.getElementById(constraint.nodeId).lock();
    });
  }
  
  let gapInequalities = [];
  if(constraints.relativePlacementConstraint) {
    constraints.relativePlacementConstraint.forEach(function(constraint){
      if(constraint.left) {
        gapInequalities.push({"axis": "x", "left": cy.getElementById(constraint.left), "right": cy.getElementById(constraint.right), "gap": constraint.gap});
      }
      else {
        gapInequalities.push({"axis": "y", "left": cy.getElementById(constraint.top), "right": cy.getElementById(constraint.bottom), "gap": constraint.gap});
      }
    });
  }
  
  let options = {
    name: 'cola',
    animate: false,
    maxSimulationTime: 20000,
    randomize: true,
    unconstrIter: 10, 
    userConstIter: 15, 
    allConstIter: 20,
    handleDisconnected: false,
    edgeLength: 50,
    alignment: constraints.alignmentConstraint ? constraints.alignmentConstraint : undefined,
    gapInequalities: gapInequalities
  };
  
  let layout = cy.layout(options);
  layout.one("layoutstop", function( event ){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });

  let start = performance.now();
  layout.run();
  console.log((performance.now() - start) + " ms" );
  
  cy.nodes().unlock();
});
*/

// Draft
document.getElementById("draftButton").addEventListener("click", function(){
  let finalOptions = Object.assign({}, options);
  finalOptions.quality = "draft";
  finalOptions.fixedNodeConstraint = constraints.fixedNodeConstraint ? constraints.fixedNodeConstraint : undefined;
  finalOptions.alignmentConstraint = constraints.alignmentConstraint ? constraints.alignmentConstraint : undefined;
  finalOptions.relativePlacementConstraint = constraints.relativePlacementConstraint ? constraints.relativePlacementConstraint : undefined;  
  let layout = cy.layout(finalOptions);
  layout.one("layoutstop", function( event ){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });
  cy.layoutUtilities("get").setOption("randomize", true);
  layout.run();
});

// Transform
document.getElementById("transformButton").addEventListener("click", function(){
  let finalOptions = Object.assign({}, options);
  finalOptions.step = "transformed";
  finalOptions.fixedNodeConstraint = constraints.fixedNodeConstraint ? constraints.fixedNodeConstraint : undefined;
  finalOptions.alignmentConstraint = constraints.alignmentConstraint ? constraints.alignmentConstraint : undefined;
  finalOptions.relativePlacementConstraint = constraints.relativePlacementConstraint ? constraints.relativePlacementConstraint : undefined;
  
  let layout = cy.layout(finalOptions);
  layout.one("layoutstop", function( event ){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });            
  layout.run();
});

// Enforce
document.getElementById("enforceButton").addEventListener("click", function(){
  let finalOptions = Object.assign({}, options);
  finalOptions.step = "enforced";
  
  finalOptions.fixedNodeConstraint = constraints.fixedNodeConstraint ? constraints.fixedNodeConstraint : undefined;
  finalOptions.alignmentConstraint = constraints.alignmentConstraint ? constraints.alignmentConstraint : undefined;
  finalOptions.relativePlacementConstraint = constraints.relativePlacementConstraint ? constraints.relativePlacementConstraint : undefined;

  let layout = cy.layout(finalOptions);
  layout.one("layoutstop", function( event ){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });            
  layout.run();
});

document.getElementById("coseButton").addEventListener("click", function(){
  let finalOptions = Object.assign({}, options);
  
  if(document.getElementById("sample").value == "sample6"){
    finalOptions.nestingFactor = 0.4;
    finalOptions.gravityRangeCompound = 0;
    finalOptions.gravityCompound = 3.0;
  }
  
  if(document.getElementById("sample").value == "sample8"){
    finalOptions.idealEdgeLength = 70; 
  }   

  finalOptions.fixedNodeConstraint = constraints.fixedNodeConstraint ? constraints.fixedNodeConstraint : undefined;
  finalOptions.alignmentConstraint = constraints.alignmentConstraint ? constraints.alignmentConstraint : undefined;
  finalOptions.relativePlacementConstraint = constraints.relativePlacementConstraint ? constraints.relativePlacementConstraint : undefined;
  
  finalOptions.randomize = false;
  finalOptions.step = "cose";  
  let layout = cy.layout(finalOptions);
  layout.one("layoutstop", function( event ){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });
  cy.layoutUtilities("get").setOption("randomize", finalOptions.randomize);
  layout.run();
});

// Handle Constraints ----------------------------

let onLoad = function(){
  let nodeList = "<select id='nodeList' class='custom-select custom-select-sm' style='width:auto;' onchange='onSelect()'>";
  let simpleNodes = cy.nodes().not(":parent");
  for(let i = 0; i < simpleNodes.length; i++){
    let node = simpleNodes[i];
    let label = (node.data('label'))?(node.data('label')):(node.id());
    if(label.length > 15)
      label = label.substring(0, 12).concat("...");
    nodeList += "<option value='" + cy.nodes().not(":parent")[i].id() + "'>" + label + "</option>";
  }
  let listComponentForFixed = document.getElementById("nodeListColumn");
  listComponentForFixed.innerHTML = nodeList;
  document.getElementById("fixedNodeX").value = Math.round(cy.nodes().not(":parent")[0].position("x"));
  document.getElementById("fixedNodeY").value = Math.round(cy.nodes().not(":parent")[0].position("y"));

  let nodeListRP1 = "<select id='nodeListRP1' class='custom-select custom-select-sm' style='width:auto;' onchange='onSelectRP1()'>";
  for(let i = 0; i < simpleNodes.length; i++){
    let node = simpleNodes[i];
    let label = (node.data('label'))?(node.data('label')):(node.id()); 
    if(label.length > 15)
      label = label.substring(0, 12).concat("...");    
    nodeListRP1 += "<option value=" + cy.nodes().not(":parent")[i].id() + ">" + label + "</option>";
  }

  let nodeListRP2 = "<select id='nodeListRP2' class='custom-select custom-select-sm' style='width:auto;' onchange='onSelectRP2()'>";
  for(let i = 0; i < simpleNodes.length; i++){
    let node = simpleNodes[i];
    let label = (node.data('label'))?(node.data('label')):(node.id());
    if(label.length > 15)
      label = label.substring(0, 12).concat("...");    
    nodeListRP2 += "<option value=" + cy.nodes().not(":parent")[i].id() + ">" + label + "</option>";
  }            

  let listComponentForRP1 = document.getElementById("nodeListColumnRP1");
  listComponentForRP1.innerHTML = nodeListRP1;

  let listComponentForRP2 = document.getElementById("nodeListColumnRP2");
  listComponentForRP2.innerHTML = nodeListRP2;            
};

let onSelect = function(){
  let id = document.getElementById("nodeList").value;
  cy.elements().unselect();
  cy.getElementById(id).select();
};

let onSelectRP1 = function(){
  let id = document.getElementById("nodeListRP1").value;
  cy.elements().unselect();
  cy.getElementById(id).select();
};

let onSelectRP2 = function(){
  let id = document.getElementById("nodeListRP2").value;
  cy.elements().unselect();
  cy.getElementById(id).select();
};

document.addEventListener('DOMContentLoaded', function(){
  document.getElementById("nodeList").addEventListener("change", function(){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  });
});

cy.ready( function(event){
  onLoad();
});

document.getElementById("nodeList").addEventListener("change", function(){
  document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
  document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
});

cy.on("position", "node", function(event) {
  if(event.target.id() == document.getElementById("nodeList").value){
    document.getElementById("fixedNodeX").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("x"));
    document.getElementById("fixedNodeY").value = Math.round(cy.getElementById(document.getElementById("nodeList").value).position("y"));
  }
});

// Adding Constraints
let constraintListTable = document.getElementById("constraintListTable");

document.getElementById("fixedNode").addEventListener("click",function(){
  let nodeId = document.getElementById("nodeList").value;
  let exist = false;
  if(constraints.fixedNodeConstraint){
    constraints.fixedNodeConstraint.forEach(function(constraintObject){
      if(constraintObject.nodeId == nodeId){
        exist = true;
      }
    }); 
  }
  if(!exist){
    let fixedNode = {nodeId: nodeId, position: Object.assign({}, {x: parseInt(document.getElementById("fixedNodeX").value), y: parseInt(document.getElementById("fixedNodeY").value)})};
    if(constraints.fixedNodeConstraint){
      constraints.fixedNodeConstraint.push(fixedNode);
    }
    else{
      constraints.fixedNodeConstraint = [fixedNode];
    }
      
    addToHistory("Fixed", [nodeId], fixedNode.position);
  }
});

document.getElementById("verticalAlignment").addEventListener("click", function(){
  if(cy.nodes(":selected").not(":parent").length > 0){
    let valignArray = [];
    cy.nodes(":selected").not(":parent").forEach(function(node){
      valignArray.push(node.id());
    });
    if(constraints.alignmentConstraint){
      if(constraints.alignmentConstraint.vertical){
        constraints.alignmentConstraint.vertical.push(valignArray);
      }
      else{
        constraints.alignmentConstraint.vertical = [valignArray];
      }
    }
    else{
      constraints.alignmentConstraint = {};
      constraints.alignmentConstraint.vertical = [valignArray];
    }
    addToHistory("Alignment", valignArray, 'vertical'); 
  }
});

document.getElementById("horizontalAlignment").addEventListener("click", function(){
  if(cy.nodes(":selected").not(":parent").length > 0){
    let halignArray = [];
    cy.nodes(":selected").not(":parent").forEach(function(node){
      halignArray.push(node.id());
    });
    if(constraints.alignmentConstraint){
      if(constraints.alignmentConstraint.horizontal){
        constraints.alignmentConstraint.horizontal.push(halignArray);
      }
      else{
        constraints.alignmentConstraint.horizontal = [halignArray];
      }
    }
    else{
      constraints.alignmentConstraint = {};
      constraints.alignmentConstraint.horizontal = [halignArray];
    }
    addToHistory("Alignment", halignArray, 'horizontal'); 
  }
});

document.getElementById("relativePlacement").addEventListener("click", function(){
  let nodeId1 = document.getElementById("nodeListRP1").value;
  let nodeId2 = document.getElementById("nodeListRP2").value;
  let isExist = false;
  if(constraints.relativePlacementConstraint){
    constraints.relativePlacementConstraint.forEach(function(constraint){
      if(constraint["left"]){
        if((constraint["left"] == nodeId1 && constraint["right"] == nodeId2 || constraint["left"] == nodeId2 && constraint["right"] == nodeId1) && document.getElementById("directionList").value == "left-right"){
          isExist = true;
        }
      }
      else {
        if((constraint["top"] == nodeId1 && constraint["bottom"] == nodeId2 || constraint["top"] == nodeId2 && constraint["bottom"] == nodeId1) && document.getElementById("directionList").value == "top-bottom"){
          isExist = true;
        }
      }
    });
  }
  if((nodeId1 != nodeId2) && !isExist){
    let relativePlacementConstraint;
    if(document.getElementById("directionList").value == "left-right"){
      relativePlacementConstraint = {left: nodeId1, right: nodeId2, gap: (document.getElementById("gap").value) ? (parseInt(document.getElementById("gap").value)) : undefined};
    }
    else{
      relativePlacementConstraint = {top: nodeId1, bottom: nodeId2, gap: (document.getElementById("gap").value) ? (parseInt(document.getElementById("gap").value)) : undefined};
    }            
    if(constraints.relativePlacementConstraint){
      constraints.relativePlacementConstraint.push(relativePlacementConstraint);
    }
    else{
      constraints.relativePlacementConstraint = [];
      constraints.relativePlacementConstraint.push(relativePlacementConstraint);
    }
    
    if(document.getElementById("directionList").value == "left-right")
      addToHistory("Relative", [nodeId1, nodeId2], 'l-r - ' + ((document.getElementById("gap").value) ? (parseInt(document.getElementById("gap").value)) : parseInt(cy.getElementById(nodeId1).width()/2 + cy.getElementById(nodeId2).width()/2 + 50)));
    else{
      addToHistory("Relative", [nodeId1, nodeId2], 't-b - ' + ((document.getElementById("gap").value) ? (parseInt(document.getElementById("gap").value)) : parseInt(cy.getElementById(nodeId1).height()/2 + cy.getElementById(nodeId2).height()/2 + 50)));
    }
  }
});

let addToHistory = function( constraintType, nodeIds, constraintInfo) {
  
  let row = constraintListTable.insertRow();
  let cell4 = row.insertCell(0);
  let cell3 = row.insertCell(0);
  let cell2 = row.insertCell(0);
  let cell1 = row.insertCell(0);
  cell1.innerHTML = constraintType;
  
  if(constraintType == 'Fixed'){
    let label = (cy.getElementById(nodeIds[0]).css('label') ? cy.getElementById(nodeIds[0]).css('label') : nodeIds);
    if(label.length > 15)
      label = label.substring(0, 12).concat("...");
    cell2.innerHTML = label;
    cell3.innerHTML = "x: "+constraintInfo.x+" y: "+constraintInfo.y;
  }
  else if(constraintType == 'Alignment'){
    let nodeList = "";
    nodeIds.forEach(function(nodeId, index){
      let label = (cy.getElementById(nodeId).css('label') ? cy.getElementById(nodeId).css('label') : nodeId);
      if(label.length > 15)
        label = label.substring(0, 12).concat("...");      
      if(index == 0)
        nodeList += label;
      else
        nodeList += ' - ' + label;
    });
    cell2.innerHTML = nodeList;
    cell3.innerHTML = constraintInfo;
  }
  else{
    let nodeList = "";
    nodeIds.forEach(function(nodeId, index){
      let label = (cy.getElementById(nodeId).css('label') ? cy.getElementById(nodeId).css('label') : nodeId);
      if(label.length > 15)
        label = label.substring(0, 12).concat("...");       
      if(index == 0)
        nodeList += label;
      else
        nodeList += ' - ' + label;
    });
    cell2.innerHTML = nodeList;
    cell3.innerHTML = constraintInfo;
  }
  
  // needed for highlighting constrained nodes
  let instance = cy.viewUtilities({
    highlightStyles: [
      { node: { 'background-color': '#da14ff', 'border-color': '#980eb2'}, edge: {} }
    ]
  });

  let rowToHighlight = $('#constraintListTable').find('tr').eq(row.rowIndex);

  let collectionToHighlight = cy.collection();
  nodeIds.forEach(function(id){
    collectionToHighlight = collectionToHighlight.union(cy.getElementById(id));
  });

  // 'Delete' symbol
  let button = document.createElement('button');
  button.setAttribute('class','close');
  button.setAttribute('aria-label', 'Close');
  if(constraintType == 'Fixed')
    button.onclick = function(event){
      deleteRowElements(row, nodeIds);
      instance.removeHighlights(collectionToHighlight.nodes());
    };
  else if(constraintType == 'Alignment')
    button.onclick = function(event){
      deleteRowElements(row, nodeIds, constraintInfo);
      instance.removeHighlights(collectionToHighlight.nodes());
    };
  else
    button.onclick = function(event){
      deleteRowElements(row, nodeIds, constraintInfo);
      instance.removeHighlights(collectionToHighlight.nodes());
    };
  let xSymbol = document.createElement('span');
  xSymbol.setAttribute('aria-hidden', 'true');
  xSymbol.style.color = "red";
  xSymbol.innerHTML = '&times';
  button.appendChild(xSymbol);
  cell4.appendChild(button);
  
  rowToHighlight.hover(function() {
    instance.highlight(collectionToHighlight.nodes(), 0);
  }, function() {
    instance.removeHighlights(collectionToHighlight.nodes());
  });
};

// Delete Row Elements
let deleteRowElements = function (row, nodeIds, info) {
  let constraintType = row.cells[0].innerHTML;
  if (constraintType == 'Fixed') {
    constraints.fixedNodeConstraint.forEach(function (item, index) {
      if (item.nodeId == nodeIds[0]) {
        constraints.fixedNodeConstraint.splice(index, 1);
      }
    });
    if (constraints.fixedNodeConstraint.length == 0) {
      constraints.fixedNodeConstraint = undefined;
    }
  } else if (constraintType == 'Alignment') {
    if (info == 'vertical') {
      constraints.alignmentConstraint.vertical.forEach(function (item, index) {
        if (item.length == nodeIds.length) {
          let equal = true;
          item.forEach(function (nodeId, i) {
            if (nodeId != nodeIds[i]) {
              equal = false;
            }
          });
          if (equal) {
            constraints.alignmentConstraint.vertical.splice(index, 1);
            if (constraints.alignmentConstraint.vertical.length == 0) {
              delete constraints.alignmentConstraint.vertical;
              if (!constraints.alignmentConstraint.horizontal) {
                constraints.alignmentConstraint = undefined;
              }
            }
          }
        }
      });
    } else {
      constraints.alignmentConstraint.horizontal.forEach(function (item, index) {
        if (item.length == nodeIds.length) {
          let equal = true;
          item.forEach(function (nodeId, i) {
            if (nodeId != nodeIds[i]) {
              equal = false;
            }
          });
          if (equal) {
            constraints.alignmentConstraint.horizontal.splice(index, 1);
            if (constraints.alignmentConstraint.horizontal.length == 0) {
              delete constraints.alignmentConstraint.horizontal;
              if (!constraints.alignmentConstraint.vertical) {
                constraints.alignmentConstraint = undefined;
              }
            }
          }
        }
      });
    }
  }
  else{
    constraints.relativePlacementConstraint.forEach(function(item, index){
      if(info.substring(0,1) == 'l'){
        if(item.left && item.left == nodeIds[0] && item.right == nodeIds[1]){
          constraints.relativePlacementConstraint.splice(index, 1);
          if(constraints.relativePlacementConstraint.length == 0){
            constraints.relativePlacementConstraint = undefined;
          }
        }
      }
      else{
        if(item.top && item.top == nodeIds[0] && item.bottom == nodeIds[1]){
          constraints.relativePlacementConstraint.splice(index, 1);
          if(constraints.relativePlacementConstraint.length == 0){
            constraints.relativePlacementConstraint = undefined;
          }          
        }        
      }
    });
  }
  constraintListTable.deleteRow(row.rowIndex);
};

// Clear logs table
let clearConstraintListTable = function() {
  if (constraintListTable.rows.length > 1) {
    let length = constraintListTable.rows.length;
    for (let i = 0; i < length - 1; i++) {
      constraintListTable.deleteRow(1);
    }
  }
};

let fillConstraintListTableFromConstraints = function () {
  if(constraints.fixedNodeConstraint){
    constraints.fixedNodeConstraint.forEach(function(constraint){
      addToHistory("Fixed", [constraint.nodeId], constraint.position);
    });    
  }
  if(constraints.alignmentConstraint){
    if(constraints.alignmentConstraint.vertical){
      constraints.alignmentConstraint.vertical.forEach(function(item){
        addToHistory("Alignment", item, 'vertical');
      });
    }
    if(constraints.alignmentConstraint.horizontal){
      constraints.alignmentConstraint.horizontal.forEach(function(item){
        addToHistory("Alignment", item, 'horizontal');
      });
    }    
  }
  if(constraints.relativePlacementConstraint){
    constraints.relativePlacementConstraint.forEach(function(constraint){
      if(constraint.left)
        addToHistory("Relative", [constraint.left, constraint.right], 'l-r - ' + (constraint.gap ? parseInt(constraint.gap) : parseInt(cy.getElementById(constraint.left).width()/2 + cy.getElementById(constraint.right).width()/2 + 50)));
      else
        addToHistory("Relative", [constraint.top, constraint.bottom], 't-b - ' + (constraint.gap ? parseInt(constraint.gap) : parseInt(cy.getElementById(constraint.top).height()/2 + cy.getElementById(constraint.bottom).height()/2 + 50)));
    });
    
  }
};

//// Samples
let elements1 = {
  nodes: [
    {data: {id: 'n1'}},    
    {data: {id: 'n2'}},
    {data: {id: 'n3', parent: 'n8'}},
    {data: {id: 'n5'}},
    {data: {id: 'n6', parent: 'n8'}},
    {data: {id: 'n7', parent: 'n8'}},
    {data: {id: 'n8'}},
    {data: {id: 'f1'}, classes: ['fixed']},
    {data: {id: 'f2'}, classes: ['fixed']},
    {data: {id: 'f3', parent: 'n8'}, classes: ['fixed']}, 
  ],
  edges: [
    {data: {source: 'n1', target: 'f1'}},
    {data: {source: 'n1', target: 'n3'}},
    {data: {source: 'f1', target: 'n2'}},
    {data: {source: 'f1', target: 'n3'}},
    {data: {source: 'n3', target: 'f2'}},
    {data: {source: 'f2', target: 'n5'}},
    {data: {source: 'n5', target: 'n8'}},
    {data: {source: 'n6', target: 'n3'}},
    {data: {source: 'n6', target: 'n7'}},
    {data: {source: 'n6', target: 'f3'}}
  ]
};

let elements2 = {
  nodes: [
    {data: {id: 'n1', parent: 'n6'}},    
    {data: {id: 'n2', parent: 'n6'}},    
    {data: {id: 'n3'}},    
    {data: {id: 'n4'}},
    {data: {id: 'n5', parent: 'n8'}},     
    {data: {id: 'n6'}},
    {data: {id: 'n7'}},
    {data: {id: 'n8'}},    
    {data: {id: 'v1', parent: 'n6'}, classes: ['alignment']},
    {data: {id: 'v2'}, classes: ['alignment']},    
    {data: {id: 'v3', parent: 'n8'}, classes: ['alignment']},
    {data: {id: 'v4', parent: 'n8'}, classes: ['alignment']},
    {data: {id: 'v5', parent: 'n5'}, classes: ['alignment']},
    {data: {id: 'h1'}, classes: ['alignment']},
    {data: {id: 'h2'}, classes: ['alignment']},
    {data: {id: 'h3'}, classes: ['alignment']},     
    {data: {id: 'h4', parent: 'n7'}, classes: ['alignment']},
    {data: {id: 'h5', parent: 'n7'}, classes: ['alignment']},     
    {data: {id: 'vh1', parent: 'n6'}, classes: ['alignment']},
    {data: {id: 'vh2', parent: 'n5'}, classes: ['alignment']}
  ],
  edges: [
    {data: {source: 'v1', target: 'vh1'}},
    {data: {source: 'v1', target: 'n1'}}, 
    {data: {source: 'n1', target: 'n2'}},    
    {data: {source: 'n2', target: 'vh1'}},
    {data: {source: 'n6', target: 'h1'}},
    {data: {source: 'h1', target: 'h2'}},
    {data: {source: 'n6', target: 'n3'}},
    {data: {source: 'n3', target: 'v2'}},
    {data: {source: 'n3', target: 'h4'}},    
    {data: {source: 'h4', target: 'h5'}},
    {data: {source: 'h4', target: 'v3'}},
    {data: {source: 'v3', target: 'v4'}},
    {data: {source: 'v3', target: 'n5'}},
    {data: {source: 'v5', target: 'vh2'}},    
    {data: {source: 'v3', target: 'n4'}},
    {data: {source: 'h3', target: 'n8'}},    
    {data: {source: 'n4', target: 'h3'}}
  ]
};

let elements3 = {
  nodes: [
    {data: {id: 'r1', parent: 'n8'}, classes: ['relative']},
    {data: {id: 'r2', parent: 'n8'}, classes: ['relative']},
    {data: {id: 'r3', parent: 'n8'}, classes: ['relative']},
    {data: {id: 'r4'}, classes: ['relative']},
    {data: {id: 'r5'}, classes: ['relative']},
    {data: {id: 'r6', parent: 'n7'}, classes: ['relative']},
    {data: {id: 'r7', parent: 'n10'}, classes: ['relative']},    
    {data: {id: 'r8', parent: 'n10'}, classes: ['relative']},    
    {data: {id: 'n1', parent: 'n7'}},
    {data: {id: 'n2'}},
    {data: {id: 'n3'}},
    {data: {id: 'n4'}},
    {data: {id: 'n5'}},
    {data: {id: 'n6'}},
    {data: {id: 'n7', parent: 'n10'}},
    {data: {id: 'n8'}},
    {data: {id: 'n9'}},
    {data: {id: 'n10'}}
  ],
  edges: [
    {data: {source: 'r6', target: 'n1'}},
    {data: {source: 'r6', target: 'n3'}},
    {data: {source: 'n1', target: 'r8'}},
    {data: {source: 'n1', target: 'r5'}},
    {data: {source: 'n1', target: 'r7'}},
    {data: {source: 'n2', target: 'n3'}},
    {data: {source: 'n2', target: 'r2'}},
    {data: {source: 'n2', target: 'n4'}},
    {data: {source: 'r5', target: 'n5'}},
    {data: {source: 'r5', target: 'n6'}},
    {data: {source: 'r2', target: 'r1'}},
    {data: {source: 'r2', target: 'r3'}},
    {data: {source: 'n7', target: 'n9'}},
    {data: {source: 'n5', target: 'n6'}},
    {data: {source: 'n5', target: 'r4'}}
  ]
};

let elements4 = [
  {group: 'nodes', data: {id: 'n1'}},
  {group: 'nodes', data: {id: 'n2'}},
  {group: 'nodes', data: {id: 'n3'}},
  {group: 'nodes', data: {id: 'n4'}},
  {group: 'nodes', data: {id: 'n5'}},  
  {group: 'nodes', data: {id: 'n6', parent: 'n24'}},
  {group: 'nodes', data: {id: 'n7', parent: 'n24'}},
  {group: 'nodes', data: {id: 'n8', parent: 'n24'}},
  {group: 'nodes', data: {id: 'n9'}},
  {group: 'nodes', data: {id: 'n10', parent: 'n28'}},
  {group: 'nodes', data: {id: 'n11', parent: 'n28'}},
  {group: 'nodes', data: {id: 'n12', parent: 'n28'}},
  {group: 'nodes', data: {id: 'n13', parent: 'n28'}},
  {group: 'nodes', data: {id: 'n14', parent: 'n28'}},
  {group: 'nodes', data: {id: 'n15'}},
  {group: 'nodes', data: {id: 'n16'}},
  {group: 'nodes', data: {id: 'n17'}},
  {group: 'nodes', data: {id: 'n18'}},
  {group: 'nodes', data: {id: 'n19'}},
  {group: 'nodes', data: {id: 'n20', parent: 'n26'}},
  {group: 'nodes', data: {id: 'n21', parent: 'n26'}},
  {group: 'nodes', data: {id: 'n22', parent: 'n27'}},    
  {group: 'nodes', data: {id: 'n23', parent: 'n25'}},
  {group: 'nodes', data: {id: 'n24'}},
  {group: 'nodes', data: {id: 'n25'}},
  {group: 'nodes', data: {id: 'n26', parent: 'n30'}},
  {group: 'nodes', data: {id: 'n27', parent: 'n29'}},
  {group: 'nodes', data: {id: 'n28', parent: 'n29'}},
  {group: 'nodes', data: {id: 'n29', parent: 'n30'}},
  {group: 'nodes', data: {id: 'n30'}},
  {group: 'nodes', data: {id: 'f1', parent: 'n29'}, classes: ['fixed']},
  {group: 'nodes', data: {id: 'f2', parent: 'n28'}, classes: ['fixed']},  
  {group: 'nodes', data: {id: 'h1'}, classes: ['alignment']},
  {group: 'nodes', data: {id: 'h2'}, classes: ['alignment']},
  {group: 'nodes', data: {id: 'h3'}, classes: ['alignment']},
  {group: 'nodes', data: {id: 'v1', parent: 'n24'}, classes: ['alignment']},  
  {group: 'nodes', data: {id: 'v2', parent: 'n25'}, classes: ['alignment']},  
  {group: 'nodes', data: {id: 'v3'}, classes: ['alignment']},
  {group: 'nodes', data: {id: 'v4'}, classes: ['alignment']},
  {group: 'nodes', data: {id: 'h4r'}, classes: ['alignment']},
  {group: 'nodes', data: {id: 'r1', parent: 'n29'}, classes: ['relative']},  
  {group: 'nodes', data: {id: 'r2', parent: 'n29'}, classes: ['relative']},
  {group: 'nodes', data: {id: 'r3'}, classes: ['relative']},
  {group: 'edges', data: {id: 'e2', source: 'n2', target: 'n3'}},
  {group: 'edges', data: {id: 'e3', source: 'n1', target: 'n2'}},
  {group: 'edges', data: {id: 'e4', source: 'n3', target: 'v1'}},
  {group: 'edges', data: {id: 'e5', source: 'n2', target: 'v1'}},
  {group: 'edges', data: {id: 'e6', source: 'v1', target: 'n4'}},
//  {group: 'edges', data: {id: 'e7', source: 'n5', target: 'n6'}},
  {group: 'edges', data: {id: 'e8', source: 'v1', target: 'n5'}},
  {group: 'edges', data: {id: 'e9', source: 'v1', target: 'n6'}},
  {group: 'edges', data: {id: 'e10', source: 'v1', target: 'n7'}},
//  {group: 'edges', data: {id: 'e11', source: 'n3', target: 'n9'}},
  {group: 'edges', data: {id: 'e12', source: 'n6', target: 'n8'}},
  {group: 'edges', data: {id: 'e13', source: 'h1', target: 'n16'}},
  { group:'edges', data:{ id: 'e14', source: 'v2', target: 'n23'} },
  {group: 'edges', data: {id: 'e15', source: 'n16', target: 'n15'}},
  {group: 'edges', data: {id: 'e16', source: 'n16', target: 'h2'}},
  {group: 'edges', data: {id: 'e17', source: 'n15', target: 'n17'}},
  {group: 'edges', data: {id: 'e18', source: 'h3', target: 'v3'}},
  {group: 'edges', data: {id: 'e19', source: 'v3', target: 'n18'}},
  {group: 'edges', data: {id: 'e20', source: 'n17', target: 'n19'}},
  {group: 'edges', data: {id: 'e21', source: 'n18', target: 'n19'}},
  {group: 'edges', data: {id: 'e22', source: 'h2', target: 'n19'}},
  {group: 'edges', data: {id: 'e23', source: 'n19', target: 'h3'}},
  {group: 'edges', data: {id: 'e25', source: 'v4', target: 'n20'}},
  {group: 'edges', data: {id: 'e26', source: 'n20', target: 'n21'}},
  {group: 'edges', data: {id: 'e27', source: 'n25', target: 'f1'}},
  {group: 'edges', data: {id: 'e29', source: 'f1', target: 'n26'}},
  {group: 'edges', data: {id: 'e30', source: 'f1', target: 'r2'}},
  {group: 'edges', data: {id: 'e31', source: 'f1', target: 'r1'}},
  {group: 'edges', data: {id: 'e33', source: 'h3', target: 'v2'}},
  {group: 'edges', data: {id: 'e35', source: 'f2', target: 'n11'}},
  {group: 'edges', data: {id: 'e36', source: 'f2', target: 'n10'}},
  {group: 'edges', data: {id: 'e37', source: 'n11', target: 'n10'}},
  {group: 'edges', data: {id: 'e38', source: 'n12', target: 'n13'}},
  {group: 'edges', data: {id: 'e39', source: 'n12', target: 'n14'}},
  {group: 'edges', data: {id: 'e40', source: 'h2', target: 'n27'}},
  {group: 'edges', data: {id: 'e41', source: 'n9', target: 'r3'}},
  {group: 'edges', data: {id: 'e42', source: 'n9', target: 'h4r'}},
  {group: 'edges', data: {id: 'e43', source: 'r3', target: 'h4r'}},
  {group: 'edges', data: {id: 'e44', source: 'n11', target: 'r3'}},
  {group: 'edges', data: {id: 'e45', source: 'n14', target: 'r3'}}
];

let elements5 = {
  nodes: [
    {data: {id: 'r1'}, classes: ['relative'], position:{x:318, y:150}},
    {data: {id: 'r2'}, classes: ['relative'], position:{x:413, y:148}},
    {data: {id: 'r3'}, classes: ['relative'], position:{x:128, y:-151}},
    {data: {id: 'r4'}, classes: ['relative'], position:{x:132, y:-38}},   
    {data: {id: 'f1v', parent: 'n8'}, classes: ['fixed'], position:{x:-79, y:276}},    
    {data: {id: 'f2h', parent: 'n6'}, classes: ['fixed'], position:{x:96, y:82}},
    {data: {id: 'v1', parent: 'n5'}, classes: ['alignment'], position:{x:-290, y:153}},
    {data: {id: 'v2', parent: 'n5'}, classes: ['alignment'], position:{x:-197, y:152}},
    {data: {id: 'v3', parent: 'n8'}, classes: ['alignment'], position:{x:-85, y:177}},
    {data: {id: 'h1', parent: 'n7'}, classes: ['alignment'], position:{x:1, y:-9}},
    {data: {id: 'h2', parent: 'n7'}, classes: ['alignment'], position:{x:0, y:-104}},
    {data: {id: 'n0', parent: 'n6'}, position:{x:186, y:219}},
    {data: {id: 'n1', parent: 'n6'}, position:{x:197, y:122}},
    {data: {id: 'n2', parent: 'n6'}, position:{x:93, y:186}},
    {data: {id: 'n3'}, position:{x:-267, y:20}},
    {data: {id: 'n4'}, position:{x:-167, y:-10}},
    {data: {id: 'n5', parent: 'n8'}},
    {data: {id: 'n6'}},
    {data: {id: 'n7'}},
    {data: {id: 'n8'}}    
  ],
  edges: [
    {data: {source: 'n0', target: 'n1'}},
    {data: {source: 'n0', target: 'n2'}},
    {data: {source: 'n6', target: 'r1'}},
    {data: {source: 'n1', target: 'f2h'}},
    {data: {source: 'r1', target: 'r2'}},
    {data: {source: 'n2', target: 'f2h'}},
    {data: {source: 'n6', target: 'r4'}},
    {data: {source: 'n3', target: 'n4'}},
    {data: {source: 'n3', target: 'n8'}},
    {data: {source: 'n4', target: 'v3'}},
    {data: {source: 'r4', target: 'h1'}},
    {data: {source: 'r4', target: 'r3'}},
    {data: {source: 'h1', target: 'h2'}},
    {data: {source: 'v1', target: 'v2'}},
    {data: {source: 'v3', target: 'n5'}},
    {data: {source: 'h1', target: 'v3'}},
    {data: {source: 'v3', target: 'f1v'}}
  ]
};

let elements5_positions = [
  {x:318, y:150}, 
  {x:413, y:148},
  {x:128, y:-151},
  {x:132, y:-38},
  {x:-79, y:276},
  {x:96, y:82},
  {x:-290, y:153},
  {x:-197, y:152},
  {x:-85, y:177},
  {x:1, y:-9},
  {x:0, y:-104},
  {x:186, y:219},
  {x:197, y:122},
  {x:93, y:186},
  {x:-267, y:20},
  {x:-167, y:-10},
  {x:318, y:150},
  {x:318, y:150}
];

let sample1_constraints = {
  "fixedNodeConstraint": [
    {
      "nodeId": "f1",
      "position": {
        "x": -150,
        "y": -100
      }
    },
    {
      "nodeId": "f2",
      "position": {
        "x": -50,
        "y": -150
      }
    },
    {
      "nodeId": "f3",
      "position": {
        "x": 100,
        "y": 150
      }
    }
  ]
};

let sample2_constraints = {
  "alignmentConstraint": {
    "vertical": [
      [
        "v1",
        "v2",
        "vh1"
      ],
      [
        "v3",
        "v4",
        "v5",
        "vh2"
      ]
    ],
    "horizontal": [
      [
        "h1",
        "h2",
        "h3"
      ],
      [
        "h4",
        "h5",
        "vh1",
        "vh2"
      ]
    ]
  }
};

let sample3_constraints = {
  "relativePlacementConstraint": [
    {
      "left": "r1",
      "right": "r2",
      "gap": 100
    },
    {
      "top": "r1",
      "bottom": "r2",
      "gap": 100
    },
    {
      "left": "r2",
      "right": "r3",
      "gap": 200
    },
    {
      "top": "r4",
      "bottom": "r5",
      "gap": 150
    },
    {
      "left": "r6",
      "right": "r7",
      "gap": 150
    },
    {
      "top": "r8",
      "bottom": "r7",
      "gap": 100
    }
  ]
};

let sample4_constraints = {
  "fixedNodeConstraint": [
    {
      "nodeId": "f1",
      "position": {
        "x": -100,
        "y": 0
      }
    },
    {
      "nodeId": "f2",
      "position": {
        "x": 300,
        "y": 0
      }
    }
  ],
  "alignmentConstraint": {
    "horizontal": [
      [
        "h1",
        "h2",
        "h3",
        "h4r"
      ]
    ],
    "vertical": [
      [
        "v1",
        "v2",
        "v3",
        "v4"        
      ]
    ]
  },
  "relativePlacementConstraint": [
    {
      "top": "r1",
      "bottom": "r2",
      "gap": 150
    },    
    {
      "left": "r3",
      "right": "h4r",
      "gap": 150
    }
  ]
}; 