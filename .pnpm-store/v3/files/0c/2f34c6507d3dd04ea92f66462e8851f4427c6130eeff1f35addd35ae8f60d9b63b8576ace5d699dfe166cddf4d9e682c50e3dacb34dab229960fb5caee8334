import CoreUtils from '../modules/CoreUtils'
import Graphics from '../modules/Graphics'
import Fill from '../modules/Fill'
import DataLabels from '../modules/DataLabels'
import Markers from '../modules/Markers'
import Scatter from './Scatter'
import Utils from '../utils/Utils'
import Helpers from './common/line/Helpers'
import { svgPath, spline } from '../libs/monotone-cubic'
/**
 * ApexCharts Line Class responsible for drawing Line / Area / RangeArea Charts.
 * This class is also responsible for generating values for Bubble/Scatter charts, so need to rename it to Axis Charts to avoid confusions
 * @module Line
 **/

class Line {
  constructor(ctx, xyRatios, isPointsChart) {
    this.ctx = ctx
    this.w = ctx.w

    this.xyRatios = xyRatios

    this.pointsChart =
      !(
        this.w.config.chart.type !== 'bubble' &&
        this.w.config.chart.type !== 'scatter'
      ) || isPointsChart

    this.scatter = new Scatter(this.ctx)

    this.noNegatives = this.w.globals.minX === Number.MAX_VALUE

    this.lineHelpers = new Helpers(this)
    this.markers = new Markers(this.ctx)

    this.prevSeriesY = []
    this.categoryAxisCorrection = 0
    this.yaxisIndex = 0
  }

