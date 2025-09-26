// @flow
import * as React from 'react';
import type {Node as ReactNode} from 'react';
import {DraggableCore} from 'react-draggable';
import {cloneElement} from './utils';
import {resizableProps} from "./propTypes";
import type {ResizeHandleAxis, DefaultProps, Props, ReactRef, DragCallbackData} from './propTypes';

// The base <Resizable> component.
// This component does not have state and relies on the parent to set its props based on callback data.
export default class Resizable extends React.Component<Props, void> {
  static propTypes = resizableProps;

  static defaultProps: DefaultProps =  {
    axis: 'both',
    handleSize: [20, 20],
    lockAspectRatio: false,
    minConstraints: [20, 20],
    maxConstraints: [Infinity, Infinity],
    resizeHandles: ['se'],
    transformScale: 1
  };

  handleRefs: {[key: ResizeHandleAxis]: ReactRef<HTMLElement>} = {};
  lastHandleRect: ?ClientRect = null;
  slack: ?[number, number] = null;

  componentWillUnmount() {
    this.resetData();
  }

  resetData() {
    this.lastHandleRect = this.slack = null;
  }

  // Clamp width and height within provided constraints
  runConstraints(width: number, height: number): [number, number] {
    const {minConstraints, maxConstraints, lockAspectRatio} = this.props;
    // short circuit
    if (!minConstraints && !maxConstraints && !lockAspectRatio) return [width, height];

    // If constraining to min and max, we need to also fit width and height to aspect ratio.
    if (lockAspectRatio) {
      const ratio = this.props.width / this.props.height;
      const deltaW = width - this.props.width;
      const deltaH = height - this.props.height;

      // Find which coordinate was greater and should push the other toward it.
      // E.g.:
      // ratio = 1, deltaW = 10, deltaH = 5, deltaH should become 10.
      // ratio = 2, deltaW = 10, deltaH = 6, deltaW should become 12.
      if (Math.abs(deltaW) > Math.abs(deltaH * ratio)) {
        height = width / ratio;
      } else {
        width = height * ratio;
      }
    }

    const [oldW, oldH] = [width, height];

    // Add slack to the values used to calculate bound position. This will ensure that if
    // we start removing slack, the element won't react to it right away until it's been
    // completely removed.
    let [slackW, slackH] = this.slack || [0, 0];
    width += slackW;
    height += slackH;

    if (minConstraints) {
      width = Math.max(minConstraints[0], width);
      height = Math.max(minConstraints[1], height);
    }
    if (maxConstraints) {
      width = Math.min(maxConstraints[0], width);
      height = Math.min(maxConstraints[1], height);
    }

    // If the width or height changed, we must have introduced some slack. Record it for the next iteration.
    this.slack = [slackW + (oldW - width), slackH + (oldH - height)];

    return [width, height];
  }

