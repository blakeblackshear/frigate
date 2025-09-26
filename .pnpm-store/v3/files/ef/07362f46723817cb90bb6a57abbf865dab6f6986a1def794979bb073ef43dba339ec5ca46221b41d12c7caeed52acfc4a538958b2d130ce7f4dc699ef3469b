import Utilities from '../../utils/Utils'
import Graphics from '../Graphics'

/**
 * ApexCharts Tooltip.Utils Class to support Tooltip functionality.
 *
 * @module Tooltip.Utils
 **/

export default class Utils {
  constructor(tooltipContext) {
    this.w = tooltipContext.w
    this.ttCtx = tooltipContext
    this.ctx = tooltipContext.ctx
  }

  /**
   ** When hovering over series, you need to capture which series is being hovered on.
   ** This function will return both capturedseries index as well as inner index of that series
   * @memberof Utils
   * @param {object}
   * - hoverArea = the rect on which user hovers
   * - elGrid = dimensions of the hover rect (it can be different than hoverarea)
   */
  getNearestValues({ hoverArea, elGrid, clientX, clientY }) {
    let w = this.w

    const seriesBound = elGrid.getBoundingClientRect()
    const hoverWidth = seriesBound.width
    const hoverHeight = seriesBound.height

    let xDivisor = hoverWidth / (w.globals.dataPoints - 1)
    let yDivisor = hoverHeight / w.globals.dataPoints

    const hasBars = this.hasBars()

    if (
      (w.globals.comboCharts || hasBars) &&
      !w.config.xaxis.convertedCatToNumeric
    ) {
      xDivisor = hoverWidth / w.globals.dataPoints
    }

    let hoverX = clientX - seriesBound.left - w.globals.barPadForNumericAxis
    let hoverY = clientY - seriesBound.top

    const notInRect =
      hoverX < 0 || hoverY < 0 || hoverX > hoverWidth || hoverY > hoverHeight

    if (notInRect) {
      hoverArea.classList.remove('hovering-zoom')
      hoverArea.classList.remove('hovering-pan')
    } else {
      if (w.globals.zoomEnabled) {
        hoverArea.classList.remove('hovering-pan')
        hoverArea.classList.add('hovering-zoom')
      } else if (w.globals.panEnabled) {
        hoverArea.classList.remove('hovering-zoom')
        hoverArea.classList.add('hovering-pan')
      }
    }

    let j = Math.round(hoverX / xDivisor)
    let jHorz = Math.floor(hoverY / yDivisor)

    if (hasBars && !w.config.xaxis.convertedCatToNumeric) {
      j = Math.ceil(hoverX / xDivisor)
      j = j - 1
    }

    let capturedSeries = null
    let closest = null

    let seriesXValArr = w.globals.seriesXvalues.map((seriesXVal) => {
      return seriesXVal.filter((s) => Utilities.isNumber(s))
    })
    let seriesYValArr = w.globals.seriesYvalues.map((seriesYVal) => {
      return seriesYVal.filter((s) => Utilities.isNumber(s))
    })

    // if X axis type is not category and tooltip is not shared, then we need to find the cursor position and get the nearest value
    if (w.globals.isXNumeric) {
      // Change origin of cursor position so that we can compute the relative nearest point to the cursor on our chart
      // we only need to scale because all points are relative to the bounds.left and bounds.top => origin is virtually (0, 0)
      const chartGridEl = this.ttCtx.getElGrid()
      const chartGridElBoundingRect = chartGridEl.getBoundingClientRect()
      const transformedHoverX =
        hoverX * (chartGridElBoundingRect.width / hoverWidth)
      const transformedHoverY =
        hoverY * (chartGridElBoundingRect.height / hoverHeight)

      closest = this.closestInMultiArray(
        transformedHoverX,
        transformedHoverY,
        seriesXValArr,
        seriesYValArr
      )
      capturedSeries = closest.index
      j = closest.j

      if (capturedSeries !== null) {
        // initial push, it should be a little smaller than the 1st val
        seriesXValArr = w.globals.seriesXvalues[capturedSeries]

        closest = this.closestInArray(transformedHoverX, seriesXValArr)

        j = closest.index
      }
    }

    w.globals.capturedSeriesIndex =
      capturedSeries === null ? -1 : capturedSeries

    if (!j || j < 1) j = 0

    if (w.globals.isBarHorizontal) {
      w.globals.capturedDataPointIndex = jHorz
    } else {
      w.globals.capturedDataPointIndex = j
    }

    return {
      capturedSeries,
      j: w.globals.isBarHorizontal ? jHorz : j,
      hoverX,
      hoverY,
    }
  }

  closestInMultiArray(hoverX, hoverY, Xarrays, Yarrays) {
    let w = this.w
    let activeIndex = 0
    let currIndex = null
    let j = -1

    if (w.globals.series.length > 1) {
      activeIndex = this.getFirstActiveXArray(Xarrays)
    } else {
      currIndex = 0
    }

    let currX = Xarrays[activeIndex][0]
    let diffX = Math.abs(hoverX - currX)

    // find nearest point on x-axis
    Xarrays.forEach((arrX) => {
      arrX.forEach((x, iX) => {
        const newDiff = Math.abs(hoverX - x)
        if (newDiff <= diffX) {
          diffX = newDiff
          j = iX
        }
      })
    })

    if (j !== -1) {
      // find nearest graph on y-axis relevanted to nearest point on x-axis
      let currY = Yarrays[activeIndex][j]
      let diffY = Math.abs(hoverY - currY)
      currIndex = activeIndex

      Yarrays.forEach((arrY, iAY) => {
        const newDiff = Math.abs(hoverY - arrY[j])
        if (newDiff <= diffY) {
          diffY = newDiff
          currIndex = iAY
        }
      })
    }

    return {
      index: currIndex,
      j,
    }
  }

