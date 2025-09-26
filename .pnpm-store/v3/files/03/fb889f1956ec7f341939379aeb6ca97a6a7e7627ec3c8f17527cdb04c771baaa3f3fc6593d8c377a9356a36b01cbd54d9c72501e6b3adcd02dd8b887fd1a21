"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.calcGridColWidth = calcGridColWidth;
exports.calcGridItemPosition = calcGridItemPosition;
exports.calcGridItemWHPx = calcGridItemWHPx;
exports.calcWH = calcWH;
exports.calcXY = calcXY;
exports.clamp = clamp;
/*:: import type { Position } from "./utils";*/
/*:: export type PositionParams = {
  margin: [number, number],
  containerPadding: [number, number],
  containerWidth: number,
  cols: number,
  rowHeight: number,
  maxRows: number
};*/
// Helper for generating column width
function calcGridColWidth(positionParams /*: PositionParams*/) /*: number*/{
  const {
    margin,
    containerPadding,
    containerWidth,
    cols
  } = positionParams;
  return (containerWidth - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols;
}

// This can either be called:
// calcGridItemWHPx(w, colWidth, margin[0])
// or
// calcGridItemWHPx(h, rowHeight, margin[1])
function calcGridItemWHPx(gridUnits /*: number*/, colOrRowSize /*: number*/, marginPx /*: number*/) /*: number*/{
  // 0 * Infinity === NaN, which causes problems with resize contraints
  if (!Number.isFinite(gridUnits)) return gridUnits;
  return Math.round(colOrRowSize * gridUnits + Math.max(0, gridUnits - 1) * marginPx);
}

/**
 * Return position on the page given an x, y, w, h.
 * left, top, width, height are all in pixels.
 * @param  {PositionParams} positionParams  Parameters of grid needed for coordinates calculations.
 * @param  {Number}  x                      X coordinate in grid units.
 * @param  {Number}  y                      Y coordinate in grid units.
 * @param  {Number}  w                      W coordinate in grid units.
 * @param  {Number}  h                      H coordinate in grid units.
 * @return {Position}                       Object containing coords.
 */
function calcGridItemPosition(positionParams /*: PositionParams*/, x /*: number*/, y /*: number*/, w /*: number*/, h /*: number*/, state /*: ?Object*/) /*: Position*/{
  const {
    margin,
    containerPadding,
    rowHeight
  } = positionParams;
  const colWidth = calcGridColWidth(positionParams);
  const out = {};

  // If resizing, use the exact width and height as returned from resizing callbacks.
  if (state && state.resizing) {
    out.width = Math.round(state.resizing.width);
    out.height = Math.round(state.resizing.height);
  }
  // Otherwise, calculate from grid units.
  else {
    out.width = calcGridItemWHPx(w, colWidth, margin[0]);
    out.height = calcGridItemWHPx(h, rowHeight, margin[1]);
  }

  // If dragging, use the exact width and height as returned from dragging callbacks.
  if (state && state.dragging) {
    out.top = Math.round(state.dragging.top);
    out.left = Math.round(state.dragging.left);
  } else if (state && state.resizing && typeof state.resizing.top === "number" && typeof state.resizing.left === "number") {
    out.top = Math.round(state.resizing.top);
    out.left = Math.round(state.resizing.left);
  }
  // Otherwise, calculate from grid units.
  else {
    out.top = Math.round((rowHeight + margin[1]) * y + containerPadding[1]);
    out.left = Math.round((colWidth + margin[0]) * x + containerPadding[0]);
  }
  return out;
}

/**
 * Translate x and y coordinates from pixels to grid units.
 * @param  {PositionParams} positionParams  Parameters of grid needed for coordinates calculations.
 * @param  {Number} top                     Top position (relative to parent) in pixels.
 * @param  {Number} left                    Left position (relative to parent) in pixels.
 * @param  {Number} w                       W coordinate in grid units.
 * @param  {Number} h                       H coordinate in grid units.
 * @return {Object}                         x and y in grid units.
 */
function calcXY(positionParams /*: PositionParams*/, top /*: number*/, left /*: number*/, w /*: number*/, h /*: number*/) /*: { x: number, y: number }*/{
  const {
    margin,
    containerPadding,
    cols,
    rowHeight,
    maxRows
  } = positionParams;
  const colWidth = calcGridColWidth(positionParams);

  // left = containerPaddingX + x * (colWidth + marginX)
  // x * (colWidth + marginX) = left - containerPaddingX
  // x = (left - containerPaddingX) / (colWidth + marginX)
  let x = Math.round((left - containerPadding[0]) / (colWidth + margin[0]));
  let y = Math.round((top - containerPadding[1]) / (rowHeight + margin[1]));

  // Capping
  x = clamp(x, 0, cols - w);
  y = clamp(y, 0, maxRows - h);
  return {
    x,
    y
  };
}

/**
 * Given a height and width in pixel values, calculate grid units.
 * @param  {PositionParams} positionParams  Parameters of grid needed for coordinates calcluations.
 * @param  {Number} height                  Height in pixels.
 * @param  {Number} width                   Width in pixels.
 * @param  {Number} x                       X coordinate in grid units.
 * @param  {Number} y                       Y coordinate in grid units.
 * @param {String} handle Resize Handle.
 * @return {Object}                         w, h as grid units.
 */
function calcWH(positionParams /*: PositionParams*/, width /*: number*/, height /*: number*/, x /*: number*/, y /*: number*/, handle /*: string*/) /*: { w: number, h: number }*/{
  const {
    margin,
    maxRows,
    cols,
    rowHeight
  } = positionParams;
  const colWidth = calcGridColWidth(positionParams);

  // width = colWidth * w - (margin * (w - 1))
  // ...
  // w = (width + margin) / (colWidth + margin)
  let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
  let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

  // Capping
  let _w = clamp(w, 0, cols - x);
  let _h = clamp(h, 0, maxRows - y);
  if (["sw", "w", "nw"].indexOf(handle) !== -1) {
    _w = clamp(w, 0, cols);
  }
  if (["nw", "n", "ne"].indexOf(handle) !== -1) {
    _h = clamp(h, 0, maxRows);
  }
  return {
    w: _w,
    h: _h
  };
}

// Similar to _.clamp
function clamp(num /*: number*/, lowerBound /*: number*/, upperBound /*: number*/) /*: number*/{
  return Math.max(Math.min(num, upperBound), lowerBound);
}