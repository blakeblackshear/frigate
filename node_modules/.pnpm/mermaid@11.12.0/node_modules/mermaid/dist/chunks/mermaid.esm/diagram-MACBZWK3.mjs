import {
  populateCommonDb
} from "./chunk-K2ZEYYM2.mjs";
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
  selectSvgElement
} from "./chunk-U2UBZNRQ.mjs";
import {
  cleanAndMerge
} from "./chunk-ZNH7G2NJ.mjs";
import "./chunk-JGNW3ECZ.mjs";
import {
  clear,
  defaultConfig_default,
  getAccDescription,
  getAccTitle,
  getConfig,
  getDiagramTitle,
  getThemeVariables,
  setAccDescription,
  setAccTitle,
  setDiagramTitle
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

// src/diagrams/radar/db.ts
var defaultOptions = {
  showLegend: true,
  ticks: 5,
  max: null,
  min: 0,
  graticule: "circle"
};
var defaultRadarData = {
  axes: [],
  curves: [],
  options: defaultOptions
};
var data = structuredClone(defaultRadarData);
var DEFAULT_RADAR_CONFIG = defaultConfig_default.radar;
var getConfig2 = /* @__PURE__ */ __name(() => {
  const config = cleanAndMerge({
    ...DEFAULT_RADAR_CONFIG,
    ...getConfig().radar
  });
  return config;
}, "getConfig");
var getAxes = /* @__PURE__ */ __name(() => data.axes, "getAxes");
var getCurves = /* @__PURE__ */ __name(() => data.curves, "getCurves");
var getOptions = /* @__PURE__ */ __name(() => data.options, "getOptions");
var setAxes = /* @__PURE__ */ __name((axes) => {
  data.axes = axes.map((axis) => {
    return {
      name: axis.name,
      label: axis.label ?? axis.name
    };
  });
}, "setAxes");
var setCurves = /* @__PURE__ */ __name((curves) => {
  data.curves = curves.map((curve) => {
    return {
      name: curve.name,
      label: curve.label ?? curve.name,
      entries: computeCurveEntries(curve.entries)
    };
  });
}, "setCurves");
var computeCurveEntries = /* @__PURE__ */ __name((entries) => {
  if (entries[0].axis == void 0) {
    return entries.map((entry) => entry.value);
  }
  const axes = getAxes();
  if (axes.length === 0) {
    throw new Error("Axes must be populated before curves for reference entries");
  }
  return axes.map((axis) => {
    const entry = entries.find((entry2) => entry2.axis?.$refText === axis.name);
    if (entry === void 0) {
      throw new Error("Missing entry for axis " + axis.label);
    }
    return entry.value;
  });
}, "computeCurveEntries");
var setOptions = /* @__PURE__ */ __name((options) => {
  const optionMap = options.reduce(
    (acc, option) => {
      acc[option.name] = option;
      return acc;
    },
    {}
  );
  data.options = {
    showLegend: optionMap.showLegend?.value ?? defaultOptions.showLegend,
    ticks: optionMap.ticks?.value ?? defaultOptions.ticks,
    max: optionMap.max?.value ?? defaultOptions.max,
    min: optionMap.min?.value ?? defaultOptions.min,
    graticule: optionMap.graticule?.value ?? defaultOptions.graticule
  };
}, "setOptions");
var clear2 = /* @__PURE__ */ __name(() => {
  clear();
  data = structuredClone(defaultRadarData);
}, "clear");
var db = {
  getAxes,
  getCurves,
  getOptions,
  setAxes,
  setCurves,
  setOptions,
  getConfig: getConfig2,
  clear: clear2,
  setAccTitle,
  getAccTitle,
  setDiagramTitle,
  getDiagramTitle,
  getAccDescription,
  setAccDescription
};

// src/diagrams/radar/parser.ts
var populate = /* @__PURE__ */ __name((ast) => {
  populateCommonDb(ast, db);
  const { axes, curves, options } = ast;
  db.setAxes(axes);
  db.setCurves(curves);
  db.setOptions(options);
}, "populate");
var parser = {
  parse: /* @__PURE__ */ __name(async (input) => {
    const ast = await parse("radar", input);
    log.debug(ast);
    populate(ast);
  }, "parse")
};

// src/diagrams/radar/renderer.ts
var draw = /* @__PURE__ */ __name((_text, id, _version, diagram2) => {
  const db2 = diagram2.db;
  const axes = db2.getAxes();
  const curves = db2.getCurves();
  const options = db2.getOptions();
  const config = db2.getConfig();
  const title = db2.getDiagramTitle();
  const svg = selectSvgElement(id);
  const g = drawFrame(svg, config);
  const maxValue = options.max ?? Math.max(...curves.map((curve) => Math.max(...curve.entries)));
  const minValue = options.min;
  const radius = Math.min(config.width, config.height) / 2;
  drawGraticule(g, axes, radius, options.ticks, options.graticule);
  drawAxes(g, axes, radius, config);
  drawCurves(g, axes, curves, minValue, maxValue, options.graticule, config);
  drawLegend(g, curves, options.showLegend, config);
  g.append("text").attr("class", "radarTitle").text(title).attr("x", 0).attr("y", -config.height / 2 - config.marginTop);
}, "draw");
var drawFrame = /* @__PURE__ */ __name((svg, config) => {
  const totalWidth = config.width + config.marginLeft + config.marginRight;
  const totalHeight = config.height + config.marginTop + config.marginBottom;
  const center = {
    x: config.marginLeft + config.width / 2,
    y: config.marginTop + config.height / 2
  };
  svg.attr("viewbox", `0 0 ${totalWidth} ${totalHeight}`).attr("width", totalWidth).attr("height", totalHeight);
  return svg.append("g").attr("transform", `translate(${center.x}, ${center.y})`);
}, "drawFrame");
var drawGraticule = /* @__PURE__ */ __name((g, axes, radius, ticks, graticule) => {
  if (graticule === "circle") {
    for (let i = 0; i < ticks; i++) {
      const r = radius * (i + 1) / ticks;
      g.append("circle").attr("r", r).attr("class", "radarGraticule");
    }
  } else if (graticule === "polygon") {
    const numAxes = axes.length;
    for (let i = 0; i < ticks; i++) {
      const r = radius * (i + 1) / ticks;
      const points = axes.map((_, j) => {
        const angle = 2 * j * Math.PI / numAxes - Math.PI / 2;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        return `${x},${y}`;
      }).join(" ");
      g.append("polygon").attr("points", points).attr("class", "radarGraticule");
    }
  }
}, "drawGraticule");
var drawAxes = /* @__PURE__ */ __name((g, axes, radius, config) => {
  const numAxes = axes.length;
  for (let i = 0; i < numAxes; i++) {
    const label = axes[i].label;
    const angle = 2 * i * Math.PI / numAxes - Math.PI / 2;
    g.append("line").attr("x1", 0).attr("y1", 0).attr("x2", radius * config.axisScaleFactor * Math.cos(angle)).attr("y2", radius * config.axisScaleFactor * Math.sin(angle)).attr("class", "radarAxisLine");
    g.append("text").text(label).attr("x", radius * config.axisLabelFactor * Math.cos(angle)).attr("y", radius * config.axisLabelFactor * Math.sin(angle)).attr("class", "radarAxisLabel");
  }
}, "drawAxes");
function drawCurves(g, axes, curves, minValue, maxValue, graticule, config) {
  const numAxes = axes.length;
  const radius = Math.min(config.width, config.height) / 2;
  curves.forEach((curve, index) => {
    if (curve.entries.length !== numAxes) {
      return;
    }
    const points = curve.entries.map((entry, i) => {
      const angle = 2 * Math.PI * i / numAxes - Math.PI / 2;
      const r = relativeRadius(entry, minValue, maxValue, radius);
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      return { x, y };
    });
    if (graticule === "circle") {
      g.append("path").attr("d", closedRoundCurve(points, config.curveTension)).attr("class", `radarCurve-${index}`);
    } else if (graticule === "polygon") {
      g.append("polygon").attr("points", points.map((p) => `${p.x},${p.y}`).join(" ")).attr("class", `radarCurve-${index}`);
    }
  });
}
__name(drawCurves, "drawCurves");
function relativeRadius(value, minValue, maxValue, radius) {
  const clippedValue = Math.min(Math.max(value, minValue), maxValue);
  return radius * (clippedValue - minValue) / (maxValue - minValue);
}
__name(relativeRadius, "relativeRadius");
function closedRoundCurve(points, tension) {
  const numPoints = points.length;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < numPoints; i++) {
    const p0 = points[(i - 1 + numPoints) % numPoints];
    const p1 = points[i];
    const p2 = points[(i + 1) % numPoints];
    const p3 = points[(i + 2) % numPoints];
    const cp1 = {
      x: p1.x + (p2.x - p0.x) * tension,
      y: p1.y + (p2.y - p0.y) * tension
    };
    const cp2 = {
      x: p2.x - (p3.x - p1.x) * tension,
      y: p2.y - (p3.y - p1.y) * tension
    };
    d += ` C${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
  }
  return `${d} Z`;
}
__name(closedRoundCurve, "closedRoundCurve");
function drawLegend(g, curves, showLegend, config) {
  if (!showLegend) {
    return;
  }
  const legendX = (config.width / 2 + config.marginRight) * 3 / 4;
  const legendY = -(config.height / 2 + config.marginTop) * 3 / 4;
  const lineHeight = 20;
  curves.forEach((curve, index) => {
    const itemGroup = g.append("g").attr("transform", `translate(${legendX}, ${legendY + index * lineHeight})`);
    itemGroup.append("rect").attr("width", 12).attr("height", 12).attr("class", `radarLegendBox-${index}`);
    itemGroup.append("text").attr("x", 16).attr("y", 0).attr("class", "radarLegendText").text(curve.label);
  });
}
__name(drawLegend, "drawLegend");
var renderer = { draw };

// src/diagrams/radar/styles.ts
var genIndexStyles = /* @__PURE__ */ __name((themeVariables, radarOptions) => {
  let sections = "";
  for (let i = 0; i < themeVariables.THEME_COLOR_LIMIT; i++) {
    const indexColor = themeVariables[`cScale${i}`];
    sections += `
		.radarCurve-${i} {
			color: ${indexColor};
			fill: ${indexColor};
			fill-opacity: ${radarOptions.curveOpacity};
			stroke: ${indexColor};
			stroke-width: ${radarOptions.curveStrokeWidth};
		}
		.radarLegendBox-${i} {
			fill: ${indexColor};
			fill-opacity: ${radarOptions.curveOpacity};
			stroke: ${indexColor};
		}
		`;
  }
  return sections;
}, "genIndexStyles");
var buildRadarStyleOptions = /* @__PURE__ */ __name((radar) => {
  const defaultThemeVariables = getThemeVariables();
  const currentConfig = getConfig();
  const themeVariables = cleanAndMerge(defaultThemeVariables, currentConfig.themeVariables);
  const radarOptions = cleanAndMerge(themeVariables.radar, radar);
  return { themeVariables, radarOptions };
}, "buildRadarStyleOptions");
var styles = /* @__PURE__ */ __name(({ radar } = {}) => {
  const { themeVariables, radarOptions } = buildRadarStyleOptions(radar);
  return `
	.radarTitle {
		font-size: ${themeVariables.fontSize};
		color: ${themeVariables.titleColor};
		dominant-baseline: hanging;
		text-anchor: middle;
	}
	.radarAxisLine {
		stroke: ${radarOptions.axisColor};
		stroke-width: ${radarOptions.axisStrokeWidth};
	}
	.radarAxisLabel {
		dominant-baseline: middle;
		text-anchor: middle;
		font-size: ${radarOptions.axisLabelFontSize}px;
		color: ${radarOptions.axisColor};
	}
	.radarGraticule {
		fill: ${radarOptions.graticuleColor};
		fill-opacity: ${radarOptions.graticuleOpacity};
		stroke: ${radarOptions.graticuleColor};
		stroke-width: ${radarOptions.graticuleStrokeWidth};
	}
	.radarLegendText {
		text-anchor: start;
		font-size: ${radarOptions.legendFontSize}px;
		dominant-baseline: hanging;
	}
	${genIndexStyles(themeVariables, radarOptions)}
	`;
}, "styles");

// src/diagrams/radar/diagram.ts
var diagram = {
  parser,
  db,
  renderer,
  styles
};
export {
  diagram
};
