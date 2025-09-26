import {
  ClassDB,
  classDiagram_default,
  classRenderer_v3_unified_default,
  styles_default
} from "./chunk-B4BG7PRW.mjs";
import "./chunk-FMBD7UC4.mjs";
import "./chunk-55IACEB6.mjs";
import "./chunk-QN33PNHL.mjs";
import "./chunk-N4CR4FBY.mjs";
import "./chunk-QXUST7PY.mjs";
import "./chunk-HN2XXSSU.mjs";
import "./chunk-JZLCHNYA.mjs";
import "./chunk-CVBHYZKI.mjs";
import "./chunk-ATLVNIR6.mjs";
import "./chunk-JA3XYJ7Z.mjs";
import "./chunk-S3R3BYOJ.mjs";
import "./chunk-ABZYJK2D.mjs";
import {
  __name
} from "./chunk-AGHRB4JF.mjs";

// src/diagrams/class/classDiagram-v2.ts
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
