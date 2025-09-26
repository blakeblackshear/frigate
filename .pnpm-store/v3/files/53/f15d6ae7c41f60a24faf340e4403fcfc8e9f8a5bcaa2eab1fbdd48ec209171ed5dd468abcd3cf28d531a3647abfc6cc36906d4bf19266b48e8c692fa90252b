import { LongPressDomEvents, LongPressReactEvents } from './use-long-press.types';
import { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, SyntheticEvent, TouchEvent as ReactTouchEvent } from 'react';
export declare function isMouseEvent<Target extends Element>(event: SyntheticEvent<Target>): event is ReactMouseEvent<Target>;
export declare function isTouchEvent<Target extends Element>(event: SyntheticEvent<Target>): event is ReactTouchEvent<Target>;
export declare function isPointerEvent<Target extends Element>(event: SyntheticEvent<Target>): event is ReactPointerEvent<Target>;
export declare function isRecognisableEvent<Target extends Element>(event: SyntheticEvent<Target>): event is LongPressReactEvents<Target>;
export declare function getCurrentPosition<Target extends Element>(event: LongPressReactEvents<Target>): {
    x: number;
    y: number;
} | null;
export declare function createArtificialReactEvent<Target extends Element = Element>(event: LongPressDomEvents): LongPressReactEvents<Target>;
