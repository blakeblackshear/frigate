"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findOrGenerateResponsiveLayout = findOrGenerateResponsiveLayout;
exports.getBreakpointFromWidth = getBreakpointFromWidth;
exports.getColsFromBreakpoint = getColsFromBreakpoint;
exports.sortBreakpoints = sortBreakpoints;
var _utils = require("./utils");
/*:: import type { CompactType, Layout } from "./utils";*/
/*:: export type Breakpoint = string;*/
/*:: export type DefaultBreakpoints = "lg" | "md" | "sm" | "xs" | "xxs";*/
/*:: export type ResponsiveLayout<T: Breakpoint> = {
  +[breakpoint: T]: Layout
};*/
// + indicates read-only
/*:: export type Breakpoints<T: Breakpoint> = {
  +[breakpoint: T]: number
};*/
/*:: export type OnLayoutChangeCallback = (
  Layout,
  { [key: Breakpoint]: Layout }
) => void;*/
/**
 * Given a width, find the highest breakpoint that matches is valid for it (width > breakpoint).
 *
 * @param  {Object} breakpoints Breakpoints object (e.g. {lg: 1200, md: 960, ...})
 * @param  {Number} width Screen width.
 * @return {String}       Highest breakpoint that is less than width.
 */
function getBreakpointFromWidth(breakpoints /*: Breakpoints<Breakpoint>*/, width /*: number*/) /*: Breakpoint*/{
  const sorted = sortBreakpoints(breakpoints);
  let matching = sorted[0];
  for (let i = 1, len = sorted.length; i < len; i++) {
    const breakpointName = sorted[i];
    if (width > breakpoints[breakpointName]) matching = breakpointName;
  }
  return matching;
}

/**
 * Given a breakpoint, get the # of cols set for it.
 * @param  {String} breakpoint Breakpoint name.
 * @param  {Object} cols       Map of breakpoints to cols.
 * @return {Number}            Number of cols.
 */
function getColsFromBreakpoint(breakpoint /*: Breakpoint*/, cols /*: Breakpoints<Breakpoint>*/) /*: number*/{
  if (!cols[breakpoint]) {
    throw new Error("ResponsiveReactGridLayout: `cols` entry for breakpoint " + breakpoint + " is missing!");
  }
  return cols[breakpoint];
}

/**
 * Given existing layouts and a new breakpoint, find or generate a new layout.
 *
 * This finds the layout above the new one and generates from it, if it exists.
 *
 * @param  {Object} layouts     Existing layouts.
 * @param  {Array} breakpoints All breakpoints.
 * @param  {String} breakpoint New breakpoint.
 * @param  {String} breakpoint Last breakpoint (for fallback).
 * @param  {Number} cols       Column count at new breakpoint.
 * @param  {Boolean} verticalCompact Whether or not to compact the layout
 *   vertically.
 * @return {Array}             New layout.
 */
function findOrGenerateResponsiveLayout(layouts /*: ResponsiveLayout<Breakpoint>*/, breakpoints /*: Breakpoints<Breakpoint>*/, breakpoint /*: Breakpoint*/, lastBreakpoint /*: Breakpoint*/, cols /*: number*/, compactType /*: CompactType*/) /*: Layout*/{
  // If it already exists, just return it.
  if (layouts[breakpoint]) return (0, _utils.cloneLayout)(layouts[breakpoint]);
  // Find or generate the next layout
  let layout = layouts[lastBreakpoint];
  const breakpointsSorted = sortBreakpoints(breakpoints);
  const breakpointsAbove = breakpointsSorted.slice(breakpointsSorted.indexOf(breakpoint));
  for (let i = 0, len = breakpointsAbove.length; i < len; i++) {
    const b = breakpointsAbove[i];
    if (layouts[b]) {
      layout = layouts[b];
      break;
    }
  }
  layout = (0, _utils.cloneLayout)(layout || []); // clone layout so we don't modify existing items
  return (0, _utils.compact)((0, _utils.correctBounds)(layout, {
    cols: cols
  }), compactType, cols);
}

/**
 * Given breakpoints, return an array of breakpoints sorted by width. This is usually
 * e.g. ['xxs', 'xs', 'sm', ...]
 *
 * @param  {Object} breakpoints Key/value pair of breakpoint names to widths.
 * @return {Array}              Sorted breakpoints.
 */
function sortBreakpoints(breakpoints /*: Breakpoints<Breakpoint>*/) /*: Array<Breakpoint>*/{
  const keys /*: Array<string>*/ = Object.keys(breakpoints);
  return keys.sort(function (a, b) {
    return breakpoints[a] - breakpoints[b];
  });
}