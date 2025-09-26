'use strict';

var addJSXAttribute = require('@svgr/babel-plugin-add-jsx-attribute');
var removeJSXAttribute = require('@svgr/babel-plugin-remove-jsx-attribute');
var removeJSXEmptyExpression = require('@svgr/babel-plugin-remove-jsx-empty-expression');
var replaceJSXAttributeValue = require('@svgr/babel-plugin-replace-jsx-attribute-value');
var svgDynamicTitle = require('@svgr/babel-plugin-svg-dynamic-title');
var svgEmDimensions = require('@svgr/babel-plugin-svg-em-dimensions');
var transformReactNativeSVG = require('@svgr/babel-plugin-transform-react-native-svg');
var transformSvgComponent = require('@svgr/babel-plugin-transform-svg-component');

const getAttributeValue = (value) => {
  const literal = typeof value === "string" && value.startsWith("{") && value.endsWith("}");
  return { value: literal ? value.slice(1, -1) : value, literal };
};
const propsToAttributes = (props) => {
  return Object.keys(props).map((name) => {
    const { literal, value } = getAttributeValue(props[name]);
    return { name, literal, value };
  });
};
function replaceMapToValues(replaceMap) {
  return Object.keys(replaceMap).map((value) => {
    const { literal, value: newValue } = getAttributeValue(replaceMap[value]);
    return { value, newValue, literal };
  });
}
const plugin = (_, opts) => {
  let toRemoveAttributes = ["version"];
  let toAddAttributes = [];
  if (opts.svgProps) {
    toAddAttributes = [...toAddAttributes, ...propsToAttributes(opts.svgProps)];
  }
  if (opts.ref) {
    toAddAttributes = [
      ...toAddAttributes,
      {
        name: "ref",
        value: "ref",
        literal: true
      }
    ];
  }
  if (opts.titleProp) {
    toAddAttributes = [
      ...toAddAttributes,
      {
        name: "aria-labelledby",
        value: "titleId",
        literal: true
      }
    ];
  }
  if (opts.descProp) {
    toAddAttributes = [
      ...toAddAttributes,
      {
        name: "aria-describedby",
        value: "descId",
        literal: true
      }
    ];
  }
  if (opts.expandProps) {
    toAddAttributes = [
      ...toAddAttributes,
      {
        name: "props",
        spread: true,
        position: opts.expandProps === "start" || opts.expandProps === "end" ? opts.expandProps : void 0
      }
    ];
  }
  if (!opts.dimensions) {
    toRemoveAttributes = [...toRemoveAttributes, "width", "height"];
  }
  const plugins = [
    [transformSvgComponent, opts],
    ...opts.icon !== false && opts.dimensions ? [
      [
        svgEmDimensions,
        opts.icon !== true ? { width: opts.icon, height: opts.icon } : opts.native ? { width: 24, height: 24 } : {}
      ]
    ] : [],
    [
      removeJSXAttribute,
      { elements: ["svg", "Svg"], attributes: toRemoveAttributes }
    ],
    [
      addJSXAttribute,
      { elements: ["svg", "Svg"], attributes: toAddAttributes }
    ],
    removeJSXEmptyExpression
  ];
  if (opts.replaceAttrValues) {
    plugins.push([
      replaceJSXAttributeValue,
      { values: replaceMapToValues(opts.replaceAttrValues) }
    ]);
  }
  if (opts.titleProp) {
    plugins.push(svgDynamicTitle);
  }
  if (opts.descProp) {
    plugins.push([svgDynamicTitle, { tag: "desc" }, "desc"]);
  }
  if (opts.native) {
    plugins.push(transformReactNativeSVG);
  }
  return { plugins };
};

module.exports = plugin;
//# sourceMappingURL=index.js.map