  draw(series, ctype, seriesIndex, seriesRangeEnd) {
    let w = this.w
    let graphics = new Graphics(this.ctx)
    let type = w.globals.comboCharts ? ctype : w.config.chart.type
    let ret = graphics.group({
      class: `apexcharts-${type}-series apexcharts-plot-series`,
    })

    const coreUtils = new CoreUtils(this.ctx, w)
    this.yRatio = this.xyRatios.yRatio
    this.zRatio = this.xyRatios.zRatio
    this.xRatio = this.xyRatios.xRatio
    this.baseLineY = this.xyRatios.baseLineY

    series = coreUtils.getLogSeries(series)
    this.yRatio = coreUtils.getLogYRatios(this.yRatio)
    // We call draw() for each series group
    this.prevSeriesY = []

    // push all series in an array, so we can draw in reverse order
    // (for stacked charts)
    let allSeries = []

    for (let i = 0; i < series.length; i++) {
      series = this.lineHelpers.sameValueSeriesFix(i, series)

      let realIndex = w.globals.comboCharts ? seriesIndex[i] : i
      let translationsIndex = this.yRatio.length > 1 ? realIndex : 0

      this._initSerieVariables(series, i, realIndex)

      let yArrj = [] // hold y values of current iterating series
      let y2Arrj = [] // holds y2 values in range-area charts
      let xArrj = [] // hold x values of current iterating series

      let x = w.globals.padHorizontal + this.categoryAxisCorrection
      let y = 1

      let linePaths = []
      let areaPaths = []

      this.ctx.series.addCollapsedClassToSeries(this.elSeries, realIndex)

      if (w.globals.isXNumeric && w.globals.seriesX.length > 0) {
        x = (w.globals.seriesX[realIndex][0] - w.globals.minX) / this.xRatio
      }

      xArrj.push(x)

      let pX = x
      let pY
      let pY2
      let prevX = pX
      let prevY = this.zeroY
      let prevY2 = this.zeroY
      let lineYPosition = 0

      // the first value in the current series is not null or undefined
      let firstPrevY = this.lineHelpers.determineFirstPrevY({
        i,
        realIndex,
        series,
        prevY,
        lineYPosition,
        translationsIndex,
      })
      prevY = firstPrevY.prevY
      if (w.config.stroke.curve === 'monotoneCubic' && series[i][0] === null) {
        // we have to discard the y position if 1st dataPoint is null as it
        // causes issues with monotoneCubic path creation
        yArrj.push(null)
      } else {
        yArrj.push(prevY)
      }
      pY = prevY

      // y2 are needed for range-area charts
      let firstPrevY2

      if (type === 'rangeArea') {
        firstPrevY2 = this.lineHelpers.determineFirstPrevY({
          i,
          realIndex,
          series: seriesRangeEnd,
          prevY: prevY2,
          lineYPosition,
          translationsIndex,
        })
        prevY2 = firstPrevY2.prevY
        pY2 = prevY2
        y2Arrj.push(yArrj[0] !== null ? prevY2 : null)
      }

      let pathsFrom = this._calculatePathsFrom({
        type,
        series,
        i,
        realIndex,
        translationsIndex,
        prevX,
        prevY,
        prevY2,
      })

      // RangeArea will resume with these for the upper path creation
      let rYArrj = [yArrj[0]]
      let rY2Arrj = [y2Arrj[0]]

      const iteratingOpts = {
        type,
        series,
        realIndex,
        translationsIndex,
        i,
        x,
        y,
        pX,
        pY,
        pathsFrom,
        linePaths,
        areaPaths,
        seriesIndex,
        lineYPosition,
        xArrj,
        yArrj,
        y2Arrj,
        seriesRangeEnd,
      }

      let paths = this._iterateOverDataPoints({
        ...iteratingOpts,
        iterations: type === 'rangeArea' ? series[i].length - 1 : undefined,
        isRangeStart: true,
      })

      if (type === 'rangeArea') {
        let pathsFrom2 = this._calculatePathsFrom({
          series: seriesRangeEnd,
          i,
          realIndex,
          prevX,
          prevY: prevY2,
        })
        let rangePaths = this._iterateOverDataPoints({
          ...iteratingOpts,
          series: seriesRangeEnd,
          xArrj: [x],
          yArrj: rYArrj,
          y2Arrj: rY2Arrj,
          pY: pY2,
          areaPaths: paths.areaPaths,
          pathsFrom: pathsFrom2,
          iterations: seriesRangeEnd[i].length - 1,
          isRangeStart: false,
        })

        // Path may be segmented by nulls in data.
        // paths.linePaths should hold (segments * 2) paths (upper and lower)
        // the first n segments belong to the lower and the last n segments
        // belong to the upper.
        // paths.linePaths and rangePaths.linepaths are actually equivalent
        // but we retain the distinction below for consistency with the
        // unsegmented paths conditional branch.
        let segments = paths.linePaths.length / 2
        for (let s = 0; s < segments; s++) {
          paths.linePaths[s] =
            rangePaths.linePaths[s + segments] + paths.linePaths[s]
        }
        paths.linePaths.splice(segments)
        paths.pathFromLine = rangePaths.pathFromLine + paths.pathFromLine
      } else {
        paths.pathFromArea += 'z'
      }

      this._handlePaths({ type, realIndex, i, paths })

      this.elSeries.add(this.elPointsMain)
      this.elSeries.add(this.elDataLabelsWrap)

      allSeries.push(this.elSeries)
    }

    if (typeof w.config.series[0]?.zIndex !== 'undefined') {
      allSeries.sort(
        (a, b) =>
          Number(a.node.getAttribute('zIndex')) -
          Number(b.node.getAttribute('zIndex'))
      )
    }

    if (w.config.chart.stacked) {
      for (let s = allSeries.length - 1; s >= 0; s--) {
        ret.add(allSeries[s])
      }
    } else {
      for (let s = 0; s < allSeries.length; s++) {
        ret.add(allSeries[s])
      }
    }

    return ret
  }

