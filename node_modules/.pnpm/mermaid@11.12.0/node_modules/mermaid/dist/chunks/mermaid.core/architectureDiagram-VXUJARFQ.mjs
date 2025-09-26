import {
  selectSvgElement
} from "./chunk-EXTU4WIE.mjs";
import {
  createText,
  getIconSVG,
  registerIconPacks,
  unknownIcon
} from "./chunk-JA3XYJ7Z.mjs";
import {
  populateCommonDb
} from "./chunk-4BX2VUAB.mjs";
import {
  cleanAndMerge,
  getEdgeId
} from "./chunk-S3R3BYOJ.mjs";
import {
  clear,
  defaultConfig_default,
  getAccDescription,
  getAccTitle,
  getConfig,
  getConfig2,
  getDiagramTitle,
  sanitizeText,
  setAccDescription,
  setAccTitle,
  setDiagramTitle,
  setupGraphViewbox
} from "./chunk-ABZYJK2D.mjs";
import {
  __name,
  log
} from "./chunk-AGHRB4JF.mjs";

// src/diagrams/architecture/architectureParser.ts
import { parse } from "@mermaid-js/parser";

// src/diagrams/architecture/architectureTypes.ts
var ArchitectureDirectionName = {
  L: "left",
  R: "right",
  T: "top",
  B: "bottom"
};
var ArchitectureDirectionArrow = {
  L: /* @__PURE__ */ __name((scale) => `${scale},${scale / 2} 0,${scale} 0,0`, "L"),
  R: /* @__PURE__ */ __name((scale) => `0,${scale / 2} ${scale},0 ${scale},${scale}`, "R"),
  T: /* @__PURE__ */ __name((scale) => `0,0 ${scale},0 ${scale / 2},${scale}`, "T"),
  B: /* @__PURE__ */ __name((scale) => `${scale / 2},0 ${scale},${scale} 0,${scale}`, "B")
};
var ArchitectureDirectionArrowShift = {
  L: /* @__PURE__ */ __name((orig, arrowSize) => orig - arrowSize + 2, "L"),
  R: /* @__PURE__ */ __name((orig, _arrowSize) => orig - 2, "R"),
  T: /* @__PURE__ */ __name((orig, arrowSize) => orig - arrowSize + 2, "T"),
  B: /* @__PURE__ */ __name((orig, _arrowSize) => orig - 2, "B")
};
var getOppositeArchitectureDirection = /* @__PURE__ */ __name(function(x) {
  if (isArchitectureDirectionX(x)) {
    return x === "L" ? "R" : "L";
  } else {
    return x === "T" ? "B" : "T";
  }
}, "getOppositeArchitectureDirection");
var isArchitectureDirection = /* @__PURE__ */ __name(function(x) {
  const temp = x;
  return temp === "L" || temp === "R" || temp === "T" || temp === "B";
}, "isArchitectureDirection");
var isArchitectureDirectionX = /* @__PURE__ */ __name(function(x) {
  const temp = x;
  return temp === "L" || temp === "R";
}, "isArchitectureDirectionX");
var isArchitectureDirectionY = /* @__PURE__ */ __name(function(x) {
  const temp = x;
  return temp === "T" || temp === "B";
}, "isArchitectureDirectionY");
var isArchitectureDirectionXY = /* @__PURE__ */ __name(function(a, b) {
  const aX_bY = isArchitectureDirectionX(a) && isArchitectureDirectionY(b);
  const aY_bX = isArchitectureDirectionY(a) && isArchitectureDirectionX(b);
  return aX_bY || aY_bX;
}, "isArchitectureDirectionXY");
var isArchitecturePairXY = /* @__PURE__ */ __name(function(pair) {
  const lhs = pair[0];
  const rhs = pair[1];
  const aX_bY = isArchitectureDirectionX(lhs) && isArchitectureDirectionY(rhs);
  const aY_bX = isArchitectureDirectionY(lhs) && isArchitectureDirectionX(rhs);
  return aX_bY || aY_bX;
}, "isArchitecturePairXY");
var isValidArchitectureDirectionPair = /* @__PURE__ */ __name(function(x) {
  return x !== "LL" && x !== "RR" && x !== "TT" && x !== "BB";
}, "isValidArchitectureDirectionPair");
var getArchitectureDirectionPair = /* @__PURE__ */ __name(function(sourceDir, targetDir) {
  const pair = `${sourceDir}${targetDir}`;
  return isValidArchitectureDirectionPair(pair) ? pair : void 0;
}, "getArchitectureDirectionPair");
var shiftPositionByArchitectureDirectionPair = /* @__PURE__ */ __name(function([x, y], pair) {
  const lhs = pair[0];
  const rhs = pair[1];
  if (isArchitectureDirectionX(lhs)) {
    if (isArchitectureDirectionY(rhs)) {
      return [x + (lhs === "L" ? -1 : 1), y + (rhs === "T" ? 1 : -1)];
    } else {
      return [x + (lhs === "L" ? -1 : 1), y];
    }
  } else {
    if (isArchitectureDirectionX(rhs)) {
      return [x + (rhs === "L" ? 1 : -1), y + (lhs === "T" ? 1 : -1)];
    } else {
      return [x, y + (lhs === "T" ? 1 : -1)];
    }
  }
}, "shiftPositionByArchitectureDirectionPair");
var getArchitectureDirectionXYFactors = /* @__PURE__ */ __name(function(pair) {
  if (pair === "LT" || pair === "TL") {
    return [1, 1];
  } else if (pair === "BL" || pair === "LB") {
    return [1, -1];
  } else if (pair === "BR" || pair === "RB") {
    return [-1, -1];
  } else {
    return [-1, 1];
  }
}, "getArchitectureDirectionXYFactors");
var getArchitectureDirectionAlignment = /* @__PURE__ */ __name(function(a, b) {
  if (isArchitectureDirectionXY(a, b)) {
    return "bend";
  } else if (isArchitectureDirectionX(a)) {
    return "horizontal";
  }
  return "vertical";
}, "getArchitectureDirectionAlignment");
var isArchitectureService = /* @__PURE__ */ __name(function(x) {
  const temp = x;
  return temp.type === "service";
}, "isArchitectureService");
var isArchitectureJunction = /* @__PURE__ */ __name(function(x) {
  const temp = x;
  return temp.type === "junction";
}, "isArchitectureJunction");
var edgeData = /* @__PURE__ */ __name((edge) => {
  return edge.data();
}, "edgeData");
var nodeData = /* @__PURE__ */ __name((node) => {
  return node.data();
}, "nodeData");

