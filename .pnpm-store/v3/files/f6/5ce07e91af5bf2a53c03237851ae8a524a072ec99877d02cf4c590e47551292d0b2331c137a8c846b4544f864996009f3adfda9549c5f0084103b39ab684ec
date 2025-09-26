import {
  __name,
  log
} from "./chunk-AGHRB4JF.mjs";

// src/rendering-util/layout-algorithms/cose-bilkent/cytoscape-setup.ts
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { select } from "d3";
cytoscape.use(coseBilkent);
function addNodes(nodes, cy) {
  nodes.forEach((node) => {
    const nodeData = {
      id: node.id,
      labelText: node.label,
      height: node.height,
      width: node.width,
      padding: node.padding ?? 0
    };
    Object.keys(node).forEach((key) => {
      if (!["id", "label", "height", "width", "padding", "x", "y"].includes(key)) {
        nodeData[key] = node[key];
      }
    });
    cy.add({
      group: "nodes",
      data: nodeData,
      position: {
        x: node.x ?? 0,
        y: node.y ?? 0
      }
    });
  });
}
__name(addNodes, "addNodes");
function addEdges(edges, cy) {
  edges.forEach((edge) => {
    const edgeData = {
      id: edge.id,
      source: edge.start,
      target: edge.end
    };
    Object.keys(edge).forEach((key) => {
      if (!["id", "start", "end"].includes(key)) {
        edgeData[key] = edge[key];
      }
    });
    cy.add({
      group: "edges",
      data: edgeData
    });
  });
}
__name(addEdges, "addEdges");
function createCytoscapeInstance(data) {
  return new Promise((resolve) => {
    const renderEl = select("body").append("div").attr("id", "cy").attr("style", "display:none");
    const cy = cytoscape({
      container: document.getElementById("cy"),
      // container to render in
      style: [
        {
          selector: "edge",
          style: {
            "curve-style": "bezier"
          }
        }
      ]
    });
    renderEl.remove();
    addNodes(data.nodes, cy);
    addEdges(data.edges, cy);
    cy.nodes().forEach(function(n) {
      n.layoutDimensions = () => {
        const nodeData = n.data();
        return { w: nodeData.width, h: nodeData.height };
      };
    });
    const layoutConfig = {
      name: "cose-bilkent",
      // @ts-ignore Types for cose-bilkent are not correct?
      quality: "proof",
      styleEnabled: false,
      animate: false
    };
    cy.layout(layoutConfig).run();
    cy.ready((e) => {
      log.info("Cytoscape ready", e);
      resolve(cy);
    });
  });
}
__name(createCytoscapeInstance, "createCytoscapeInstance");
function extractPositionedNodes(cy) {
  return cy.nodes().map((node) => {
    const data = node.data();
    const position = node.position();
    const positionedNode = {
      id: data.id,
      x: position.x,
      y: position.y
    };
    Object.keys(data).forEach((key) => {
      if (key !== "id") {
        positionedNode[key] = data[key];
      }
    });
    return positionedNode;
  });
}
__name(extractPositionedNodes, "extractPositionedNodes");
function extractPositionedEdges(cy) {
  return cy.edges().map((edge) => {
    const data = edge.data();
    const rscratch = edge._private.rscratch;
    const positionedEdge = {
      id: data.id,
      source: data.source,
      target: data.target,
      startX: rscratch.startX,
      startY: rscratch.startY,
      midX: rscratch.midX,
      midY: rscratch.midY,
      endX: rscratch.endX,
      endY: rscratch.endY
    };
    Object.keys(data).forEach((key) => {
      if (!["id", "source", "target"].includes(key)) {
        positionedEdge[key] = data[key];
      }
    });
    return positionedEdge;
  });
}
__name(extractPositionedEdges, "extractPositionedEdges");

// src/rendering-util/layout-algorithms/cose-bilkent/layout.ts
async function executeCoseBilkentLayout(data, _config) {
  log.debug("Starting cose-bilkent layout algorithm");
  try {
    validateLayoutData(data);
    const cy = await createCytoscapeInstance(data);
    const positionedNodes = extractPositionedNodes(cy);
    const positionedEdges = extractPositionedEdges(cy);
    log.debug(`Layout completed: ${positionedNodes.length} nodes, ${positionedEdges.length} edges`);
    return {
      nodes: positionedNodes,
      edges: positionedEdges
    };
  } catch (error) {
    log.error("Error in cose-bilkent layout algorithm:", error);
    throw error;
  }
}
__name(executeCoseBilkentLayout, "executeCoseBilkentLayout");
function validateLayoutData(data) {
  if (!data) {
    throw new Error("Layout data is required");
  }
  if (!data.config) {
    throw new Error("Configuration is required in layout data");
  }
  if (!data.rootNode) {
    throw new Error("Root node is required");
  }
  if (!data.nodes || !Array.isArray(data.nodes)) {
    throw new Error("No nodes found in layout data");
  }
  if (!Array.isArray(data.edges)) {
    throw new Error("Edges array is required in layout data");
  }
  return true;
}
__name(validateLayoutData, "validateLayoutData");

