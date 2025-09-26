import Animations from '../modules/Animations'
import Graphics from '../modules/Graphics'
import Fill from '../modules/Fill'
import Utils from '../utils/Utils'
import Helpers from './common/treemap/Helpers'
import Filters from '../modules/Filters'

/**
 * ApexCharts HeatMap Class.
 * @module HeatMap
 **/

export default class HeatMap {
  constructor(ctx, xyRatios) {
    this.ctx = ctx
    this.w = ctx.w

    this.xRatio = xyRatios.xRatio
    this.yRatio = xyRatios.yRatio

    this.dynamicAnim = this.w.config.chart.animations.dynamicAnimation

    this.helpers = new Helpers(ctx)
    this.rectRadius = this.w.config.plotOptions.heatmap.radius
    this.strokeWidth = this.w.config.stroke.show
      ? this.w.config.stroke.width
      : 0
  }

  draw(series) {
    let w = this.w
    const graphics = new Graphics(this.ctx)

    let ret = graphics.group({
      class: 'apexcharts-heatmap',
    })

    ret.attr('clip-path', `url(#gridRectMask${w.globals.cuid})`)

    // width divided into equal parts
    let xDivision = w.globals.gridWidth / w.globals.dataPoints
    let yDivision = w.globals.gridHeight / w.globals.series.length

    let y1 = 0
    let rev = false

    this.negRange = this.helpers.checkColorRange()

    let heatSeries = series.slice()

    if (w.config.yaxis[0].reversed) {
      rev = true
      heatSeries.reverse()
    }

    for (
      let i = rev ? 0 : heatSeries.length - 1;
      rev ? i < heatSeries.length : i >= 0;
      rev ? i++ : i--
    ) {
      // el to which series will be drawn
      let elSeries = graphics.group({
        class: `apexcharts-series apexcharts-heatmap-series`,
        seriesName: Utils.escapeString(w.globals.seriesNames[i]),
        rel: i + 1,
        'data:realIndex': i,
      })
      this.ctx.series.addCollapsedClassToSeries(elSeries, i)

      if (w.config.chart.dropShadow.enabled) {
        const shadow = w.config.chart.dropShadow
        const filters = new Filters(this.ctx)
        filters.dropShadow(elSeries, shadow, i)
      }

      let x1 = 0
      let shadeIntensity = w.config.plotOptions.heatmap.shadeIntensity

      for (let j = 0; j < heatSeries[i].length; j++) {
        let heatColor = this.helpers.getShadeColor(
          w.config.chart.type,
          i,
          j,
          this.negRange
        )
        let color = heatColor.color
        let heatColorProps = heatColor.colorProps

        if (w.config.fill.type === 'image') {
          const fill = new Fill(this.ctx)

          color = fill.fillPath({
            seriesNumber: i,
            dataPointIndex: j,
            opacity: w.globals.hasNegs
              ? heatColorProps.percent < 0
                ? 1 - (1 + heatColorProps.percent / 100)
                : shadeIntensity + heatColorProps.percent / 100
              : heatColorProps.percent / 100,
            patternID: Utils.randomId(),
            width: w.config.fill.image.width
              ? w.config.fill.image.width
              : xDivision,
            height: w.config.fill.image.height
              ? w.config.fill.image.height
              : yDivision,
          })
        }

        let radius = this.rectRadius

        let rect = graphics.drawRect(x1, y1, xDivision, yDivision, radius)
        rect.attr({
          cx: x1,
          cy: y1,
        })

        rect.node.classList.add('apexcharts-heatmap-rect')
        elSeries.add(rect)

        rect.attr({
          fill: color,
          i,
          index: i,
          j,
          val: series[i][j],
          'stroke-width': this.strokeWidth,
          stroke: w.config.plotOptions.heatmap.useFillColorAsStroke
            ? color
            : w.globals.stroke.colors[0],
          color,
        })

        this.helpers.addListeners(rect)

        if (w.config.chart.animations.enabled && !w.globals.dataChanged) {
          let speed = 1
          if (!w.globals.resized) {
            speed = w.config.chart.animations.speed
          }
          this.animateHeatMap(rect, x1, y1, xDivision, yDivision, speed)
        }

        if (w.globals.dataChanged) {
          let speed = 1
          if (this.dynamicAnim.enabled && w.globals.shouldAnimate) {
            speed = this.dynamicAnim.speed

            let colorFrom =
              w.globals.previousPaths[i] &&
              w.globals.previousPaths[i][j] &&
              w.globals.previousPaths[i][j].color

            if (!colorFrom) colorFrom = 'rgba(255, 255, 255, 0)'

            this.animateHeatColor(
              rect,
              Utils.isColorHex(colorFrom)
                ? colorFrom
                : Utils.rgb2hex(colorFrom),
              Utils.isColorHex(color) ? color : Utils.rgb2hex(color),
              speed
            )
          }
        }

        let formatter = w.config.dataLabels.formatter
        let formattedText = formatter(w.globals.series[i][j], {
          value: w.globals.series[i][j],
          seriesIndex: i,
          dataPointIndex: j,
          w,
        })

        let dataLabels = this.helpers.calculateDataLabels({
          text: formattedText,
          x: x1 + xDivision / 2,
          y: y1 + yDivision / 2,
          i,
          j,
          colorProps: heatColorProps,
          series: heatSeries,
        })
        if (dataLabels !== null) {
          elSeries.add(dataLabels)
        }

        x1 = x1 + xDivision
      }

      y1 = y1 + yDivision

      ret.add(elSeries)
    }

    // adjust yaxis labels for heatmap
    let yAxisScale = w.globals.yAxisScale[0].result.slice()
    if (w.config.yaxis[0].reversed) {
      yAxisScale.unshift('')
    } else {
      yAxisScale.push('')
    }
    w.globals.yAxisScale[0].result = yAxisScale

    return ret
  }

  animateHeatMap(el, x, y, width, height, speed) {
    const animations = new Animations(this.ctx)
    animations.animateRect(
      el,
      {
        x: x + width / 2,
        y: y + height / 2,
        width: 0,
        height: 0,
      },
      {
        x,
        y,
        width,
        height,
      },
      speed,
      () => {
        animations.animationCompleted(el)
      }
    )
  }

  animateHeatColor(el, colorFrom, colorTo, speed) {
    el.attr({
      fill: colorFrom,
    })
      .animate(speed)
      .attr({
        fill: colorTo,
      })
  }
}
