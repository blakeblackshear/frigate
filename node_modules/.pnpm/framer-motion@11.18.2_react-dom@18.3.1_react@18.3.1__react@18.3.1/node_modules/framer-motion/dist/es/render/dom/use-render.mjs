import { Fragment, useMemo, createElement } from 'react';
import { useHTMLProps } from '../html/use-props.mjs';
import { filterProps } from './utils/filter-props.mjs';
import { isSVGComponent } from './utils/is-svg-component.mjs';
import { useSVGProps } from '../svg/use-props.mjs';
import { isMotionValue } from '../../value/utils/is-motion-value.mjs';

function createUseRender(forwardMotionProps = false) {
    const useRender = (Component, props, ref, { latestValues }, isStatic) => {
        const useVisualProps = isSVGComponent(Component)
            ? useSVGProps
            : useHTMLProps;
        const visualProps = useVisualProps(props, latestValues, isStatic, Component);
        const filteredProps = filterProps(props, typeof Component === "string", forwardMotionProps);
        const elementProps = Component !== Fragment
            ? { ...filteredProps, ...visualProps, ref }
            : {};
        /**
         * If component has been handed a motion value as its child,
         * memoise its initial value and render that. Subsequent updates
         * will be handled by the onChange handler
         */
        const { children } = props;
        const renderedChildren = useMemo(() => (isMotionValue(children) ? children.get() : children), [children]);
        return createElement(Component, {
            ...elementProps,
            children: renderedChildren,
        });
    };
    return useRender;
}

export { createUseRender };
