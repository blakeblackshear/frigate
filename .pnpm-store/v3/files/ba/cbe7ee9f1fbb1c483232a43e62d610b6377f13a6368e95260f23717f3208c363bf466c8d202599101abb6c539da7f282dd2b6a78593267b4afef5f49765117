import CoreUtils from '../modules/CoreUtils'
import Bar from './Bar'
import Fill from '../modules/Fill'
import Graphics from '../modules/Graphics'
import Utils from '../utils/Utils'

/**
 * ApexCharts BoxCandleStick Class responsible for drawing both Stacked Columns and Bars.
 *
 * @module BoxCandleStick
 **/

class BoxCandleStick extends Bar {
  draw(series, ctype, seriesIndex) {
    let w = this.w
    let graphics = new Graphics(this.ctx)
    let type = w.globals.comboCharts ? ctype : w.config.chart.type
    let fill = new Fill(this.ctx)

    this.candlestickOptions = this.w.config.plotOptions.candlestick
    this.boxOptions = this.w.config.plotOptions.boxPlot
    this.isHorizontal = w.config.plotOptions.bar.horizontal

    const coreUtils = new CoreUtils(this.ctx, w)
    series = coreUtils.getLogSeries(series)
    this.series = series
    this.yRatio = coreUtils.getLogYRatios(this.yRatio)

    this.barHelpers.initVariables(series)

    let ret = graphics.group({
      class: `apexcharts-${type}-series apexcharts-plot-series`,
    })

    for (let i = 0; i < series.length; i++) {
      this.isBoxPlot =
        w.config.chart.type === 'boxPlot' ||
        w.config.series[i].type === 'boxPlot'

      let x,
        y,
        xDivision, // xDivision is the GRIDWIDTH divided by number of datapoints (columns)
        yDivision, // yDivision is the GRIDHEIGHT divided by number of datapoints (bars)
        zeroH, // zeroH is the baseline where 0 meets y axis
        zeroW // zeroW is the baseline where 0 meets x axis

      let yArrj = [] // hold y values of current iterating series
      let xArrj = [] // hold x values of current iterating series

      let realIndex = w.globals.comboCharts ? seriesIndex[i] : i
      // As BoxCandleStick derives from Bar, we need this to render.
      let { columnGroupIndex } = this.barHelpers.getGroupIndex(realIndex)

      // el to which series will be drawn
      let elSeries = graphics.group({
        class: `apexcharts-series`,
        seriesName: Utils.escapeString(w.globals.seriesNames[realIndex]),
        rel: i + 1,
        'data:realIndex': realIndex,
      })

      this.ctx.series.addCollapsedClassToSeries(elSeries, realIndex)

      if (series[i].length > 0) {
        this.visibleI = this.visibleI + 1
      }

      let barHeight = 0
      let barWidth = 0

      let translationsIndex = 0
      if (this.yRatio.length > 1) {
        this.yaxisIndex = w.globals.seriesYAxisReverseMap[realIndex][0]
        translationsIndex = realIndex
      }

      let initPositions = this.barHelpers.initialPositions()

      y = initPositions.y
      barHeight = initPositions.barHeight
      yDivision = initPositions.yDivision
      zeroW = initPositions.zeroW

      x = initPositions.x
      barWidth = initPositions.barWidth
      xDivision = initPositions.xDivision
      zeroH = initPositions.zeroH

      xArrj.push(x + barWidth / 2)

      // eldatalabels
      let elDataLabelsWrap = graphics.group({
        class: 'apexcharts-datalabels',
        'data:realIndex': realIndex,
      })

      for (let j = 0; j < w.globals.dataPoints; j++) {
        const strokeWidth = this.barHelpers.getStrokeWidth(i, j, realIndex)

        let paths = null
        const pathsParams = {
          indexes: {
            i,
            j,
            realIndex,
            translationsIndex,
          },
          x,
          y,
          strokeWidth,
          elSeries,
        }

        if (this.isHorizontal) {
          paths = this.drawHorizontalBoxPaths({
            ...pathsParams,
            yDivision,
            barHeight,
            zeroW,
          })
        } else {
          paths = this.drawVerticalBoxPaths({
            ...pathsParams,
            xDivision,
            barWidth,
            zeroH,
          })
        }

        y = paths.y
        x = paths.x

        // push current X
        if (j > 0) {
          xArrj.push(x + barWidth / 2)
        }

        yArrj.push(y)

        paths.pathTo.forEach((pathTo, pi) => {
          let lineFill =
            !this.isBoxPlot && this.candlestickOptions.wick.useFillColor
              ? paths.color[pi]
              : w.globals.stroke.colors[i]

          let pathFill = fill.fillPath({
            seriesNumber: realIndex,
            dataPointIndex: j,
            color: paths.color[pi],
            value: series[i][j],
          })

          this.renderSeries({
            realIndex,
            pathFill,
            lineFill,
            j,
            i,
            pathFrom: paths.pathFrom,
            pathTo,
            strokeWidth,
            elSeries,
            x,
            y,
            series,
            columnGroupIndex,
            barHeight,
            barWidth,
            elDataLabelsWrap,
            visibleSeries: this.visibleI,
            type: w.config.chart.type,
          })
        })
      }

      // push all x val arrays into main xArr
      w.globals.seriesXvalues[realIndex] = xArrj
      w.globals.seriesYvalues[realIndex] = yArrj

      ret.add(elSeries)
    }

    return ret
  }

