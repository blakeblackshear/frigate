import {
  parse
} from "./chunk-UAX3YSUW.mjs";
import "./chunk-XHLUJ3B6.mjs";
import "./chunk-KFNMVS7B.mjs";
import "./chunk-2336245P.mjs";
import "./chunk-SNU2EDPW.mjs";
import "./chunk-FYFMZRDX.mjs";
import "./chunk-KOBZ2EY6.mjs";
import {
  package_default
} from "./chunk-2M32CCKP.mjs";
import {
  selectSvgElement
} from "./chunk-U2UBZNRQ.mjs";
import {
  configureSvgSize
} from "./chunk-6PHMZWEM.mjs";
import {
  log
} from "./chunk-2LXNVE6Q.mjs";
import "./chunk-KYR5PYZH.mjs";
import "./chunk-JFBLLWPX.mjs";
import "./chunk-ZZTYOBSU.mjs";
import "./chunk-PSZZOCOG.mjs";
import "./chunk-PEQZQI46.mjs";
import {
  __name
} from "./chunk-DLQEHMXD.mjs";

// src/diagrams/info/infoParser.ts
var parser = {
  parse: /* @__PURE__ */ __name(async (input) => {
    const ast = await parse("info", input);
    log.debug(ast);
  }, "parse")
};

// src/diagrams/info/infoDb.ts
var DEFAULT_INFO_DB = {
  version: package_default.version + (true ? "" : "-tiny")
};
var getVersion = /* @__PURE__ */ __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};

// src/diagrams/info/infoRenderer.ts
var draw = /* @__PURE__ */ __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = { draw };

// src/diagrams/info/infoDiagram.ts
var diagram = {
  parser,
  db,
  renderer
};
export {
  diagram
};
