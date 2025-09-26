// @flow
import * as React from "react";
import PropTypes from "prop-types";
import ResizeObserver from "resize-observer-polyfill";
import clsx from "clsx";
import type { ReactRef } from "../ReactGridLayoutPropTypes";

type WPDefaultProps = {|
  measureBeforeMount: boolean
|};

// eslint-disable-next-line no-unused-vars
type WPProps = {|
  className?: string,
  style?: Object,
  ...WPDefaultProps
|};

type WPState = {|
  width: number
|};

type ComposedProps<Config> = {|
  ...Config,
  measureBeforeMount?: boolean,
  className?: string,
  style?: Object,
  width?: number
|};

const layoutClassName = "react-grid-layout";

/*
 * A simple HOC that provides facility for listening to container resizes.
 *
 * The Flow type is pretty janky here. I can't just spread `WPProps` into this returned object - I wish I could - but it triggers
 * a flow bug of some sort that causes it to stop typechecking.
 */
export default function WidthProvideRGL<Config>(
  ComposedComponent: React.AbstractComponent<Config>
): React.AbstractComponent<ComposedProps<Config>> {
  return class WidthProvider extends React.Component<
    ComposedProps<Config>,
    WPState
  > {
    static defaultProps: WPDefaultProps = {
      measureBeforeMount: false
    };

    static propTypes = {
      // If true, will not render children until mounted. Useful for getting the exact width before
      // rendering, to prevent any unsightly resizing.
      measureBeforeMount: PropTypes.bool
    };

    state: WPState = {
      width: 1280
    };

    elementRef: ReactRef<HTMLDivElement> = React.createRef();
    mounted: boolean = false;
    resizeObserver: ResizeObserver;

    componentDidMount() {
      this.mounted = true;
      this.resizeObserver = new ResizeObserver(entries => {
        const node = this.elementRef.current;
        if (node instanceof HTMLElement) {
          const width = entries[0].contentRect.width;
          this.setState({ width });
        }
      });
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.observe(node);
      }
    }

    componentWillUnmount() {
      this.mounted = false;
      const node = this.elementRef.current;
      if (node instanceof HTMLElement) {
        this.resizeObserver.unobserve(node);
      }
      this.resizeObserver.disconnect();
    }

    render() {
      const { measureBeforeMount, ...rest } = this.props;
      if (measureBeforeMount && !this.mounted) {
        return (
          <div
            className={clsx(this.props.className, layoutClassName)}
            style={this.props.style}
            // $FlowIgnore ref types
            ref={this.elementRef}
          />
        );
      }

      return (
        <ComposedComponent
          innerRef={this.elementRef}
          {...rest}
          {...this.state}
        />
      );
    }
  };
}
