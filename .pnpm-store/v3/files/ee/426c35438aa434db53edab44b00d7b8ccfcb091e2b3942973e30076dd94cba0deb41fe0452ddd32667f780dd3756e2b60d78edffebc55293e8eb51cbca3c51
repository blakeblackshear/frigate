import { Feature } from '../motion/features/Feature.mjs';
import { press } from 'motion-dom';
import { extractEventInfo } from '../events/event-info.mjs';
import { frame } from '../frameloop/frame.mjs';

function handlePressEvent(node, event, lifecycle) {
    const { props } = node;
    if (node.animationState && props.whileTap) {
        node.animationState.setActive("whileTap", lifecycle === "Start");
    }
    const eventName = ("onTap" + (lifecycle === "End" ? "" : lifecycle));
    const callback = props[eventName];
    if (callback) {
        frame.postRender(() => callback(event, extractEventInfo(event)));
    }
}
class PressGesture extends Feature {
    mount() {
        const { current } = this.node;
        if (!current)
            return;
        this.unmount = press(current, (startEvent) => {
            handlePressEvent(this.node, startEvent, "Start");
            return (endEvent, { success }) => handlePressEvent(this.node, endEvent, success ? "End" : "Cancel");
        }, { useGlobalTarget: this.node.props.globalTapTarget });
    }
    unmount() { }
}

export { PressGesture };