// src/diagrams/architecture/architectureDb.ts
var DEFAULT_ARCHITECTURE_CONFIG = defaultConfig_default.architecture;
var ArchitectureDB = class {
  constructor() {
    this.nodes = {};
    this.groups = {};
    this.edges = [];
    this.registeredIds = {};
    this.elements = {};
    this.setAccTitle = setAccTitle;
    this.getAccTitle = getAccTitle;
    this.setDiagramTitle = setDiagramTitle;
    this.getDiagramTitle = getDiagramTitle;
    this.getAccDescription = getAccDescription;
    this.setAccDescription = setAccDescription;
    this.clear();
  }
  static {
    __name(this, "ArchitectureDB");
  }
  clear() {
    this.nodes = {};
    this.groups = {};
    this.edges = [];
    this.registeredIds = {};
    this.dataStructures = void 0;
    this.elements = {};
    clear();
  }
  addService({
    id,
    icon,
    in: parent,
    title,
    iconText
  }) {
    if (this.registeredIds[id] !== void 0) {
      throw new Error(
        `The service id [${id}] is already in use by another ${this.registeredIds[id]}`
      );
    }
    if (parent !== void 0) {
      if (id === parent) {
        throw new Error(`The service [${id}] cannot be placed within itself`);
      }
      if (this.registeredIds[parent] === void 0) {
        throw new Error(
          `The service [${id}]'s parent does not exist. Please make sure the parent is created before this service`
        );
      }
      if (this.registeredIds[parent] === "node") {
        throw new Error(`The service [${id}]'s parent is not a group`);
      }
    }
    this.registeredIds[id] = "node";
    this.nodes[id] = {
      id,
      type: "service",
      icon,
      iconText,
      title,
      edges: [],
      in: parent
    };
  }
  getServices() {
    return Object.values(this.nodes).filter(isArchitectureService);
  }
  addJunction({ id, in: parent }) {
    this.registeredIds[id] = "node";
    this.nodes[id] = {
      id,
      type: "junction",
      edges: [],
      in: parent
    };
  }
  getJunctions() {
    return Object.values(this.nodes).filter(isArchitectureJunction);
  }
  getNodes() {
    return Object.values(this.nodes);
  }
  getNode(id) {
    return this.nodes[id] ?? null;
  }
  addGroup({ id, icon, in: parent, title }) {
    if (this.registeredIds?.[id] !== void 0) {
      throw new Error(
        `The group id [${id}] is already in use by another ${this.registeredIds[id]}`
      );
    }
    if (parent !== void 0) {
      if (id === parent) {
        throw new Error(`The group [${id}] cannot be placed within itself`);
      }
      if (this.registeredIds?.[parent] === void 0) {
        throw new Error(
          `The group [${id}]'s parent does not exist. Please make sure the parent is created before this group`
        );
      }
      if (this.registeredIds?.[parent] === "node") {
        throw new Error(`The group [${id}]'s parent is not a group`);
      }
    }
    this.registeredIds[id] = "group";
    this.groups[id] = {
      id,
      icon,
      title,
      in: parent
    };
  }
  getGroups() {
    return Object.values(this.groups);
  }
  addEdge({
    lhsId,
    rhsId,
    lhsDir,
    rhsDir,
    lhsInto,
    rhsInto,
    lhsGroup,
    rhsGroup,
    title
  }) {
    if (!isArchitectureDirection(lhsDir)) {
      throw new Error(
        `Invalid direction given for left hand side of edge ${lhsId}--${rhsId}. Expected (L,R,T,B) got ${String(lhsDir)}`
      );
    }
    if (!isArchitectureDirection(rhsDir)) {
      throw new Error(
        `Invalid direction given for right hand side of edge ${lhsId}--${rhsId}. Expected (L,R,T,B) got ${String(rhsDir)}`
      );
    }
    if (this.nodes[lhsId] === void 0 && this.groups[lhsId] === void 0) {
      throw new Error(
        `The left-hand id [${lhsId}] does not yet exist. Please create the service/group before declaring an edge to it.`
      );
    }
    if (this.nodes[rhsId] === void 0 && this.groups[rhsId] === void 0) {
      throw new Error(
        `The right-hand id [${rhsId}] does not yet exist. Please create the service/group before declaring an edge to it.`
      );
    }
    const lhsGroupId = this.nodes[lhsId].in;
    const rhsGroupId = this.nodes[rhsId].in;
    if (lhsGroup && lhsGroupId && rhsGroupId && lhsGroupId == rhsGroupId) {
      throw new Error(
        `The left-hand id [${lhsId}] is modified to traverse the group boundary, but the edge does not pass through two groups.`
      );
    }
    if (rhsGroup && lhsGroupId && rhsGroupId && lhsGroupId == rhsGroupId) {
      throw new Error(
        `The right-hand id [${rhsId}] is modified to traverse the group boundary, but the edge does not pass through two groups.`
      );
    }
    const edge = {
      lhsId,
      lhsDir,
      lhsInto,
      lhsGroup,
      rhsId,
      rhsDir,
      rhsInto,
      rhsGroup,
      title
    };
    this.edges.push(edge);
    if (this.nodes[lhsId] && this.nodes[rhsId]) {
      this.nodes[lhsId].edges.push(this.edges[this.edges.length - 1]);
      this.nodes[rhsId].edges.push(this.edges[this.edges.length - 1]);
    }
  }
  getEdges() {
    return this.edges;
  }
  /**
   * Returns the current diagram's adjacency list, spatial map, & group alignments.
   * If they have not been created, run the algorithms to generate them.
   * @returns
   */
  getDataStructures() {
    if (this.dataStructures === void 0) {
      const groupAlignments = {};
      const adjList = Object.entries(this.nodes).reduce((prevOuter, [id, service]) => {
        prevOuter[id] = service.edges.reduce((prevInner, edge) => {
          const lhsGroupId = this.getNode(edge.lhsId)?.in;
          const rhsGroupId = this.getNode(edge.rhsId)?.in;
          if (lhsGroupId && rhsGroupId && lhsGroupId !== rhsGroupId) {
            const alignment = getArchitectureDirectionAlignment(edge.lhsDir, edge.rhsDir);
            if (alignment !== "bend") {
              groupAlignments[lhsGroupId] ??= {};
              groupAlignments[lhsGroupId][rhsGroupId] = alignment;
              groupAlignments[rhsGroupId] ??= {};
              groupAlignments[rhsGroupId][lhsGroupId] = alignment;
            }
          }
          if (edge.lhsId === id) {
            const pair = getArchitectureDirectionPair(edge.lhsDir, edge.rhsDir);
            if (pair) {
              prevInner[pair] = edge.rhsId;
            }
          } else {
            const pair = getArchitectureDirectionPair(edge.rhsDir, edge.lhsDir);
            if (pair) {
              prevInner[pair] = edge.lhsId;
            }
          }
          return prevInner;
        }, {});
        return prevOuter;
      }, {});
      const firstId = Object.keys(adjList)[0];
      const visited = { [firstId]: 1 };
      const notVisited = Object.keys(adjList).reduce(
        (prev, id) => id === firstId ? prev : { ...prev, [id]: 1 },
        {}
      );
      const BFS = /* @__PURE__ */ __name((startingId) => {
        const spatialMap = { [startingId]: [0, 0] };
        const queue = [startingId];
        while (queue.length > 0) {
          const id = queue.shift();
          if (id) {
            visited[id] = 1;
            delete notVisited[id];
            const adj = adjList[id];
            const [posX, posY] = spatialMap[id];
            Object.entries(adj).forEach(([dir, rhsId]) => {
              if (!visited[rhsId]) {
                spatialMap[rhsId] = shiftPositionByArchitectureDirectionPair(
                  [posX, posY],
                  dir
                );
                queue.push(rhsId);
              }
            });
          }
        }
        return spatialMap;
      }, "BFS");
      const spatialMaps = [BFS(firstId)];
      while (Object.keys(notVisited).length > 0) {
        spatialMaps.push(BFS(Object.keys(notVisited)[0]));
      }
      this.dataStructures = {
        adjList,
        spatialMaps,
        groupAlignments
      };
    }
    return this.dataStructures;
  }
  setElementForId(id, element) {
    this.elements[id] = element;
  }
  getElementById(id) {
    return this.elements[id];
  }
  getConfig() {
    return cleanAndMerge({
      ...DEFAULT_ARCHITECTURE_CONFIG,
      ...getConfig().architecture
    });
  }
  getConfigField(field) {
    return this.getConfig()[field];
  }
};