// src/rendering-util/layout-algorithms/cose-bilkent/render.ts
var render = /* @__PURE__ */ __name(async (data4Layout, svg, {
  insertCluster,
  insertEdge,
  insertEdgeLabel,
  insertMarkers,
  insertNode,
  log: log2,
  positionEdgeLabel
}, { algorithm: _algorithm }) => {
  const nodeDb = {};
  const clusterDb = {};
  const element = svg.select("g");
  insertMarkers(element, data4Layout.markers, data4Layout.type, data4Layout.diagramId);
  const subGraphsEl = element.insert("g").attr("class", "subgraphs");
  const edgePaths = element.insert("g").attr("class", "edgePaths");
  const edgeLabels = element.insert("g").attr("class", "edgeLabels");
  const nodes = element.insert("g").attr("class", "nodes");
  log2.debug("Inserting nodes into DOM for dimension calculation");
  await Promise.all(
    data4Layout.nodes.map(async (node) => {
      if (node.isGroup) {
        const clusterNode = { ...node };
        clusterDb[node.id] = clusterNode;
        nodeDb[node.id] = clusterNode;
        await insertCluster(subGraphsEl, node);
      } else {
        const nodeWithPosition = { ...node };
        nodeDb[node.id] = nodeWithPosition;
        const nodeEl = await insertNode(nodes, node, {
          config: data4Layout.config,
          dir: data4Layout.direction || "TB"
        });
        const boundingBox = nodeEl.node().getBBox();
        nodeWithPosition.width = boundingBox.width;
        nodeWithPosition.height = boundingBox.height;
        nodeWithPosition.domId = nodeEl;
        log2.debug(`Node ${node.id} dimensions: ${boundingBox.width}x${boundingBox.height}`);
      }
    })
  );
  log2.debug("Running cose-bilkent layout algorithm");
  const updatedLayoutData = {
    ...data4Layout,
    nodes: data4Layout.nodes.map((node) => {
      const nodeWithDimensions = nodeDb[node.id];
      return {
        ...node,
        width: nodeWithDimensions.width,
        height: nodeWithDimensions.height
      };
    })
  };
  const layoutResult = await executeCoseBilkentLayout(updatedLayoutData, data4Layout.config);
  log2.debug("Positioning nodes based on layout results");
  layoutResult.nodes.forEach((positionedNode) => {
    const node = nodeDb[positionedNode.id];
    if (node?.domId) {
      node.domId.attr(
        "transform",
        `translate(${positionedNode.x}, ${positionedNode.y})`
      );
      node.x = positionedNode.x;
      node.y = positionedNode.y;
      log2.debug(`Positioned node ${node.id} at center (${positionedNode.x}, ${positionedNode.y})`);
    }
  });
  layoutResult.edges.forEach((positionedEdge) => {
    const edge = data4Layout.edges.find((e) => e.id === positionedEdge.id);
    if (edge) {
      edge.points = [
        { x: positionedEdge.startX, y: positionedEdge.startY },
        { x: positionedEdge.midX, y: positionedEdge.midY },
        { x: positionedEdge.endX, y: positionedEdge.endY }
      ];
    }
  });
  log2.debug("Inserting and positioning edges");
  await Promise.all(
    data4Layout.edges.map(async (edge) => {
      const _edgeLabel = await insertEdgeLabel(edgeLabels, edge);
      const startNode = nodeDb[edge.start ?? ""];
      const endNode = nodeDb[edge.end ?? ""];
      if (startNode && endNode) {
        const positionedEdge = layoutResult.edges.find((e) => e.id === edge.id);
        if (positionedEdge) {
          log2.debug("APA01 positionedEdge", positionedEdge);
          const edgeWithPath = { ...edge };
          const paths = insertEdge(
            edgePaths,
            edgeWithPath,
            clusterDb,
            data4Layout.type,
            startNode,
            endNode,
            data4Layout.diagramId
          );
          positionEdgeLabel(edgeWithPath, paths);
        } else {
          const edgeWithPath = {
            ...edge,
            points: [
              { x: startNode.x || 0, y: startNode.y || 0 },
              { x: endNode.x || 0, y: endNode.y || 0 }
            ]
          };
          const paths = insertEdge(
            edgePaths,
            edgeWithPath,
            clusterDb,
            data4Layout.type,
            startNode,
            endNode,
            data4Layout.diagramId
          );
          positionEdgeLabel(edgeWithPath, paths);
        }
      }
    })
  );
  log2.debug("Cose-bilkent rendering completed");
}, "render");

// src/rendering-util/layout-algorithms/cose-bilkent/index.ts
var render2 = render;
export {
  render2 as render
};
