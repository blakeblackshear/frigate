import React from 'react';

declare const animations: {
    easeOut: (t: number) => number;
    linear: (t: number) => number;
    easeInQuad: (t: number) => number;
    easeOutQuad: (t: number) => number;
    easeInOutQuad: (t: number) => number;
    easeInCubic: (t: number) => number;
    easeOutCubic: (t: number) => number;
    easeInOutCubic: (t: number) => number;
    easeInQuart: (t: number) => number;
    easeOutQuart: (t: number) => number;
    easeInOutQuart: (t: number) => number;
    easeInQuint: (t: number) => number;
    easeOutQuint: (t: number) => number;
    easeInOutQuint: (t: number) => number;
};

type DeepNonNullable<T> = T extends (...args: any[]) => any ? T : T extends any[] ? DeepNonNullableArray<T[number]> : T extends object ? DeepNonNullableObject<T> : T;
type DeepNonNullableArray<T> = Array<DeepNonNullable<NonNullable<T>>>;
type DeepNonNullableObject<T> = {
    [P in keyof T]-?: DeepNonNullable<NonNullable<T[P]>>;
};

declare const zoomIn: (contextInstance: ReactZoomPanPinchContext) => (step?: number, animationTime?: number, animationType?: keyof typeof animations) => void;
declare const zoomOut: (contextInstance: ReactZoomPanPinchContext) => (step?: number, animationTime?: number, animationType?: keyof typeof animations) => void;
declare const setTransform: (contextInstance: ReactZoomPanPinchContext) => (newPositionX: number, newPositionY: number, newScale: number, animationTime?: number, animationType?: keyof typeof animations) => void;
declare const resetTransform: (contextInstance: ReactZoomPanPinchContext) => (animationTime?: number, animationType?: keyof typeof animations) => void;
declare const centerView: (contextInstance: ReactZoomPanPinchContext) => (scale?: number, animationTime?: number, animationType?: keyof typeof animations) => void;
declare const zoomToElement: (contextInstance: ReactZoomPanPinchContext) => (node: HTMLElement | string, scale?: number, animationTime?: number, animationType?: keyof typeof animations) => void;

type StartCoordsType = {
    x: number;
    y: number;
} | null;
declare class ZoomPanPinch {
    props: ReactZoomPanPinchProps;
    mounted: boolean;
    transformState: ReactZoomPanPinchState;
    setup: LibrarySetup;
    observer?: ResizeObserver;
    onChangeCallbacks: Set<(ctx: ReactZoomPanPinchRef) => void>;
    onInitCallbacks: Set<(ctx: ReactZoomPanPinchRef) => void>;
    wrapperComponent: HTMLDivElement | null;
    contentComponent: HTMLDivElement | null;
    isInitialized: boolean;
    bounds: BoundsType | null;
    previousWheelEvent: WheelEvent | null;
    wheelStopEventTimer: ReturnType<typeof setTimeout> | null;
    wheelAnimationTimer: ReturnType<typeof setTimeout> | null;
    isPanning: boolean;
    isWheelPanning: boolean;
    startCoords: StartCoordsType;
    lastTouch: number | null;
    distance: null | number;
    lastDistance: null | number;
    pinchStartDistance: null | number;
    pinchStartScale: null | number;
    pinchMidpoint: null | PositionType;
    doubleClickStopEventTimer: ReturnType<typeof setTimeout> | null;
    velocity: VelocityType | null;
    velocityTime: number | null;
    lastMousePosition: PositionType | null;
    animate: boolean;
    animation: AnimationType | null;
    maxBounds: BoundsType | null;
    pressedKeys: {
        [key: string]: boolean;
    };
    constructor(props: ReactZoomPanPinchProps);
    mount: () => void;
    unmount: () => void;
    update: (newProps: ReactZoomPanPinchProps) => void;
    initializeWindowEvents: () => void;
    cleanupWindowEvents: () => void;
    handleInitializeWrapperEvents: (wrapper: HTMLDivElement) => void;
    handleInitialize: (contentComponent: HTMLDivElement) => void;
    onWheelZoom: (event: WheelEvent) => void;
    onWheelPanning: (event: WheelEvent) => void;
    onPanningStart: (event: MouseEvent) => void;
    onPanning: (event: MouseEvent) => void;
    onPanningStop: (event: MouseEvent | TouchEvent) => void;
    onPinchStart: (event: TouchEvent) => void;
    onPinch: (event: TouchEvent) => void;
    onPinchStop: (event: TouchEvent) => void;
    onTouchPanningStart: (event: TouchEvent) => void;
    onTouchPanning: (event: TouchEvent) => void;
    onTouchPanningStop: (event: TouchEvent) => void;
    onDoubleClick: (event: MouseEvent | TouchEvent) => void;
    clearPanning: (event: MouseEvent) => void;
    setKeyPressed: (e: KeyboardEvent) => void;
    setKeyUnPressed: (e: KeyboardEvent) => void;
    isPressingKeys: (keys: string[]) => boolean;
    setTransformState: (scale: number, positionX: number, positionY: number) => void;
    setCenter: () => void;
    handleTransformStyles: (x: number, y: number, scale: number) => string;
    applyTransformation: () => void;
    getContext: () => ReactZoomPanPinchRef;
    /**
     * Hooks
     */
    onChange: (callback: (ref: ReactZoomPanPinchRef) => void) => () => void;
    onInit: (callback: (ref: ReactZoomPanPinchRef) => void) => () => void;
    /**
     * Initialization
     */
    init: (wrapperComponent: HTMLDivElement, contentComponent: HTMLDivElement) => void;
}

