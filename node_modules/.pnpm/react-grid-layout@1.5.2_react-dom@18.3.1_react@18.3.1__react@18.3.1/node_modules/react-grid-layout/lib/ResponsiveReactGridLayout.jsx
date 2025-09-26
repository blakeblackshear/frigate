// @flow
import * as React from "react";
import PropTypes from "prop-types";
import { deepEqual } from "fast-equals";

import {
  cloneLayout,
  synchronizeLayoutWithChildren,
  validateLayout,
  noop,
  type Layout,
  type Pick
} from "./utils";
import {
  getBreakpointFromWidth,
  getColsFromBreakpoint,
  findOrGenerateResponsiveLayout,
  type ResponsiveLayout,
  type OnLayoutChangeCallback,
  type Breakpoints
} from "./responsiveUtils";
import ReactGridLayout from "./ReactGridLayout";

// $FlowFixMe[method-unbinding]
const type = obj => Object.prototype.toString.call(obj);

/**
 * Get a value of margin or containerPadding.
 *
 * @param  {Array | Object} param Margin | containerPadding, e.g. [10, 10] | {lg: [10, 10], ...}.
 * @param  {String} breakpoint   Breakpoint: lg, md, sm, xs and etc.
 * @return {Array}
 */
function getIndentationValue<T: ?[number, number]>(
  param: { [key: string]: T } | T,
  breakpoint: string
): T {
  // $FlowIgnore TODO fix this typedef
  if (param == null) return null;
  // $FlowIgnore TODO fix this typedef
  return Array.isArray(param) ? param : param[breakpoint];
}

type State = {
  layout: Layout,
  breakpoint: string,
  cols: number,
  layouts?: ResponsiveLayout<string>
};

type Props<Breakpoint: string = string> = {|
  ...React.ElementConfig<typeof ReactGridLayout>,

  // Responsive config
  breakpoint?: ?Breakpoint,
  breakpoints: Breakpoints<Breakpoint>,
  cols: { [key: Breakpoint]: number },
  layouts: ResponsiveLayout<Breakpoint>,
  width: number,
  margin: { [key: Breakpoint]: [number, number] } | [number, number],
  /* prettier-ignore */
  containerPadding: { [key: Breakpoint]: ?[number, number] } | ?[number, number],

  // Callbacks
  onBreakpointChange: (Breakpoint, cols: number) => void,
  onLayoutChange: OnLayoutChangeCallback,
  onWidthChange: (
    containerWidth: number,
    margin: [number, number],
    cols: number,
    containerPadding: ?[number, number]
  ) => void
|};

type DefaultProps = Pick<
  Props<>,
  {|
    allowOverlap: 0,
    breakpoints: 0,
    cols: 0,
    containerPadding: 0,
    layouts: 0,
    margin: 0,
    onBreakpointChange: 0,
    onLayoutChange: 0,
    onWidthChange: 0
  |}
>;

export default class ResponsiveReactGridLayout extends React.Component<
  Props<>,
  State
