import * as _radix_ui_react_context from '@radix-ui/react-context';
import * as React from 'react';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { Portal as Portal$1 } from '@radix-ui/react-portal';
import { Primitive } from '@radix-ui/react-primitive';
import { DismissableLayer } from '@radix-ui/react-dismissable-layer';

declare const createHoverCardScope: _radix_ui_react_context.CreateScope;
interface HoverCardProps {
    children?: React.ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    openDelay?: number;
    closeDelay?: number;
}
declare const HoverCard: React.FC<HoverCardProps>;
type PrimitiveLinkProps = React.ComponentPropsWithoutRef<typeof Primitive.a>;
interface HoverCardTriggerProps extends PrimitiveLinkProps {
}
declare const HoverCardTrigger: React.ForwardRefExoticComponent<HoverCardTriggerProps & React.RefAttributes<HTMLAnchorElement>>;
type PortalProps = React.ComponentPropsWithoutRef<typeof Portal$1>;
interface HoverCardPortalProps {
    children?: React.ReactNode;
    /**
     * Specify a container element to portal the content into.
     */
    container?: PortalProps['container'];
    /**
     * Used to force mounting when more control is needed. Useful when
     * controlling animation with React animation libraries.
     */
    forceMount?: true;
}
declare const HoverCardPortal: React.FC<HoverCardPortalProps>;
interface HoverCardContentProps extends HoverCardContentImplProps {
    /**
     * Used to force mounting when more control is needed. Useful when
     * controlling animation with React animation libraries.
     */
    forceMount?: true;
}
declare const HoverCardContent: React.ForwardRefExoticComponent<HoverCardContentProps & React.RefAttributes<HTMLDivElement>>;
type DismissableLayerProps = React.ComponentPropsWithoutRef<typeof DismissableLayer>;
type PopperContentProps = React.ComponentPropsWithoutRef<typeof PopperPrimitive.Content>;
interface HoverCardContentImplProps extends Omit<PopperContentProps, 'onPlaced'> {
    /**
     * Event handler called when the escape key is down.
     * Can be prevented.
     */
    onEscapeKeyDown?: DismissableLayerProps['onEscapeKeyDown'];
    /**
     * Event handler called when the a `pointerdown` event happens outside of the `HoverCard`.
     * Can be prevented.
     */
    onPointerDownOutside?: DismissableLayerProps['onPointerDownOutside'];
    /**
     * Event handler called when the focus moves outside of the `HoverCard`.
     * Can be prevented.
     */
    onFocusOutside?: DismissableLayerProps['onFocusOutside'];
    /**
     * Event handler called when an interaction happens outside the `HoverCard`.
     * Specifically, when a `pointerdown` event happens outside or focus moves outside of it.
     * Can be prevented.
     */
    onInteractOutside?: DismissableLayerProps['onInteractOutside'];
}
type PopperArrowProps = React.ComponentPropsWithoutRef<typeof PopperPrimitive.Arrow>;
interface HoverCardArrowProps extends PopperArrowProps {
}
declare const HoverCardArrow: React.ForwardRefExoticComponent<HoverCardArrowProps & React.RefAttributes<SVGSVGElement>>;
declare const Root: React.FC<HoverCardProps>;
declare const Trigger: React.ForwardRefExoticComponent<HoverCardTriggerProps & React.RefAttributes<HTMLAnchorElement>>;
declare const Portal: React.FC<HoverCardPortalProps>;
declare const Content: React.ForwardRefExoticComponent<HoverCardContentProps & React.RefAttributes<HTMLDivElement>>;
declare const Arrow: React.ForwardRefExoticComponent<HoverCardArrowProps & React.RefAttributes<SVGSVGElement>>;

export { Arrow, Content, HoverCard, HoverCardArrow, type HoverCardArrowProps, HoverCardContent, type HoverCardContentProps, HoverCardPortal, type HoverCardPortalProps, type HoverCardProps, HoverCardTrigger, type HoverCardTriggerProps, Portal, Root, Trigger, createHoverCardScope };