  getFirstActiveXArray(Xarrays) {
    const w = this.w
    let activeIndex = 0

    let firstActiveSeriesIndex = Xarrays.map((xarr, index) => {
      return xarr.length > 0 ? index : -1
    })

    for (let a = 0; a < firstActiveSeriesIndex.length; a++) {
      if (
        firstActiveSeriesIndex[a] !== -1 &&
        w.globals.collapsedSeriesIndices.indexOf(a) === -1 &&
        w.globals.ancillaryCollapsedSeriesIndices.indexOf(a) === -1
      ) {
        activeIndex = firstActiveSeriesIndex[a]
        break
      }
    }

    return activeIndex
  }

  closestInArray(val, arr) {
    let curr = arr[0]
    let currIndex = null
    let diff = Math.abs(val - curr)

    for (let i = 0; i < arr.length; i++) {
      let newdiff = Math.abs(val - arr[i])
      if (newdiff < diff) {
        diff = newdiff
        currIndex = i
      }
    }

    return {
      index: currIndex,
    }
  }

  /**
   * When there are multiple series, it is possible to have different x values for each series.
   * But it may be possible in those multiple series, that there is same x value for 2 or more
   * series.
   * @memberof Utils
   * @param {int}
   * - j = is the inner index of series -> (series[i][j])
   * @return {bool}
   */
  isXoverlap(j) {
    let w = this.w
    let xSameForAllSeriesJArr = []

    const seriesX = w.globals.seriesX.filter((s) => typeof s[0] !== 'undefined')

    if (seriesX.length > 0) {
      for (let i = 0; i < seriesX.length - 1; i++) {
        if (
          typeof seriesX[i][j] !== 'undefined' &&
          typeof seriesX[i + 1][j] !== 'undefined'
        ) {
          if (seriesX[i][j] !== seriesX[i + 1][j]) {
            xSameForAllSeriesJArr.push('unEqual')
          }
        }
      }
    }

    if (xSameForAllSeriesJArr.length === 0) {
      return true
    }

    return false
  }

  isInitialSeriesSameLen() {
    let sameLen = true

    const initialSeries = this.w.globals.initialSeries

    for (let i = 0; i < initialSeries.length - 1; i++) {
      if (initialSeries[i].data.length !== initialSeries[i + 1].data.length) {
        sameLen = false
        break
      }
    }

    return sameLen
  }

  getBarsHeight(allbars) {
    let bars = [...allbars]
    const totalHeight = bars.reduce((acc, bar) => acc + bar.getBBox().height, 0)

    return totalHeight
  }

  getElMarkers(capturedSeries) {
    // The selector .apexcharts-series-markers-wrap > * includes marker groups for which the
    // .apexcharts-series-markers class is not added due to null values or discrete markers
    if (typeof capturedSeries == 'number') {
      return this.w.globals.dom.baseEl.querySelectorAll(
        `.apexcharts-series[data\\:realIndex='${capturedSeries}'] .apexcharts-series-markers-wrap > *`
      )
    }
    return this.w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-series-markers-wrap > *'
    )
  }

  getAllMarkers() {
    // first get all marker parents. This parent class contains series-index
    // which helps to sort the markers as they are dynamic
    let markersWraps = this.w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-series-markers-wrap'
    )

    markersWraps = [...markersWraps]
    markersWraps.sort((a, b) => {
      var indexA = Number(a.getAttribute('data:realIndex'))
      var indexB = Number(b.getAttribute('data:realIndex'))
      return indexB < indexA ? 1 : indexB > indexA ? -1 : 0
    })

    let markers = []
    markersWraps.forEach((m) => {
      markers.push(m.querySelector('.apexcharts-marker'))
    })

    return markers
  }

  hasMarkers(capturedSeries) {
    const markers = this.getElMarkers(capturedSeries)
    return markers.length > 0
  }

  getPathFromPoint(point, size) {
    let cx = Number(point.getAttribute('cx'))
    let cy = Number(point.getAttribute('cy'))
    let shape = point.getAttribute('shape')
    return new Graphics(this.ctx).getMarkerPath(cx, cy, shape, size)
  }

  getElBars() {
    return this.w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-bar-series,  .apexcharts-candlestick-series, .apexcharts-boxPlot-series, .apexcharts-rangebar-series'
    )
  }

  hasBars() {
    const bars = this.getElBars()
    return bars.length > 0
  }

  getHoverMarkerSize(index) {
    const w = this.w
    let hoverSize = w.config.markers.hover.size

    if (hoverSize === undefined) {
      hoverSize =
        w.globals.markers.size[index] + w.config.markers.hover.sizeOffset
    }
    return hoverSize
  }

  toggleAllTooltipSeriesGroups(state) {
    let w = this.w
    const ttCtx = this.ttCtx

    if (ttCtx.allTooltipSeriesGroups.length === 0) {
      ttCtx.allTooltipSeriesGroups = w.globals.dom.baseEl.querySelectorAll(
        '.apexcharts-tooltip-series-group'
      )
    }

    let allTooltipSeriesGroups = ttCtx.allTooltipSeriesGroups
    for (let i = 0; i < allTooltipSeriesGroups.length; i++) {
      if (state === 'enable') {
        allTooltipSeriesGroups[i].classList.add('apexcharts-active')
        allTooltipSeriesGroups[i].style.display = w.config.tooltip.items.display
      } else {
        allTooltipSeriesGroups[i].classList.remove('apexcharts-active')
        allTooltipSeriesGroups[i].style.display = 'none'
      }
    }
  }
}