  _initSerieVariables(series, i, realIndex) {
    const w = this.w
    const graphics = new Graphics(this.ctx)

    // width divided into equal parts
    this.xDivision =
      w.globals.gridWidth /
      (w.globals.dataPoints - (w.config.xaxis.tickPlacement === 'on' ? 1 : 0))

    this.strokeWidth = Array.isArray(w.config.stroke.width)
      ? w.config.stroke.width[realIndex]
      : w.config.stroke.width

    let translationsIndex = 0
    if (this.yRatio.length > 1) {
      this.yaxisIndex = w.globals.seriesYAxisReverseMap[realIndex]
      translationsIndex = realIndex
    }

    this.isReversed =
      w.config.yaxis[this.yaxisIndex] &&
      w.config.yaxis[this.yaxisIndex].reversed

    // zeroY is the 0 value in y series which can be used in negative charts
    this.zeroY =
      w.globals.gridHeight -
      this.baseLineY[translationsIndex] -
      (this.isReversed ? w.globals.gridHeight : 0) +
      (this.isReversed ? this.baseLineY[translationsIndex] * 2 : 0)

    this.areaBottomY = this.zeroY
    if (
      this.zeroY > w.globals.gridHeight ||
      w.config.plotOptions.area.fillTo === 'end'
    ) {
      this.areaBottomY = w.globals.gridHeight
    }

    this.categoryAxisCorrection = this.xDivision / 2

    // el to which series will be drawn
    this.elSeries = graphics.group({
      class: `apexcharts-series`,
      zIndex:
        typeof w.config.series[realIndex].zIndex !== 'undefined'
          ? w.config.series[realIndex].zIndex
          : realIndex,
      seriesName: Utils.escapeString(w.globals.seriesNames[realIndex]),
    })

    // points
    this.elPointsMain = graphics.group({
      class: 'apexcharts-series-markers-wrap',
      'data:realIndex': realIndex,
    })

    // eldatalabels
    this.elDataLabelsWrap = graphics.group({
      class: 'apexcharts-datalabels',
      'data:realIndex': realIndex,
    })

    let longestSeries = series[i].length === w.globals.dataPoints
    this.elSeries.attr({
      'data:longestSeries': longestSeries,
      rel: i + 1,
      'data:realIndex': realIndex,
    })

    this.appendPathFrom = true
  }

  _calculatePathsFrom({
    type,
    series,
    i,
    realIndex,
    translationsIndex,
    prevX,
    prevY,
    prevY2,
  }) {
    const w = this.w
    const graphics = new Graphics(this.ctx)
    let linePath, areaPath, pathFromLine, pathFromArea

    if (series[i][0] === null) {
      // when the first value itself is null, we need to move the pointer to a location where a null value is not found
      for (let s = 0; s < series[i].length; s++) {
        if (series[i][s] !== null) {
          prevX = this.xDivision * s
          prevY = this.zeroY - series[i][s] / this.yRatio[translationsIndex]
          linePath = graphics.move(prevX, prevY)
          areaPath = graphics.move(prevX, this.areaBottomY)
          break
        }
      }
    } else {
      linePath = graphics.move(prevX, prevY)

      if (type === 'rangeArea') {
        linePath = graphics.move(prevX, prevY2) + graphics.line(prevX, prevY)
      }
      areaPath =
        graphics.move(prevX, this.areaBottomY) + graphics.line(prevX, prevY)
    }

    pathFromLine = graphics.move(0, this.zeroY) + graphics.line(0, this.zeroY)
    pathFromArea = graphics.move(0, this.zeroY) + graphics.line(0, this.zeroY)

    if (w.globals.previousPaths.length > 0) {
      const pathFrom = this.lineHelpers.checkPreviousPaths({
        pathFromLine,
        pathFromArea,
        realIndex,
      })
      pathFromLine = pathFrom.pathFromLine
      pathFromArea = pathFrom.pathFromArea
    }

    return {
      prevX,
      prevY,
      linePath,
      areaPath,
      pathFromLine,
      pathFromArea,
    }
  }