  drawVerticalBoxPaths({
    indexes,
    x,
    y,
    xDivision,
    barWidth,
    zeroH,
    strokeWidth,
  }) {
    let w = this.w
    let graphics = new Graphics(this.ctx)

    let i = indexes.i
    let j = indexes.j

    let isPositive = true
    let colorPos = w.config.plotOptions.candlestick.colors.upward
    let colorNeg = w.config.plotOptions.candlestick.colors.downward
    let color = ''

    if (this.isBoxPlot) {
      color = [this.boxOptions.colors.lower, this.boxOptions.colors.upper]
    }

    const yRatio = this.yRatio[indexes.translationsIndex]
    let realIndex = indexes.realIndex

    const ohlc = this.getOHLCValue(realIndex, j)
    let l1 = zeroH
    let l2 = zeroH

    if (ohlc.o > ohlc.c) {
      isPositive = false
    }

    let y1 = Math.min(ohlc.o, ohlc.c)
    let y2 = Math.max(ohlc.o, ohlc.c)
    let m = ohlc.m

    if (w.globals.isXNumeric) {
      x =
        (w.globals.seriesX[realIndex][j] - w.globals.minX) / this.xRatio -
        barWidth / 2
    }

    let barXPosition = x + barWidth * this.visibleI

    if (
      typeof this.series[i][j] === 'undefined' ||
      this.series[i][j] === null
    ) {
      y1 = zeroH
      y2 = zeroH
    } else {
      y1 = zeroH - y1 / yRatio
      y2 = zeroH - y2 / yRatio
      l1 = zeroH - ohlc.h / yRatio
      l2 = zeroH - ohlc.l / yRatio
      m = zeroH - ohlc.m / yRatio
    }

    let pathTo = graphics.move(barXPosition, zeroH)
    let pathFrom = graphics.move(barXPosition + barWidth / 2, y1)
    if (w.globals.previousPaths.length > 0) {
      pathFrom = this.getPreviousPath(realIndex, j, true)
    }

    if (this.isBoxPlot) {
      pathTo = [
        graphics.move(barXPosition, y1) +
          graphics.line(barXPosition + barWidth / 2, y1) +
          graphics.line(barXPosition + barWidth / 2, l1) +
          graphics.line(barXPosition + barWidth / 4, l1) +
          graphics.line(barXPosition + barWidth - barWidth / 4, l1) +
          graphics.line(barXPosition + barWidth / 2, l1) +
          graphics.line(barXPosition + barWidth / 2, y1) +
          graphics.line(barXPosition + barWidth, y1) +
          graphics.line(barXPosition + barWidth, m) +
          graphics.line(barXPosition, m) +
          graphics.line(barXPosition, y1 + strokeWidth / 2),
        graphics.move(barXPosition, m) +
          graphics.line(barXPosition + barWidth, m) +
          graphics.line(barXPosition + barWidth, y2) +
          graphics.line(barXPosition + barWidth / 2, y2) +
          graphics.line(barXPosition + barWidth / 2, l2) +
          graphics.line(barXPosition + barWidth - barWidth / 4, l2) +
          graphics.line(barXPosition + barWidth / 4, l2) +
          graphics.line(barXPosition + barWidth / 2, l2) +
          graphics.line(barXPosition + barWidth / 2, y2) +
          graphics.line(barXPosition, y2) +
          graphics.line(barXPosition, m) +
          'z',
      ]
    } else {
      // candlestick
      pathTo = [
        graphics.move(barXPosition, y2) +
          graphics.line(barXPosition + barWidth / 2, y2) +
          graphics.line(barXPosition + barWidth / 2, l1) +
          graphics.line(barXPosition + barWidth / 2, y2) +
          graphics.line(barXPosition + barWidth, y2) +
          graphics.line(barXPosition + barWidth, y1) +
          graphics.line(barXPosition + barWidth / 2, y1) +
          graphics.line(barXPosition + barWidth / 2, l2) +
          graphics.line(barXPosition + barWidth / 2, y1) +
          graphics.line(barXPosition, y1) +
          graphics.line(barXPosition, y2 - strokeWidth / 2),
      ]
    }

    pathFrom = pathFrom + graphics.move(barXPosition, y1)

    if (!w.globals.isXNumeric) {
      x = x + xDivision
    }

    return {
      pathTo,
      pathFrom,
      x,
      y: y2,
      barXPosition,
      color: this.isBoxPlot ? color : isPositive ? [colorPos] : [colorNeg],
    }
  }

