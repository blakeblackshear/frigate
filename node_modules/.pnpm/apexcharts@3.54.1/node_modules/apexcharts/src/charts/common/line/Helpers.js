import CoreUtils from '../../../modules/CoreUtils'
import Utils from '../../../utils/Utils'

export default class Helpers {
  constructor(lineCtx) {
    this.w = lineCtx.w
    this.lineCtx = lineCtx
  }

  sameValueSeriesFix(i, series) {
    const w = this.w

    if (
      w.config.fill.type === 'gradient' ||
      w.config.fill.type[i] === 'gradient'
    ) {
      const coreUtils = new CoreUtils(this.lineCtx.ctx, w)

      // applied only to LINE chart
      // a small adjustment to allow gradient line to draw correctly for all same values
      /* #fix https://github.com/apexcharts/apexcharts.js/issues/358 */
      if (coreUtils.seriesHaveSameValues(i)) {
        let gSeries = series[i].slice()
        gSeries[gSeries.length - 1] = gSeries[gSeries.length - 1] + 0.000001
        series[i] = gSeries
      }
    }
    return series
  }

  calculatePoints({ series, realIndex, x, y, i, j, prevY }) {
    let w = this.w

    let ptX = []
    let ptY = []

    if (j === 0) {
      let xPT1st =
        this.lineCtx.categoryAxisCorrection + w.config.markers.offsetX
      // the first point for line series
      // we need to check whether it's not a time series, because a time series may
      // start from the middle of the x axis
      if (w.globals.isXNumeric) {
        xPT1st =
          (w.globals.seriesX[realIndex][0] - w.globals.minX) /
            this.lineCtx.xRatio +
          w.config.markers.offsetX
      }

      // push 2 points for the first data values
      ptX.push(xPT1st)
      ptY.push(
        Utils.isNumber(series[i][0]) ? prevY + w.config.markers.offsetY : null
      )
      ptX.push(x + w.config.markers.offsetX)
      ptY.push(
        Utils.isNumber(series[i][j + 1]) ? y + w.config.markers.offsetY : null
      )
    } else {
      ptX.push(x + w.config.markers.offsetX)
      ptY.push(
        Utils.isNumber(series[i][j + 1]) ? y + w.config.markers.offsetY : null
      )
    }

    let pointsPos = {
      x: ptX,
      y: ptY,
    }

    return pointsPos
  }

  checkPreviousPaths({ pathFromLine, pathFromArea, realIndex }) {
    let w = this.w

    for (let pp = 0; pp < w.globals.previousPaths.length; pp++) {
      let gpp = w.globals.previousPaths[pp]

      if (
        (gpp.type === 'line' || gpp.type === 'area') &&
        gpp.paths.length > 0 &&
        parseInt(gpp.realIndex, 10) === parseInt(realIndex, 10)
      ) {
        if (gpp.type === 'line') {
          this.lineCtx.appendPathFrom = false
          pathFromLine = w.globals.previousPaths[pp].paths[0].d
        } else if (gpp.type === 'area') {
          this.lineCtx.appendPathFrom = false
          pathFromArea = w.globals.previousPaths[pp].paths[0].d

          if (w.config.stroke.show && w.globals.previousPaths[pp].paths[1]) {
            pathFromLine = w.globals.previousPaths[pp].paths[1].d
          }
        }
      }
    }

    return {
      pathFromLine,
      pathFromArea,
    }
  }

  determineFirstPrevY({ i, realIndex, series, prevY, lineYPosition, translationsIndex }) {
    let w = this.w
    let stackSeries =
      (w.config.chart.stacked && !w.globals.comboCharts) ||
      (w.config.chart.stacked &&
        w.globals.comboCharts &&
        (!this.w.config.chart.stackOnlyBar ||
          this.w.config.series[realIndex]?.type === 'bar'
          || this.w.config.series[realIndex]?.type === 'column'))

    if (typeof series[i]?.[0] !== 'undefined') {
      if (stackSeries) {
        if (i > 0) {
          // 1st y value of previous series
          lineYPosition = this.lineCtx.prevSeriesY[i - 1][0]
        } else {
          // the first series will not have prevY values
          lineYPosition = this.lineCtx.zeroY
        }
      } else {
        lineYPosition = this.lineCtx.zeroY
      }
      prevY =
        lineYPosition -
        series[i][0] / this.lineCtx.yRatio[translationsIndex] +
        (this.lineCtx.isReversed 
          ? series[i][0] / this.lineCtx.yRatio[translationsIndex] : 0) * 2
    } else {
      // the first value in the current series is null
      if (stackSeries && i > 0 && typeof series[i][0] === 'undefined') {
        // check for undefined value (undefined value will occur when we clear the series while user clicks on legend to hide serieses)
        for (let s = i - 1; s >= 0; s--) {
          // for loop to get to 1st previous value until we get it
          if (series[s][0] !== null && typeof series[s][0] !== 'undefined') {
            lineYPosition = this.lineCtx.prevSeriesY[s][0]
            prevY = lineYPosition
            break
          }
        }
      }
    }
    return {
      prevY,
      lineYPosition,
    }
  }
}
