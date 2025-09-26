import Utils from '../../utils/Utils'

/**
 * ApexCharts Tooltip.Intersect Class.
 * This file deals with functions related to intersecting tooltips
 * (tooltips that appear when user hovers directly over a data-point whether)
 *
 * @module Tooltip.Intersect
 **/

class Intersect {
  constructor(tooltipContext) {
    this.w = tooltipContext.w
    const w = this.w
    this.ttCtx = tooltipContext

    this.isVerticalGroupedRangeBar =
      !w.globals.isBarHorizontal &&
      w.config.chart.type === 'rangeBar' &&
      w.config.plotOptions.bar.rangeBarGroupRows
  }

  // a helper function to get an element's attribute value
  getAttr(e, attr) {
    return parseFloat(e.target.getAttribute(attr))
  }

  // handle tooltip for heatmaps and treemaps
  handleHeatTreeTooltip({ e, opt, x, y, type }) {
    const ttCtx = this.ttCtx
    const w = this.w

    if (e.target.classList.contains(`apexcharts-${type}-rect`)) {
      let i = this.getAttr(e, 'i')
      let j = this.getAttr(e, 'j')
      let cx = this.getAttr(e, 'cx')
      let cy = this.getAttr(e, 'cy')
      let width = this.getAttr(e, 'width')
      let height = this.getAttr(e, 'height')

      ttCtx.tooltipLabels.drawSeriesTexts({
        ttItems: opt.ttItems,
        i,
        j,
        shared: false,
        e,
      })

      w.globals.capturedSeriesIndex = i
      w.globals.capturedDataPointIndex = j

      x = cx + ttCtx.tooltipRect.ttWidth / 2 + width
      y = cy + ttCtx.tooltipRect.ttHeight / 2 - height / 2

      ttCtx.tooltipPosition.moveXCrosshairs(cx + width / 2)

      if (x > w.globals.gridWidth / 2) {
        x = cx - ttCtx.tooltipRect.ttWidth / 2 + width
      }
      if (ttCtx.w.config.tooltip.followCursor) {
        let seriesBound = w.globals.dom.elWrap.getBoundingClientRect()
        x =
          w.globals.clientX -
          seriesBound.left -
          (x > w.globals.gridWidth / 2 ? ttCtx.tooltipRect.ttWidth : 0)
        y =
          w.globals.clientY -
          seriesBound.top -
          (y > w.globals.gridHeight / 2 ? ttCtx.tooltipRect.ttHeight : 0)
      }
    }

    return {
      x,
      y,
    }
  }

  /**
   * handle tooltips for line/area/scatter charts where tooltip.intersect is true
   * when user hovers over the marker directly, this function is executed
   */
  handleMarkerTooltip({ e, opt, x, y }) {
    let w = this.w
    const ttCtx = this.ttCtx

    let i
    let j
    if (e.target.classList.contains('apexcharts-marker')) {
      let cx = parseInt(opt.paths.getAttribute('cx'), 10)
      let cy = parseInt(opt.paths.getAttribute('cy'), 10)
      let val = parseFloat(opt.paths.getAttribute('val'))

      j = parseInt(opt.paths.getAttribute('rel'), 10)
      i =
        parseInt(
          opt.paths.parentNode.parentNode.parentNode.getAttribute('rel'),
          10
        ) - 1

      if (ttCtx.intersect) {
        const el = Utils.findAncestor(opt.paths, 'apexcharts-series')
        if (el) {
          i = parseInt(el.getAttribute('data:realIndex'), 10)
        }
      }

      ttCtx.tooltipLabels.drawSeriesTexts({
        ttItems: opt.ttItems,
        i,
        j,
        shared: ttCtx.showOnIntersect ? false : w.config.tooltip.shared,
        e,
      })

      if (e.type === 'mouseup') {
        ttCtx.markerClick(e, i, j)
      }

      w.globals.capturedSeriesIndex = i
      w.globals.capturedDataPointIndex = j

      x = cx
      y = cy + w.globals.translateY - ttCtx.tooltipRect.ttHeight * 1.4

      if (ttCtx.w.config.tooltip.followCursor) {
        const elGrid = ttCtx.getElGrid()
        const seriesBound = elGrid.getBoundingClientRect()
        y = ttCtx.e.clientY + w.globals.translateY - seriesBound.top
      }

      if (val < 0) {
        y = cy
      }
      ttCtx.marker.enlargeCurrentPoint(j, opt.paths, x, y)
    }

    return {
      x,
      y,
    }
  }

