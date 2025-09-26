declare module 'react-draggable' {
  import * as React from 'react';

  export interface DraggableBounds {
    left?: number
    right?: number
    top?: number
    bottom?: number
  }

  export interface DraggableProps extends DraggableCoreProps {
    axis: 'both' | 'x' | 'y' | 'none',
    bounds: DraggableBounds | string | false ,
    defaultClassName: string,
    defaultClassNameDragging: string,
    defaultClassNameDragged: string,
    defaultPosition: ControlPosition,
    positionOffset: PositionOffsetControlPosition,
    position: ControlPosition
  }

  export type DraggableEvent = React.MouseEvent<HTMLElement | SVGElement>
    | React.TouchEvent<HTMLElement | SVGElement>
    | MouseEvent
    | TouchEvent

  export type DraggableEventHandler = (
    e: DraggableEvent,
    data: DraggableData
  ) => void | false;

  export interface DraggableData {
    node: HTMLElement,
    x: number, y: number,
    deltaX: number, deltaY: number,
    lastX: number, lastY: number
  }

  export type ControlPosition = {x: number, y: number};

  export type PositionOffsetControlPosition = {x: number|string, y: number|string};

  export interface DraggableCoreProps {
    allowAnyClick: boolean,
    allowMobileScroll: boolean,
    cancel: string,
    children?: React.ReactNode,
    disabled: boolean,
    enableUserSelectHack: boolean,
    offsetParent: HTMLElement,
    grid: [number, number],
    handle: string,
    nodeRef?: React.RefObject<HTMLElement | null>,
    onStart: DraggableEventHandler,
    onDrag: DraggableEventHandler,
    onStop: DraggableEventHandler,
    onMouseDown: (e: MouseEvent) => void,
    scale: number
  }

  export default class Draggable extends React.Component<Partial<DraggableProps>, {}> {
    static defaultProps : DraggableProps;
  }

  export class DraggableCore extends React.Component<Partial<DraggableCoreProps>, {}> {
    static defaultProps : DraggableCoreProps;
  }
}
