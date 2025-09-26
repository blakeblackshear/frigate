import { useRef as i, useCallback as P, useEffect as C } from "react";
var f = /* @__PURE__ */ ((e) => (e.Mouse = "mouse", e.Touch = "touch", e.Pointer = "pointer", e))(f || {}), l = /* @__PURE__ */ ((e) => (e.CancelledByMovement = "cancelled-by-movement", e.CancelledByRelease = "cancelled-by-release", e.CancelledOutsideElement = "cancelled-outside-element", e))(l || {});
const b = [
  "mousedown",
  "mousemove",
  "mouseup",
  "mouseleave",
  "mouseout"
], q = [
  "touchstart",
  "touchmove",
  "touchend",
  "touchcancel"
], z = [
  "pointerdown",
  "pointermove",
  "pointerup",
  "pointerleave",
  "pointerout"
];
function G(e) {
  return typeof e == "object" && e !== null && "pageX" in e && typeof e.pageX == "number" && "pageY" in e && typeof e.pageY == "number";
}
function J(e) {
  var u;
  return b.includes((u = e == null ? void 0 : e.nativeEvent) == null ? void 0 : u.type);
}
function U(e) {
  var u;
  return q.includes((u = e == null ? void 0 : e.nativeEvent) == null ? void 0 : u.type) || "touches" in e;
}
function K(e) {
  const { nativeEvent: u } = e;
  return u ? z.includes(u == null ? void 0 : u.type) || "pointerId" in u : !1;
}
function D(e) {
  return J(e) || U(e) || K(e);
}
function A(e) {
  var s;
  const u = U(e) ? (s = e == null ? void 0 : e.touches) == null ? void 0 : s[0] : e;
  return G(u) ? {
    x: u.pageX,
    y: u.pageY
  } : null;
}
function N(e) {
  return {
    target: e.target,
    currentTarget: e.currentTarget,
    nativeEvent: e,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    persist: () => {
    }
  };
}
function V(e, {
  threshold: u = 400,
  captureEvent: s = !1,
  detect: R = f.Pointer,
  cancelOnMovement: p = !1,
  cancelOutsideElement: T = !0,
  filterEvents: M,
  onStart: m,
  onMove: w,
  onFinish: g,
  onCancel: h
} = {}) {
  const L = i(!1), c = i(!1), H = i(), d = i(), B = i(e), a = i(null), y = P(
    (r) => (t) => {
      c.current || D(t) && (M !== void 0 && !M(t) || (s && t.persist(), m == null || m(t, { context: r }), a.current = A(t), c.current = !0, H.current = t.currentTarget, d.current = setTimeout(() => {
        B.current && (B.current(t, { context: r }), L.current = !0);
      }, u)));
    },
    [s, M, m, u]
  ), o = P(
    (r) => (t, n) => {
      D(t) && c.current && (a.current = null, s && t.persist(), L.current ? g == null || g(t, { context: r }) : c.current && (h == null || h(t, { context: r, reason: n ?? l.CancelledByRelease })), L.current = !1, c.current = !1, d.current !== void 0 && clearTimeout(d.current));
    },
    [s, g, h]
  ), E = P(
    (r) => (t) => {
      if (D(t) && (w == null || w(t, { context: r }), p !== !1 && a.current)) {
        const n = A(t);
        if (n) {
          const X = p === !0 ? 25 : p, Y = {
            x: Math.abs(n.x - a.current.x),
            y: Math.abs(n.y - a.current.y)
          };
          (Y.x > X || Y.y > X) && o(r)(t, l.CancelledByMovement);
        }
      }
    },
    [o, p, w]
  ), I = P(
    (r) => {
      if (e === null)
        return {};
      switch (R) {
        case f.Mouse: {
          const t = {
            onMouseDown: y(r),
            onMouseMove: E(r),
            onMouseUp: o(r)
          };
          return T && (t.onMouseLeave = (n) => {
            o(r)(n, l.CancelledOutsideElement);
          }), t;
        }
        case f.Touch:
          return {
            onTouchStart: y(r),
            onTouchMove: E(r),
            onTouchEnd: o(r)
          };
        case f.Pointer: {
          const t = {
            onPointerDown: y(r),
            onPointerMove: E(r),
            onPointerUp: o(r)
          };
          return T && (t.onPointerLeave = (n) => o(r)(n, l.CancelledOutsideElement)), t;
        }
      }
    },
    [e, o, T, R, E, y]
  );
  return C(() => {
    function r(t) {
      const n = N(t);
      o()(n);
    }
    return window.addEventListener("mouseup", r), window.addEventListener("touchend", r), window.addEventListener("pointerup", r), () => {
      window.removeEventListener("mouseup", r), window.removeEventListener("touchend", r), window.removeEventListener("pointerup", r);
    };
  }, [o]), C(
    () => () => {
      d.current !== void 0 && clearTimeout(d.current);
    },
    []
  ), C(() => {
    B.current = e;
  }, [e]), I;
}
export {
  l as LongPressCallbackReason,
  f as LongPressEventType,
  V as useLongPress
};
