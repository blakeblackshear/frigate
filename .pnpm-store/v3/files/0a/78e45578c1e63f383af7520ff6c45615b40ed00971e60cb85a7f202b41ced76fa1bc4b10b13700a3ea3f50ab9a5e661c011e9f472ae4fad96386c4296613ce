import Utils from './../../utils/Utils'

export default class Globals {
  initGlobalVars(gl) {
    gl.series = [] // the MAIN series array (y values)
    gl.seriesCandleO = []
    gl.seriesCandleH = []
    gl.seriesCandleM = []
    gl.seriesCandleL = []
    gl.seriesCandleC = []
    gl.seriesRangeStart = []
    gl.seriesRangeEnd = []
    gl.seriesRange = []
    gl.seriesPercent = []
    gl.seriesGoals = []
    gl.seriesX = []
    gl.seriesZ = []
    gl.seriesNames = []
    gl.seriesTotals = []
    gl.seriesLog = []
    gl.seriesColors = []
    gl.stackedSeriesTotals = []
    gl.seriesXvalues = [] // we will need this in tooltip (it's x position)
    // when we will have unequal x values, we will need
    // some way to get x value depending on mouse pointer
    gl.seriesYvalues = [] // we will need this when deciding which series
    // user hovered on
    gl.labels = []
    gl.hasXaxisGroups = false
    gl.groups = []
    gl.barGroups = []
    gl.lineGroups = []
    gl.areaGroups = []
    gl.hasSeriesGroups = false
    gl.seriesGroups = []
    gl.categoryLabels = []
    gl.timescaleLabels = []
    gl.noLabelsProvided = false
    gl.resizeTimer = null
    gl.selectionResizeTimer = null
    gl.lastWheelExecution = 0
    gl.delayedElements = []
    gl.pointsArray = []
    gl.dataLabelsRects = []
    gl.isXNumeric = false
    gl.skipLastTimelinelabel = false
    gl.skipFirstTimelinelabel = false
    gl.isDataXYZ = false
    gl.isMultiLineX = false
    gl.isMultipleYAxis = false
    gl.maxY = -Number.MAX_VALUE
    gl.minY = Number.MIN_VALUE
    gl.minYArr = []
    gl.maxYArr = []
    gl.maxX = -Number.MAX_VALUE
    gl.minX = Number.MAX_VALUE
    gl.initialMaxX = -Number.MAX_VALUE
    gl.initialMinX = Number.MAX_VALUE
    gl.maxDate = 0
    gl.minDate = Number.MAX_VALUE
    gl.minZ = Number.MAX_VALUE
    gl.maxZ = -Number.MAX_VALUE
    gl.minXDiff = Number.MAX_VALUE
    gl.yAxisScale = []
    gl.xAxisScale = null
    gl.xAxisTicksPositions = []
    gl.yLabelsCoords = []
    gl.yTitleCoords = []
    gl.barPadForNumericAxis = 0
    gl.padHorizontal = 0
    gl.xRange = 0
    gl.yRange = []
    gl.zRange = 0
    gl.dataPoints = 0
    gl.xTickAmount = 0
    gl.multiAxisTickAmount = 0
  }

