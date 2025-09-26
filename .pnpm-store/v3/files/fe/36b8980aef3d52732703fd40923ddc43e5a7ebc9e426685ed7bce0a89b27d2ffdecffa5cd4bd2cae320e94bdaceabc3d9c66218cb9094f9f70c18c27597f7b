"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TouchEvent2 = exports.SVGElement = void 0;
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
// eslint-disable-next-line no-use-before-define
/*:: export type DraggableEventHandler = (e: MouseEvent, data: DraggableData) => void | false;*/
/*:: export type DraggableData = {
  node: HTMLElement,
  x: number, y: number,
  deltaX: number, deltaY: number,
  lastX: number, lastY: number
};*/
/*:: export type Bounds = {
  left?: number, top?: number, right?: number, bottom?: number
};*/
/*:: export type ControlPosition = {x: number, y: number};*/
/*:: export type PositionOffsetControlPosition = {x: number|string, y: number|string};*/
/*:: export type EventHandler<T> = (e: T) => void | false;*/
// Missing in Flow
class SVGElement extends HTMLElement {}

// Missing targetTouches
exports.SVGElement = SVGElement;
class TouchEvent2 extends TouchEvent {
  constructor() {
    super(...arguments);
    _defineProperty(this, "changedTouches", void 0);
    _defineProperty(this, "targetTouches", void 0);
  }
}
/*:: export type MouseTouchEvent = MouseEvent & TouchEvent2;*/
exports.TouchEvent2 = TouchEvent2;