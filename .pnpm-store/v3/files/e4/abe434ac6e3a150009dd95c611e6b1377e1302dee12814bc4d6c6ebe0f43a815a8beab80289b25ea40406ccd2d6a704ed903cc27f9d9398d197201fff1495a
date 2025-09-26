import Utils from '../utils/Utils'
import DateTime from '../utils/DateTime'
import Scales from './Scales'

/**
 * Range is used to generates values between min and max.
 *
 * @module Range
 **/

class Range {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.scales = new Scales(ctx)
  }

  init() {
    this.setYRange()
    this.setXRange()
    this.setZRange()
  }

  getMinYMaxY(
    startingSeriesIndex,
    lowestY = Number.MAX_VALUE,
    highestY = -Number.MAX_VALUE,
    endingSeriesIndex = null
  ) {
    const cnf = this.w.config
    const gl = this.w.globals
    let maxY = -Number.MAX_VALUE
    let minY = Number.MIN_VALUE

    if (endingSeriesIndex === null) {
      endingSeriesIndex = startingSeriesIndex + 1
    }
    let series = gl.series
    let seriesMin = series
    let seriesMax = series

    if (cnf.chart.type === 'candlestick') {
      seriesMin = gl.seriesCandleL
      seriesMax = gl.seriesCandleH
    } else if (cnf.chart.type === 'boxPlot') {
      seriesMin = gl.seriesCandleO
      seriesMax = gl.seriesCandleC
    } else if (gl.isRangeData) {
      seriesMin = gl.seriesRangeStart
      seriesMax = gl.seriesRangeEnd
    }
    let autoScaleYaxis = false
    if (gl.seriesX.length >= endingSeriesIndex) {
      // Eventually brushSource will be set if the current chart is a target.
      // That is, after the appropriate event causes us to update.
      let brush = gl.brushSource?.w.config.chart.brush
      if (
        (cnf.chart.zoom.enabled && cnf.chart.zoom.autoScaleYaxis) ||
        (brush?.enabled && brush?.autoScaleYaxis)
      ) {
        autoScaleYaxis = true
      }
    }

    for (let i = startingSeriesIndex; i < endingSeriesIndex; i++) {
      gl.dataPoints = Math.max(gl.dataPoints, series[i].length)

      const seriesType = cnf.series[i].type

      if (gl.categoryLabels.length) {
        gl.dataPoints = gl.categoryLabels.filter(
          (label) => typeof label !== 'undefined'
        ).length
      }

      if (
        gl.labels.length &&
        cnf.xaxis.type !== 'datetime' &&
        gl.series.reduce((a, c) => a + c.length, 0) !== 0
      ) {
        // the condition cnf.xaxis.type !== 'datetime' fixes #3897 and #3905
        gl.dataPoints = Math.max(gl.dataPoints, gl.labels.length)
      }
      let firstXIndex = 0
      let lastXIndex = series[i].length - 1
      if (autoScaleYaxis) {
        // Scale the Y axis to the min..max within the possibly zoomed X axis domain.
        if (cnf.xaxis.min) {
          for (
            ;
            firstXIndex < lastXIndex &&
            gl.seriesX[i][firstXIndex] < cnf.xaxis.min;
            firstXIndex++
          ) {}
        }
        if (cnf.xaxis.max) {
          for (
            ;
            lastXIndex > firstXIndex &&
            gl.seriesX[i][lastXIndex] > cnf.xaxis.max;
            lastXIndex--
          ) {}
        }
      }
      for (
        let j = firstXIndex;
        j <= lastXIndex && j < gl.series[i].length;
        j++
      ) {
        let val = series[i][j]
        if (val !== null && Utils.isNumber(val)) {
          if (typeof seriesMax[i][j] !== 'undefined') {
            maxY = Math.max(maxY, seriesMax[i][j])
            lowestY = Math.min(lowestY, seriesMax[i][j])
          }
          if (typeof seriesMin[i][j] !== 'undefined') {
            lowestY = Math.min(lowestY, seriesMin[i][j])
            highestY = Math.max(highestY, seriesMin[i][j])
          }

          // These series arrays are dual purpose:
          // Array      : CandleO, CandleH, CandleM, CandleL, CandleC
          // Candlestick: O        H                 L        C
          // Boxplot    : Min      Q1       Median   Q3       Max
          switch (seriesType) {
            case 'candlestick':
              {
                if (typeof gl.seriesCandleC[i][j] !== 'undefined') {
                  maxY = Math.max(maxY, gl.seriesCandleH[i][j])
                  lowestY = Math.min(lowestY, gl.seriesCandleL[i][j])
                }
              }
              break
            case 'boxPlot':
              {
                if (typeof gl.seriesCandleC[i][j] !== 'undefined') {
                  maxY = Math.max(maxY, gl.seriesCandleC[i][j])
                  lowestY = Math.min(lowestY, gl.seriesCandleO[i][j])
                }
              }
              break
          }

          // there is a combo chart and the specified series in not either
          // candlestick, boxplot, or rangeArea/rangeBar; find the max there.
          if (
            seriesType &&
            seriesType !== 'candlestick' &&
            seriesType !== 'boxPlot' &&
            seriesType !== 'rangeArea' &&
            seriesType !== 'rangeBar'
          ) {
            maxY = Math.max(maxY, gl.series[i][j])
            lowestY = Math.min(lowestY, gl.series[i][j])
          }
          highestY = maxY

          if (
            gl.seriesGoals[i] &&
            gl.seriesGoals[i][j] &&
            Array.isArray(gl.seriesGoals[i][j])
          ) {
            gl.seriesGoals[i][j].forEach((g) => {
              if (minY !== Number.MIN_VALUE) {
                minY = Math.min(minY, g.value)
                lowestY = minY
              }
              maxY = Math.max(maxY, g.value)
              highestY = maxY
            })
          }

          if (Utils.isFloat(val)) {
            val = Utils.noExponents(val)
            gl.yValueDecimal = Math.max(
              gl.yValueDecimal,
              val.toString().split('.')[1].length
            )
          }
          if (minY > seriesMin[i][j] && seriesMin[i][j] < 0) {
            minY = seriesMin[i][j]
          }
        } else {
          gl.hasNullValues = true
        }
      }
      if (seriesType === 'bar' || seriesType === 'column') {
        if (minY < 0 && maxY < 0) {
          // all negative values in a bar series, hence make the max to 0
          maxY = 0
          highestY = Math.max(highestY, 0)
        }
        if (minY === Number.MIN_VALUE) {
          minY = 0
          lowestY = Math.min(lowestY, 0)
        }
      }
    }

    if (
      cnf.chart.type === 'rangeBar' &&
      gl.seriesRangeStart.length &&
      gl.isBarHorizontal
    ) {
      minY = lowestY
    }

    if (cnf.chart.type === 'bar') {
      if (minY < 0 && maxY < 0) {
        // all negative values in a bar chart, hence make the max to 0
        maxY = 0
      }
      if (minY === Number.MIN_VALUE) {
        minY = 0
      }
    }

    return {
      minY,
      maxY,
      lowestY,
      highestY,
    }
  }

  setYRange() {
    let gl = this.w.globals
    let cnf = this.w.config
    gl.maxY = -Number.MAX_VALUE
    gl.minY = Number.MIN_VALUE

    let lowestYInAllSeries = Number.MAX_VALUE
    let minYMaxY

    if (gl.isMultipleYAxis) {
      // we need to get minY and maxY for multiple y axis
      lowestYInAllSeries = Number.MAX_VALUE
      for (let i = 0; i < gl.series.length; i++) {
        minYMaxY = this.getMinYMaxY(i)
        gl.minYArr[i] = minYMaxY.lowestY
        gl.maxYArr[i] = minYMaxY.highestY
        lowestYInAllSeries = Math.min(lowestYInAllSeries, minYMaxY.lowestY)
      }
    }

    // and then, get the minY and maxY from all series
    minYMaxY = this.getMinYMaxY(0, lowestYInAllSeries, null, gl.series.length)
    if (cnf.chart.type === 'bar') {
      gl.minY = minYMaxY.minY
      gl.maxY = minYMaxY.maxY
    } else {
      gl.minY = minYMaxY.lowestY
      gl.maxY = minYMaxY.highestY
    }
    lowestYInAllSeries = minYMaxY.lowestY

    if (cnf.chart.stacked) {
      this._setStackedMinMax()
    }

    // if the numbers are too big, reduce the range
    // for eg, if number is between 100000-110000, putting 0 as the lowest
    // value is not so good idea. So change the gl.minY for
    // line/area/scatter/candlesticks/boxPlot/vertical rangebar
    if (
      cnf.chart.type === 'line' ||
      cnf.chart.type === 'area' ||
      cnf.chart.type === 'scatter' ||
      cnf.chart.type === 'candlestick' ||
      cnf.chart.type === 'boxPlot' ||
      (cnf.chart.type === 'rangeBar' && !gl.isBarHorizontal)
    ) {
      if (
        gl.minY === Number.MIN_VALUE &&
        lowestYInAllSeries !== -Number.MAX_VALUE &&
        lowestYInAllSeries !== gl.maxY // single value possibility
      ) {
        gl.minY = lowestYInAllSeries
      }
    } else {
      gl.minY =
        gl.minY !== Number.MIN_VALUE
          ? Math.min(minYMaxY.minY, gl.minY)
          : minYMaxY.minY
    }

    cnf.yaxis.forEach((yaxe, index) => {
      // override all min/max values by user defined values (y axis)
      if (yaxe.max !== undefined) {
        if (typeof yaxe.max === 'number') {
          gl.maxYArr[index] = yaxe.max
        } else if (typeof yaxe.max === 'function') {
          // fixes apexcharts.js/issues/2098
          gl.maxYArr[index] = yaxe.max(
            gl.isMultipleYAxis ? gl.maxYArr[index] : gl.maxY
          )
        }

        // gl.maxY is for single y-axis chart, it will be ignored in multi-yaxis
        gl.maxY = gl.maxYArr[index]
      }
      if (yaxe.min !== undefined) {
        if (typeof yaxe.min === 'number') {
          gl.minYArr[index] = yaxe.min
        } else if (typeof yaxe.min === 'function') {
          // fixes apexcharts.js/issues/2098
          gl.minYArr[index] = yaxe.min(
            gl.isMultipleYAxis
              ? gl.minYArr[index] === Number.MIN_VALUE
                ? 0
                : gl.minYArr[index]
              : gl.minY
          )
        }
        // gl.minY is for single y-axis chart, it will be ignored in multi-yaxis
        gl.minY = gl.minYArr[index]
      }
    })

    // for horizontal bar charts, we need to check xaxis min/max as user may have specified there
    if (gl.isBarHorizontal) {
      const minmax = ['min', 'max']
      minmax.forEach((m) => {
        if (cnf.xaxis[m] !== undefined && typeof cnf.xaxis[m] === 'number') {
          m === 'min' ? (gl.minY = cnf.xaxis[m]) : (gl.maxY = cnf.xaxis[m])
        }
      })
    }

    if (gl.isMultipleYAxis) {
      this.scales.scaleMultipleYAxes()
      gl.minY = lowestYInAllSeries
    } else {
      this.scales.setYScaleForIndex(0, gl.minY, gl.maxY)
      gl.minY = gl.yAxisScale[0].niceMin
      gl.maxY = gl.yAxisScale[0].niceMax
      gl.minYArr[0] = gl.minY
      gl.maxYArr[0] = gl.maxY
    }

    gl.barGroups = []
    gl.lineGroups = []
    gl.areaGroups = []
    cnf.series.forEach((s) => {
      let type = s.type || cnf.chart.type
      switch (type) {
        case 'bar':
        case 'column':
          gl.barGroups.push(s.group)
          break
        case 'line':
          gl.lineGroups.push(s.group)
          break
        case 'area':
          gl.areaGroups.push(s.group)
          break
      }
    })
    // Uniquify the group names in each stackable chart type.
    gl.barGroups = gl.barGroups.filter((v, i, a) => a.indexOf(v) === i)
    gl.lineGroups = gl.lineGroups.filter((v, i, a) => a.indexOf(v) === i)
    gl.areaGroups = gl.areaGroups.filter((v, i, a) => a.indexOf(v) === i)

    return {
      minY: gl.minY,
      maxY: gl.maxY,
      minYArr: gl.minYArr,
      maxYArr: gl.maxYArr,
      yAxisScale: gl.yAxisScale,
    }
  }

  setXRange() {
    let gl = this.w.globals
    let cnf = this.w.config

    const isXNumeric =
      cnf.xaxis.type === 'numeric' ||
      cnf.xaxis.type === 'datetime' ||
      (cnf.xaxis.type === 'category' && !gl.noLabelsProvided) ||
      gl.noLabelsProvided ||
      gl.isXNumeric

    const getInitialMinXMaxX = () => {
      for (let i = 0; i < gl.series.length; i++) {
        if (gl.labels[i]) {
          for (let j = 0; j < gl.labels[i].length; j++) {
            if (gl.labels[i][j] !== null && Utils.isNumber(gl.labels[i][j])) {
              gl.maxX = Math.max(gl.maxX, gl.labels[i][j])
              gl.initialMaxX = Math.max(gl.maxX, gl.labels[i][j])
              gl.minX = Math.min(gl.minX, gl.labels[i][j])
              gl.initialMinX = Math.min(gl.minX, gl.labels[i][j])
            }
          }
        }
      }
    }
    // minX maxX starts here
    if (gl.isXNumeric) {
      getInitialMinXMaxX()
    }

    if (gl.noLabelsProvided) {
      if (cnf.xaxis.categories.length === 0) {
        gl.maxX = gl.labels[gl.labels.length - 1]
        gl.initialMaxX = gl.labels[gl.labels.length - 1]
        gl.minX = 1
        gl.initialMinX = 1
      }
    }

    if (gl.isXNumeric || gl.noLabelsProvided || gl.dataFormatXNumeric) {
      let ticks = 10

      if (cnf.xaxis.tickAmount === undefined) {
        ticks = Math.round(gl.svgWidth / 150)

        // no labels provided and total number of dataPoints is less than 30
        if (cnf.xaxis.type === 'numeric' && gl.dataPoints < 30) {
          ticks = gl.dataPoints - 1
        }

        // this check is for when ticks exceeds total datapoints and that would result in duplicate labels
        if (ticks > gl.dataPoints && gl.dataPoints !== 0) {
          ticks = gl.dataPoints - 1
        }
      } else if (cnf.xaxis.tickAmount === 'dataPoints') {
        if (gl.series.length > 1) {
          ticks = gl.series[gl.maxValsInArrayIndex].length - 1
        }
        if (gl.isXNumeric) {
          const diff = gl.maxX - gl.minX
          if (diff < 30) {
            ticks = diff - 1
          }
        }
      } else {
        ticks = cnf.xaxis.tickAmount
      }
      gl.xTickAmount = ticks

      // override all min/max values by user defined values (x axis)
      if (cnf.xaxis.max !== undefined && typeof cnf.xaxis.max === 'number') {
        gl.maxX = cnf.xaxis.max
      }
      if (cnf.xaxis.min !== undefined && typeof cnf.xaxis.min === 'number') {
        gl.minX = cnf.xaxis.min
      }

      // if range is provided, adjust the new minX
      if (cnf.xaxis.range !== undefined) {
        gl.minX = gl.maxX - cnf.xaxis.range
      }

      if (gl.minX !== Number.MAX_VALUE && gl.maxX !== -Number.MAX_VALUE) {
        if (cnf.xaxis.convertedCatToNumeric && !gl.dataFormatXNumeric) {
          let catScale = []
          for (let i = gl.minX - 1; i < gl.maxX; i++) {
            catScale.push(i + 1)
          }
          gl.xAxisScale = {
            result: catScale,
            niceMin: catScale[0],
            niceMax: catScale[catScale.length - 1],
          }
        } else {
          gl.xAxisScale = this.scales.setXScale(gl.minX, gl.maxX)
        }
      } else {
        gl.xAxisScale = this.scales.linearScale(
          0,
          ticks,
          ticks,
          0,
          cnf.xaxis.stepSize
        )
        if (gl.noLabelsProvided && gl.labels.length > 0) {
          gl.xAxisScale = this.scales.linearScale(
            1,
            gl.labels.length,
            ticks - 1,
            0,
            cnf.xaxis.stepSize
          )

          // this is the only place seriesX is again mutated
          gl.seriesX = gl.labels.slice()
        }
      }
      // we will still store these labels as the count for this will be different (to draw grid and labels placement)
      if (isXNumeric) {
        gl.labels = gl.xAxisScale.result.slice()
      }
    }

    if (gl.isBarHorizontal && gl.labels.length) {
      gl.xTickAmount = gl.labels.length
    }

    // single dataPoint
    this._handleSingleDataPoint()

    // minimum x difference to calculate bar width in numeric bars
    this._getMinXDiff()

    return {
      minX: gl.minX,
      maxX: gl.maxX,
    }
  }

  setZRange() {
    // minZ, maxZ starts here
    let gl = this.w.globals

    if (!gl.isDataXYZ) return
    for (let i = 0; i < gl.series.length; i++) {
      if (typeof gl.seriesZ[i] !== 'undefined') {
        for (let j = 0; j < gl.seriesZ[i].length; j++) {
          if (gl.seriesZ[i][j] !== null && Utils.isNumber(gl.seriesZ[i][j])) {
            gl.maxZ = Math.max(gl.maxZ, gl.seriesZ[i][j])
            gl.minZ = Math.min(gl.minZ, gl.seriesZ[i][j])
          }
        }
      }
    }
  }

  _handleSingleDataPoint() {
    const gl = this.w.globals
    const cnf = this.w.config

    if (gl.minX === gl.maxX) {
      let datetimeObj = new DateTime(this.ctx)

      if (cnf.xaxis.type === 'datetime') {
        const newMinX = datetimeObj.getDate(gl.minX)
        if (cnf.xaxis.labels.datetimeUTC) {
          newMinX.setUTCDate(newMinX.getUTCDate() - 2)
        } else {
          newMinX.setDate(newMinX.getDate() - 2)
        }

        gl.minX = new Date(newMinX).getTime()

        const newMaxX = datetimeObj.getDate(gl.maxX)
        if (cnf.xaxis.labels.datetimeUTC) {
          newMaxX.setUTCDate(newMaxX.getUTCDate() + 2)
        } else {
          newMaxX.setDate(newMaxX.getDate() + 2)
        }
        gl.maxX = new Date(newMaxX).getTime()
      } else if (
        cnf.xaxis.type === 'numeric' ||
        (cnf.xaxis.type === 'category' && !gl.noLabelsProvided)
      ) {
        gl.minX = gl.minX - 2
        gl.initialMinX = gl.minX
        gl.maxX = gl.maxX + 2
        gl.initialMaxX = gl.maxX
      }
    }
  }

  _getMinXDiff() {
    const gl = this.w.globals

    if (gl.isXNumeric) {
      // get the least x diff if numeric x axis is present
      gl.seriesX.forEach((sX, i) => {
        if (sX.length === 1) {
          // a small hack to prevent overlapping multiple bars when there is just 1 datapoint in bar series.
          // fix #811
          sX.push(
            gl.seriesX[gl.maxValsInArrayIndex][
              gl.seriesX[gl.maxValsInArrayIndex].length - 1
            ]
          )
        }

        // fix #983 (clone the array to avoid side effects)
        const seriesX = sX.slice()
        seriesX.sort((a, b) => a - b)

        seriesX.forEach((s, j) => {
          if (j > 0) {
            let xDiff = s - seriesX[j - 1]
            if (xDiff > 0) {
              gl.minXDiff = Math.min(xDiff, gl.minXDiff)
            }
          }
        })
        if (gl.dataPoints === 1 || gl.minXDiff === Number.MAX_VALUE) {
          // fixes apexcharts.js #1221
          gl.minXDiff = 0.5
        }
      })
    }
  }

  _setStackedMinMax() {
    const gl = this.w.globals
    // for stacked charts, we calculate each series's parallel values.
    // i.e, series[0][j] + series[1][j] .... [series[i.length][j]]
    // and get the max out of it

    if (!gl.series.length) return
    let seriesGroups = gl.seriesGroups

    if (!seriesGroups.length) {
      seriesGroups = [this.w.globals.seriesNames.map((name) => name)]
    }
    let stackedPoss = {}
    let stackedNegs = {}

    seriesGroups.forEach((group) => {
      stackedPoss[group] = []
      stackedNegs[group] = []
      const indicesOfSeriesInGroup = this.w.config.series
        .map((serie, si) =>
          group.indexOf(gl.seriesNames[si]) > -1 ? si : null
        )
        .filter((f) => f !== null)

      indicesOfSeriesInGroup.forEach((i) => {
        for (let j = 0; j < gl.series[gl.maxValsInArrayIndex].length; j++) {
          if (typeof stackedPoss[group][j] === 'undefined') {
            stackedPoss[group][j] = 0
            stackedNegs[group][j] = 0
          }

          let stackSeries =
            (this.w.config.chart.stacked && !gl.comboCharts) ||
            (this.w.config.chart.stacked &&
              gl.comboCharts &&
              (!this.w.config.chart.stackOnlyBar ||
                this.w.config.series?.[i]?.type === 'bar' ||
                this.w.config.series?.[i]?.type === 'column'))

          if (stackSeries) {
            if (gl.series[i][j] !== null && Utils.isNumber(gl.series[i][j])) {
              gl.series[i][j] > 0
                ? (stackedPoss[group][j] +=
                    parseFloat(gl.series[i][j]) + 0.0001)
                : (stackedNegs[group][j] += parseFloat(gl.series[i][j]))
            }
          }
        }
      })
    })

    Object.entries(stackedPoss).forEach(([key]) => {
      stackedPoss[key].forEach((_, stgi) => {
        gl.maxY = Math.max(gl.maxY, stackedPoss[key][stgi])
        gl.minY = Math.min(gl.minY, stackedNegs[key][stgi])
      })
    })
  }
}

export default Range
