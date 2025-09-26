// @flow
import * as React from 'react';
import type {Node as ReactNode, Element as ReactElement} from 'react';
import PropTypes from 'prop-types';

import Resizable from './Resizable';
import {resizableProps} from "./propTypes";
import type {ResizeCallbackData, ResizableBoxState} from './propTypes';

// ElementConfig gives us an object type where all items present in `defaultProps` are made optional.
// <ResizableBox> does not have defaultProps, so we can use this type to tell Flow that we don't
// care about that and will handle it in <Resizable> instead.
// A <ResizableBox> can also have a `style` property.
type ResizableBoxProps = {|...React.ElementConfig<typeof Resizable>, style?: Object, children?: ReactElement<any>|};

export default class ResizableBox extends React.Component<ResizableBoxProps, ResizableBoxState> {

  // PropTypes are identical to <Resizable>, except that children are not strictly required to be present.
  static propTypes = {
    ...resizableProps,
    children: PropTypes.element,
  };

  state: ResizableBoxState = {
    width: this.props.width,
    height: this.props.height,
    propsWidth: this.props.width,
    propsHeight: this.props.height,
  };

  static getDerivedStateFromProps(props: ResizableBoxProps, state: ResizableBoxState): ?ResizableBoxState {
    // If parent changes height/width, set that in our state.
    if (state.propsWidth !== props.width || state.propsHeight !== props.height) {
      return {
        width: props.width,
        height: props.height,
        propsWidth: props.width,
        propsHeight: props.height,
      };
    }
    return null;
  }

  onResize: (e: SyntheticEvent<>, data: ResizeCallbackData) => void = (e, data) => {
    const {size} = data;
    if (this.props.onResize) {
      e.persist?.();
      this.setState(size, () => this.props.onResize && this.props.onResize(e, data));
    } else {
      this.setState(size);
    }
  };

  render(): ReactNode {
    // Basic wrapper around a Resizable instance.
    // If you use Resizable directly, you are responsible for updating the child component
    // with a new width and height.
    const {
      handle,
      handleSize,
      onResize,
      onResizeStart,
      onResizeStop,
      draggableOpts,
      minConstraints,
      maxConstraints,
      lockAspectRatio,
      axis,
      width,
      height,
      resizeHandles,
      style,
      transformScale,
      ...props
    } = this.props;

    return (
      <Resizable
        axis={axis}
        draggableOpts={draggableOpts}
        handle={handle}
        handleSize={handleSize}
        height={this.state.height}
        lockAspectRatio={lockAspectRatio}
        maxConstraints={maxConstraints}
        minConstraints={minConstraints}
        onResizeStart={onResizeStart}
        onResize={this.onResize}
        onResizeStop={onResizeStop}
        resizeHandles={resizeHandles}
        transformScale={transformScale}
        width={this.state.width}
      >
        <div {...props} style={{...style, width: this.state.width + 'px', height: this.state.height + 'px'}} />
      </Resizable>
    );
  }
}