// src/diagrams/architecture/architectureParser.ts
var populateDb = /* @__PURE__ */ __name((ast, db) => {
  populateCommonDb(ast, db);
  ast.groups.map((group) => db.addGroup(group));
  ast.services.map((service) => db.addService({ ...service, type: "service" }));
  ast.junctions.map((service) => db.addJunction({ ...service, type: "junction" }));
  ast.edges.map((edge) => db.addEdge(edge));
}, "populateDb");
var parser = {
  parser: {
    // @ts-expect-error - ArchitectureDB is not assignable to DiagramDB
    yy: void 0
  },
  parse: /* @__PURE__ */ __name(async (input) => {
    const ast = await parse("architecture", input);
    log.debug(ast);
    const db = parser.parser?.yy;
    if (!(db instanceof ArchitectureDB)) {
      throw new Error(
        "parser.parser?.yy was not a ArchitectureDB. This is due to a bug within Mermaid, please report this issue at https://github.com/mermaid-js/mermaid/issues."
      );
    }
    populateDb(ast, db);
  }, "parse")
};

// src/diagrams/architecture/architectureStyles.ts
var getStyles = /* @__PURE__ */ __name((options) => `
  .edge {
    stroke-width: ${options.archEdgeWidth};
    stroke: ${options.archEdgeColor};
    fill: none;
  }

  .arrow {
    fill: ${options.archEdgeArrowColor};
  }

  .node-bkg {
    fill: none;
    stroke: ${options.archGroupBorderColor};
    stroke-width: ${options.archGroupBorderWidth};
    stroke-dasharray: 8;
  }
  .node-icon-text {
    display: flex; 
    align-items: center;
  }
  
  .node-icon-text > div {
    color: #fff;
    margin: 1px;
    height: fit-content;
    text-align: center;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
  }
`, "getStyles");
var architectureStyles_default = getStyles;

// src/diagrams/architecture/architectureRenderer.ts
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import { select } from "d3";

