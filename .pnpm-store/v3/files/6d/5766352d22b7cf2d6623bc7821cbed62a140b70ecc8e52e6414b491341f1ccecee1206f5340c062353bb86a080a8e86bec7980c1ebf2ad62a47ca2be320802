"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = WidthProvideRGL;
var React = _interopRequireWildcard(require("react"));
var _propTypes = _interopRequireDefault(require("prop-types"));
var _resizeObserverPolyfill = _interopRequireDefault(require("resize-observer-polyfill"));
var _clsx = _interopRequireDefault(require("clsx"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/*:: import type { ReactRef } from "../ReactGridLayoutPropTypes";*/
/*:: type WPDefaultProps = {|
  measureBeforeMount: boolean
|};*/
/*:: type WPProps = {|
  className?: string,
  style?: Object,
  ...WPDefaultProps
|};*/
// eslint-disable-next-line no-unused-vars
/*:: type WPState = {|
  width: number
|};*/
/*:: type ComposedProps<Config> = {|
  ...Config,
  measureBeforeMount?: boolean,
  className?: string,
  style?: Object,
  width?: number
|};*/
const layoutClassName = "react-grid-layout";

/*
 * A simple HOC that provides facility for listening to container resizes.
 *
 * The Flow type is pretty janky here. I can't just spread `WPProps` into this returned object - I wish I could - but it triggers
 * a flow bug of some sort that causes it to stop typechecking.
 */
function WidthProvideRGL /*:: <Config>*/(ComposedComponent /*: React.AbstractComponent<Config>*/) /*: React.AbstractComponent<ComposedProps<Config>>*/{
  var _WidthProvider;
  return _WidthProvider = class WidthProvider extends React.Component
  /*:: <
      ComposedProps<Config>,
      WPState
    >*/
  {
    constructor() {
      super(...arguments);
      _defineProperty(this, "state", {
        width: 1280
      });
      _defineProperty(this, "elementRef", /*#__PURE__*/React.createRef());
      _defineProperty(this, "mounted", false);
      _defineProperty(this, "resizeObserver", void 0);
    }
    componentDidMount() {
      this.mounted = true;
      this.resizeObserver = new _resizeObserverPolyfill.default(entries => {
        const node = this.elementRef.current;
        if (node instanceof HTMLElement) {
          const width = entries[0].contentRect.width;
          this.setState({
            width
          });
        }
      });
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.observe(node);
      }
    }
    componentWillUnmount() {
      this.mounted = false;
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.unobserve(node);
      }
      this.resizeObserver.disconnect();
    }
    render() {
      const {
        measureBeforeMount,
        ...rest
      } = this.props;
      if (measureBeforeMount && !this.mounted) {
        return /*#__PURE__*/React.createElement("div", {
          className: (0, _clsx.default)(this.props.className, layoutClassName),
          style: this.props.style
          // $FlowIgnore ref types
          ,
          ref: this.elementRef
        });
      }
      return /*#__PURE__*/React.createElement(ComposedComponent, _extends({
        innerRef: this.elementRef
      }, rest, this.state));
    }
  }, _defineProperty(_WidthProvider, "defaultProps", {
    measureBeforeMount: false
  }), _defineProperty(_WidthProvider, "propTypes", {
    // If true, will not render children until mounted. Useful for getting the exact width before
    // rendering, to prevent any unsightly resizing.
    measureBeforeMount: _propTypes.default.bool
  }), _WidthProvider;
}