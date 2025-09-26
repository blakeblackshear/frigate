import * as _radix_ui_react_context from '@radix-ui/react-context';
import * as React from 'react';
import { Primitive } from '@radix-ui/react-primitive';

type Direction = 'ltr' | 'rtl';
type Sizes = {
    content: number;
    viewport: number;
    scrollbar: {
        size: number;
        paddingStart: number;
        paddingEnd: number;
    };
};
declare const createScrollAreaScope: _radix_ui_react_context.CreateScope;
type ScrollAreaContextValue = {
    type: 'auto' | 'always' | 'scroll' | 'hover';
    dir: Direction;
    scrollHideDelay: number;
    scrollArea: ScrollAreaElement | null;
    viewport: ScrollAreaViewportElement | null;
    onViewportChange(viewport: ScrollAreaViewportElement | null): void;
    content: HTMLDivElement | null;
    onContentChange(content: HTMLDivElement): void;
    scrollbarX: ScrollAreaScrollbarElement | null;
    onScrollbarXChange(scrollbar: ScrollAreaScrollbarElement | null): void;
    scrollbarXEnabled: boolean;
    onScrollbarXEnabledChange(rendered: boolean): void;
    scrollbarY: ScrollAreaScrollbarElement | null;
    onScrollbarYChange(scrollbar: ScrollAreaScrollbarElement | null): void;
    scrollbarYEnabled: boolean;
    onScrollbarYEnabledChange(rendered: boolean): void;
    onCornerWidthChange(width: number): void;
    onCornerHeightChange(height: number): void;
};
type ScrollAreaElement = React.ComponentRef<typeof Primitive.div>;
type PrimitiveDivProps = React.ComponentPropsWithoutRef<typeof Primitive.div>;
interface ScrollAreaProps extends PrimitiveDivProps {
    type?: ScrollAreaContextValue['type'];
    dir?: ScrollAreaContextValue['dir'];
    scrollHideDelay?: number;
}
declare const ScrollArea: React.ForwardRefExoticComponent<ScrollAreaProps & React.RefAttributes<HTMLDivElement>>;
type ScrollAreaViewportElement = React.ComponentRef<typeof Primitive.div>;
interface ScrollAreaViewportProps extends PrimitiveDivProps {
    nonce?: string;
}
declare const ScrollAreaViewport: React.ForwardRefExoticComponent<ScrollAreaViewportProps & React.RefAttributes<HTMLDivElement>>;
type ScrollAreaScrollbarElement = ScrollAreaScrollbarVisibleElement;
interface ScrollAreaScrollbarProps extends ScrollAreaScrollbarVisibleProps {
    forceMount?: true;
}
declare const ScrollAreaScrollbar: React.ForwardRefExoticComponent<ScrollAreaScrollbarProps & React.RefAttributes<HTMLDivElement>>;
type ScrollAreaScrollbarVisibleElement = ScrollAreaScrollbarAxisElement;
interface ScrollAreaScrollbarVisibleProps extends Omit<ScrollAreaScrollbarAxisProps, keyof ScrollAreaScrollbarAxisPrivateProps> {
    orientation?: 'horizontal' | 'vertical';
}
type ScrollAreaScrollbarAxisPrivateProps = {
    hasThumb: boolean;
    sizes: Sizes;
    onSizesChange(sizes: Sizes): void;
    onThumbChange(thumb: ScrollAreaThumbElement | null): void;
    onThumbPointerDown(pointerPos: number): void;
    onThumbPointerUp(): void;
    onThumbPositionChange(): void;
    onWheelScroll(scrollPos: number): void;
    onDragScroll(pointerPos: number): void;
};
type ScrollAreaScrollbarAxisElement = ScrollAreaScrollbarImplElement;
interface ScrollAreaScrollbarAxisProps extends Omit<ScrollAreaScrollbarImplProps, keyof ScrollAreaScrollbarImplPrivateProps>, ScrollAreaScrollbarAxisPrivateProps {
}
type ScrollbarContext = {
    hasThumb: boolean;
    scrollbar: ScrollAreaScrollbarElement | null;
    onThumbChange(thumb: ScrollAreaThumbElement | null): void;
    onThumbPointerUp(): void;
    onThumbPointerDown(pointerPos: {
        x: number;
        y: number;
    }): void;
    onThumbPositionChange(): void;
};
type ScrollAreaScrollbarImplElement = React.ComponentRef<typeof Primitive.div>;
type ScrollAreaScrollbarImplPrivateProps = {
    sizes: Sizes;
    hasThumb: boolean;
    onThumbChange: ScrollbarContext['onThumbChange'];
    onThumbPointerUp: ScrollbarContext['onThumbPointerUp'];
    onThumbPointerDown: ScrollbarContext['onThumbPointerDown'];
    onThumbPositionChange: ScrollbarContext['onThumbPositionChange'];
    onWheelScroll(event: WheelEvent, maxScrollPos: number): void;
    onDragScroll(pointerPos: {
        x: number;
        y: number;
    }): void;
    onResize(): void;
};
interface ScrollAreaScrollbarImplProps extends Omit<PrimitiveDivProps, keyof ScrollAreaScrollbarImplPrivateProps>, ScrollAreaScrollbarImplPrivateProps {
}
type ScrollAreaThumbElement = ScrollAreaThumbImplElement;
interface ScrollAreaThumbProps extends ScrollAreaThumbImplProps {
    /**
     * Used to force mounting when more control is needed. Useful when
     * controlling animation with React animation libraries.
     */
    forceMount?: true;
}
declare const ScrollAreaThumb: React.ForwardRefExoticComponent<ScrollAreaThumbProps & React.RefAttributes<HTMLDivElement>>;
type ScrollAreaThumbImplElement = React.ComponentRef<typeof Primitive.div>;
interface ScrollAreaThumbImplProps extends PrimitiveDivProps {
}
interface ScrollAreaCornerProps extends ScrollAreaCornerImplProps {
}
declare const ScrollAreaCorner: React.ForwardRefExoticComponent<ScrollAreaCornerProps & React.RefAttributes<HTMLDivElement>>;
interface ScrollAreaCornerImplProps extends PrimitiveDivProps {
}
declare const Root: React.ForwardRefExoticComponent<ScrollAreaProps & React.RefAttributes<HTMLDivElement>>;
declare const Viewport: React.ForwardRefExoticComponent<ScrollAreaViewportProps & React.RefAttributes<HTMLDivElement>>;
declare const Scrollbar: React.ForwardRefExoticComponent<ScrollAreaScrollbarProps & React.RefAttributes<HTMLDivElement>>;
declare const Thumb: React.ForwardRefExoticComponent<ScrollAreaThumbProps & React.RefAttributes<HTMLDivElement>>;
declare const Corner: React.ForwardRefExoticComponent<ScrollAreaCornerProps & React.RefAttributes<HTMLDivElement>>;

export { Corner, Root, ScrollArea, ScrollAreaCorner, type ScrollAreaCornerProps, type ScrollAreaProps, ScrollAreaScrollbar, type ScrollAreaScrollbarProps, ScrollAreaThumb, type ScrollAreaThumbProps, ScrollAreaViewport, type ScrollAreaViewportProps, Scrollbar, Thumb, Viewport, createScrollAreaScope };
