import Utils from '../utils/Utils'

/**
 * ApexCharts Theme Class for setting the colors and palettes.
 *
 * @module Theme
 **/

export default class Theme {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
    this.colors = []
    this.isColorFn = false
    this.isHeatmapDistributed = this.checkHeatmapDistributed()
    this.isBarDistributed = this.checkBarDistributed()
  }

  checkHeatmapDistributed() {
    const { chart, plotOptions } = this.w.config
    return (
      (chart.type === 'treemap' &&
        plotOptions.treemap &&
        plotOptions.treemap.distributed) ||
      (chart.type === 'heatmap' &&
        plotOptions.heatmap &&
        plotOptions.heatmap.distributed)
    )
  }

  checkBarDistributed() {
    const { chart, plotOptions } = this.w.config
    return (
      plotOptions.bar &&
      plotOptions.bar.distributed &&
      (chart.type === 'bar' || chart.type === 'rangeBar')
    )
  }

  init() {
    this.setDefaultColors()
  }

  setDefaultColors() {
    const w = this.w
    const utils = new Utils()

    w.globals.dom.elWrap.classList.add(
      `apexcharts-theme-${w.config.theme.mode}`
    )

    // Create a copy of config.colors array to avoid mutating the original config.colors
    const configColors = [...(w.config.colors || w.config.fill.colors || [])]
    w.globals.colors = this.getColors(configColors)

    this.applySeriesColors(w.globals.seriesColors, w.globals.colors)

    if (w.config.theme.monochrome.enabled) {
      w.globals.colors = this.getMonochromeColors(
        w.config.theme.monochrome,
        w.globals.series,
        utils
      )
    }

    const defaultColors = w.globals.colors.slice()
    this.pushExtraColors(w.globals.colors)

    this.applyColorTypes(['fill', 'stroke'], defaultColors)
    this.applyDataLabelsColors(defaultColors)
    this.applyRadarPolygonsColors()
    this.applyMarkersColors(defaultColors)
  }

  getColors(configColors) {
    const w = this.w
    if (!configColors || configColors.length === 0) {
      return this.predefined()
    }

    if (
      Array.isArray(configColors) &&
      configColors.length > 0 &&
      typeof configColors[0] === 'function'
    ) {
      this.isColorFn = true
      return w.config.series.map((s, i) => {
        let c = configColors[i] || configColors[0]
        return typeof c === 'function'
          ? c({
              value: w.globals.axisCharts
                ? w.globals.series[i][0] || 0
                : w.globals.series[i],
              seriesIndex: i,
              dataPointIndex: i,
              w: this.w,
            })
          : c
      })
    }

    return configColors
  }

  applySeriesColors(seriesColors, globalsColors) {
    seriesColors.forEach((c, i) => {
      if (c) {
        globalsColors[i] = c
      }
    })
  }

  getMonochromeColors(monochrome, series, utils) {
    const { color, shadeIntensity, shadeTo } = monochrome
    const glsCnt =
      this.isBarDistributed || this.isHeatmapDistributed
        ? series[0].length * series.length
        : series.length
    const part = 1 / (glsCnt / shadeIntensity)
    let percent = 0

    return Array.from({ length: glsCnt }, () => {
      const newColor =
        shadeTo === 'dark'
          ? utils.shadeColor(percent * -1, color)
          : utils.shadeColor(percent, color)
      percent += part
      return newColor
    })
  }

  applyColorTypes(colorTypes, defaultColors) {
    const w = this.w
    colorTypes.forEach((c) => {
      w.globals[c].colors =
        w.config[c].colors === undefined
          ? this.isColorFn
            ? w.config.colors
            : defaultColors
          : w.config[c].colors.slice()
      this.pushExtraColors(w.globals[c].colors)
    })
  }

  applyDataLabelsColors(defaultColors) {
    const w = this.w
    w.globals.dataLabels.style.colors =
      w.config.dataLabels.style.colors === undefined
        ? defaultColors
        : w.config.dataLabels.style.colors.slice()
    this.pushExtraColors(w.globals.dataLabels.style.colors, 50)
  }

  applyRadarPolygonsColors() {
    const w = this.w
    w.globals.radarPolygons.fill.colors =
      w.config.plotOptions.radar.polygons.fill.colors === undefined
        ? [w.config.theme.mode === 'dark' ? '#424242' : 'none']
        : w.config.plotOptions.radar.polygons.fill.colors.slice()
    this.pushExtraColors(w.globals.radarPolygons.fill.colors, 20)
  }

  applyMarkersColors(defaultColors) {
    const w = this.w
    w.globals.markers.colors =
      w.config.markers.colors === undefined
        ? defaultColors
        : w.config.markers.colors.slice()
    this.pushExtraColors(w.globals.markers.colors)
  }

  pushExtraColors(colorSeries, length, distributed = null) {
    const w = this.w
    let len = length || w.globals.series.length

    if (distributed === null) {
      distributed =
        this.isBarDistributed ||
        this.isHeatmapDistributed ||
        (w.config.chart.type === 'heatmap' &&
          w.config.plotOptions.heatmap &&
          w.config.plotOptions.heatmap.colorScale.inverse)
    }

    if (distributed && w.globals.series.length) {
      len =
        w.globals.series[w.globals.maxValsInArrayIndex].length *
        w.globals.series.length
    }

    if (colorSeries.length < len) {
      let diff = len - colorSeries.length
      for (let i = 0; i < diff; i++) {
        colorSeries.push(colorSeries[i])
      }
    }
  }

  updateThemeOptions(options) {
    options.chart = options.chart || {}
    options.tooltip = options.tooltip || {}
    const mode = options.theme.mode
    const palette =
      mode === 'dark'
        ? 'palette4'
        : mode === 'light'
        ? 'palette1'
        : options.theme.palette || 'palette1'
    const foreColor =
      mode === 'dark'
        ? '#f6f7f8'
        : mode === 'light'
        ? '#373d3f'
        : options.chart.foreColor || '#373d3f'

    options.tooltip.theme = mode || 'light'
    options.chart.foreColor = foreColor
    options.theme.palette = palette

    return options
  }

  predefined() {
    const palette = this.w.config.theme.palette
    const palettes = {
      palette1: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
      palette2: ['#3f51b5', '#03a9f4', '#4caf50', '#f9ce1d', '#FF9800'],
      palette3: ['#33b2df', '#546E7A', '#d4526e', '#13d8aa', '#A5978B'],
      palette4: ['#4ecdc4', '#c7f464', '#81D4FA', '#fd6a6a', '#546E7A'],
      palette5: ['#2b908f', '#f9a3a4', '#90ee7e', '#fa4443', '#69d2e7'],
      palette6: ['#449DD1', '#F86624', '#EA3546', '#662E9B', '#C5D86D'],
      palette7: ['#D7263D', '#1B998B', '#2E294E', '#F46036', '#E2C044'],
      palette8: ['#662E9B', '#F86624', '#F9C80E', '#EA3546', '#43BCCD'],
      palette9: ['#5C4742', '#A5978B', '#8D5B4C', '#5A2A27', '#C4BBAF'],
      palette10: ['#A300D6', '#7D02EB', '#5653FE', '#2983FF', '#00B1F2'],
      default: ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'],
    }
    return palettes[palette] || palettes.default
  }
}