// src/diagrams/architecture/architectureIcons.ts
var wrapIcon = /* @__PURE__ */ __name((icon) => {
  return `<g><rect width="80" height="80" style="fill: #087ebf; stroke-width: 0px;"/>${icon}</g>`;
}, "wrapIcon");
var architectureIcons = {
  prefix: "mermaid-architecture",
  height: 80,
  width: 80,
  icons: {
    database: {
      body: wrapIcon(
        '<path id="b" data-name="4" d="m20,57.86c0,3.94,8.95,7.14,20,7.14s20-3.2,20-7.14" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><path id="c" data-name="3" d="m20,45.95c0,3.94,8.95,7.14,20,7.14s20-3.2,20-7.14" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><path id="d" data-name="2" d="m20,34.05c0,3.94,8.95,7.14,20,7.14s20-3.2,20-7.14" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><ellipse id="e" data-name="1" cx="40" cy="22.14" rx="20" ry="7.14" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="20" y1="57.86" x2="20" y2="22.14" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="60" y1="57.86" x2="60" y2="22.14" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/>'
      )
    },
    server: {
      body: wrapIcon(
        '<rect x="17.5" y="17.5" width="45" height="45" rx="2" ry="2" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="17.5" y1="32.5" x2="62.5" y2="32.5" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="17.5" y1="47.5" x2="62.5" y2="47.5" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><g><path d="m56.25,25c0,.27-.45.5-1,.5h-10.5c-.55,0-1-.23-1-.5s.45-.5,1-.5h10.5c.55,0,1,.23,1,.5Z" style="fill: #fff; stroke-width: 0px;"/><path d="m56.25,25c0,.27-.45.5-1,.5h-10.5c-.55,0-1-.23-1-.5s.45-.5,1-.5h10.5c.55,0,1,.23,1,.5Z" style="fill: none; stroke: #fff; stroke-miterlimit: 10;"/></g><g><path d="m56.25,40c0,.27-.45.5-1,.5h-10.5c-.55,0-1-.23-1-.5s.45-.5,1-.5h10.5c.55,0,1,.23,1,.5Z" style="fill: #fff; stroke-width: 0px;"/><path d="m56.25,40c0,.27-.45.5-1,.5h-10.5c-.55,0-1-.23-1-.5s.45-.5,1-.5h10.5c.55,0,1,.23,1,.5Z" style="fill: none; stroke: #fff; stroke-miterlimit: 10;"/></g><g><path d="m56.25,55c0,.27-.45.5-1,.5h-10.5c-.55,0-1-.23-1-.5s.45-.5,1-.5h10.5c.55,0,1,.23,1,.5Z" style="fill: #fff; stroke-width: 0px;"/><path d="m56.25,55c0,.27-.45.5-1,.5h-10.5c-.55,0-1-.23-1-.5s.45-.5,1-.5h10.5c.55,0,1,.23,1,.5Z" style="fill: none; stroke: #fff; stroke-miterlimit: 10;"/></g><g><circle cx="32.5" cy="25" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/><circle cx="27.5" cy="25" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/><circle cx="22.5" cy="25" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/></g><g><circle cx="32.5" cy="40" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/><circle cx="27.5" cy="40" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/><circle cx="22.5" cy="40" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/></g><g><circle cx="32.5" cy="55" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/><circle cx="27.5" cy="55" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/><circle cx="22.5" cy="55" r=".75" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10;"/></g>'
      )
    },
    disk: {
      body: wrapIcon(
        '<rect x="20" y="15" width="40" height="50" rx="1" ry="1" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><ellipse cx="24" cy="19.17" rx=".8" ry=".83" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><ellipse cx="56" cy="19.17" rx=".8" ry=".83" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><ellipse cx="24" cy="60.83" rx=".8" ry=".83" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><ellipse cx="56" cy="60.83" rx=".8" ry=".83" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><ellipse cx="40" cy="33.75" rx="14" ry="14.58" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><ellipse cx="40" cy="33.75" rx="4" ry="4.17" style="fill: #fff; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><path d="m37.51,42.52l-4.83,13.22c-.26.71-1.1,1.02-1.76.64l-4.18-2.42c-.66-.38-.81-1.26-.33-1.84l9.01-10.8c.88-1.05,2.56-.08,2.09,1.2Z" style="fill: #fff; stroke-width: 0px;"/>'
      )
    },
    internet: {
      body: wrapIcon(
        '<circle cx="40" cy="40" r="22.5" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="40" y1="17.5" x2="40" y2="62.5" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="17.5" y1="40" x2="62.5" y2="40" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><path d="m39.99,17.51c-15.28,11.1-15.28,33.88,0,44.98" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><path d="m40.01,17.51c15.28,11.1,15.28,33.88,0,44.98" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="19.75" y1="30.1" x2="60.25" y2="30.1" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/><line x1="19.75" y1="49.9" x2="60.25" y2="49.9" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/>'
      )
    },
    cloud: {
      body: wrapIcon(
        '<path d="m65,47.5c0,2.76-2.24,5-5,5H20c-2.76,0-5-2.24-5-5,0-1.87,1.03-3.51,2.56-4.36-.04-.21-.06-.42-.06-.64,0-2.6,2.48-4.74,5.65-4.97,1.65-4.51,6.34-7.76,11.85-7.76.86,0,1.69.08,2.5.23,2.09-1.57,4.69-2.5,7.5-2.5,6.1,0,11.19,4.38,12.28,10.17,2.14.56,3.72,2.51,3.72,4.83,0,.03,0,.07-.01.1,2.29.46,4.01,2.48,4.01,4.9Z" style="fill: none; stroke: #fff; stroke-miterlimit: 10; stroke-width: 2px;"/>'
      )
    },
    unknown: unknownIcon,
    blank: {
      body: wrapIcon("")
    }
  }
};