  drawHorizontalBoxPaths({
    indexes,
    x,
    y,
    yDivision,
    barHeight,
    zeroW,
    strokeWidth,
  }) {
    let w = this.w
    let graphics = new Graphics(this.ctx)

    let i = indexes.i
    let j = indexes.j

    let color = this.boxOptions.colors.lower

    if (this.isBoxPlot) {
      color = [this.boxOptions.colors.lower, this.boxOptions.colors.upper]
    }

    const yRatio = this.invertedYRatio
    let realIndex = indexes.realIndex

    const ohlc = this.getOHLCValue(realIndex, j)
    let l1 = zeroW
    let l2 = zeroW

    let x1 = Math.min(ohlc.o, ohlc.c)
    let x2 = Math.max(ohlc.o, ohlc.c)
    let m = ohlc.m

    if (w.globals.isXNumeric) {
      y =
        (w.globals.seriesX[realIndex][j] - w.globals.minX) /
          this.invertedXRatio -
        barHeight / 2
    }

    let barYPosition = y + barHeight * this.visibleI

    if (
      typeof this.series[i][j] === 'undefined' ||
      this.series[i][j] === null
    ) {
      x1 = zeroW
      x2 = zeroW
    } else {
      x1 = zeroW + x1 / yRatio
      x2 = zeroW + x2 / yRatio
      l1 = zeroW + ohlc.h / yRatio
      l2 = zeroW + ohlc.l / yRatio
      m = zeroW + ohlc.m / yRatio
    }

    let pathTo = graphics.move(zeroW, barYPosition)
    let pathFrom = graphics.move(x1, barYPosition + barHeight / 2)
    if (w.globals.previousPaths.length > 0) {
      pathFrom = this.getPreviousPath(realIndex, j, true)
    }

    pathTo = [
      graphics.move(x1, barYPosition) +
        graphics.line(x1, barYPosition + barHeight / 2) +
        graphics.line(l1, barYPosition + barHeight / 2) +
        graphics.line(l1, barYPosition + barHeight / 2 - barHeight / 4) +
        graphics.line(l1, barYPosition + barHeight / 2 + barHeight / 4) +
        graphics.line(l1, barYPosition + barHeight / 2) +
        graphics.line(x1, barYPosition + barHeight / 2) +
        graphics.line(x1, barYPosition + barHeight) +
        graphics.line(m, barYPosition + barHeight) +
        graphics.line(m, barYPosition) +
        graphics.line(x1 + strokeWidth / 2, barYPosition),
      graphics.move(m, barYPosition) +
        graphics.line(m, barYPosition + barHeight) +
        graphics.line(x2, barYPosition + barHeight) +
        graphics.line(x2, barYPosition + barHeight / 2) +
        graphics.line(l2, barYPosition + barHeight / 2) +
        graphics.line(l2, barYPosition + barHeight - barHeight / 4) +
        graphics.line(l2, barYPosition + barHeight / 4) +
        graphics.line(l2, barYPosition + barHeight / 2) +
        graphics.line(x2, barYPosition + barHeight / 2) +
        graphics.line(x2, barYPosition) +
        graphics.line(m, barYPosition) +
        'z',
    ]

    pathFrom = pathFrom + graphics.move(x1, barYPosition)

    if (!w.globals.isXNumeric) {
      y = y + yDivision
    }

    return {
      pathTo,
      pathFrom,
      x: x2,
      y,
      barYPosition,
      color,
    }
  }
  getOHLCValue(i, j) {
    const w = this.w

    return {
      o: this.isBoxPlot
        ? w.globals.seriesCandleH[i][j]
        : w.globals.seriesCandleO[i][j],
      h: this.isBoxPlot
        ? w.globals.seriesCandleO[i][j]
        : w.globals.seriesCandleH[i][j],
      m: w.globals.seriesCandleM[i][j],
      l: this.isBoxPlot
        ? w.globals.seriesCandleC[i][j]
        : w.globals.seriesCandleL[i][j],
      c: this.isBoxPlot
        ? w.globals.seriesCandleL[i][j]
        : w.globals.seriesCandleC[i][j],
    }
  }
}

export default BoxCandleStick
