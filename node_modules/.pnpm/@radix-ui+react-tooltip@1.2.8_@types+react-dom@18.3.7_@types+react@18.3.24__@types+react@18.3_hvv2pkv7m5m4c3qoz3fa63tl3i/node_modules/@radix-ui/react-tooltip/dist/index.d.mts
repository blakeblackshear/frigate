import * as _radix_ui_react_context from '@radix-ui/react-context';
import * as React from 'react';
import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { Portal as Portal$1 } from '@radix-ui/react-portal';
import { Primitive } from '@radix-ui/react-primitive';

declare const createTooltipScope: _radix_ui_react_context.CreateScope;
interface TooltipProviderProps {
    children: React.ReactNode;
    /**
     * The duration from when the pointer enters the trigger until the tooltip gets opened.
     * @defaultValue 700
     */
    delayDuration?: number;
    /**
     * How much time a user has to enter another trigger without incurring a delay again.
     * @defaultValue 300
     */
    skipDelayDuration?: number;
    /**
     * When `true`, trying to hover the content will result in the tooltip closing as the pointer leaves the trigger.
     * @defaultValue false
     */
    disableHoverableContent?: boolean;
}
declare const TooltipProvider: React.FC<TooltipProviderProps>;
interface TooltipProps {
    children?: React.ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    /**
     * The duration from when the pointer enters the trigger until the tooltip gets opened. This will
     * override the prop with the same name passed to Provider.
     * @defaultValue 700
     */
    delayDuration?: number;
    /**
     * When `true`, trying to hover the content will result in the tooltip closing as the pointer leaves the trigger.
     * @defaultValue false
     */
    disableHoverableContent?: boolean;
}
declare const Tooltip: React.FC<TooltipProps>;
type PrimitiveButtonProps = React.ComponentPropsWithoutRef<typeof Primitive.button>;
interface TooltipTriggerProps extends PrimitiveButtonProps {
}
declare const TooltipTrigger: React.ForwardRefExoticComponent<TooltipTriggerProps & React.RefAttributes<HTMLButtonElement>>;
type PortalProps = React.ComponentPropsWithoutRef<typeof Portal$1>;
interface TooltipPortalProps {
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
declare const TooltipPortal: React.FC<TooltipPortalProps>;
interface TooltipContentProps extends TooltipContentImplProps {
    /**
     * Used to force mounting when more control is needed. Useful when
     * controlling animation with React animation libraries.
     */
    forceMount?: true;
}
declare const TooltipContent: React.ForwardRefExoticComponent<TooltipContentProps & React.RefAttributes<HTMLDivElement>>;
type DismissableLayerProps = React.ComponentPropsWithoutRef<typeof DismissableLayer>;
type PopperContentProps = React.ComponentPropsWithoutRef<typeof PopperPrimitive.Content>;
interface TooltipContentImplProps extends Omit<PopperContentProps, 'onPlaced'> {
    /**
     * A more descriptive label for accessibility purpose
     */
    'aria-label'?: string;
    /**
     * Event handler called when the escape key is down.
     * Can be prevented.
     */
    onEscapeKeyDown?: DismissableLayerProps['onEscapeKeyDown'];
    /**
     * Event handler called when the a `pointerdown` event happens outside of the `Tooltip`.
     * Can be prevented.
     */
    onPointerDownOutside?: DismissableLayerProps['onPointerDownOutside'];
}
type PopperArrowProps = React.ComponentPropsWithoutRef<typeof PopperPrimitive.Arrow>;
interface TooltipArrowProps extends PopperArrowProps {
}
declare const TooltipArrow: React.ForwardRefExoticComponent<TooltipArrowProps & React.RefAttributes<SVGSVGElement>>;
declare const Provider: React.FC<TooltipProviderProps>;
declare const Root: React.FC<TooltipProps>;
declare const Trigger: React.ForwardRefExoticComponent<TooltipTriggerProps & React.RefAttributes<HTMLButtonElement>>;
declare const Portal: React.FC<TooltipPortalProps>;
declare const Content: React.ForwardRefExoticComponent<TooltipContentProps & React.RefAttributes<HTMLDivElement>>;
declare const Arrow: React.ForwardRefExoticComponent<TooltipArrowProps & React.RefAttributes<SVGSVGElement>>;

export { Arrow, Content, Portal, Provider, Root, Tooltip, TooltipArrow, type TooltipArrowProps, TooltipContent, type TooltipContentProps, TooltipPortal, type TooltipPortalProps, type TooltipProps, TooltipProvider, type TooltipProviderProps, TooltipTrigger, type TooltipTriggerProps, Trigger, createTooltipScope };
