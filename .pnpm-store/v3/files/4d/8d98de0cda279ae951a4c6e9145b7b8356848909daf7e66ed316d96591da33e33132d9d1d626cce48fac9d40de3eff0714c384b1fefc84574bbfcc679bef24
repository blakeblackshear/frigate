/**
 * ApexCharts Tooltip.AxesTooltip Class.
 * This file deals with the x-axis and y-axis tooltips.
 *
 * @module Tooltip.AxesTooltip
 **/

class AxesTooltip {
  constructor(tooltipContext) {
    this.w = tooltipContext.w
    this.ttCtx = tooltipContext
  }

  /**
   * This method adds the secondary tooltip which appears below x axis
   * @memberof Tooltip
   **/
  drawXaxisTooltip() {
    let w = this.w
    const ttCtx = this.ttCtx

    const isBottom = w.config.xaxis.position === 'bottom'

    ttCtx.xaxisOffY = isBottom
      ? w.globals.gridHeight + 1
      : -w.globals.xAxisHeight - w.config.xaxis.axisTicks.height + 3
    const tooltipCssClass = isBottom
      ? 'apexcharts-xaxistooltip apexcharts-xaxistooltip-bottom'
      : 'apexcharts-xaxistooltip apexcharts-xaxistooltip-top'

    let renderTo = w.globals.dom.elWrap

    if (ttCtx.isXAxisTooltipEnabled) {
      let xaxisTooltip = w.globals.dom.baseEl.querySelector(
        '.apexcharts-xaxistooltip'
      )

      if (xaxisTooltip === null) {
        ttCtx.xaxisTooltip = document.createElement('div')
        ttCtx.xaxisTooltip.setAttribute(
          'class',
          tooltipCssClass + ' apexcharts-theme-' + w.config.tooltip.theme
        )

        renderTo.appendChild(ttCtx.xaxisTooltip)

        ttCtx.xaxisTooltipText = document.createElement('div')
        ttCtx.xaxisTooltipText.classList.add('apexcharts-xaxistooltip-text')

        ttCtx.xaxisTooltipText.style.fontFamily =
          w.config.xaxis.tooltip.style.fontFamily || w.config.chart.fontFamily
        ttCtx.xaxisTooltipText.style.fontSize =
          w.config.xaxis.tooltip.style.fontSize

        ttCtx.xaxisTooltip.appendChild(ttCtx.xaxisTooltipText)
      }
    }
  }

  /**
   * This method adds the secondary tooltip which appears below x axis
   * @memberof Tooltip
   **/
  drawYaxisTooltip() {
    let w = this.w
    const ttCtx = this.ttCtx

    for (let i = 0; i < w.config.yaxis.length; i++) {
      const isRight =
        w.config.yaxis[i].opposite || w.config.yaxis[i].crosshairs.opposite

      ttCtx.yaxisOffX = isRight ? w.globals.gridWidth + 1 : 1
      let tooltipCssClass = isRight
        ? `apexcharts-yaxistooltip apexcharts-yaxistooltip-${i} apexcharts-yaxistooltip-right`
        : `apexcharts-yaxistooltip apexcharts-yaxistooltip-${i} apexcharts-yaxistooltip-left`

      let renderTo = w.globals.dom.elWrap

      let yaxisTooltip = w.globals.dom.baseEl.querySelector(
        `.apexcharts-yaxistooltip apexcharts-yaxistooltip-${i}`
      )

      if (yaxisTooltip === null) {
        ttCtx.yaxisTooltip = document.createElement('div')
        ttCtx.yaxisTooltip.setAttribute(
          'class',
          tooltipCssClass + ' apexcharts-theme-' + w.config.tooltip.theme
        )

        renderTo.appendChild(ttCtx.yaxisTooltip)

        if (i === 0) ttCtx.yaxisTooltipText = []

        ttCtx.yaxisTooltipText[i] = document.createElement('div')
        ttCtx.yaxisTooltipText[i].classList.add('apexcharts-yaxistooltip-text')

        ttCtx.yaxisTooltip.appendChild(ttCtx.yaxisTooltipText[i])
      }
    }
  }

