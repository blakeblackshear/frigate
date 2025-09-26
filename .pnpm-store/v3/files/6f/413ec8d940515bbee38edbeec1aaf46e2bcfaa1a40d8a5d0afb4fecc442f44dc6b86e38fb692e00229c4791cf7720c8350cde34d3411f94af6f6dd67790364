"use client";
import { jsx } from 'react/jsx-runtime';
import { invariant } from 'motion-utils';
import { forwardRef, useContext } from 'react';
import { ReorderContext } from '../../context/ReorderContext.mjs';
import { motion } from '../../render/components/motion/proxy.mjs';
import { useConstant } from '../../utils/use-constant.mjs';
import { useMotionValue } from '../../value/use-motion-value.mjs';
import { useTransform } from '../../value/use-transform.mjs';
import { isMotionValue } from '../../value/utils/is-motion-value.mjs';

function useDefaultMotionValue(value, defaultValue = 0) {
    return isMotionValue(value) ? value : useMotionValue(defaultValue);
}
function ReorderItemComponent({ children, style = {}, value, as = "li", onDrag, layout = true, ...props }, externalRef) {
    const Component = useConstant(() => motion[as]);
    const context = useContext(ReorderContext);
    const point = {
        x: useDefaultMotionValue(style.x),
        y: useDefaultMotionValue(style.y),
    };
    const zIndex = useTransform([point.x, point.y], ([latestX, latestY]) => latestX || latestY ? 1 : "unset");
    invariant(Boolean(context), "Reorder.Item must be a child of Reorder.Group");
    const { axis, registerItem, updateOrder } = context;
    return (jsx(Component, { drag: axis, ...props, dragSnapToOrigin: true, style: { ...style, x: point.x, y: point.y, zIndex }, layout: layout, onDrag: (event, gesturePoint) => {
            const { velocity } = gesturePoint;
            velocity[axis] &&
                updateOrder(value, point[axis].get(), velocity[axis]);
            onDrag && onDrag(event, gesturePoint);
        }, onLayoutMeasure: (measured) => registerItem(value, measured), ref: externalRef, ignoreStrict: true, children: children }));
}
const ReorderItem = /*@__PURE__*/ forwardRef(ReorderItemComponent);

export { ReorderItem, ReorderItemComponent };
