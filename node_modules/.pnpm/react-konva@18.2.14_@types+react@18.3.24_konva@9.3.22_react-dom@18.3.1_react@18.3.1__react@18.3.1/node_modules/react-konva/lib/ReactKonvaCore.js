/**
 * Based on ReactArt.js
 * Copyright (c) 2017-present Lavrenov Anton.
 * All rights reserved.
 *
 * MIT
 */
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useContextBridge = exports.useStrictMode = exports.Stage = exports.KonvaRenderer = exports.version = exports.Transformer = exports.Shape = exports.Arrow = exports.RegularPolygon = exports.Path = exports.Tag = exports.Arc = exports.Ring = exports.Star = exports.TextPath = exports.Text = exports.Image = exports.Sprite = exports.Line = exports.Wedge = exports.Ellipse = exports.Circle = exports.Rect = exports.Label = exports.Group = exports.FastLayer = exports.Layer = void 0;
const react_1 = __importDefault(require("react"));
const Core_js_1 = __importDefault(require("konva/lib/Core.js"));
const react_reconciler_1 = __importDefault(require("react-reconciler"));
const constants_js_1 = require("react-reconciler/constants.js");
const HostConfig = __importStar(require("./ReactKonvaHostConfig.js"));
const makeUpdates_js_1 = require("./makeUpdates.js");
const its_fine_1 = require("its-fine");
Object.defineProperty(exports, "useContextBridge", { enumerable: true, get: function () { return its_fine_1.useContextBridge; } });
function usePrevious(value) {
    const ref = react_1.default.useRef({});
    react_1.default.useLayoutEffect(() => {
        ref.current = value;
    });
    react_1.default.useLayoutEffect(() => {
        return () => {
            // when using suspense it is possible that stage is unmounted
            // but React still keep component ref
            // in that case we need to manually flush props
            // we have a special test for that
            ref.current = {};
        };
    }, []);
    return ref.current;
}
const StageWrap = (props) => {
    const container = react_1.default.useRef(null);
    const stage = react_1.default.useRef(null);
    const fiberRef = react_1.default.useRef(null);
    const oldProps = usePrevious(props);
    const Bridge = (0, its_fine_1.useContextBridge)();
    const _setRef = (stage) => {
        const { forwardedRef } = props;
        if (!forwardedRef) {
            return;
        }
        if (typeof forwardedRef === 'function') {
            forwardedRef(stage);
        }
        else {
            forwardedRef.current = stage;
        }
    };
    react_1.default.useLayoutEffect(() => {
        stage.current = new Core_js_1.default.Stage({
            width: props.width,
            height: props.height,
            container: container.current,
        });
        _setRef(stage.current);
        // @ts-ignore
        fiberRef.current = exports.KonvaRenderer.createContainer(stage.current, constants_js_1.LegacyRoot, false, null);
        exports.KonvaRenderer.updateContainer(react_1.default.createElement(Bridge, {}, props.children), fiberRef.current);
        return () => {
            if (!Core_js_1.default.isBrowser) {
                return;
            }
            _setRef(null);
            exports.KonvaRenderer.updateContainer(null, fiberRef.current, null);
            stage.current.destroy();
        };
    }, []);
    react_1.default.useLayoutEffect(() => {
        _setRef(stage.current);
        (0, makeUpdates_js_1.applyNodeProps)(stage.current, props, oldProps);
        exports.KonvaRenderer.updateContainer(react_1.default.createElement(Bridge, {}, props.children), fiberRef.current, null);
    });
    return react_1.default.createElement('div', {
        ref: container,
        id: props.id,
        accessKey: props.accessKey,
        className: props.className,
        role: props.role,
        style: props.style,
        tabIndex: props.tabIndex,
        title: props.title,
    });
};
exports.Layer = 'Layer';
exports.FastLayer = 'FastLayer';
exports.Group = 'Group';
exports.Label = 'Label';
exports.Rect = 'Rect';
exports.Circle = 'Circle';
exports.Ellipse = 'Ellipse';
exports.Wedge = 'Wedge';
exports.Line = 'Line';
exports.Sprite = 'Sprite';
exports.Image = 'Image';
exports.Text = 'Text';
exports.TextPath = 'TextPath';
exports.Star = 'Star';
exports.Ring = 'Ring';
exports.Arc = 'Arc';
exports.Tag = 'Tag';
exports.Path = 'Path';
exports.RegularPolygon = 'RegularPolygon';
exports.Arrow = 'Arrow';
exports.Shape = 'Shape';
exports.Transformer = 'Transformer';
exports.version = '18.2.13';
// @ts-ignore
exports.KonvaRenderer = (0, react_reconciler_1.default)(HostConfig);
exports.KonvaRenderer.injectIntoDevTools({
    // @ts-ignore
    findHostInstanceByFiber: () => null,
    bundleType: process.env.NODE_ENV !== 'production' ? 1 : 0,
    version: react_1.default.version,
    rendererPackageName: 'react-konva',
});
exports.Stage = react_1.default.forwardRef((props, ref) => {
    return react_1.default.createElement(its_fine_1.FiberProvider, {}, react_1.default.createElement(StageWrap, { ...props, forwardedRef: ref }));
});
exports.useStrictMode = makeUpdates_js_1.toggleStrictMode;
