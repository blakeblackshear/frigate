import * as React from "react";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var _a, _b;
const useIsomorphicLayoutEffect = typeof window !== "undefined" && (((_a = window.document) == null ? void 0 : _a.createElement) || ((_b = window.navigator) == null ? void 0 : _b.product) === "ReactNative") ? React.useLayoutEffect : React.useEffect;
function traverseFiber(fiber, ascending, selector) {
  if (!fiber)
    return;
  if (selector(fiber) === true)
    return fiber;
  let child = ascending ? fiber.return : fiber.child;
  while (child) {
    const match = traverseFiber(child, ascending, selector);
    if (match)
      return match;
    child = ascending ? null : child.sibling;
  }
}
function wrapContext(context) {
  try {
    return Object.defineProperties(context, {
      _currentRenderer: {
        get() {
          return null;
        },
        set() {
        }
      },
      _currentRenderer2: {
        get() {
          return null;
        },
        set() {
        }
      }
    });
  } catch (_) {
    return context;
  }
}
const error = console.error;
console.error = function() {
  const message = [...arguments].join("");
  if ((message == null ? void 0 : message.startsWith("Warning:")) && message.includes("useContext")) {
    console.error = error;
    return;
  }
  return error.apply(this, arguments);
};
const FiberContext = wrapContext(React.createContext(null));
class FiberProvider extends React.Component {
  render() {
    return /* @__PURE__ */ React.createElement(FiberContext.Provider, {
      value: this._reactInternals
    }, this.props.children);
  }
}
function useFiber() {
  const root = React.useContext(FiberContext);
  if (root === null)
    throw new Error("its-fine: useFiber must be called within a <FiberProvider />!");
  const id = React.useId();
  const fiber = React.useMemo(() => {
    for (const maybeFiber of [root, root == null ? void 0 : root.alternate]) {
      if (!maybeFiber)
        continue;
      const fiber2 = traverseFiber(maybeFiber, false, (node) => {
        let state = node.memoizedState;
        while (state) {
          if (state.memoizedState === id)
            return true;
          state = state.next;
        }
      });
      if (fiber2)
        return fiber2;
    }
  }, [root, id]);
  return fiber;
}
function useContainer() {
  const fiber = useFiber();
  const root = React.useMemo(
    () => traverseFiber(fiber, true, (node) => {
      var _a2;
      return ((_a2 = node.stateNode) == null ? void 0 : _a2.containerInfo) != null;
    }),
    [fiber]
  );
  return root == null ? void 0 : root.stateNode.containerInfo;
}
function useNearestChild(type) {
  const fiber = useFiber();
  const childRef = React.useRef();
  useIsomorphicLayoutEffect(() => {
    var _a2;
    childRef.current = (_a2 = traverseFiber(
      fiber,
      false,
      (node) => typeof node.type === "string" && (type === void 0 || node.type === type)
    )) == null ? void 0 : _a2.stateNode;
  }, [fiber]);
  return childRef;
}
function useNearestParent(type) {
  const fiber = useFiber();
  const parentRef = React.useRef();
  useIsomorphicLayoutEffect(() => {
    var _a2;
    parentRef.current = (_a2 = traverseFiber(
      fiber,
      true,
      (node) => typeof node.type === "string" && (type === void 0 || node.type === type)
    )) == null ? void 0 : _a2.stateNode;
  }, [fiber]);
  return parentRef;
}
function useContextMap() {
  const fiber = useFiber();
  const [contextMap] = React.useState(() => /* @__PURE__ */ new Map());
  contextMap.clear();
  let node = fiber;
  while (node) {
    if (node.type && typeof node.type === "object") {
      const enableRenderableContext = node.type._context === void 0 && node.type.Provider === node.type;
      const context = enableRenderableContext ? node.type : node.type._context;
      if (context && context !== FiberContext && !contextMap.has(context)) {
        contextMap.set(context, React.useContext(wrapContext(context)));
      }
    }
    node = node.return;
  }
  return contextMap;
}
function useContextBridge() {
  const contextMap = useContextMap();
  return React.useMemo(
    () => Array.from(contextMap.keys()).reduce(
      (Prev, context) => (props) => /* @__PURE__ */ React.createElement(Prev, null, /* @__PURE__ */ React.createElement(context.Provider, __spreadProps(__spreadValues({}, props), {
        value: contextMap.get(context)
      }))),
      (props) => /* @__PURE__ */ React.createElement(FiberProvider, __spreadValues({}, props))
    ),
    [contextMap]
  );
}
export {
  FiberProvider,
  traverseFiber,
  useContainer,
  useContextBridge,
  useContextMap,
  useFiber,
  useNearestChild,
  useNearestParent
};
//# sourceMappingURL=index.js.map
