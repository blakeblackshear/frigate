// @flow
import PropTypes from 'prop-types';
import {DraggableCore} from "react-draggable";
import type {Element as ReactElement, ElementConfig} from 'react';

export type ReactRef<T: HTMLElement> = {
  current: T | null
};

export type Axis = 'both' | 'x' | 'y' | 'none';
export type ResizeHandleAxis = 's' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne';
export type ResizableState = void;
export type ResizableBoxState = {
  width: number, height: number,
  propsWidth: number, propsHeight: number
};
export type DragCallbackData = {
  node: HTMLElement,
  x: number, y: number,
  deltaX: number, deltaY: number,
  lastX: number, lastY: number
};
export type ResizeCallbackData = {
  node: HTMLElement,
  size: {width: number, height: number},
  handle: ResizeHandleAxis
};

// <Resizable>
export type DefaultProps = {
  axis: Axis,
  handleSize: [number, number],
  lockAspectRatio: boolean,
  minConstraints: [number, number],
  maxConstraints: [number, number],
  resizeHandles: ResizeHandleAxis[],
  transformScale: number,
};

export type Props = {
  ...DefaultProps,
  children: ReactElement<any>,
  className?: ?string,
  draggableOpts?: ?ElementConfig<typeof DraggableCore>,
  height: number,
  handle?: ReactElement<any> | (resizeHandleAxis: ResizeHandleAxis, ref: ReactRef<HTMLElement>) => ReactElement<any>,
  onResizeStop?: ?(e: SyntheticEvent<>, data: ResizeCallbackData) => any,
  onResizeStart?: ?(e: SyntheticEvent<>, data: ResizeCallbackData) => any,
  onResize?: ?(e: SyntheticEvent<>, data: ResizeCallbackData) => any,
  width: number,
};



export const resizableProps: Object = {
  /*
  * Restricts resizing to a particular axis (default: 'both')
  * 'both' - allows resizing by width or height
  * 'x' - only allows the width to be changed
  * 'y' - only allows the height to be changed
  * 'none' - disables resizing altogether
  * */
  axis: PropTypes.oneOf(['both', 'x', 'y', 'none']),
  className: PropTypes.string,
  /*
  * Require that one and only one child be present.
  * */
  children: PropTypes.element.isRequired,
  /*
  * These will be passed wholesale to react-draggable's DraggableCore
  * */
  draggableOpts: PropTypes.shape({
    allowAnyClick: PropTypes.bool,
    cancel: PropTypes.string,
    children: PropTypes.node,
    disabled: PropTypes.bool,
    enableUserSelectHack: PropTypes.bool,
    offsetParent: PropTypes.node,
    grid: PropTypes.arrayOf(PropTypes.number),
    handle: PropTypes.string,
    nodeRef: PropTypes.object,
    onStart: PropTypes.func,
    onDrag: PropTypes.func,
    onStop: PropTypes.func,
    onMouseDown: PropTypes.func,
    scale: PropTypes.number,
  }),
  /*
  * Initial height
  * */
  height: (...args) => {
    const [props] = args;
    // Required if resizing height or both
    if (props.axis === 'both' || props.axis === 'y') {
      return PropTypes.number.isRequired(...args);
    }
    return PropTypes.number(...args);
  },
  /*
  * Customize cursor resize handle
  * */
  handle: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func
  ]),
  /*
  * If you change this, be sure to update your css
  * */
  handleSize: PropTypes.arrayOf(PropTypes.number),
  lockAspectRatio: PropTypes.bool,
  /*
  * Max X & Y measure
  * */
  maxConstraints: PropTypes.arrayOf(PropTypes.number),
  /*
  * Min X & Y measure
  * */
  minConstraints: PropTypes.arrayOf(PropTypes.number),
  /*
  * Called on stop resize event
  * */
  onResizeStop: PropTypes.func,
  /*
  * Called on start resize event
  * */
  onResizeStart: PropTypes.func,
  /*
  * Called on resize event
  * */
  onResize: PropTypes.func,
  /*
  * Defines which resize handles should be rendered (default: 'se')
  * 's' - South handle (bottom-center)
  * 'w' - West handle (left-center)
  * 'e' - East handle (right-center)
  * 'n' - North handle (top-center)
  * 'sw' - Southwest handle (bottom-left)
  * 'nw' - Northwest handle (top-left)
  * 'se' - Southeast handle (bottom-right)
  * 'ne' - Northeast handle (top-center)
  * */
  resizeHandles: PropTypes.arrayOf(PropTypes.oneOf(['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'])),

  /*
  * If `transform: scale(n)` is set on the parent, this should be set to `n`.
  * */
  transformScale: PropTypes.number,
  /*
   * Initial width
   */
  width: (...args) => {
    const [props] = args;
    // Required if resizing width or both
    if (props.axis === 'both' || props.axis === 'x') {
      return PropTypes.number.isRequired(...args);
    }
    return PropTypes.number(...args);
  },
};