> {
  // This should only include propTypes needed in this code; RGL itself
  // will do validation of the rest props passed to it.
  static propTypes = {
    //
    // Basic props
    //

    // Optional, but if you are managing width yourself you may want to set the breakpoint
    // yourself as well.
    breakpoint: PropTypes.string,

    // {name: pxVal}, e.g. {lg: 1200, md: 996, sm: 768, xs: 480}
    breakpoints: PropTypes.object,

    allowOverlap: PropTypes.bool,

    // # of cols. This is a breakpoint -> cols map
    cols: PropTypes.object,

    // # of margin. This is a breakpoint -> margin map
    // e.g. { lg: [5, 5], md: [10, 10], sm: [15, 15] }
    // Margin between items [x, y] in px
    // e.g. [10, 10]
    margin: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),

    // # of containerPadding. This is a breakpoint -> containerPadding map
    // e.g. { lg: [5, 5], md: [10, 10], sm: [15, 15] }
    // Padding inside the container [x, y] in px
    // e.g. [10, 10]
    containerPadding: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),

    // layouts is an object mapping breakpoints to layouts.
    // e.g. {lg: Layout, md: Layout, ...}
    layouts(props: Props<>, propName: string) {
      if (type(props[propName]) !== "[object Object]") {
        throw new Error(
          "Layout property must be an object. Received: " +
            type(props[propName])
        );
      }
      Object.keys(props[propName]).forEach(key => {
        if (!(key in props.breakpoints)) {
          throw new Error(
            "Each key in layouts must align with a key in breakpoints."
          );
        }
        validateLayout(props.layouts[key], "layouts." + key);
      });
    },

    // The width of this component.
    // Required in this propTypes stanza because generateInitialState() will fail without it.
    width: PropTypes.number.isRequired,

    //
    // Callbacks
    //

    // Calls back with breakpoint and new # cols
    onBreakpointChange: PropTypes.func,

    // Callback so you can save the layout.
    // Calls back with (currentLayout, allLayouts). allLayouts are keyed by breakpoint.
    onLayoutChange: PropTypes.func,

    // Calls back with (containerWidth, margin, cols, containerPadding)
    onWidthChange: PropTypes.func
  };

  static defaultProps: DefaultProps = {
    breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
    cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
    containerPadding: { lg: null, md: null, sm: null, xs: null, xxs: null },
    layouts: {},
    margin: [10, 10],
    allowOverlap: false,
    onBreakpointChange: noop,
    onLayoutChange: noop,
    onWidthChange: noop
  };

  state: State = this.generateInitialState();

  generateInitialState(): State {
    const { width, breakpoints, layouts, cols } = this.props;
    const breakpoint = getBreakpointFromWidth(breakpoints, width);
    const colNo = getColsFromBreakpoint(breakpoint, cols);
    // verticalCompact compatibility, now deprecated
    const compactType =
      this.props.verticalCompact === false ? null : this.props.compactType;
    // Get the initial layout. This can tricky; we try to generate one however possible if one doesn't exist
    // for this layout.
    const initialLayout = findOrGenerateResponsiveLayout(
      layouts,
      breakpoints,
      breakpoint,
      breakpoint,
      colNo,
      compactType
    );

    return {
      layout: initialLayout,
      breakpoint: breakpoint,
      cols: colNo
    };
  }

  static getDerivedStateFromProps(
    nextProps: Props<*>,
    prevState: State
  ): ?$Shape<State> {
    if (!deepEqual(nextProps.layouts, prevState.layouts)) {
      // Allow parent to set layouts directly.
      const { breakpoint, cols } = prevState;

      // Since we're setting an entirely new layout object, we must generate a new responsive layout
      // if one does not exist.
      const newLayout = findOrGenerateResponsiveLayout(
        nextProps.layouts,
        nextProps.breakpoints,
        breakpoint,
        breakpoint,
        cols,
        nextProps.compactType
      );
      return { layout: newLayout, layouts: nextProps.layouts };
    }

    return null;
  }

  componentDidUpdate(prevProps: Props<*>) {
    // Allow parent to set width or breakpoint directly.
    if (
      this.props.width != prevProps.width ||
      this.props.breakpoint !== prevProps.breakpoint ||
      !deepEqual(this.props.breakpoints, prevProps.breakpoints) ||
      !deepEqual(this.props.cols, prevProps.cols)
    ) {
      this.onWidthChange(prevProps);
    }
  }

  // wrap layouts so we do not need to pass layouts to child
  onLayoutChange: Layout => void = (layout: Layout) => {
    this.props.onLayoutChange(layout, {
      ...this.props.layouts,
      [this.state.breakpoint]: layout
    });
  };

  /**
   * When the width changes work through breakpoints and reset state with the new width & breakpoint.
   * Width changes are necessary to figure out the widget widths.
   */
  onWidthChange(prevProps: Props<*>) {
    const { breakpoints, cols, layouts, compactType } = this.props;
    const newBreakpoint =
      this.props.breakpoint ||
      getBreakpointFromWidth(this.props.breakpoints, this.props.width);

    const lastBreakpoint = this.state.breakpoint;
    const newCols: number = getColsFromBreakpoint(newBreakpoint, cols);
    const newLayouts = { ...layouts };

    // Breakpoint change
    if (
      lastBreakpoint !== newBreakpoint ||
      prevProps.breakpoints !== breakpoints ||
      prevProps.cols !== cols
    ) {
      // Preserve the current layout if the current breakpoint is not present in the next layouts.
      if (!(lastBreakpoint in newLayouts))
        newLayouts[lastBreakpoint] = cloneLayout(this.state.layout);

      // Find or generate a new layout.
      let layout = findOrGenerateResponsiveLayout(
        newLayouts,
        breakpoints,
        newBreakpoint,
        lastBreakpoint,
        newCols,
        compactType
      );

      // This adds missing items.
      layout = synchronizeLayoutWithChildren(
        layout,
        this.props.children,
        newCols,
        compactType,
        this.props.allowOverlap
      );

      // Store the new layout.
      newLayouts[newBreakpoint] = layout;

      // callbacks
      this.props.onBreakpointChange(newBreakpoint, newCols);
      this.props.onLayoutChange(layout, newLayouts);

      this.setState({
        breakpoint: newBreakpoint,
        layout: layout,
        cols: newCols
      });
    }

    const margin = getIndentationValue(this.props.margin, newBreakpoint);
    const containerPadding = getIndentationValue(
      this.props.containerPadding,
      newBreakpoint
    );

    //call onWidthChange on every change of width, not only on breakpoint changes
    this.props.onWidthChange(
      this.props.width,
      margin,
      newCols,
      containerPadding
    );
  }

  render(): React.Element<typeof ReactGridLayout> {
    /* eslint-disable no-unused-vars */
    const {
      breakpoint,
      breakpoints,
      cols,
      layouts,
      margin,
      containerPadding,
      onBreakpointChange,
      onLayoutChange,
      onWidthChange,
      ...other
    } = this.props;
    /* eslint-enable no-unused-vars */

    return (
      <ReactGridLayout
        {...other}
        // $FlowIgnore should allow nullable here due to DefaultProps
        margin={getIndentationValue(margin, this.state.breakpoint)}
        containerPadding={getIndentationValue(
          containerPadding,
          this.state.breakpoint
        )}
        onLayoutChange={this.onLayoutChange}
        layout={this.state.layout}
        cols={this.state.cols}
      />
    );
  }
}
