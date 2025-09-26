import {
  getConfig2 as getConfig
} from "./chunk-ABZYJK2D.mjs";
import {
  __name
} from "./chunk-AGHRB4JF.mjs";

// src/rendering-util/rendering-elements/shapes/handDrawnShapeStyles.ts
var solidStateFill = /* @__PURE__ */ __name((color) => {
  const { handDrawnSeed } = getConfig();
  return {
    fill: color,
    hachureAngle: 120,
    // angle of hachure,
    hachureGap: 4,
    fillWeight: 2,
    roughness: 0.7,
    stroke: color,
    seed: handDrawnSeed
  };
}, "solidStateFill");
var compileStyles = /* @__PURE__ */ __name((node) => {
  const stylesMap = styles2Map([
    ...node.cssCompiledStyles || [],
    ...node.cssStyles || [],
    ...node.labelStyle || []
  ]);
  return { stylesMap, stylesArray: [...stylesMap] };
}, "compileStyles");
var styles2Map = /* @__PURE__ */ __name((styles) => {
  const styleMap = /* @__PURE__ */ new Map();
  styles.forEach((style) => {
    const [key, value] = style.split(":");
    styleMap.set(key.trim(), value?.trim());
  });
  return styleMap;
}, "styles2Map");
var isLabelStyle = /* @__PURE__ */ __name((key) => {
  return key === "color" || key === "font-size" || key === "font-family" || key === "font-weight" || key === "font-style" || key === "text-decoration" || key === "text-align" || key === "text-transform" || key === "line-height" || key === "letter-spacing" || key === "word-spacing" || key === "text-shadow" || key === "text-overflow" || key === "white-space" || key === "word-wrap" || key === "word-break" || key === "overflow-wrap" || key === "hyphens";
}, "isLabelStyle");
var styles2String = /* @__PURE__ */ __name((node) => {
  const { stylesArray } = compileStyles(node);
  const labelStyles = [];
  const nodeStyles = [];
  const borderStyles = [];
  const backgroundStyles = [];
  stylesArray.forEach((style) => {
    const key = style[0];
    if (isLabelStyle(key)) {
      labelStyles.push(style.join(":") + " !important");
    } else {
      nodeStyles.push(style.join(":") + " !important");
      if (key.includes("stroke")) {
        borderStyles.push(style.join(":") + " !important");
      }
      if (key === "fill") {
        backgroundStyles.push(style.join(":") + " !important");
      }
    }
  });
  return {
    labelStyles: labelStyles.join(";"),
    nodeStyles: nodeStyles.join(";"),
    stylesArray,
    borderStyles,
    backgroundStyles
  };
}, "styles2String");
var userNodeOverrides = /* @__PURE__ */ __name((node, options) => {
  const { themeVariables, handDrawnSeed } = getConfig();
  const { nodeBorder, mainBkg } = themeVariables;
  const { stylesMap } = compileStyles(node);
  const result = Object.assign(
    {
      roughness: 0.7,
      fill: stylesMap.get("fill") || mainBkg,
      fillStyle: "hachure",
      // solid fill
      fillWeight: 4,
      hachureGap: 5.2,
      stroke: stylesMap.get("stroke") || nodeBorder,
      seed: handDrawnSeed,
      strokeWidth: stylesMap.get("stroke-width")?.replace("px", "") || 1.3,
      fillLineDash: [0, 0],
      strokeLineDash: getStrokeDashArray(stylesMap.get("stroke-dasharray"))
    },
    options
  );
  return result;
}, "userNodeOverrides");
var getStrokeDashArray = /* @__PURE__ */ __name((strokeDasharrayStyle) => {
  if (!strokeDasharrayStyle) {
    return [0, 0];
  }
  const dashArray = strokeDasharrayStyle.trim().split(/\s+/).map(Number);
  if (dashArray.length === 1) {
    const val = isNaN(dashArray[0]) ? 0 : dashArray[0];
    return [val, val];
  }
  const first = isNaN(dashArray[0]) ? 0 : dashArray[0];
  const second = isNaN(dashArray[1]) ? 0 : dashArray[1];
  return [first, second];
}, "getStrokeDashArray");

export {
  solidStateFill,
  compileStyles,
  isLabelStyle,
  styles2String,
  userNodeOverrides
};