type ReactZoomPanPinchContext = typeof ZoomPanPinch.prototype;
type ReactZoomPanPinchContextState = {
    instance: ReactZoomPanPinchContext;
    state: ReactZoomPanPinchState;
};
type ReactZoomPanPinchContentRef = {
    instance: ReactZoomPanPinchContext;
} & ReactZoomPanPinchHandlers;
type ReactZoomPanPinchRef = ReactZoomPanPinchContextState & ReactZoomPanPinchHandlers;
type ReactZoomPanPinchState = {
    previousScale: number;
    scale: number;
    positionX: number;
    positionY: number;
};
type ReactZoomPanPinchHandlers = {
    zoomIn: ReturnType<typeof zoomIn>;
    zoomOut: ReturnType<typeof zoomOut>;
    setTransform: ReturnType<typeof setTransform>;
    resetTransform: ReturnType<typeof resetTransform>;
    centerView: ReturnType<typeof centerView>;
    zoomToElement: ReturnType<typeof zoomToElement>;
};
type ReactZoomPanPinchRefProps = {
    setRef: (context: ReactZoomPanPinchRef) => void;
} & Omit<ReactZoomPanPinchProps, "ref">;
type ReactZoomPanPinchProps = {
    children?: React.ReactNode | ((ref: ReactZoomPanPinchContentRef) => React.ReactNode);
    ref?: React.Ref<ReactZoomPanPinchRef>;
    initialScale?: number;
    initialPositionX?: number;
    initialPositionY?: number;
    disabled?: boolean;
    minPositionX?: null | number;
    maxPositionX?: null | number;
    minPositionY?: null | number;
    maxPositionY?: null | number;
    minScale?: number;
    maxScale?: number;
    limitToBounds?: boolean;
    centerZoomedOut?: boolean;
    centerOnInit?: boolean;
    disablePadding?: boolean;
    customTransform?: (x: number, y: number, scale: number) => string;
    smooth?: boolean;
    wheel?: {
        step?: number;
        smoothStep?: number;
        disabled?: boolean;
        wheelDisabled?: boolean;
        touchPadDisabled?: boolean;
        activationKeys?: string[];
        excluded?: string[];
    };
    panning?: {
        disabled?: boolean;
        velocityDisabled?: boolean;
        lockAxisX?: boolean;
        lockAxisY?: boolean;
        allowLeftClickPan?: boolean;
        allowMiddleClickPan?: boolean;
        allowRightClickPan?: boolean;
        activationKeys?: string[];
        excluded?: string[];
        wheelPanning?: boolean;
    };
    pinch?: {
        step?: number;
        disabled?: boolean;
        excluded?: string[];
    };
    doubleClick?: {
        disabled?: boolean;
        step?: number;
        mode?: "zoomIn" | "zoomOut" | "reset" | "toggle";
        animationTime?: number;
        animationType?: keyof typeof animations;
        excluded?: string[];
    };
    zoomAnimation?: {
        disabled?: boolean;
        size?: number;
        animationTime?: number;
        animationType?: keyof typeof animations;
    };
    alignmentAnimation?: {
        disabled?: boolean;
        sizeX?: number;
        sizeY?: number;
        animationTime?: number;
        velocityAlignmentTime?: number;
        animationType?: keyof typeof animations;
    };
    velocityAnimation?: {
        disabled?: boolean;
        sensitivity?: number;
        animationTime?: number;
        animationType?: keyof typeof animations;
        equalToMove?: boolean;
    };
    onWheelStart?: (ref: ReactZoomPanPinchRef, event: WheelEvent) => void;
    onWheel?: (ref: ReactZoomPanPinchRef, event: WheelEvent) => void;
    onWheelStop?: (ref: ReactZoomPanPinchRef, event: WheelEvent) => void;
    onPanningStart?: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
    onPanning?: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
    onPanningStop?: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
    onPinchingStart?: (ref: ReactZoomPanPinchRef, event: TouchEvent) => void;
    onPinching?: (ref: ReactZoomPanPinchRef, event: TouchEvent) => void;
    onPinchingStop?: (ref: ReactZoomPanPinchRef, event: TouchEvent) => void;
    onZoomStart?: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
    onZoom?: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
    onZoomStop?: (ref: ReactZoomPanPinchRef, event: TouchEvent | MouseEvent) => void;
    onTransformed?: (ref: ReactZoomPanPinchRef, state: {
        scale: number;
        positionX: number;
        positionY: number;
    }) => void;
    onInit?: (ref: ReactZoomPanPinchRef) => void;
};
type ReactZoomPanPinchComponentHelpers = {
    setComponents: (wrapper: HTMLDivElement, content: HTMLDivElement) => void;
};
type LibrarySetup = Pick<ReactZoomPanPinchProps, "minPositionX" | "maxPositionX" | "minPositionY" | "maxPositionY"> & DeepNonNullable<Omit<ReactZoomPanPinchProps, "ref" | "initialScale" | "initialPositionX" | "initialPositionY" | "minPositionX" | "maxPositionX" | "minPositionY" | "maxPositionY" | "children" | "defaultPositionX" | "defaultPositionY" | "defaultScale" | "wrapperClass" | "contentClass" | "onWheelStart" | "onWheel" | "onWheelStop" | "onPanningStart" | "onPanning" | "onPanningStop" | "onPinchingStart" | "onPinching" | "onPinchingStop" | "onZoomStart" | "onZoom" | "onZoomStop" | "onTransformed" | "onInit" | "customTransform">>;

