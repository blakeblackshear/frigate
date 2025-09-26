"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentEventPriority = exports.supportsMutation = exports.warnsIfNotActing = exports.isPrimaryRenderer = exports.noTimeout = exports.cancelTimeout = exports.scheduleTimeout = exports.run = exports.idlePriority = exports.now = void 0;
exports.appendInitialChild = appendInitialChild;
exports.createInstance = createInstance;
exports.createTextInstance = createTextInstance;
exports.finalizeInitialChildren = finalizeInitialChildren;
exports.getPublicInstance = getPublicInstance;
exports.prepareForCommit = prepareForCommit;
exports.preparePortalMount = preparePortalMount;
exports.prepareUpdate = prepareUpdate;
exports.resetAfterCommit = resetAfterCommit;
exports.resetTextContent = resetTextContent;
exports.shouldDeprioritizeSubtree = shouldDeprioritizeSubtree;
exports.getRootHostContext = getRootHostContext;
exports.getChildHostContext = getChildHostContext;
exports.shouldSetTextContent = shouldSetTextContent;
exports.appendChild = appendChild;
exports.appendChildToContainer = appendChildToContainer;
exports.insertBefore = insertBefore;
exports.insertInContainerBefore = insertInContainerBefore;
exports.removeChild = removeChild;
exports.removeChildFromContainer = removeChildFromContainer;
exports.commitTextUpdate = commitTextUpdate;
exports.commitMount = commitMount;
exports.commitUpdate = commitUpdate;
exports.hideInstance = hideInstance;
exports.hideTextInstance = hideTextInstance;
exports.unhideInstance = unhideInstance;
exports.unhideTextInstance = unhideTextInstance;
exports.clearContainer = clearContainer;
exports.detachDeletedInstance = detachDeletedInstance;
const Core_js_1 = __importDefault(require("konva/lib/Core.js"));
const makeUpdates_js_1 = require("./makeUpdates.js");
var scheduler_1 = require("scheduler");
Object.defineProperty(exports, "now", { enumerable: true, get: function () { return scheduler_1.unstable_now; } });
Object.defineProperty(exports, "idlePriority", { enumerable: true, get: function () { return scheduler_1.unstable_IdlePriority; } });
Object.defineProperty(exports, "run", { enumerable: true, get: function () { return scheduler_1.unstable_runWithPriority; } });
const constants_js_1 = require("react-reconciler/constants.js");
const NO_CONTEXT = {};
const UPDATE_SIGNAL = {};
// for react-spring capability
Core_js_1.default.Node.prototype._applyProps = makeUpdates_js_1.applyNodeProps;
function appendInitialChild(parentInstance, child) {
    if (typeof child === 'string') {
        // Noop for string children of Text (eg <Text>foo</Text>)
        console.error(`Do not use plain text as child of Konva.Node. You are using text: ${child}`);
        return;
    }
    parentInstance.add(child);
    (0, makeUpdates_js_1.updatePicture)(parentInstance);
}
function createInstance(type, props, internalInstanceHandle) {
    let NodeClass = Core_js_1.default[type];
    if (!NodeClass) {
        console.error(`Konva has no node with the type ${type}. Group will be used instead. If you use minimal version of react-konva, just import required nodes into Konva: "import "konva/lib/shapes/${type}"  If you want to render DOM elements as part of canvas tree take a look into this demo: https://konvajs.github.io/docs/react/DOM_Portal.html`);
        NodeClass = Core_js_1.default.Group;
    }
    // we need to split props into events and non events
    // we we can pass non events into constructor directly
    // that way the performance should be better
    // we we apply change "applyNodeProps"
    // then it will trigger change events on first run
    // but we don't need them!
    const propsWithoutEvents = {};
    const propsWithOnlyEvents = {};
    for (var key in props) {
        var isEvent = key.slice(0, 2) === 'on';
        if (isEvent) {
            propsWithOnlyEvents[key] = props[key];
        }
        else {
            propsWithoutEvents[key] = props[key];
        }
    }
    const instance = new NodeClass(propsWithoutEvents);
    (0, makeUpdates_js_1.applyNodeProps)(instance, propsWithOnlyEvents);
    return instance;
}
function createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    console.error(`Text components are not supported for now in ReactKonva. Your text is: "${text}"`);
}
function finalizeInitialChildren(domElement, type, props) {
    return false;
}
function getPublicInstance(instance) {
    return instance;
}
function prepareForCommit() {
    return null;
}
function preparePortalMount() {
    return null;
}
function prepareUpdate(domElement, type, oldProps, newProps) {
    return UPDATE_SIGNAL;
}
function resetAfterCommit() {
    // Noop
}
function resetTextContent(domElement) {
    // Noop
}
function shouldDeprioritizeSubtree(type, props) {
    return false;
}
function getRootHostContext() {
    return NO_CONTEXT;
}
function getChildHostContext() {
    return NO_CONTEXT;
}
exports.scheduleTimeout = setTimeout;
exports.cancelTimeout = clearTimeout;
exports.noTimeout = -1;
// export const schedulePassiveEffects = scheduleDeferredCallback;
// export const cancelPassiveEffects = cancelDeferredCallback;
function shouldSetTextContent(type, props) {
    return false;
}
// The Konva renderer is secondary to the React DOM renderer.
exports.isPrimaryRenderer = false;
exports.warnsIfNotActing = true;
exports.supportsMutation = true;
function appendChild(parentInstance, child) {
    if (child.parent === parentInstance) {
        child.moveToTop();
    }
    else {
        parentInstance.add(child);
    }
    (0, makeUpdates_js_1.updatePicture)(parentInstance);
}
function appendChildToContainer(parentInstance, child) {
    if (child.parent === parentInstance) {
        child.moveToTop();
    }
    else {
        parentInstance.add(child);
    }
    (0, makeUpdates_js_1.updatePicture)(parentInstance);
}
function insertBefore(parentInstance, child, beforeChild) {
    // child._remove() will not stop dragging
    // but child.remove() will stop it, but we don't need it
    // removing will reset zIndexes
    child._remove();
    parentInstance.add(child);
    child.setZIndex(beforeChild.getZIndex());
    (0, makeUpdates_js_1.updatePicture)(parentInstance);
}
function insertInContainerBefore(parentInstance, child, beforeChild) {
    insertBefore(parentInstance, child, beforeChild);
}
function removeChild(parentInstance, child) {
    child.destroy();
    child.off(makeUpdates_js_1.EVENTS_NAMESPACE);
    (0, makeUpdates_js_1.updatePicture)(parentInstance);
}
function removeChildFromContainer(parentInstance, child) {
    child.destroy();
    child.off(makeUpdates_js_1.EVENTS_NAMESPACE);
    (0, makeUpdates_js_1.updatePicture)(parentInstance);
}
function commitTextUpdate(textInstance, oldText, newText) {
    console.error(`Text components are not yet supported in ReactKonva. You text is: "${newText}"`);
}
function commitMount(instance, type, newProps) {
    // Noop
}
function commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    (0, makeUpdates_js_1.applyNodeProps)(instance, newProps, oldProps);
}
function hideInstance(instance) {
    instance.hide();
    (0, makeUpdates_js_1.updatePicture)(instance);
}
function hideTextInstance(textInstance) {
    // Noop
}
function unhideInstance(instance, props) {
    if (props.visible == null || props.visible) {
        instance.show();
    }
}
function unhideTextInstance(textInstance, text) {
    // Noop
}
function clearContainer(container) {
    // Noop
}
function detachDeletedInstance() { }
const getCurrentEventPriority = () => constants_js_1.DefaultEventPriority;
exports.getCurrentEventPriority = getCurrentEventPriority;
