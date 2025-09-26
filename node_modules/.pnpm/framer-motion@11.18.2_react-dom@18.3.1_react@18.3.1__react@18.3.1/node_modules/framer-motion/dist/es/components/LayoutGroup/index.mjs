"use client";
import { jsx } from 'react/jsx-runtime';
import { useContext, useRef, useMemo } from 'react';
import { LayoutGroupContext } from '../../context/LayoutGroupContext.mjs';
import { DeprecatedLayoutGroupContext } from '../../context/DeprecatedLayoutGroupContext.mjs';
import { useForceUpdate } from '../../utils/use-force-update.mjs';
import { nodeGroup } from '../../projection/node/group.mjs';

const shouldInheritGroup = (inherit) => inherit === true;
const shouldInheritId = (inherit) => shouldInheritGroup(inherit === true) || inherit === "id";
const LayoutGroup = ({ children, id, inherit = true }) => {
    const layoutGroupContext = useContext(LayoutGroupContext);
    const deprecatedLayoutGroupContext = useContext(DeprecatedLayoutGroupContext);
    const [forceRender, key] = useForceUpdate();
    const context = useRef(null);
    const upstreamId = layoutGroupContext.id || deprecatedLayoutGroupContext;
    if (context.current === null) {
        if (shouldInheritId(inherit) && upstreamId) {
            id = id ? upstreamId + "-" + id : upstreamId;
        }
        context.current = {
            id,
            group: shouldInheritGroup(inherit)
                ? layoutGroupContext.group || nodeGroup()
                : nodeGroup(),
        };
    }
    const memoizedContext = useMemo(() => ({ ...context.current, forceRender }), [key]);
    return (jsx(LayoutGroupContext.Provider, { value: memoizedContext, children: children }));
};

export { LayoutGroup };
