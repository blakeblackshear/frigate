import { Konva } from 'konva/lib/Global.js';
const propsToSkip = {
    children: true,
    ref: true,
    key: true,
    style: true,
    forwardedRef: true,
    unstable_applyCache: true,
    unstable_applyDrawHitFromCache: true,
};
let zIndexWarningShowed = false;
let dragWarningShowed = false;
export const EVENTS_NAMESPACE = '.react-konva-event';
let useStrictMode = false;
export function toggleStrictMode(value) {
    useStrictMode = value;
}
const DRAGGABLE_WARNING = `ReactKonva: You have a Konva node with draggable = true and position defined but no onDragMove or onDragEnd events are handled.
Position of a node will be changed during drag&drop, so you should update state of the react app as well.
Consider to add onDragMove or onDragEnd events.
For more info see: https://github.com/konvajs/react-konva/issues/256
`;
const Z_INDEX_WARNING = `ReactKonva: You are using "zIndex" attribute for a Konva node.
react-konva may get confused with ordering. Just define correct order of elements in your render function of a component.
For more info see: https://github.com/konvajs/react-konva/issues/194
`;
const EMPTY_PROPS = {};
export function applyNodeProps(instance, props, oldProps = EMPTY_PROPS) {
    // don't use zIndex in react-konva
    if (!zIndexWarningShowed && 'zIndex' in props) {
        console.warn(Z_INDEX_WARNING);
        zIndexWarningShowed = true;
    }
    // check correct draggable usage
    if (!dragWarningShowed && props.draggable) {
        var hasPosition = props.x !== undefined || props.y !== undefined;
        var hasEvents = props.onDragEnd || props.onDragMove;
        if (hasPosition && !hasEvents) {
            console.warn(DRAGGABLE_WARNING);
            dragWarningShowed = true;
        }
    }
    // check old props
    // we need to unset properties that are not in new props
    // and remove all events
    for (var key in oldProps) {
        if (propsToSkip[key]) {
            continue;
        }
        var isEvent = key.slice(0, 2) === 'on';
        var propChanged = oldProps[key] !== props[key];
        // if that is a changed event, we need to remove it
        if (isEvent && propChanged) {
            var eventName = key.substr(2).toLowerCase();
            if (eventName.substr(0, 7) === 'content') {
                eventName =
                    'content' +
                        eventName.substr(7, 1).toUpperCase() +
                        eventName.substr(8);
            }
            instance.off(eventName, oldProps[key]);
        }
        var toRemove = !props.hasOwnProperty(key);
        if (toRemove) {
            instance.setAttr(key, undefined);
        }
    }
    var strictUpdate = useStrictMode || props._useStrictMode;
    var updatedProps = {};
    var hasUpdates = false;
    const newEvents = {};
    for (var key in props) {
        if (propsToSkip[key]) {
            continue;
        }
        var isEvent = key.slice(0, 2) === 'on';
        var toAdd = oldProps[key] !== props[key];
        if (isEvent && toAdd) {
            var eventName = key.substr(2).toLowerCase();
            if (eventName.substr(0, 7) === 'content') {
                eventName =
                    'content' +
                        eventName.substr(7, 1).toUpperCase() +
                        eventName.substr(8);
            }
            // check that event is not undefined
            if (props[key]) {
                newEvents[eventName] = props[key];
            }
        }
        if (!isEvent &&
            (props[key] !== oldProps[key] ||
                (strictUpdate && props[key] !== instance.getAttr(key)))) {
            hasUpdates = true;
            updatedProps[key] = props[key];
        }
    }
    if (hasUpdates) {
        instance.setAttrs(updatedProps);
        updatePicture(instance);
    }
    // subscribe to events AFTER we set attrs
    // we need it to fix https://github.com/konvajs/react-konva/issues/471
    // settings attrs may add events. Like "draggable: true" will add "mousedown" listener
    for (var eventName in newEvents) {
        instance.on(eventName + EVENTS_NAMESPACE, newEvents[eventName]);
    }
}
export function updatePicture(node) {
    if (!Konva.autoDrawEnabled) {
        var drawingNode = node.getLayer() || node.getStage();
        drawingNode && drawingNode.batchDraw();
    }
}
