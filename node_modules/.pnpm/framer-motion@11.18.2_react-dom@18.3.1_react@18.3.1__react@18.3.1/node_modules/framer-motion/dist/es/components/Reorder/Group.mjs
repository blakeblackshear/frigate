"use client";
import { jsx } from 'react/jsx-runtime';
import { invariant } from 'motion-utils';
import { forwardRef, useRef, useEffect } from 'react';
import { ReorderContext } from '../../context/ReorderContext.mjs';
import { motion } from '../../render/components/motion/proxy.mjs';
import { useConstant } from '../../utils/use-constant.mjs';
import { checkReorder } from './utils/check-reorder.mjs';

function ReorderGroupComponent({ children, as = "ul", axis = "y", onReorder, values, ...props }, externalRef) {
    const Component = useConstant(() => motion[as]);
    const order = [];
    const isReordering = useRef(false);
    invariant(Boolean(values), "Reorder.Group must be provided a values prop");
    const context = {
        axis,
        registerItem: (value, layout) => {
            // If the entry was already added, update it rather than adding it again
            const idx = order.findIndex((entry) => value === entry.value);
            if (idx !== -1) {
                order[idx].layout = layout[axis];
            }
            else {
                order.push({ value: value, layout: layout[axis] });
            }
            order.sort(compareMin);
        },
        updateOrder: (item, offset, velocity) => {
            if (isReordering.current)
                return;
            const newOrder = checkReorder(order, item, offset, velocity);
            if (order !== newOrder) {
                isReordering.current = true;
                onReorder(newOrder
                    .map(getValue)
                    .filter((value) => values.indexOf(value) !== -1));
            }
        },
    };
    useEffect(() => {
        isReordering.current = false;
    });
    return (jsx(Component, { ...props, ref: externalRef, ignoreStrict: true, children: jsx(ReorderContext.Provider, { value: context, children: children }) }));
}
const ReorderGroup = /*@__PURE__*/ forwardRef(ReorderGroupComponent);
function getValue(item) {
    return item.value;
}
function compareMin(a, b) {
    return a.layout.min - b.layout.min;
}

export { ReorderGroup, ReorderGroupComponent };
