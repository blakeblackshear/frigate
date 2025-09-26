import AxesUtils from '../axes/AxesUtils'

export default class DimGrid {
  constructor(dCtx) {
    this.w = dCtx.w
    this.dCtx = dCtx
  }

  gridPadForColumnsInNumericAxis(gridWidth) {
    const { w } = this
    const { config: cnf, globals: gl } = w

    if (
      gl.noData ||
      gl.collapsedSeries.length + gl.ancillaryCollapsedSeries.length ===
        cnf.series.length
    ) {
      return 0
    }

    const hasBar = (type) =>
      ['bar', 'rangeBar', 'candlestick', 'boxPlot'].includes(type)

    const type = cnf.chart.type
    let barWidth = 0
    let seriesLen = hasBar(type) ? cnf.series.length : 1

    if (gl.comboBarCount > 0) {
      seriesLen = gl.comboBarCount
    }

    gl.collapsedSeries.forEach((c) => {
      if (hasBar(c.type)) {
        seriesLen -= 1
      }
    })

    if (cnf.chart.stacked) {
      seriesLen = 1
    }

    const barsPresent = hasBar(type) || gl.comboBarCount > 0
    let xRange = Math.abs(gl.initialMaxX - gl.initialMinX)

    if (
      barsPresent &&
      gl.isXNumeric &&
      !gl.isBarHorizontal &&
      seriesLen > 0 &&
      xRange !== 0
    ) {
      if (xRange <= 3) {
        xRange = gl.dataPoints
      }

      const xRatio = xRange / gridWidth
      let xDivision =
        gl.minXDiff && gl.minXDiff / xRatio > 0 ? gl.minXDiff / xRatio : 0

      if (xDivision > gridWidth / 2) {
        xDivision /= 2
      }
      // Here, barWidth is assumed to be the width occupied by a group of bars.
      // There will be one bar in the group for each series plotted.
      // Note: This version of the following math is different to that over in
      // Helpers.js. Don't assume they should be the same. Over there,
      // xDivision is computed differently and it's used on different charts.
      // They were the same, but the solution to
      // https://github.com/apexcharts/apexcharts.js/issues/4178
      // was to remove the division by seriesLen.
      barWidth =
        (xDivision * parseInt(cnf.plotOptions.bar.columnWidth, 10)) / 100

      if (barWidth < 1) {
        barWidth = 1
      }

      gl.barPadForNumericAxis = barWidth
    }

    return barWidth
  }

  gridPadFortitleSubtitle() {
    const { w } = this
    const { globals: gl } = w
    let gridShrinkOffset = this.dCtx.isSparkline || !gl.axisCharts ? 0 : 10

    const titleSubtitle = ['title', 'subtitle']

    titleSubtitle.forEach((t) => {
      if (w.config[t].text !== undefined) {
        gridShrinkOffset += w.config[t].margin
      } else {
        gridShrinkOffset += this.dCtx.isSparkline || !gl.axisCharts ? 0 : 5
      }
    })

    if (
      w.config.legend.show &&
      w.config.legend.position === 'bottom' &&
      !w.config.legend.floating &&
      !gl.axisCharts
    ) {
      gridShrinkOffset += 10
    }

    const titleCoords = this.dCtx.dimHelpers.getTitleSubtitleCoords('title')
    const subtitleCoords =
      this.dCtx.dimHelpers.getTitleSubtitleCoords('subtitle')

    gl.gridHeight -=
      titleCoords.height + subtitleCoords.height + gridShrinkOffset
    gl.translateY +=
      titleCoords.height + subtitleCoords.height + gridShrinkOffset
  }

  setGridXPosForDualYAxis(yTitleCoords, yaxisLabelCoords) {
    const { w } = this
    const axesUtils = new AxesUtils(this.dCtx.ctx)

    w.config.yaxis.forEach((yaxe, index) => {
      if (
        w.globals.ignoreYAxisIndexes.indexOf(index) === -1 &&
        !yaxe.floating &&
        !axesUtils.isYAxisHidden(index)
      ) {
        if (yaxe.opposite) {
          w.globals.translateX -=
            yaxisLabelCoords[index].width +
            yTitleCoords[index].width +
            parseInt(yaxe.labels.style.fontSize, 10) / 1.2 +
            12
        }

        // fixes apexcharts.js#1599
        if (w.globals.translateX < 2) {
          w.globals.translateX = 2
        }
      }
    })
  }
}
