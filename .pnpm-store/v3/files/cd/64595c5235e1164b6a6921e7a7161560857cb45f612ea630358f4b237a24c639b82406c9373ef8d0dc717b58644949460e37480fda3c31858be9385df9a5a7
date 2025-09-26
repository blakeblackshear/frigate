import Utils from '../../../utils/Utils'
import Graphics from '../../../modules/Graphics'
import DataLabels from '../../../modules/DataLabels'

export default class TreemapHelpers {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  checkColorRange() {
    const w = this.w

    let negRange = false
    let chartOpts = w.config.plotOptions[w.config.chart.type]

    if (chartOpts.colorScale.ranges.length > 0) {
      chartOpts.colorScale.ranges.map((range, index) => {
        if (range.from <= 0) {
          negRange = true
        }
      })
    }
    return negRange
  }

  getShadeColor(chartType, i, j, negRange) {
    const w = this.w

    let colorShadePercent = 1
    let shadeIntensity = w.config.plotOptions[chartType].shadeIntensity

    const colorProps = this.determineColor(chartType, i, j)

    if (w.globals.hasNegs || negRange) {
      if (w.config.plotOptions[chartType].reverseNegativeShade) {
        if (colorProps.percent < 0) {
          colorShadePercent =
            (colorProps.percent / 100) * (shadeIntensity * 1.25)
        } else {
          colorShadePercent =
            (1 - colorProps.percent / 100) * (shadeIntensity * 1.25)
        }
      } else {
        if (colorProps.percent <= 0) {
          colorShadePercent =
            1 - (1 + colorProps.percent / 100) * shadeIntensity
        } else {
          colorShadePercent = (1 - colorProps.percent / 100) * shadeIntensity
        }
      }
    } else {
      colorShadePercent = 1 - colorProps.percent / 100
      if (chartType === 'treemap') {
        colorShadePercent =
          (1 - colorProps.percent / 100) * (shadeIntensity * 1.25)
      }
    }

    let color = colorProps.color
    let utils = new Utils()

    if (w.config.plotOptions[chartType].enableShades) {
      // The shadeColor function may return either an RGB or a hex color value
      // However, hexToRgba requires the input to be in hex format
      // The ternary operator checks if the color is in RGB format, and if so, converts it to hex
      if (this.w.config.theme.mode === 'dark') {
        const shadeColor = utils.shadeColor(
          colorShadePercent * -1,
          colorProps.color
        )
        color = Utils.hexToRgba(
          Utils.isColorHex(shadeColor) ? shadeColor : Utils.rgb2hex(shadeColor),
          w.config.fill.opacity
        )
      } else {
        const shadeColor = utils.shadeColor(colorShadePercent, colorProps.color)
        color = Utils.hexToRgba(
          Utils.isColorHex(shadeColor) ? shadeColor : Utils.rgb2hex(shadeColor),
          w.config.fill.opacity
        )
      }
    }

    return { color, colorProps }
  }

  determineColor(chartType, i, j) {
    const w = this.w

    let val = w.globals.series[i][j]

    let chartOpts = w.config.plotOptions[chartType]

    let seriesNumber = chartOpts.colorScale.inverse ? j : i

    if (chartOpts.distributed && w.config.chart.type === 'treemap') {
      seriesNumber = j
    }

    let color = w.globals.colors[seriesNumber]
    let foreColor = null
    let min = Math.min(...w.globals.series[i])
    let max = Math.max(...w.globals.series[i])

    if (!chartOpts.distributed && chartType === 'heatmap') {
      min = w.globals.minY
      max = w.globals.maxY
    }

    if (typeof chartOpts.colorScale.min !== 'undefined') {
      min =
        chartOpts.colorScale.min < w.globals.minY
          ? chartOpts.colorScale.min
          : w.globals.minY
      max =
        chartOpts.colorScale.max > w.globals.maxY
          ? chartOpts.colorScale.max
          : w.globals.maxY
    }

    let total = Math.abs(max) + Math.abs(min)

    let percent = (100 * val) / (total === 0 ? total - 0.000001 : total)

    if (chartOpts.colorScale.ranges.length > 0) {
      const colorRange = chartOpts.colorScale.ranges
      colorRange.map((range, index) => {
        if (val >= range.from && val <= range.to) {
          color = range.color
          foreColor = range.foreColor ? range.foreColor : null
          min = range.from
          max = range.to
          let rTotal = Math.abs(max) + Math.abs(min)
          percent = (100 * val) / (rTotal === 0 ? rTotal - 0.000001 : rTotal)
        }
      })
    }

    return {
      color,
      foreColor,
      percent,
    }
  }

  calculateDataLabels({ text, x, y, i, j, colorProps, fontSize }) {
    let w = this.w
    let dataLabelsConfig = w.config.dataLabels

    const graphics = new Graphics(this.ctx)

    let dataLabels = new DataLabels(this.ctx)

    let elDataLabelsWrap = null

    if (dataLabelsConfig.enabled) {
      elDataLabelsWrap = graphics.group({
        class: 'apexcharts-data-labels',
      })

      const offX = dataLabelsConfig.offsetX
      const offY = dataLabelsConfig.offsetY

      let dataLabelsX = x + offX
      let dataLabelsY =
        y + parseFloat(dataLabelsConfig.style.fontSize) / 3 + offY

      dataLabels.plotDataLabelsText({
        x: dataLabelsX,
        y: dataLabelsY,
        text,
        i,
        j,
        color: colorProps.foreColor,
        parent: elDataLabelsWrap,
        fontSize,
        dataLabelsConfig,
      })
    }

    return elDataLabelsWrap
  }

  addListeners(elRect) {
    const graphics = new Graphics(this.ctx)
    elRect.node.addEventListener(
      'mouseenter',
      graphics.pathMouseEnter.bind(this, elRect)
    )
    elRect.node.addEventListener(
      'mouseleave',
      graphics.pathMouseLeave.bind(this, elRect)
    )
    elRect.node.addEventListener(
      'mousedown',
      graphics.pathMouseDown.bind(this, elRect)
    )
  }
}