  globalVars(config) {
    return {
      chartID: null, // chart ID - apexcharts-cuid
      cuid: null, // chart ID - random numbers excluding "apexcharts" part
      events: {
        beforeMount: [],
        mounted: [],
        updated: [],
        clicked: [],
        selection: [],
        dataPointSelection: [],
        zoomed: [],
        scrolled: [],
      },
      colors: [],
      clientX: null,
      clientY: null,
      fill: {
        colors: [],
      },
      stroke: {
        colors: [],
      },
      dataLabels: {
        style: {
          colors: [],
        },
      },
      radarPolygons: {
        fill: {
          colors: [],
        },
      },
      markers: {
        colors: [],
        size: config.markers.size,
        largestSize: 0,
      },
      animationEnded: false,
      isTouchDevice: 'ontouchstart' in window || navigator.msMaxTouchPoints,
      isDirty: false, // chart has been updated after the initial render. This is different than dataChanged property. isDirty means user manually called some method to update
      isExecCalled: false, // whether user updated the chart through the exec method
      initialConfig: null, // we will store the first config user has set to go back when user finishes interactions like zooming and come out of it
      initialSeries: [],
      lastXAxis: [],
      lastYAxis: [],
      columnSeries: null,
      labels: [], // store the text to draw on x axis
      // Don't mutate the labels, many things including tooltips depends on it!
      timescaleLabels: [], // store the timescaleLabels Labels in another variable
      noLabelsProvided: false, // if user didn't provide any categories/labels or x values, fallback to 1,2,3,4...
      allSeriesCollapsed: false,
      collapsedSeries: [], // when user collapses a series, it goes into this array
      collapsedSeriesIndices: [], // this stores the index of the collapsedSeries instead of whole object for quick access
      ancillaryCollapsedSeries: [], // when user collapses an "alwaysVisible" series, it goes into this array
      ancillaryCollapsedSeriesIndices: [], // this stores the index of the ancillaryCollapsedSeries whose y-axis is always visible
      risingSeries: [], // when user re-opens a collapsed series, it goes here
      dataFormatXNumeric: false, // boolean value to indicate user has passed numeric x values
      capturedSeriesIndex: -1,
      capturedDataPointIndex: -1,
      selectedDataPoints: [],
      invalidLogScale: false, // if a user enabled log scale but the data provided is not valid to generate a log scale, turn on this flag
      ignoreYAxisIndexes: [], // when series are being collapsed in multiple y axes, ignore certain index
      maxValsInArrayIndex: 0,
      radialSize: 0,
      selection: undefined,
      zoomEnabled:
        config.chart.toolbar.autoSelected === 'zoom' &&
        config.chart.toolbar.tools.zoom &&
        config.chart.zoom.enabled,
      panEnabled:
        config.chart.toolbar.autoSelected === 'pan' &&
        config.chart.toolbar.tools.pan,
      selectionEnabled:
        config.chart.toolbar.autoSelected === 'selection' &&
        config.chart.toolbar.tools.selection,
      yaxis: null,
      mousedown: false,
      lastClientPosition: {}, // don't reset this variable this the chart is destroyed. It is used to detect right or left mousemove in panning
      visibleXRange: undefined,
      yValueDecimal: 0, // are there floating numbers in the series. If yes, this represent the len of the decimals
      total: 0,
      SVGNS: 'http://www.w3.org/2000/svg', // svg namespace
      svgWidth: 0, // the whole svg width
      svgHeight: 0, // the whole svg height
      noData: false, // whether there is any data to display or not
      locale: {}, // the current locale values will be preserved here for global access
      dom: {}, // for storing all dom nodes in this particular property
      memory: {
        methodsToExec: [],
      },
      shouldAnimate: true,
      skipLastTimelinelabel: false, // when last label is cropped, skip drawing it
      skipFirstTimelinelabel: false, // when first label is cropped, skip drawing it
      delayedElements: [], // element which appear after animation has finished
      axisCharts: true, // chart type = line or area or bar
      // (refer them also as plot charts in the code)
      isDataXYZ: false, // bool: data was provided in a {[x,y,z]} pattern
      isSlopeChart: config.plotOptions.line.isSlopeChart,
      resized: false, // bool: user has resized
      resizeTimer: null, // timeout function to make a small delay before
      // drawing when user resized
      comboCharts: false, // bool: whether it's a combination of line/column
      dataChanged: false, // bool: has data changed dynamically
      previousPaths: [], // array: when data is changed, it will animate from
      // previous paths
      allSeriesHasEqualX: true,
      pointsArray: [], // store the points positions here to draw later on hover
      // format is - [[x,y],[x,y]... [x,y]]
      dataLabelsRects: [], // store the positions of datalabels to prevent collision
      lastDrawnDataLabelsIndexes: [],
      hasNullValues: false, // bool: whether series contains null values
      easing: null, // function: animation effect to apply
      zoomed: false, // whether user has zoomed or not
      gridWidth: 0, // drawable width of actual graphs (series paths)
      gridHeight: 0, // drawable height of actual graphs (series paths)
      rotateXLabels: false,
      defaultLabels: false,
      xLabelFormatter: undefined, // formatter for x axis labels
      yLabelFormatters: [],
      xaxisTooltipFormatter: undefined, // formatter for x axis tooltip
      ttKeyFormatter: undefined,
      ttVal: undefined,
      ttZFormatter: undefined,
      LINE_HEIGHT_RATIO: 1.618,
      xAxisLabelsHeight: 0,
      xAxisGroupLabelsHeight: 0,
      xAxisLabelsWidth: 0,
      yAxisLabelsWidth: 0,
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0,
      translateYAxisX: [],
      yAxisWidths: [],
      translateXAxisY: 0,
      translateXAxisX: 0,
      tooltip: null,
      // Rules for niceScaleAllowedMagMsd:
      // 1) An array of two arrays only ([[],[]]):
      //    * array[0][]: influences labelling of data series that contain only integers
      //       - must contain only integers (or expect ugly ticks)
      //    * array[1][]: influences labelling of data series that contain at least one float
      //       - may contain floats
      //    * both arrays:
      //       - each array[][i] ideally satisfy: 10 mod array[][i] == 0 (or expect ugly ticks)
      //       - to avoid clipping data point keep each array[][i] >= i
      // 2) each array[i][] contains 11 values, for all possible index values 0..10.
      //    array[][0] should not be needed (not proven) but ensures non-zero is returned.
      //
      // Users can effectively force their preferred "magMsd" through stepSize and
      // forceNiceScale. With forceNiceScale: true, stepSize becomes normalizable to the
      // axis's min..max range, which allows users to set stepSize to an integer 1..10, for
      // example, stepSize: 3. This value will be preferred to the value determined through
      // this array. The range-normalized value is checked for consistency with other
      // user defined options and will be ignored if inconsistent.
      niceScaleAllowedMagMsd: [
        [1, 1, 2, 5, 5, 5, 10, 10, 10, 10, 10],
        [1, 1, 2, 5, 5, 5, 10, 10, 10, 10, 10],
      ],
      // Default ticks based on SVG size. These values have high numbers
      // of divisors. The array is indexed using a calculated maxTicks value
      // divided by 2 simply to halve the array size. See Scales.niceScale().
      niceScaleDefaultTicks: [
        1, 2, 4, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 12, 12, 12, 12,
        12, 12, 12, 12, 12, 24,
      ],
      seriesYAxisMap: [], // Given yAxis index, return all series indices belonging to it. Multiple series can be referenced to each yAxis.
      seriesYAxisReverseMap: [], // Given a Series index, return its yAxis index.
    }
  }

  init(config) {
    let globals = this.globalVars(config)
    this.initGlobalVars(globals)

    globals.initialConfig = Utils.extend({}, config)
    globals.initialSeries = Utils.clone(config.series)

    globals.lastXAxis = Utils.clone(globals.initialConfig.xaxis)
    globals.lastYAxis = Utils.clone(globals.initialConfig.yaxis)
    return globals
  }
}
