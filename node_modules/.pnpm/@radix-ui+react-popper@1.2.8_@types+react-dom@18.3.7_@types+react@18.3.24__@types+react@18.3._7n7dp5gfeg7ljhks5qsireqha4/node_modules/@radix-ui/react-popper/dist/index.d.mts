import * as _radix_ui_react_context from '@radix-ui/react-context';
import * as React from 'react';
import * as ArrowPrimitive from '@radix-ui/react-arrow';
import { Primitive } from '@radix-ui/react-primitive';
import { Measurable } from '@radix-ui/rect';

declare const SIDE_OPTIONS: readonly ["top", "right", "bottom", "left"];
declare const ALIGN_OPTIONS: readonly ["start", "center", "end"];
type Side = (typeof SIDE_OPTIONS)[number];
type Align = (typeof ALIGN_OPTIONS)[number];
declare const createPopperScope: _radix_ui_react_context.CreateScope;
interface PopperProps {
    children?: React.ReactNode;
}
declare const Popper: React.FC<PopperProps>;
type PrimitiveDivProps = React.ComponentPropsWithoutRef<typeof Primitive.div>;
interface PopperAnchorProps extends PrimitiveDivProps {
    virtualRef?: React.RefObject<Measurable>;
}
declare const PopperAnchor: React.ForwardRefExoticComponent<PopperAnchorProps & React.RefAttributes<HTMLDivElement>>;
type Boundary = Element | null;
interface PopperContentProps extends PrimitiveDivProps {
    side?: Side;
    sideOffset?: number;
    align?: Align;
    alignOffset?: number;
    arrowPadding?: number;
    avoidCollisions?: boolean;
    collisionBoundary?: Boundary | Boundary[];
    collisionPadding?: number | Partial<Record<Side, number>>;
    sticky?: 'partial' | 'always';
    hideWhenDetached?: boolean;
    updatePositionStrategy?: 'optimized' | 'always';
    onPlaced?: () => void;
}
declare const PopperContent: React.ForwardRefExoticComponent<PopperContentProps & React.RefAttributes<HTMLDivElement>>;
type ArrowProps = React.ComponentPropsWithoutRef<typeof ArrowPrimitive.Root>;
interface PopperArrowProps extends ArrowProps {
}
declare const PopperArrow: React.ForwardRefExoticComponent<PopperArrowProps & React.RefAttributes<SVGSVGElement>>;
declare const Root: React.FC<PopperProps>;
declare const Anchor: React.ForwardRefExoticComponent<PopperAnchorProps & React.RefAttributes<HTMLDivElement>>;
declare const Content: React.ForwardRefExoticComponent<PopperContentProps & React.RefAttributes<HTMLDivElement>>;
declare const Arrow: React.ForwardRefExoticComponent<PopperArrowProps & React.RefAttributes<SVGSVGElement>>;

export { ALIGN_OPTIONS, Anchor, Arrow, Content, Popper, PopperAnchor, type PopperAnchorProps, PopperArrow, type PopperArrowProps, PopperContent, type PopperContentProps, type PopperProps, Root, SIDE_OPTIONS, createPopperScope };