// src/diagrams/architecture/svgDraw.ts
var drawEdges = /* @__PURE__ */ __name(async function(edgesEl, cy, db) {
  const padding = db.getConfigField("padding");
  const iconSize = db.getConfigField("iconSize");
  const halfIconSize = iconSize / 2;
  const arrowSize = iconSize / 6;
  const halfArrowSize = arrowSize / 2;
  await Promise.all(
    cy.edges().map(async (edge) => {
      const {
        source,
        sourceDir,
        sourceArrow,
        sourceGroup,
        target,
        targetDir,
        targetArrow,
        targetGroup,
        label
      } = edgeData(edge);
      let { x: startX, y: startY } = edge[0].sourceEndpoint();
      const { x: midX, y: midY } = edge[0].midpoint();
      let { x: endX, y: endY } = edge[0].targetEndpoint();
      const groupEdgeShift = padding + 4;
      if (sourceGroup) {
        if (isArchitectureDirectionX(sourceDir)) {
          startX += sourceDir === "L" ? -groupEdgeShift : groupEdgeShift;
        } else {
          startY += sourceDir === "T" ? -groupEdgeShift : groupEdgeShift + 18;
        }
      }
      if (targetGroup) {
        if (isArchitectureDirectionX(targetDir)) {
          endX += targetDir === "L" ? -groupEdgeShift : groupEdgeShift;
        } else {
          endY += targetDir === "T" ? -groupEdgeShift : groupEdgeShift + 18;
        }
      }
      if (!sourceGroup && db.getNode(source)?.type === "junction") {
        if (isArchitectureDirectionX(sourceDir)) {
          startX += sourceDir === "L" ? halfIconSize : -halfIconSize;
        } else {
          startY += sourceDir === "T" ? halfIconSize : -halfIconSize;
        }
      }
      if (!targetGroup && db.getNode(target)?.type === "junction") {
        if (isArchitectureDirectionX(targetDir)) {
          endX += targetDir === "L" ? halfIconSize : -halfIconSize;
        } else {
          endY += targetDir === "T" ? halfIconSize : -halfIconSize;
        }
      }
      if (edge[0]._private.rscratch) {
        const g = edgesEl.insert("g");
        g.insert("path").attr("d", `M ${startX},${startY} L ${midX},${midY} L${endX},${endY} `).attr("class", "edge").attr("id", getEdgeId(source, target, { prefix: "L" }));
        if (sourceArrow) {
          const xShift = isArchitectureDirectionX(sourceDir) ? ArchitectureDirectionArrowShift[sourceDir](startX, arrowSize) : startX - halfArrowSize;
          const yShift = isArchitectureDirectionY(sourceDir) ? ArchitectureDirectionArrowShift[sourceDir](startY, arrowSize) : startY - halfArrowSize;
          g.insert("polygon").attr("points", ArchitectureDirectionArrow[sourceDir](arrowSize)).attr("transform", `translate(${xShift},${yShift})`).attr("class", "arrow");
        }
        if (targetArrow) {
          const xShift = isArchitectureDirectionX(targetDir) ? ArchitectureDirectionArrowShift[targetDir](endX, arrowSize) : endX - halfArrowSize;
          const yShift = isArchitectureDirectionY(targetDir) ? ArchitectureDirectionArrowShift[targetDir](endY, arrowSize) : endY - halfArrowSize;
          g.insert("polygon").attr("points", ArchitectureDirectionArrow[targetDir](arrowSize)).attr("transform", `translate(${xShift},${yShift})`).attr("class", "arrow");
        }
        if (label) {
          const axis = !isArchitectureDirectionXY(sourceDir, targetDir) ? isArchitectureDirectionX(sourceDir) ? "X" : "Y" : "XY";
          let width = 0;
          if (axis === "X") {
            width = Math.abs(startX - endX);
          } else if (axis === "Y") {
            width = Math.abs(startY - endY) / 1.5;
          } else {
            width = Math.abs(startX - endX) / 2;
          }
          const textElem = g.append("g");
          await createText(
            textElem,
            label,
            {
              useHtmlLabels: false,
              width,
              classes: "architecture-service-label"
            },
            getConfig2()
          );
          textElem.attr("dy", "1em").attr("alignment-baseline", "middle").attr("dominant-baseline", "middle").attr("text-anchor", "middle");
          if (axis === "X") {
            textElem.attr("transform", "translate(" + midX + ", " + midY + ")");
          } else if (axis === "Y") {
            textElem.attr("transform", "translate(" + midX + ", " + midY + ") rotate(-90)");
          } else if (axis === "XY") {
            const pair = getArchitectureDirectionPair(sourceDir, targetDir);
            if (pair && isArchitecturePairXY(pair)) {
              const bboxOrig = textElem.node().getBoundingClientRect();
              const [x, y] = getArchitectureDirectionXYFactors(pair);
              textElem.attr("dominant-baseline", "auto").attr("transform", `rotate(${-1 * x * y * 45})`);
              const bboxNew = textElem.node().getBoundingClientRect();
              textElem.attr(
                "transform",
                `
                translate(${midX}, ${midY - bboxOrig.height / 2})
                translate(${x * bboxNew.width / 2}, ${y * bboxNew.height / 2})
                rotate(${-1 * x * y * 45}, 0, ${bboxOrig.height / 2})
              `
              );
            }
          }
        }
      }
    })
  );
}, "drawEdges");
var drawGroups = /* @__PURE__ */ __name(async function(groupsEl, cy, db) {
  const padding = db.getConfigField("padding");
  const groupIconSize = padding * 0.75;
  const fontSize = db.getConfigField("fontSize");
  const iconSize = db.getConfigField("iconSize");
  const halfIconSize = iconSize / 2;
  await Promise.all(
    cy.nodes().map(async (node) => {
      const data = nodeData(node);
      if (data.type === "group") {
        const { h, w, x1, y1 } = node.boundingBox();
        const groupsNode = groupsEl.append("rect");
        groupsNode.attr("id", `group-${data.id}`).attr("x", x1 + halfIconSize).attr("y", y1 + halfIconSize).attr("width", w).attr("height", h).attr("class", "node-bkg");
        const groupLabelContainer = groupsEl.append("g");
        let shiftedX1 = x1;
        let shiftedY1 = y1;
        if (data.icon) {
          const bkgElem = groupLabelContainer.append("g");
          bkgElem.html(
            `<g>${await getIconSVG(data.icon, { height: groupIconSize, width: groupIconSize, fallbackPrefix: architectureIcons.prefix })}</g>`
          );
          bkgElem.attr(
            "transform",
            "translate(" + (shiftedX1 + halfIconSize + 1) + ", " + (shiftedY1 + halfIconSize + 1) + ")"
          );
          shiftedX1 += groupIconSize;
          shiftedY1 += fontSize / 2 - 1 - 2;
        }
        if (data.label) {
          const textElem = groupLabelContainer.append("g");
          await createText(
            textElem,
            data.label,
            {
              useHtmlLabels: false,
              width: w,
              classes: "architecture-service-label"
            },
            getConfig2()
          );
          textElem.attr("dy", "1em").attr("alignment-baseline", "middle").attr("dominant-baseline", "start").attr("text-anchor", "start");
          textElem.attr(
            "transform",
            "translate(" + (shiftedX1 + halfIconSize + 4) + ", " + (shiftedY1 + halfIconSize + 2) + ")"
          );
        }
        db.setElementForId(data.id, groupsNode);
      }
    })
  );
}, "drawGroups");
var drawServices = /* @__PURE__ */ __name(async function(db, elem, services) {
  const config = getConfig2();
  for (const service of services) {
    const serviceElem = elem.append("g");
    const iconSize = db.getConfigField("iconSize");
    if (service.title) {
      const textElem = serviceElem.append("g");
      await createText(
        textElem,
        service.title,
        {
          useHtmlLabels: false,
          width: iconSize * 1.5,
          classes: "architecture-service-label"
        },
        config
      );
      textElem.attr("dy", "1em").attr("alignment-baseline", "middle").attr("dominant-baseline", "middle").attr("text-anchor", "middle");
      textElem.attr("transform", "translate(" + iconSize / 2 + ", " + iconSize + ")");
    }
    const bkgElem = serviceElem.append("g");
    if (service.icon) {
      bkgElem.html(
        `<g>${await getIconSVG(service.icon, { height: iconSize, width: iconSize, fallbackPrefix: architectureIcons.prefix })}</g>`
      );
    } else if (service.iconText) {
      bkgElem.html(
        `<g>${await getIconSVG("blank", { height: iconSize, width: iconSize, fallbackPrefix: architectureIcons.prefix })}</g>`
      );
      const textElemContainer = bkgElem.append("g");
      const fo = textElemContainer.append("foreignObject").attr("width", iconSize).attr("height", iconSize);
      const divElem = fo.append("div").attr("class", "node-icon-text").attr("style", `height: ${iconSize}px;`).append("div").html(sanitizeText(service.iconText, config));
      const fontSize = parseInt(
        window.getComputedStyle(divElem.node(), null).getPropertyValue("font-size").replace(/\D/g, "")
      ) ?? 16;
      divElem.attr("style", `-webkit-line-clamp: ${Math.floor((iconSize - 2) / fontSize)};`);
    } else {
      bkgElem.append("path").attr("class", "node-bkg").attr("id", "node-" + service.id).attr(
        "d",
        `M0 ${iconSize} v${-iconSize} q0,-5 5,-5 h${iconSize} q5,0 5,5 v${iconSize} H0 Z`
      );
    }
    serviceElem.attr("id", `service-${service.id}`).attr("class", "architecture-service");
    const { width, height } = serviceElem.node().getBBox();
    service.width = width;
    service.height = height;
    db.setElementForId(service.id, serviceElem);
  }
  return 0;
}, "drawServices");
var drawJunctions = /* @__PURE__ */ __name(function(db, elem, junctions) {
  junctions.forEach((junction) => {
    const junctionElem = elem.append("g");
    const iconSize = db.getConfigField("iconSize");
    const bkgElem = junctionElem.append("g");
    bkgElem.append("rect").attr("id", "node-" + junction.id).attr("fill-opacity", "0").attr("width", iconSize).attr("height", iconSize);
    junctionElem.attr("class", "architecture-junction");
    const { width, height } = junctionElem._groups[0][0].getBBox();
    junctionElem.width = width;
    junctionElem.height = height;
    db.setElementForId(junction.id, junctionElem);
  });
}, "drawJunctions");