  /**
   * @memberof Tooltip
   **/
  setXCrosshairWidth() {
    let w = this.w
    const ttCtx = this.ttCtx

    // set xcrosshairs width
    const xcrosshairs = ttCtx.getElXCrosshairs()
    ttCtx.xcrosshairsWidth = parseInt(w.config.xaxis.crosshairs.width, 10)

    if (!w.globals.comboCharts) {
      if (w.config.xaxis.crosshairs.width === 'tickWidth') {
        let count = w.globals.labels.length
        ttCtx.xcrosshairsWidth = w.globals.gridWidth / count
      } else if (w.config.xaxis.crosshairs.width === 'barWidth') {
        let bar = w.globals.dom.baseEl.querySelector('.apexcharts-bar-area')
        if (bar !== null) {
          let barWidth = parseFloat(bar.getAttribute('barWidth'))
          ttCtx.xcrosshairsWidth = barWidth
        } else {
          ttCtx.xcrosshairsWidth = 1
        }
      }
    } else {
      let bar = w.globals.dom.baseEl.querySelector('.apexcharts-bar-area')
      if (bar !== null && w.config.xaxis.crosshairs.width === 'barWidth') {
        let barWidth = parseFloat(bar.getAttribute('barWidth'))
        ttCtx.xcrosshairsWidth = barWidth
      } else {
        if (w.config.xaxis.crosshairs.width === 'tickWidth') {
          let count = w.globals.labels.length
          ttCtx.xcrosshairsWidth = w.globals.gridWidth / count
        }
      }
    }

    if (w.globals.isBarHorizontal) {
      ttCtx.xcrosshairsWidth = 0
    }
    if (xcrosshairs !== null && ttCtx.xcrosshairsWidth > 0) {
      xcrosshairs.setAttribute('width', ttCtx.xcrosshairsWidth)
    }
  }

  handleYCrosshair() {
    let w = this.w
    const ttCtx = this.ttCtx

    // set ycrosshairs height
    ttCtx.ycrosshairs = w.globals.dom.baseEl.querySelector(
      '.apexcharts-ycrosshairs'
    )

    ttCtx.ycrosshairsHidden = w.globals.dom.baseEl.querySelector(
      '.apexcharts-ycrosshairs-hidden'
    )
  }

  drawYaxisTooltipText(index, clientY, xyRatios) {
    const ttCtx = this.ttCtx
    const w = this.w
    const gl = w.globals
    const yAxisSeriesArr = gl.seriesYAxisMap[index]

    if (ttCtx.yaxisTooltips[index] && yAxisSeriesArr.length > 0) {
      const lbFormatter = gl.yLabelFormatters[index]
      const elGrid = ttCtx.getElGrid()
      const seriesBound = elGrid.getBoundingClientRect()

      // We can use the index of any series referenced by the Yaxis
      // because they will all return the same value.
      const seriesIndex = yAxisSeriesArr[0]
      let translationsIndex = 0
      if (xyRatios.yRatio.length > 1) {
        translationsIndex = seriesIndex
      }
      const hoverY =
        (clientY - seriesBound.top) * xyRatios.yRatio[translationsIndex]
      const height = gl.maxYArr[seriesIndex] - gl.minYArr[seriesIndex]
      let val = gl.minYArr[seriesIndex] + (height - hoverY)

      if (w.config.yaxis[index].reversed) {
        val = gl.maxYArr[seriesIndex] - (height - hoverY)
      }

      ttCtx.tooltipPosition.moveYCrosshairs(clientY - seriesBound.top)
      ttCtx.yaxisTooltipText[index].innerHTML = lbFormatter(val)
      ttCtx.tooltipPosition.moveYAxisTooltip(index)
    }
  }
}

export default AxesTooltip
