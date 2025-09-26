import Animations from '../modules/Animations'
import Fill from '../modules/Fill'
import Filters from '../modules/Filters'
import Graphics from '../modules/Graphics'
import Markers from '../modules/Markers'

/**
 * ApexCharts Scatter Class.
 * This Class also handles bubbles chart as currently there is no major difference in drawing them,
 * @module Scatter
 **/
export default class Scatter {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.initialAnim = this.w.config.chart.animations.enabled
  }

  draw(elSeries, j, opts) {
    let w = this.w

    let graphics = new Graphics(this.ctx)

    let realIndex = opts.realIndex
    let pointsPos = opts.pointsPos
    let zRatio = opts.zRatio
    let elPointsMain = opts.elParent

    let elPointsWrap = graphics.group({
      class: `apexcharts-series-markers apexcharts-series-${w.config.chart.type}`,
    })

    elPointsWrap.attr('clip-path', `url(#gridRectMarkerMask${w.globals.cuid})`)

    if (Array.isArray(pointsPos.x)) {
      for (let q = 0; q < pointsPos.x.length; q++) {
        let dataPointIndex = j + 1
        let shouldDraw = true

        // a small hack as we have 2 points for the first val to connect it
        if (j === 0 && q === 0) dataPointIndex = 0
        if (j === 0 && q === 1) dataPointIndex = 1

        let radius = w.globals.markers.size[realIndex]

        if (zRatio !== Infinity) {
          // means we have a bubble
          const bubble = w.config.plotOptions.bubble
          radius = w.globals.seriesZ[realIndex][dataPointIndex]

          if (bubble.zScaling) {
            radius /= zRatio
          }

          if (bubble.minBubbleRadius && radius < bubble.minBubbleRadius) {
            radius = bubble.minBubbleRadius
          }

          if (bubble.maxBubbleRadius && radius > bubble.maxBubbleRadius) {
            radius = bubble.maxBubbleRadius
          }
        }

        let x = pointsPos.x[q]
        let y = pointsPos.y[q]

        radius = radius || 0

        if (
          y === null ||
          typeof w.globals.series[realIndex][dataPointIndex] === 'undefined'
        ) {
          shouldDraw = false
        }

        if (shouldDraw) {
          const point = this.drawPoint(
            x,
            y,
            radius,
            realIndex,
            dataPointIndex,
            j
          )
          elPointsWrap.add(point)
        }

        elPointsMain.add(elPointsWrap)
      }
    }
  }

  drawPoint(x, y, radius, realIndex, dataPointIndex, j) {
    const w = this.w

    let i = realIndex
    let anim = new Animations(this.ctx)
    let filters = new Filters(this.ctx)
    let fill = new Fill(this.ctx)
    let markers = new Markers(this.ctx)
    const graphics = new Graphics(this.ctx)

    const markerConfig = markers.getMarkerConfig({
      cssClass: 'apexcharts-marker',
      seriesIndex: i,
      dataPointIndex,
      radius:
        w.config.chart.type === 'bubble' ||
        (w.globals.comboCharts &&
          w.config.series[realIndex] &&
          w.config.series[realIndex].type === 'bubble')
          ? radius
          : null,
    })

    let pathFillCircle = fill.fillPath({
      seriesNumber: realIndex,
      dataPointIndex,
      color: markerConfig.pointFillColor,
      patternUnits: 'objectBoundingBox',
      value: w.globals.series[realIndex][j],
    })

    let el = graphics.drawMarker(x, y, markerConfig)

    if (w.config.series[i].data[dataPointIndex]) {
      if (w.config.series[i].data[dataPointIndex].fillColor) {
        pathFillCircle = w.config.series[i].data[dataPointIndex].fillColor
      }
    }

    el.attr({
      fill: pathFillCircle,
    })

    if (w.config.chart.dropShadow.enabled) {
      const dropShadow = w.config.chart.dropShadow
      filters.dropShadow(el, dropShadow, realIndex)
    }

    if (this.initialAnim && !w.globals.dataChanged && !w.globals.resized) {
      let speed = w.config.chart.animations.speed

      anim.animateMarker(el, speed, w.globals.easing, () => {
        window.setTimeout(() => {
          anim.animationCompleted(el)
        }, 100)
      })
    } else {
      w.globals.animationEnded = true
    }

    el.attr({
      rel: dataPointIndex,
      j: dataPointIndex,
      index: realIndex,
      'default-marker-size': markerConfig.pSize,
    })

    filters.setSelectionFilter(el, realIndex, dataPointIndex)
    markers.addEvents(el)

    el.node.classList.add('apexcharts-marker')

    return el
  }

  centerTextInBubble(y) {
    let w = this.w
    y = y + parseInt(w.config.dataLabels.style.fontSize, 10) / 4

    return {
      y,
    }
  }
}