type SizeType = {
    width: number;
    height: number;
};
type PositionType = {
    x: number;
    y: number;
};
type StateType = {
    scale: number;
    positionX: number;
    positionY: number;
};
type VelocityType = {
    velocityX: number;
    velocityY: number;
    total: number;
};
type BoundsType = {
    minPositionX: number;
    maxPositionX: number;
    minPositionY: number;
    maxPositionY: number;
};
type AnimationType = () => void | number;

declare const useControls: () => ReactZoomPanPinchContentRef;

declare const useTransformInit: (callback: (ref: ReactZoomPanPinchContextState) => void | (() => void)) => void;

declare const useTransformEffect: (callback: (ref: ReactZoomPanPinchContextState) => void | (() => void)) => void;

declare const useTransformContext: () => ZoomPanPinch;

declare const KeepScale: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>;

type MiniMapProps = {
    children: React.ReactNode;
    width?: number;
    height?: number;
    borderColor?: string;
} & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
declare const MiniMap: React.FC<MiniMapProps>;

type Props = {
    children: React.ReactNode;
    wrapperClass?: string;
    contentClass?: string;
    wrapperStyle?: React.CSSProperties;
    contentStyle?: React.CSSProperties;
    wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
    contentProps?: React.HTMLAttributes<HTMLDivElement>;
};
declare const TransformComponent: React.FC<Props>;

declare const Context: React.Context<ZoomPanPinch>;
declare const TransformWrapper: React.ForwardRefExoticComponent<Omit<ReactZoomPanPinchProps, "ref"> & React.RefAttributes<ReactZoomPanPinchContentRef>>;

declare const getTransformStyles: (x: number, y: number, scale: number) => string;
declare const getMatrixTransformStyles: (x: number, y: number, scale: number) => string;
declare const getCenterPosition: (scale: number, wrapperComponent: HTMLDivElement, contentComponent: HTMLDivElement) => StateType;

export { AnimationType, BoundsType, Context, KeepScale, LibrarySetup, MiniMap, MiniMapProps, PositionType, ReactZoomPanPinchComponentHelpers, ReactZoomPanPinchContentRef, ReactZoomPanPinchContext, ReactZoomPanPinchContextState, ReactZoomPanPinchHandlers, ReactZoomPanPinchProps, ReactZoomPanPinchRef, ReactZoomPanPinchRefProps, ReactZoomPanPinchState, SizeType, StateType, TransformComponent, TransformWrapper, VelocityType, getCenterPosition, getMatrixTransformStyles, getTransformStyles, useControls, useTransformContext, useTransformEffect, useTransformInit };
