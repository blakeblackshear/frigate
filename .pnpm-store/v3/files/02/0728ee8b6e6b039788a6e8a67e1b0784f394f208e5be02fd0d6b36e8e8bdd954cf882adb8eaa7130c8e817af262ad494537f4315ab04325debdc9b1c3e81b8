import Defaults from './Defaults'
import Utils from './../../utils/Utils'
import Options from './Options'

/**
 * ApexCharts Config Class for extending user options with pre-defined ApexCharts config.
 *
 * @module Config
 **/
export default class Config {
  constructor(opts) {
    this.opts = opts
  }

  init({ responsiveOverride }) {
    let opts = this.opts
    let options = new Options()
    let defaults = new Defaults(opts)

    this.chartType = opts.chart.type

    opts = this.extendYAxis(opts)
    opts = this.extendAnnotations(opts)

    let config = options.init()
    let newDefaults = {}
    if (opts && typeof opts === 'object') {
      let chartDefaults = {}
      const chartTypes = [
        'line',
        'area',
        'bar',
        'candlestick',
        'boxPlot',
        'rangeBar',
        'rangeArea',
        'bubble',
        'scatter',
        'heatmap',
        'treemap',
        'pie',
        'polarArea',
        'donut',
        'radar',
        'radialBar',
      ]

      if (chartTypes.indexOf(opts.chart.type) !== -1) {
        chartDefaults = defaults[opts.chart.type]()
      } else {
        chartDefaults = defaults.line()
      }

      if (opts.plotOptions?.bar?.isFunnel) {
        chartDefaults = defaults.funnel()
      }

      if (opts.chart.stacked && opts.chart.type === 'bar') {
        chartDefaults = defaults.stackedBars()
      }

      if (opts.chart.brush?.enabled) {
        chartDefaults = defaults.brush(chartDefaults)
      }

      if (opts.plotOptions?.line?.isSlopeChart) {
        chartDefaults = defaults.slope()
      }

      if (opts.chart.stacked && opts.chart.stackType === '100%') {
        opts = defaults.stacked100(opts)
      }

      if (opts.plotOptions?.bar?.isDumbbell) {
        opts = defaults.dumbbell(opts)
      }

      // If user has specified a dark theme, make the tooltip dark too
      this.checkForDarkTheme(window.Apex) // check global window Apex options
      this.checkForDarkTheme(opts) // check locally passed options

      opts.xaxis = opts.xaxis || window.Apex.xaxis || {}

      // an important boolean needs to be set here
      // otherwise all the charts will have this flag set to true window.Apex.xaxis is set globally
      if (!responsiveOverride) {
        opts.xaxis.convertedCatToNumeric = false
      }

      opts = this.checkForCatToNumericXAxis(this.chartType, chartDefaults, opts)

      if (
        opts.chart.sparkline?.enabled ||
        window.Apex.chart?.sparkline?.enabled
      ) {
        chartDefaults = defaults.sparkline(chartDefaults)
      }
      newDefaults = Utils.extend(config, chartDefaults)
    }

    // config should cascade in this fashion
    // default-config < global-apex-variable-config < user-defined-config

    // get GLOBALLY defined options and merge with the default config
    let mergedWithDefaultConfig = Utils.extend(newDefaults, window.Apex)

    // get the merged config and extend with user defined config
    config = Utils.extend(mergedWithDefaultConfig, opts)

    // some features are not supported. those mismatches should be handled
    config = this.handleUserInputErrors(config)

    return config
  }

  checkForCatToNumericXAxis(chartType, chartDefaults, opts) {
    let defaults = new Defaults(opts)

    const isBarHorizontal =
      (chartType === 'bar' || chartType === 'boxPlot') &&
      opts.plotOptions?.bar?.horizontal

    const unsupportedZoom =
      chartType === 'pie' ||
      chartType === 'polarArea' ||
      chartType === 'donut' ||
      chartType === 'radar' ||
      chartType === 'radialBar' ||
      chartType === 'heatmap'

    const notNumericXAxis =
      opts.xaxis.type !== 'datetime' && opts.xaxis.type !== 'numeric'

    let tickPlacement = opts.xaxis.tickPlacement
      ? opts.xaxis.tickPlacement
      : chartDefaults.xaxis && chartDefaults.xaxis.tickPlacement
    if (
      !isBarHorizontal &&
      !unsupportedZoom &&
      notNumericXAxis &&
      tickPlacement !== 'between'
    ) {
      opts = defaults.convertCatToNumeric(opts)
    }

    return opts
  }

