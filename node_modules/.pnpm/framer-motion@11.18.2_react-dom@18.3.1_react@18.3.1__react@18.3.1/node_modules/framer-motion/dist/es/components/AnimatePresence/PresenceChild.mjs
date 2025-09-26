"use client";
import { jsx } from 'react/jsx-runtime';
import * as React from 'react';
import { useId, useCallback, useMemo } from 'react';
import { PresenceContext } from '../../context/PresenceContext.mjs';
import { useConstant } from '../../utils/use-constant.mjs';
import { PopChild } from './PopChild.mjs';

const PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode, }) => {
    const presenceChildren = useConstant(newChildrenMap);
    const id = useId();
    const memoizedOnExitComplete = useCallback((childId) => {
        presenceChildren.set(childId, true);
        for (const isComplete of presenceChildren.values()) {
            if (!isComplete)
                return; // can stop searching when any is incomplete
        }
        onExitComplete && onExitComplete();
    }, [presenceChildren, onExitComplete]);
    const context = useMemo(() => ({
        id,
        initial,
        isPresent,
        custom,
        onExitComplete: memoizedOnExitComplete,
        register: (childId) => {
            presenceChildren.set(childId, false);
            return () => presenceChildren.delete(childId);
        },
    }), 
    /**
     * If the presence of a child affects the layout of the components around it,
     * we want to make a new context value to ensure they get re-rendered
     * so they can detect that layout change.
     */
    presenceAffectsLayout
        ? [Math.random(), memoizedOnExitComplete]
        : [isPresent, memoizedOnExitComplete]);
    useMemo(() => {
        presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
    }, [isPresent]);
    /**
     * If there's no `motion` components to fire exit animations, we want to remove this
     * component immediately.
     */
    React.useEffect(() => {
        !isPresent &&
            !presenceChildren.size &&
            onExitComplete &&
            onExitComplete();
    }, [isPresent]);
    if (mode === "popLayout") {
        children = jsx(PopChild, { isPresent: isPresent, children: children });
    }
    return (jsx(PresenceContext.Provider, { value: context, children: children }));
};
function newChildrenMap() {
    return new Map();
}

export { PresenceChild };