  _handlePaths({ type, realIndex, i, paths }) {
    const w = this.w
    const graphics = new Graphics(this.ctx)
    const fill = new Fill(this.ctx)

    // push all current y values array to main PrevY Array
    this.prevSeriesY.push(paths.yArrj)

    // push all x val arrays into main xArr
    w.globals.seriesXvalues[realIndex] = paths.xArrj
    w.globals.seriesYvalues[realIndex] = paths.yArrj

    const forecast = w.config.forecastDataPoints
    if (forecast.count > 0 && type !== 'rangeArea') {
      const forecastCutoff =
        w.globals.seriesXvalues[realIndex][
          w.globals.seriesXvalues[realIndex].length - forecast.count - 1
        ]
      const elForecastMask = graphics.drawRect(
        forecastCutoff,
        0,
        w.globals.gridWidth,
        w.globals.gridHeight,
        0
      )
      w.globals.dom.elForecastMask.appendChild(elForecastMask.node)

      const elNonForecastMask = graphics.drawRect(
        0,
        0,
        forecastCutoff,
        w.globals.gridHeight,
        0
      )
      w.globals.dom.elNonForecastMask.appendChild(elNonForecastMask.node)
    }

    // these elements will be shown after area path animation completes
    if (!this.pointsChart) {
      w.globals.delayedElements.push({
        el: this.elPointsMain.node,
        index: realIndex,
      })
    }

    const defaultRenderedPathOptions = {
      i,
      realIndex,
      animationDelay: i,
      initialSpeed: w.config.chart.animations.speed,
      dataChangeSpeed: w.config.chart.animations.dynamicAnimation.speed,
      className: `apexcharts-${type}`,
    }

    if (type === 'area') {
      let pathFill = fill.fillPath({
        seriesNumber: realIndex,
      })

      for (let p = 0; p < paths.areaPaths.length; p++) {
        let renderedPath = graphics.renderPaths({
          ...defaultRenderedPathOptions,
          pathFrom: paths.pathFromArea,
          pathTo: paths.areaPaths[p],
          stroke: 'none',
          strokeWidth: 0,
          strokeLineCap: null,
          fill: pathFill,
        })

        this.elSeries.add(renderedPath)
      }
    }

    if (w.config.stroke.show && !this.pointsChart) {
      let lineFill = null
      if (type === 'line') {
        lineFill = fill.fillPath({
          seriesNumber: realIndex,
          i,
        })
      } else {
        if (w.config.stroke.fill.type === 'solid') {
          lineFill = w.globals.stroke.colors[realIndex]
        } else {
          const prevFill = w.config.fill
          w.config.fill = w.config.stroke.fill

          lineFill = fill.fillPath({
            seriesNumber: realIndex,
            i,
          })
          w.config.fill = prevFill
        }
      }

      // range-area paths are drawn using linePaths
      for (let p = 0; p < paths.linePaths.length; p++) {
        let pathFill = lineFill
        if (type === 'rangeArea') {
          pathFill = fill.fillPath({
            seriesNumber: realIndex,
          })
        }
        const linePathCommonOpts = {
          ...defaultRenderedPathOptions,
          pathFrom: paths.pathFromLine,
          pathTo: paths.linePaths[p],
          stroke: lineFill,
          strokeWidth: this.strokeWidth,
          strokeLineCap: w.config.stroke.lineCap,
          fill: type === 'rangeArea' ? pathFill : 'none',
        }
        let renderedPath = graphics.renderPaths(linePathCommonOpts)
        this.elSeries.add(renderedPath)
        renderedPath.attr('fill-rule', `evenodd`)

        if (forecast.count > 0 && type !== 'rangeArea') {
          let renderedForecastPath = graphics.renderPaths(linePathCommonOpts)

          renderedForecastPath.node.setAttribute(
            'stroke-dasharray',
            forecast.dashArray
          )

          if (forecast.strokeWidth) {
            renderedForecastPath.node.setAttribute(
              'stroke-width',
              forecast.strokeWidth
            )
          }

          this.elSeries.add(renderedForecastPath)
          renderedForecastPath.attr(
            'clip-path',
            `url(#forecastMask${w.globals.cuid})`
          )
          renderedPath.attr(
            'clip-path',
            `url(#nonForecastMask${w.globals.cuid})`
          )
        }
      }
    }
  }