  /**
   * Wrapper around drag events to provide more useful data.
   *
   * @param  {String} handlerName Handler name to wrap.
   * @return {Function}           Handler function.
   */
  resizeHandler(handlerName: 'onResize' | 'onResizeStart' | 'onResizeStop', axis: ResizeHandleAxis): Function {
    return (e: SyntheticEvent<>, {node, deltaX, deltaY}: DragCallbackData) => {
      // Reset data in case it was left over somehow (should not be possible)
      if (handlerName === 'onResizeStart') this.resetData();

      // Axis restrictions
      const canDragX = (this.props.axis === 'both' || this.props.axis === 'x') && axis !== 'n' && axis !== 's';
      const canDragY = (this.props.axis === 'both' || this.props.axis === 'y') && axis !== 'e' && axis !== 'w';
      // No dragging possible.
      if (!canDragX && !canDragY) return;

      // Decompose axis for later use
      const axisV = axis[0];
      const axisH = axis[axis.length - 1]; // intentionally not axis[1], so that this catches axis === 'w' for example

      // Track the element being dragged to account for changes in position.
      // If a handle's position is changed between callbacks, we need to factor this in to the next callback.
      // Failure to do so will cause the element to "skip" when resized upwards or leftwards.
      const handleRect = node.getBoundingClientRect();
      if (this.lastHandleRect != null) {
        // If the handle has repositioned on either axis since last render,
        // we need to increase our callback values by this much.
        // Only checking 'n', 'w' since resizing by 's', 'w' won't affect the overall position on page,
        if (axisH === 'w') {
          const deltaLeftSinceLast = handleRect.left - this.lastHandleRect.left;
          deltaX += deltaLeftSinceLast;
        }
        if (axisV === 'n') {
          const deltaTopSinceLast = handleRect.top - this.lastHandleRect.top;
          deltaY += deltaTopSinceLast;
        }
      }
      // Storage of last rect so we know how much it has really moved.
      this.lastHandleRect = handleRect;

      // Reverse delta if using top or left drag handles.
      if (axisH === 'w') deltaX = -deltaX;
      if (axisV === 'n') deltaY = -deltaY;

      // Update w/h by the deltas. Also factor in transformScale.
      let width = this.props.width + (canDragX ? deltaX / this.props.transformScale : 0);
      let height = this.props.height + (canDragY ? deltaY / this.props.transformScale : 0);

      // Run user-provided constraints.
      [width, height] = this.runConstraints(width, height);

      const dimensionsChanged = width !== this.props.width || height !== this.props.height;

      // Call user-supplied callback if present.
      const cb = typeof this.props[handlerName] === 'function' ? this.props[handlerName] : null;
      // Don't call 'onResize' if dimensions haven't changed.
      const shouldSkipCb = handlerName === 'onResize' && !dimensionsChanged;
      if (cb && !shouldSkipCb) {
        e.persist?.();
        cb(e, {node, size: {width, height}, handle: axis});
      }

      // Reset internal data
      if (handlerName === 'onResizeStop') this.resetData();
    };
  }

  // Render a resize handle given an axis & DOM ref. Ref *must* be attached for
  // the underlying draggable library to work properly.
  renderResizeHandle(handleAxis: ResizeHandleAxis, ref: ReactRef<HTMLElement>): ReactNode {
    const {handle} = this.props;
    // No handle provided, make the default
    if (!handle) {
      return <span className={`react-resizable-handle react-resizable-handle-${handleAxis}`} ref={ref} />;
    }
    // Handle is a function, such as:
    // `handle={(handleAxis) => <span className={...} />}`
    if (typeof handle === 'function') {
      return handle(handleAxis, ref);
    }
    // Handle is a React component (composite or DOM).
    const isDOMElement = typeof handle.type === 'string';
    const props = {
      ref,
      // Add `handleAxis` prop iff this is not a DOM element,
      // otherwise we'll get an unknown property warning
      ...(isDOMElement ? {} : {handleAxis})
    };
    return React.cloneElement(handle, props);

  }

  render(): ReactNode {
    // Pass along only props not meant for the `<Resizable>`.`
    // eslint-disable-next-line no-unused-vars
    const {children, className, draggableOpts, width, height, handle, handleSize,
            lockAspectRatio, axis, minConstraints, maxConstraints, onResize,
            onResizeStop, onResizeStart, resizeHandles, transformScale, ...p} = this.props;

    // What we're doing here is getting the child of this element, and cloning it with this element's props.
    // We are then defining its children as:
    // 1. Its original children (resizable's child's children), and
    // 2. One or more draggable handles.
    return cloneElement(children, {
      ...p,
      className: `${className ? `${className} ` : ''}react-resizable`,
      children: [
        ...children.props.children,
        ...resizeHandles.map((handleAxis) => {
          // Create a ref to the handle so that `<DraggableCore>` doesn't have to use ReactDOM.findDOMNode().
          const ref = (this.handleRefs[handleAxis]) ?? (this.handleRefs[handleAxis] = React.createRef());
          return (
            <DraggableCore
              {...draggableOpts}
              nodeRef={ref}
              key={`resizableHandle-${handleAxis}`}
              onStop={this.resizeHandler('onResizeStop', handleAxis)}
              onStart={this.resizeHandler('onResizeStart', handleAxis)}
              onDrag={this.resizeHandler('onResize', handleAxis)}
            >
              {this.renderResizeHandle(handleAxis, ref)}
            </DraggableCore>
          );
        })
      ]
    });
  }
}