  /**
   * handle tooltips for bar/column charts
   */
  handleBarTooltip({ e, opt }) {
    const w = this.w
    const ttCtx = this.ttCtx

    const tooltipEl = ttCtx.getElTooltip()

    let bx = 0
    let x = 0
    let y = 0
    let i = 0
    let strokeWidth
    let barXY = this.getBarTooltipXY({
      e,
      opt,
    })
    i = barXY.i
    let j = barXY.j

    w.globals.capturedSeriesIndex = i
    w.globals.capturedDataPointIndex = j

    if (
      (w.globals.isBarHorizontal && ttCtx.tooltipUtil.hasBars()) ||
      !w.config.tooltip.shared
    ) {
      x = barXY.x
      y = barXY.y
      strokeWidth = Array.isArray(w.config.stroke.width)
        ? w.config.stroke.width[i]
        : w.config.stroke.width
      bx = x
    } else {
      if (!w.globals.comboCharts && !w.config.tooltip.shared) {
        // todo: re-check this condition as it's always 0
        bx = bx / 2
      }
    }

    // y is NaN, make it touch the bottom of grid area
    if (isNaN(y)) {
      y = w.globals.svgHeight - ttCtx.tooltipRect.ttHeight
    }

    const seriesIndex = parseInt(
      opt.paths.parentNode.getAttribute('data:realIndex'),
      10
    )

    const isReversed = w.globals.isMultipleYAxis
      ? w.config.yaxis[seriesIndex] && w.config.yaxis[seriesIndex].reversed
      : w.config.yaxis[0].reversed

    if (x + ttCtx.tooltipRect.ttWidth > w.globals.gridWidth) {
      x = x - ttCtx.tooltipRect.ttWidth
    } else if (x < 0) {
      x = 0
    }

    if (ttCtx.w.config.tooltip.followCursor) {
      const elGrid = ttCtx.getElGrid()
      const seriesBound = elGrid.getBoundingClientRect()
      y = ttCtx.e.clientY - seriesBound.top
    }

    // if tooltip is still null, querySelector
    if (ttCtx.tooltip === null) {
      ttCtx.tooltip = w.globals.dom.baseEl.querySelector('.apexcharts-tooltip')
    }

    if (!w.config.tooltip.shared) {
      if (w.globals.comboBarCount > 0) {
        ttCtx.tooltipPosition.moveXCrosshairs(bx + strokeWidth / 2)
      } else {
        ttCtx.tooltipPosition.moveXCrosshairs(bx)
      }
    }

    // move tooltip here
    if (
      !ttCtx.fixedTooltip &&
      (!w.config.tooltip.shared ||
        (w.globals.isBarHorizontal && ttCtx.tooltipUtil.hasBars()))
    ) {
      y = y + w.globals.translateY - ttCtx.tooltipRect.ttHeight / 2

      tooltipEl.style.left = x + w.globals.translateX + 'px'
      tooltipEl.style.top = y + 'px'
    }
  }

  getBarTooltipXY({ e, opt }) {
    let w = this.w
    let j = null
    const ttCtx = this.ttCtx
    let i = 0
    let x = 0
    let y = 0
    let barWidth = 0
    let barHeight = 0

    const cl = e.target.classList

    if (
      cl.contains('apexcharts-bar-area') ||
      cl.contains('apexcharts-candlestick-area') ||
      cl.contains('apexcharts-boxPlot-area') ||
      cl.contains('apexcharts-rangebar-area')
    ) {
      let bar = e.target
      let barRect = bar.getBoundingClientRect()

      let seriesBound = opt.elGrid.getBoundingClientRect()

      let bh = barRect.height
      barHeight = barRect.height
      let bw = barRect.width

      let cx = parseInt(bar.getAttribute('cx'), 10)
      let cy = parseInt(bar.getAttribute('cy'), 10)
      barWidth = parseFloat(bar.getAttribute('barWidth'))
      const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX

      j = parseInt(bar.getAttribute('j'), 10)
      i = parseInt(bar.parentNode.getAttribute('rel'), 10) - 1

      let y1 = bar.getAttribute('data-range-y1')
      let y2 = bar.getAttribute('data-range-y2')

      if (w.globals.comboCharts) {
        i = parseInt(bar.parentNode.getAttribute('data:realIndex'), 10)
      }

      const handleXForColumns = (x) => {
        if (w.globals.isXNumeric) {
          x = cx - bw / 2
        } else {
          if (this.isVerticalGroupedRangeBar) {
            x = cx + bw / 2
          } else {
            x = cx - ttCtx.dataPointsDividedWidth + bw / 2
          }
        }
        return x
      }

      const handleYForBars = () => {
        return (
          cy -
          ttCtx.dataPointsDividedHeight +
          bh / 2 -
          ttCtx.tooltipRect.ttHeight / 2
        )
      }

      ttCtx.tooltipLabels.drawSeriesTexts({
        ttItems: opt.ttItems,
        i,
        j,
        y1: y1 ? parseInt(y1, 10) : null,
        y2: y2 ? parseInt(y2, 10) : null,
        shared: ttCtx.showOnIntersect ? false : w.config.tooltip.shared,
        e,
      })

      if (w.config.tooltip.followCursor) {
        if (w.globals.isBarHorizontal) {
          x = clientX - seriesBound.left + 15
          y = handleYForBars()
        } else {
          x = handleXForColumns(x)
          y = e.clientY - seriesBound.top - ttCtx.tooltipRect.ttHeight / 2 - 15
        }
      } else {
        if (w.globals.isBarHorizontal) {
          x = cx
          if (x < ttCtx.xyRatios.baseLineInvertedY) {
            x = cx - ttCtx.tooltipRect.ttWidth
          }
          y = handleYForBars()
        } else {
          x = handleXForColumns(x)
          y = cy // - ttCtx.tooltipRect.ttHeight / 2 + 10
        }
      }
    }

    return {
      x,
      y,
      barHeight,
      barWidth,
      i,
      j,
    }
  }
}

export default Intersect