  _iterateOverDataPoints({
    type,
    series,
    iterations,
    realIndex,
    translationsIndex,
    i,
    x,
    y,
    pX,
    pY,
    pathsFrom,
    linePaths,
    areaPaths,
    seriesIndex,
    lineYPosition,
    xArrj,
    yArrj,
    y2Arrj,
    isRangeStart,
    seriesRangeEnd,
  }) {
    const w = this.w
    let graphics = new Graphics(this.ctx)
    let yRatio = this.yRatio
    let { prevY, linePath, areaPath, pathFromLine, pathFromArea } = pathsFrom

    const minY = Utils.isNumber(w.globals.minYArr[realIndex])
      ? w.globals.minYArr[realIndex]
      : w.globals.minY

    if (!iterations) {
      iterations =
        w.globals.dataPoints > 1
          ? w.globals.dataPoints - 1
          : w.globals.dataPoints
    }

    const getY = (_y, lineYPos) => {
      return (
        lineYPos -
        _y / yRatio[translationsIndex] +
        (this.isReversed ? _y / yRatio[translationsIndex] : 0) * 2
      )
    }

    let y2 = y

    let stackSeries =
      (w.config.chart.stacked && !w.globals.comboCharts) ||
      (w.config.chart.stacked &&
        w.globals.comboCharts &&
        (!this.w.config.chart.stackOnlyBar ||
          this.w.config.series[realIndex]?.type === 'bar' ||
          this.w.config.series[realIndex]?.type === 'column'))

    let curve = w.config.stroke.curve
    if (Array.isArray(curve)) {
      if (Array.isArray(seriesIndex)) {
        curve = curve[seriesIndex[i]]
      } else {
        curve = curve[i]
      }
    }

    let pathState = 0
    let segmentStartX

    for (let j = 0; j < iterations; j++) {
      const isNull =
        typeof series[i][j + 1] === 'undefined' || series[i][j + 1] === null

      if (w.globals.isXNumeric) {
        let sX = w.globals.seriesX[realIndex][j + 1]
        if (typeof w.globals.seriesX[realIndex][j + 1] === 'undefined') {
          /* fix #374 */
          sX = w.globals.seriesX[realIndex][iterations - 1]
        }
        x = (sX - w.globals.minX) / this.xRatio
      } else {
        x = x + this.xDivision
      }

      if (stackSeries) {
        if (
          i > 0 &&
          w.globals.collapsedSeries.length < w.config.series.length - 1
        ) {
          // a collapsed series in a stacked chart may provide wrong result
          // for the next series, hence find the prevIndex of prev series
          // which is not collapsed - fixes apexcharts.js#1372
          const prevIndex = (pi) => {
            for (let pii = pi; pii > 0; pii--) {
              if (
                w.globals.collapsedSeriesIndices.indexOf(
                  seriesIndex?.[pii] || pii
                ) > -1
              ) {
                pii--
              } else {
                return pii
              }
            }
            return 0
          }
          lineYPosition = this.prevSeriesY[prevIndex(i - 1)][j + 1]
        } else {
          // the first series will not have prevY values
          lineYPosition = this.zeroY
        }
      } else {
        lineYPosition = this.zeroY
      }

      if (isNull) {
        y = getY(minY, lineYPosition)
      } else {
        y = getY(series[i][j + 1], lineYPosition)

        if (type === 'rangeArea') {
          y2 = getY(seriesRangeEnd[i][j + 1], lineYPosition)
        }
      }

      // push current X
      xArrj.push(x)

      // push current Y that will be used as next series's bottom position
      if (
        isNull &&
        (w.config.stroke.curve === 'smooth' ||
          w.config.stroke.curve === 'monotoneCubic')
      ) {
        yArrj.push(null)
        y2Arrj.push(null)
      } else {
        yArrj.push(y)
        y2Arrj.push(y2)
      }

      let pointsPos = this.lineHelpers.calculatePoints({
        series,
        x,
        y,
        realIndex,
        i,
        j,
        prevY,
      })

      let calculatedPaths = this._createPaths({
        type,
        series,
        i,
        realIndex,
        j,
        x,
        y,
        y2,
        xArrj,
        yArrj,
        y2Arrj,
        pX,
        pY,
        pathState,
        segmentStartX,
        linePath,
        areaPath,
        linePaths,
        areaPaths,
        curve,
        isRangeStart,
      })

      areaPaths = calculatedPaths.areaPaths
      linePaths = calculatedPaths.linePaths
      pX = calculatedPaths.pX
      pY = calculatedPaths.pY
      pathState = calculatedPaths.pathState
      segmentStartX = calculatedPaths.segmentStartX
      areaPath = calculatedPaths.areaPath
      linePath = calculatedPaths.linePath

      if (
        this.appendPathFrom &&
        !(curve === 'monotoneCubic' && type === 'rangeArea')
      ) {
        pathFromLine += graphics.line(x, this.zeroY)
        pathFromArea += graphics.line(x, this.zeroY)
      }

      this.handleNullDataPoints(series, pointsPos, i, j, realIndex)

      this._handleMarkersAndLabels({
        type,
        pointsPos,
        i,
        j,
        realIndex,
        isRangeStart,
      })
    }

    return {
      yArrj,
      xArrj,
      pathFromArea,
      areaPaths,
      pathFromLine,
      linePaths,
      linePath,
      areaPath,
    }
  }