// src/diagrams/architecture/architectureRenderer.ts
registerIconPacks([
  {
    name: architectureIcons.prefix,
    icons: architectureIcons
  }
]);
cytoscape.use(fcose);
function addServices(services, cy, db) {
  services.forEach((service) => {
    cy.add({
      group: "nodes",
      data: {
        type: "service",
        id: service.id,
        icon: service.icon,
        label: service.title,
        parent: service.in,
        width: db.getConfigField("iconSize"),
        height: db.getConfigField("iconSize")
      },
      classes: "node-service"
    });
  });
}
__name(addServices, "addServices");
function addJunctions(junctions, cy, db) {
  junctions.forEach((junction) => {
    cy.add({
      group: "nodes",
      data: {
        type: "junction",
        id: junction.id,
        parent: junction.in,
        width: db.getConfigField("iconSize"),
        height: db.getConfigField("iconSize")
      },
      classes: "node-junction"
    });
  });
}
__name(addJunctions, "addJunctions");
function positionNodes(db, cy) {
  cy.nodes().map((node) => {
    const data = nodeData(node);
    if (data.type === "group") {
      return;
    }
    data.x = node.position().x;
    data.y = node.position().y;
    const nodeElem = db.getElementById(data.id);
    nodeElem.attr("transform", "translate(" + (data.x || 0) + "," + (data.y || 0) + ")");
  });
}
__name(positionNodes, "positionNodes");
function addGroups(groups, cy) {
  groups.forEach((group) => {
    cy.add({
      group: "nodes",
      data: {
        type: "group",
        id: group.id,
        icon: group.icon,
        label: group.title,
        parent: group.in
      },
      classes: "node-group"
    });
  });
}
__name(addGroups, "addGroups");
function addEdges(edges, cy) {
  edges.forEach((parsedEdge) => {
    const { lhsId, rhsId, lhsInto, lhsGroup, rhsInto, lhsDir, rhsDir, rhsGroup, title } = parsedEdge;
    const edgeType = isArchitectureDirectionXY(parsedEdge.lhsDir, parsedEdge.rhsDir) ? "segments" : "straight";
    const edge = {
      id: `${lhsId}-${rhsId}`,
      label: title,
      source: lhsId,
      sourceDir: lhsDir,
      sourceArrow: lhsInto,
      sourceGroup: lhsGroup,
      sourceEndpoint: lhsDir === "L" ? "0 50%" : lhsDir === "R" ? "100% 50%" : lhsDir === "T" ? "50% 0" : "50% 100%",
      target: rhsId,
      targetDir: rhsDir,
      targetArrow: rhsInto,
      targetGroup: rhsGroup,
      targetEndpoint: rhsDir === "L" ? "0 50%" : rhsDir === "R" ? "100% 50%" : rhsDir === "T" ? "50% 0" : "50% 100%"
    };
    cy.add({
      group: "edges",
      data: edge,
      classes: edgeType
    });
  });
}
__name(addEdges, "addEdges");
function getAlignments(db, spatialMaps, groupAlignments) {
  const flattenAlignments = /* @__PURE__ */ __name((alignmentObj, alignmentDir) => {
    return Object.entries(alignmentObj).reduce(
      (prev, [dir, alignments2]) => {
        let cnt = 0;
        const arr = Object.entries(alignments2);
        if (arr.length === 1) {
          prev[dir] = arr[0][1];
          return prev;
        }
        for (let i = 0; i < arr.length - 1; i++) {
          for (let j = i + 1; j < arr.length; j++) {
            const [aGroupId, aNodeIds] = arr[i];
            const [bGroupId, bNodeIds] = arr[j];
            const alignment = groupAlignments[aGroupId]?.[bGroupId];
            if (alignment === alignmentDir) {
              prev[dir] ??= [];
              prev[dir] = [...prev[dir], ...aNodeIds, ...bNodeIds];
            } else if (aGroupId === "default" || bGroupId === "default") {
              prev[dir] ??= [];
              prev[dir] = [...prev[dir], ...aNodeIds, ...bNodeIds];
            } else {
              const keyA = `${dir}-${cnt++}`;
              prev[keyA] = aNodeIds;
              const keyB = `${dir}-${cnt++}`;
              prev[keyB] = bNodeIds;
            }
          }
        }
        return prev;
      },
      {}
    );
  }, "flattenAlignments");
  const alignments = spatialMaps.map((spatialMap) => {
    const horizontalAlignments = {};
    const verticalAlignments = {};
    Object.entries(spatialMap).forEach(([id, [x, y]]) => {
      const nodeGroup = db.getNode(id)?.in ?? "default";
      horizontalAlignments[y] ??= {};
      horizontalAlignments[y][nodeGroup] ??= [];
      horizontalAlignments[y][nodeGroup].push(id);
      verticalAlignments[x] ??= {};
      verticalAlignments[x][nodeGroup] ??= [];
      verticalAlignments[x][nodeGroup].push(id);
    });
    return {
      horiz: Object.values(flattenAlignments(horizontalAlignments, "horizontal")).filter(
        (arr) => arr.length > 1
      ),
      vert: Object.values(flattenAlignments(verticalAlignments, "vertical")).filter(
        (arr) => arr.length > 1
      )
    };
  });
  const [horizontal, vertical] = alignments.reduce(
    ([prevHoriz, prevVert], { horiz, vert }) => {
      return [
        [...prevHoriz, ...horiz],
        [...prevVert, ...vert]
      ];
    },
    [[], []]
  );
  return {
    horizontal,
    vertical
  };
}
__name(getAlignments, "getAlignments");
function getRelativeConstraints(spatialMaps, db) {
  const relativeConstraints = [];
  const posToStr = /* @__PURE__ */ __name((pos) => `${pos[0]},${pos[1]}`, "posToStr");
  const strToPos = /* @__PURE__ */ __name((pos) => pos.split(",").map((p) => parseInt(p)), "strToPos");
  spatialMaps.forEach((spatialMap) => {
    const invSpatialMap = Object.fromEntries(
      Object.entries(spatialMap).map(([id, pos]) => [posToStr(pos), id])
    );
    const queue = [posToStr([0, 0])];
    const visited = {};
    const directions = {
      L: [-1, 0],
      R: [1, 0],
      T: [0, 1],
      B: [0, -1]
    };
    while (queue.length > 0) {
      const curr = queue.shift();
      if (curr) {
        visited[curr] = 1;
        const currId = invSpatialMap[curr];
        if (currId) {
          const currPos = strToPos(curr);
          Object.entries(directions).forEach(([dir, shift]) => {
            const newPos = posToStr([currPos[0] + shift[0], currPos[1] + shift[1]]);
            const newId = invSpatialMap[newPos];
            if (newId && !visited[newPos]) {
              queue.push(newPos);
              relativeConstraints.push({
                [ArchitectureDirectionName[dir]]: newId,
                [ArchitectureDirectionName[getOppositeArchitectureDirection(dir)]]: currId,
                gap: 1.5 * db.getConfigField("iconSize")
              });
            }
          });
        }
      }
    }
  });
  return relativeConstraints;
}
__name(getRelativeConstraints, "getRelativeConstraints");
function layoutArchitecture(services, junctions, groups, edges, db, { spatialMaps, groupAlignments }) {
  return new Promise((resolve) => {
    const renderEl = select("body").append("div").attr("id", "cy").attr("style", "display:none");
    const cy = cytoscape({
      container: document.getElementById("cy"),
      style: [
        {
          selector: "edge",
          style: {
            "curve-style": "straight",
            label: "data(label)",
            "source-endpoint": "data(sourceEndpoint)",
            "target-endpoint": "data(targetEndpoint)"
          }
        },
        {
          selector: "edge.segments",
          style: {
            "curve-style": "segments",
            "segment-weights": "0",
            "segment-distances": [0.5],
            // @ts-ignore Incorrect library types
            "edge-distances": "endpoints",
            "source-endpoint": "data(sourceEndpoint)",
            "target-endpoint": "data(targetEndpoint)"
          }
        },
        {
          selector: "node",
          style: {
            // @ts-ignore Incorrect library types
            "compound-sizing-wrt-labels": "include"
          }
        },
        {
          selector: "node[label]",
          style: {
            "text-valign": "bottom",
            "text-halign": "center",
            "font-size": `${db.getConfigField("fontSize")}px`
          }
        },
        {
          selector: ".node-service",
          style: {
            label: "data(label)",
            width: "data(width)",
            height: "data(height)"
          }
        },
        {
          selector: ".node-junction",
          style: {
            width: "data(width)",
            height: "data(height)"
          }
        },
        {
          selector: ".node-group",
          style: {
            // @ts-ignore Incorrect library types
            padding: `${db.getConfigField("padding")}px`
          }
        }
      ],
      layout: {
        name: "grid",
        boundingBox: {
          x1: 0,
          x2: 100,
          y1: 0,
          y2: 100
        }
      }
    });
    renderEl.remove();
    addGroups(groups, cy);
    addServices(services, cy, db);
    addJunctions(junctions, cy, db);
    addEdges(edges, cy);
    const alignmentConstraint = getAlignments(db, spatialMaps, groupAlignments);
    const relativePlacementConstraint = getRelativeConstraints(spatialMaps, db);
    const layout = cy.layout({
      name: "fcose",
      quality: "proof",
      styleEnabled: false,
      animate: false,
      nodeDimensionsIncludeLabels: false,
      // Adjust the edge parameters if it passes through the border of a group
      // Hacky fix for: https://github.com/iVis-at-Bilkent/cytoscape.js-fcose/issues/67
      idealEdgeLength(edge) {
        const [nodeA, nodeB] = edge.connectedNodes();
        const { parent: parentA } = nodeData(nodeA);
        const { parent: parentB } = nodeData(nodeB);
        const elasticity = parentA === parentB ? 1.5 * db.getConfigField("iconSize") : 0.5 * db.getConfigField("iconSize");
        return elasticity;
      },
      edgeElasticity(edge) {
        const [nodeA, nodeB] = edge.connectedNodes();
        const { parent: parentA } = nodeData(nodeA);
        const { parent: parentB } = nodeData(nodeB);
        const elasticity = parentA === parentB ? 0.45 : 1e-3;
        return elasticity;
      },
      alignmentConstraint,
      relativePlacementConstraint
    });
    layout.one("layoutstop", () => {
      function getSegmentWeights(source, target, pointX, pointY) {
        let W, D;
        const { x: sX, y: sY } = source;
        const { x: tX, y: tY } = target;
        D = (pointY - sY + (sX - pointX) * (sY - tY) / (sX - tX)) / Math.sqrt(1 + Math.pow((sY - tY) / (sX - tX), 2));
        W = Math.sqrt(Math.pow(pointY - sY, 2) + Math.pow(pointX - sX, 2) - Math.pow(D, 2));
        const distAB = Math.sqrt(Math.pow(tX - sX, 2) + Math.pow(tY - sY, 2));
        W = W / distAB;
        let delta1 = (tX - sX) * (pointY - sY) - (tY - sY) * (pointX - sX);
        switch (true) {
          case delta1 >= 0:
            delta1 = 1;
            break;
          case delta1 < 0:
            delta1 = -1;
            break;
        }
        let delta2 = (tX - sX) * (pointX - sX) + (tY - sY) * (pointY - sY);
        switch (true) {
          case delta2 >= 0:
            delta2 = 1;
            break;
          case delta2 < 0:
            delta2 = -1;
            break;
        }
        D = Math.abs(D) * delta1;
        W = W * delta2;
        return {
          distances: D,
          weights: W
        };
      }
      __name(getSegmentWeights, "getSegmentWeights");
      cy.startBatch();
      for (const edge of Object.values(cy.edges())) {
        if (edge.data?.()) {
          const { x: sX, y: sY } = edge.source().position();
          const { x: tX, y: tY } = edge.target().position();
          if (sX !== tX && sY !== tY) {
            const sEP = edge.sourceEndpoint();
            const tEP = edge.targetEndpoint();
            const { sourceDir } = edgeData(edge);
            const [pointX, pointY] = isArchitectureDirectionY(sourceDir) ? [sEP.x, tEP.y] : [tEP.x, sEP.y];
            const { weights, distances } = getSegmentWeights(sEP, tEP, pointX, pointY);
            edge.style("segment-distances", distances);
            edge.style("segment-weights", weights);
          }
        }
      }
      cy.endBatch();
      layout.run();
    });
    layout.run();
    cy.ready((e) => {
      log.info("Ready", e);
      resolve(cy);
    });
  });
}
__name(layoutArchitecture, "layoutArchitecture");
var draw = /* @__PURE__ */ __name(async (text, id, _version, diagObj) => {
  const db = diagObj.db;
  const services = db.getServices();
  const junctions = db.getJunctions();
  const groups = db.getGroups();
  const edges = db.getEdges();
  const ds = db.getDataStructures();
  const svg = selectSvgElement(id);
  const edgesElem = svg.append("g");
  edgesElem.attr("class", "architecture-edges");
  const servicesElem = svg.append("g");
  servicesElem.attr("class", "architecture-services");
  const groupElem = svg.append("g");
  groupElem.attr("class", "architecture-groups");
  await drawServices(db, servicesElem, services);
  drawJunctions(db, servicesElem, junctions);
  const cy = await layoutArchitecture(services, junctions, groups, edges, db, ds);
  await drawEdges(edgesElem, cy, db);
  await drawGroups(groupElem, cy, db);
  positionNodes(db, cy);
  setupGraphViewbox(void 0, svg, db.getConfigField("padding"), db.getConfigField("useMaxWidth"));
}, "draw");
var renderer = { draw };

// src/diagrams/architecture/architectureDiagram.ts
var diagram = {
  parser,
  get db() {
    return new ArchitectureDB();
  },
  renderer,
  styles: architectureStyles_default
};
export {
  diagram
};
