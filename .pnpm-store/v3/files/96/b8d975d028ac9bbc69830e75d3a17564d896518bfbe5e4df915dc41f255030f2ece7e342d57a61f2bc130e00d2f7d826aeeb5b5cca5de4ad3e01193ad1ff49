import Konva from 'konva/lib/Core.js';
import { applyNodeProps, updatePicture, EVENTS_NAMESPACE } from './makeUpdates.js';
export { unstable_now as now, unstable_IdlePriority as idlePriority, unstable_runWithPriority as run, } from 'scheduler';
import { DefaultEventPriority } from 'react-reconciler/constants.js';
const NO_CONTEXT = {};
const UPDATE_SIGNAL = {};
// for react-spring capability
Konva.Node.prototype._applyProps = applyNodeProps;
export function appendInitialChild(parentInstance, child) {
    if (typeof child === 'string') {
        // Noop for string children of Text (eg <Text>foo</Text>)
        console.error(`Do not use plain text as child of Konva.Node. You are using text: ${child}`);
        return;
    }
    parentInstance.add(child);
    updatePicture(parentInstance);
}
export function createInstance(type, props, internalInstanceHandle) {
    let NodeClass = Konva[type];
    if (!NodeClass) {
        console.error(`Konva has no node with the type ${type}. Group will be used instead. If you use minimal version of react-konva, just import required nodes into Konva: "import "konva/lib/shapes/${type}"  If you want to render DOM elements as part of canvas tree take a look into this demo: https://konvajs.github.io/docs/react/DOM_Portal.html`);
        NodeClass = Konva.Group;
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
    applyNodeProps(instance, propsWithOnlyEvents);
    return instance;
}
export function createTextInstance(text, rootContainerInstance, internalInstanceHandle) {
    console.error(`Text components are not supported for now in ReactKonva. Your text is: "${text}"`);
}
export function finalizeInitialChildren(domElement, type, props) {
    return false;
}
export function getPublicInstance(instance) {
    return instance;
}
export function prepareForCommit() {
    return null;
}
export function preparePortalMount() {
    return null;
}
export function prepareUpdate(domElement, type, oldProps, newProps) {
    return UPDATE_SIGNAL;
}
export function resetAfterCommit() {
    // Noop
}
export function resetTextContent(domElement) {
    // Noop
}
export function shouldDeprioritizeSubtree(type, props) {
    return false;
}
export function getRootHostContext() {
    return NO_CONTEXT;
}
export function getChildHostContext() {
    return NO_CONTEXT;
}
export const scheduleTimeout = setTimeout;
export const cancelTimeout = clearTimeout;
export const noTimeout = -1;
// export const schedulePassiveEffects = scheduleDeferredCallback;
// export const cancelPassiveEffects = cancelDeferredCallback;
export function shouldSetTextContent(type, props) {
    return false;
}
// The Konva renderer is secondary to the React DOM renderer.
export const isPrimaryRenderer = false;
export const warnsIfNotActing = true;
export const supportsMutation = true;
export function appendChild(parentInstance, child) {
    if (child.parent === parentInstance) {
        child.moveToTop();
    }
    else {
        parentInstance.add(child);
    }
    updatePicture(parentInstance);
}
export function appendChildToContainer(parentInstance, child) {
    if (child.parent === parentInstance) {
        child.moveToTop();
    }
    else {
        parentInstance.add(child);
    }
    updatePicture(parentInstance);
}
export function insertBefore(parentInstance, child, beforeChild) {
    // child._remove() will not stop dragging
    // but child.remove() will stop it, but we don't need it
    // removing will reset zIndexes
    child._remove();
    parentInstance.add(child);
    child.setZIndex(beforeChild.getZIndex());
    updatePicture(parentInstance);
}
export function insertInContainerBefore(parentInstance, child, beforeChild) {
    insertBefore(parentInstance, child, beforeChild);
}
export function removeChild(parentInstance, child) {
    child.destroy();
    child.off(EVENTS_NAMESPACE);
    updatePicture(parentInstance);
}
export function removeChildFromContainer(parentInstance, child) {
    child.destroy();
    child.off(EVENTS_NAMESPACE);
    updatePicture(parentInstance);
}
export function commitTextUpdate(textInstance, oldText, newText) {
    console.error(`Text components are not yet supported in ReactKonva. You text is: "${newText}"`);
}
export function commitMount(instance, type, newProps) {
    // Noop
}
export function commitUpdate(instance, updatePayload, type, oldProps, newProps) {
    applyNodeProps(instance, newProps, oldProps);
}
export function hideInstance(instance) {
    instance.hide();
    updatePicture(instance);
}
export function hideTextInstance(textInstance) {
    // Noop
}
export function unhideInstance(instance, props) {
    if (props.visible == null || props.visible) {
        instance.show();
    }
}
export function unhideTextInstance(textInstance, text) {
    // Noop
}
export function clearContainer(container) {
    // Noop
}
export function detachDeletedInstance() { }
export const getCurrentEventPriority = () => DefaultEventPriority;