  _handleMarkersAndLabels({ type, pointsPos, isRangeStart, i, j, realIndex }) {
    const w = this.w
    let dataLabels = new DataLabels(this.ctx)

    if (!this.pointsChart) {
      if (w.globals.series[i].length > 1) {
        this.elPointsMain.node.classList.add('apexcharts-element-hidden')
      }

      let elPointsWrap = this.markers.plotChartMarkers(
        pointsPos,
        realIndex,
        j + 1
      )
      if (elPointsWrap !== null) {
        this.elPointsMain.add(elPointsWrap)
      }
    } else {
      // scatter / bubble chart points creation
      this.scatter.draw(this.elSeries, j, {
        realIndex,
        pointsPos,
        zRatio: this.zRatio,
        elParent: this.elPointsMain,
      })
    }

    let drawnLabels = dataLabels.drawDataLabel({
      type,
      isRangeStart,
      pos: pointsPos,
      i: realIndex,
      j: j + 1,
    })
    if (drawnLabels !== null) {
      this.elDataLabelsWrap.add(drawnLabels)
    }
  }

  _createPaths({
    type,
    series,
    i,
    realIndex,
    j,
    x,
    y,
    xArrj,
    yArrj,
    y2,
    y2Arrj,
    pX,
    pY,
    pathState,
    segmentStartX,
    linePath,
    areaPath,
    linePaths,
    areaPaths,
    curve,
    isRangeStart,
  }) {
    let graphics = new Graphics(this.ctx)
    const areaBottomY = this.areaBottomY
    let rangeArea = type === 'rangeArea'
    let isLowerRangeAreaPath = type === 'rangeArea' && isRangeStart

    switch (curve) {
      case 'monotoneCubic':
        let yAj = isRangeStart ? yArrj : y2Arrj
        let getSmoothInputs = (xArr, yArr) => {
          return xArr
            .map((_, i) => {
              return [_, yArr[i]]
            })
            .filter((_) => _[1] !== null)
        }
        let getSegmentLengths = (yArr) => {
          // Get the segment lengths so the segments can be extracted from
          // the null-filtered smoothInputs array
          let segLens = []
          let count = 0
          yArr.forEach((_) => {
            if (_ !== null) {
              count++
            } else if (count > 0) {
              segLens.push(count)
              count = 0
            }
          })
          if (count > 0) {
            segLens.push(count)
          }
          return segLens
        }
        let getSegments = (yArr, points) => {
          let segLens = getSegmentLengths(yArr)
          let segments = []
          for (let i = 0, len = 0; i < segLens.length; len += segLens[i++]) {
            segments[i] = spline.slice(points, len, len + segLens[i])
          }
          return segments
        }

        switch (pathState) {
          case 0:
            // Find start of segment
            if (yAj[j + 1] === null) {
              break
            }
            pathState = 1
          // continue through to pathState 1
          case 1:
            if (
              !(rangeArea
                ? xArrj.length === series[i].length
                : j === series[i].length - 2)
            ) {
              break
            }
          // continue through to pathState 2
          case 2:
            // Interpolate the full series with nulls excluded then extract the
            // null delimited segments with interpolated points included.
            const _xAj = isRangeStart ? xArrj : xArrj.slice().reverse()
            const _yAj = isRangeStart ? yAj : yAj.slice().reverse()

            const smoothInputs = getSmoothInputs(_xAj, _yAj)
            const points =
              smoothInputs.length > 1
                ? spline.points(smoothInputs)
                : smoothInputs

            let smoothInputsLower = []
            if (rangeArea) {
              if (isLowerRangeAreaPath) {
                // As we won't be needing it, borrow areaPaths to retain our
                // rangeArea lower points.
                areaPaths = smoothInputs
              } else {
                // Retrieve the corresponding lower raw interpolated points so we
                // can join onto its end points. Note: the upper Y2 segments will
                // be in the reverse order relative to the lower segments.
                smoothInputsLower = areaPaths.reverse()
              }
            }

            let segmentCount = 0
            let smoothInputsIndex = 0
            getSegments(_yAj, points).forEach((_) => {
              segmentCount++
              let svgPoints = svgPath(_)
              let _start = smoothInputsIndex
              smoothInputsIndex += _.length
              let _end = smoothInputsIndex - 1
              if (isLowerRangeAreaPath) {
                linePath =
                  graphics.move(
                    smoothInputs[_start][0],
                    smoothInputs[_start][1]
                  ) + svgPoints
              } else if (rangeArea) {
                linePath =
                  graphics.move(
                    smoothInputsLower[_start][0],
                    smoothInputsLower[_start][1]
                  ) +
                  graphics.line(
                    smoothInputs[_start][0],
                    smoothInputs[_start][1]
                  ) +
                  svgPoints +
                  graphics.line(
                    smoothInputsLower[_end][0],
                    smoothInputsLower[_end][1]
                  )
              } else {
                linePath =
                  graphics.move(
                    smoothInputs[_start][0],
                    smoothInputs[_start][1]
                  ) + svgPoints
                areaPath =
                  linePath +
                  graphics.line(smoothInputs[_end][0], areaBottomY) +
                  graphics.line(smoothInputs[_start][0], areaBottomY) +
                  'z'
                areaPaths.push(areaPath)
              }
              linePaths.push(linePath)
            })

            if (rangeArea && segmentCount > 1 && !isLowerRangeAreaPath) {
              // Reverse the order of the upper path segments
              let upperLinePaths = linePaths.slice(segmentCount).reverse()
              linePaths.splice(segmentCount)
              upperLinePaths.forEach((u) => linePaths.push(u))
            }
            pathState = 0
            break
        }
        break
      case 'smooth':
        let length = (x - pX) * 0.35
        if (series[i][j] === null) {
          pathState = 0
        } else {
          switch (pathState) {
            case 0:
              // Beginning of segment
              segmentStartX = pX
              if (isLowerRangeAreaPath) {
                // Need to add path portion that will join to the upper path
                linePath = graphics.move(pX, y2Arrj[j]) + graphics.line(pX, pY)
              } else {
                linePath = graphics.move(pX, pY)
              }
              areaPath = graphics.move(pX, pY)

              // Check for single isolated point
              if (series[i][j + 1] === null) {
                linePaths.push(linePath)
                areaPaths.push(areaPath)
                // Stay in pathState = 0;
                break
              }
              pathState = 1
              if (j < series[i].length - 2) {
                let p = graphics.curve(pX + length, pY, x - length, y, x, y)
                linePath += p
                areaPath += p
                break
              }
            // Continue on with pathState 1 to finish the path and exit
            case 1:
              // Continuing with segment
              if (series[i][j + 1] === null) {
                // Segment ends here
                if (isLowerRangeAreaPath) {
                  linePath += graphics.line(pX, y2)
                } else {
                  linePath += graphics.move(pX, pY)
                }
                areaPath +=
                  graphics.line(pX, areaBottomY) +
                  graphics.line(segmentStartX, areaBottomY) +
                  'z'
                linePaths.push(linePath)
                areaPaths.push(areaPath)
                pathState = -1
              } else {
                let p = graphics.curve(pX + length, pY, x - length, y, x, y)
                linePath += p
                areaPath += p
                if (j >= series[i].length - 2) {
                  if (isLowerRangeAreaPath) {
                    // Need to add path portion that will join to the upper path
                    linePath +=
                      graphics.curve(x, y, x, y, x, y2) + graphics.move(x, y2)
                  }
                  areaPath +=
                    graphics.curve(x, y, x, y, x, areaBottomY) +
                    graphics.line(segmentStartX, areaBottomY) +
                    'z'
                  linePaths.push(linePath)
                  areaPaths.push(areaPath)
                  pathState = -1
                }
              }
              break
          }
        }

        pX = x
        pY = y

        break
      default:
        let pathToPoint = (curve, x, y) => {
          let path = []
          switch (curve) {
            case 'stepline':
              path = graphics.line(x, null, 'H') + graphics.line(null, y, 'V')
              break
            case 'linestep':
              path = graphics.line(null, y, 'V') + graphics.line(x, null, 'H')
              break
            case 'straight':
              path = graphics.line(x, y)
              break
          }
          return path
        }
        if (series[i][j] === null) {
          pathState = 0
        } else {
          switch (pathState) {
            case 0:
              // Beginning of segment
              segmentStartX = pX
              if (isLowerRangeAreaPath) {
                // Need to add path portion that will join to the upper path
                linePath = graphics.move(pX, y2Arrj[j]) + graphics.line(pX, pY)
              } else {
                linePath = graphics.move(pX, pY)
              }
              areaPath = graphics.move(pX, pY)

              // Check for single isolated point
              if (series[i][j + 1] === null) {
                linePaths.push(linePath)
                areaPaths.push(areaPath)
                // Stay in pathState = 0
                break
              }
              pathState = 1
              if (j < series[i].length - 2) {
                let p = pathToPoint(curve, x, y)
                linePath += p
                areaPath += p
                break
              }
            // Continue on with pathState 1 to finish the path and exit
            case 1:
              // Continuing with segment
              if (series[i][j + 1] === null) {
                // Segment ends here
                if (isLowerRangeAreaPath) {
                  linePath += graphics.line(pX, y2)
                } else {
                  linePath += graphics.move(pX, pY)
                }
                areaPath +=
                  graphics.line(pX, areaBottomY) +
                  graphics.line(segmentStartX, areaBottomY) +
                  'z'
                linePaths.push(linePath)
                areaPaths.push(areaPath)
                pathState = -1
              } else {
                let p = pathToPoint(curve, x, y)
                linePath += p
                areaPath += p
                if (j >= series[i].length - 2) {
                  if (isLowerRangeAreaPath) {
                    // Need to add path portion that will join to the upper path
                    linePath += graphics.line(x, y2)
                  }
                  areaPath +=
                    graphics.line(x, areaBottomY) +
                    graphics.line(segmentStartX, areaBottomY) +
                    'z'
                  linePaths.push(linePath)
                  areaPaths.push(areaPath)
                  pathState = -1
                }
              }
              break
          }
        }

        pX = x
        pY = y

        break
    }

    return {
      linePaths,
      areaPaths,
      pX,
      pY,
      pathState,
      segmentStartX,
      linePath,
      areaPath,
    }
  }

  handleNullDataPoints(series, pointsPos, i, j, realIndex) {
    const w = this.w
    if (
      (series[i][j] === null && w.config.markers.showNullDataPoints) ||
      series[i].length === 1
    ) {
      let pSize = this.strokeWidth - w.config.markers.strokeWidth / 2
      if (!(pSize > 0)) {
        pSize = 0
      }
      // fixes apexcharts.js#1282, #1252
      let elPointsWrap = this.markers.plotChartMarkers(
        pointsPos,
        realIndex,
        j + 1,
        pSize,
        true
      )
      if (elPointsWrap !== null) {
        this.elPointsMain.add(elPointsWrap)
      }
    }
  }
}

export default Line