  extendYAxis(opts, w) {
    let options = new Options()

    if (
      typeof opts.yaxis === 'undefined' ||
      !opts.yaxis ||
      (Array.isArray(opts.yaxis) && opts.yaxis.length === 0)
    ) {
      opts.yaxis = {}
    }

    // extend global yaxis config (only if object is provided / not an array)
    if (
      opts.yaxis.constructor !== Array &&
      window.Apex.yaxis &&
      window.Apex.yaxis.constructor !== Array
    ) {
      opts.yaxis = Utils.extend(opts.yaxis, window.Apex.yaxis)
    }

    // as we can't extend nested object's array with extend, we need to do it first
    // user can provide either an array or object in yaxis config
    if (opts.yaxis.constructor !== Array) {
      // convert the yaxis to array if user supplied object
      opts.yaxis = [Utils.extend(options.yAxis, opts.yaxis)]
    } else {
      opts.yaxis = Utils.extendArray(opts.yaxis, options.yAxis)
    }

    let isLogY = false
    opts.yaxis.forEach((y) => {
      if (y.logarithmic) {
        isLogY = true
      }
    })

    let series = opts.series
    if (w && !series) {
      series = w.config.series
    }

    // A logarithmic chart works correctly when each series has a corresponding y-axis
    // If this is not the case, we manually create yaxis for multi-series log chart
    if (isLogY && series.length !== opts.yaxis.length && series.length) {
      opts.yaxis = series.map((s, i) => {
        if (!s.name) {
          series[i].name = `series-${i + 1}`
        }
        if (opts.yaxis[i]) {
          opts.yaxis[i].seriesName = series[i].name
          return opts.yaxis[i]
        } else {
          const newYaxis = Utils.extend(options.yAxis, opts.yaxis[0])
          newYaxis.show = false
          return newYaxis
        }
      })
    }

    if (isLogY && series.length > 1 && series.length !== opts.yaxis.length) {
      console.warn(
        'A multi-series logarithmic chart should have equal number of series and y-axes'
      )
    }
    return opts
  }

  // annotations also accepts array, so we need to extend them manually
  extendAnnotations(opts) {
    if (typeof opts.annotations === 'undefined') {
      opts.annotations = {}
      opts.annotations.yaxis = []
      opts.annotations.xaxis = []
      opts.annotations.points = []
    }

    opts = this.extendYAxisAnnotations(opts)
    opts = this.extendXAxisAnnotations(opts)
    opts = this.extendPointAnnotations(opts)

    return opts
  }

  extendYAxisAnnotations(opts) {
    let options = new Options()

    opts.annotations.yaxis = Utils.extendArray(
      typeof opts.annotations.yaxis !== 'undefined'
        ? opts.annotations.yaxis
        : [],
      options.yAxisAnnotation
    )
    return opts
  }

  extendXAxisAnnotations(opts) {
    let options = new Options()

    opts.annotations.xaxis = Utils.extendArray(
      typeof opts.annotations.xaxis !== 'undefined'
        ? opts.annotations.xaxis
        : [],
      options.xAxisAnnotation
    )
    return opts
  }
  extendPointAnnotations(opts) {
    let options = new Options()

    opts.annotations.points = Utils.extendArray(
      typeof opts.annotations.points !== 'undefined'
        ? opts.annotations.points
        : [],
      options.pointAnnotation
    )
    return opts
  }

  checkForDarkTheme(opts) {
    if (opts.theme && opts.theme.mode === 'dark') {
      if (!opts.tooltip) {
        opts.tooltip = {}
      }
      if (opts.tooltip.theme !== 'light') {
        opts.tooltip.theme = 'dark'
      }

      if (!opts.chart.foreColor) {
        opts.chart.foreColor = '#f6f7f8'
      }

      if (!opts.theme.palette) {
        opts.theme.palette = 'palette4'
      }
    }
  }

  handleUserInputErrors(opts) {
    let config = opts
    // conflicting tooltip option. intersect makes sure to focus on 1 point at a time. Shared cannot be used along with it
    if (config.tooltip.shared && config.tooltip.intersect) {
      throw new Error(
        'tooltip.shared cannot be enabled when tooltip.intersect is true. Turn off any other option by setting it to false.'
      )
    }

    if (config.chart.type === 'bar' && config.plotOptions.bar.horizontal) {
      // No multiple yaxis for bars
      if (config.yaxis.length > 1) {
        throw new Error(
          'Multiple Y Axis for bars are not supported. Switch to column chart by setting plotOptions.bar.horizontal=false'
        )
      }

      // if yaxis is reversed in horizontal bar chart, you should draw the y-axis on right side
      if (config.yaxis[0].reversed) {
        config.yaxis[0].opposite = true
      }

      config.xaxis.tooltip.enabled = false // no xaxis tooltip for horizontal bar
      config.yaxis[0].tooltip.enabled = false // no xaxis tooltip for horizontal bar
      config.chart.zoom.enabled = false // no zooming for horz bars
    }

    if (config.chart.type === 'bar' || config.chart.type === 'rangeBar') {
      if (config.tooltip.shared) {
        if (
          config.xaxis.crosshairs.width === 'barWidth' &&
          config.series.length > 1
        ) {
          config.xaxis.crosshairs.width = 'tickWidth'
        }
      }
    }

    if (
      config.chart.type === 'candlestick' ||
      config.chart.type === 'boxPlot'
    ) {
      if (config.yaxis[0].reversed) {
        console.warn(
          `Reversed y-axis in ${config.chart.type} chart is not supported.`
        )
        config.yaxis[0].reversed = false
      }
    }

    return config
  }
}
