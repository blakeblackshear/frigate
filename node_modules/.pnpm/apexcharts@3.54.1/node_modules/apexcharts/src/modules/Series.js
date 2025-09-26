import Graphics from './Graphics'
import Utils from '../utils/Utils'

/**
 * ApexCharts Series Class for interaction with the Series of the chart.
 *
 * @module Series
 **/

export default class Series {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.legendInactiveClass = 'legend-mouseover-inactive'
  }

  getAllSeriesEls() {
    return this.w.globals.dom.baseEl.getElementsByClassName(`apexcharts-series`)
  }

  getSeriesByName(seriesName) {
    return this.w.globals.dom.baseEl.querySelector(
      `.apexcharts-inner .apexcharts-series[seriesName='${Utils.escapeString(
        seriesName
      )}']`
    )
  }

  isSeriesHidden(seriesName) {
    const targetElement = this.getSeriesByName(seriesName)
    let realIndex = parseInt(targetElement.getAttribute('data:realIndex'), 10)
    let isHidden = targetElement.classList.contains(
      'apexcharts-series-collapsed'
    )

    return { isHidden, realIndex }
  }

  addCollapsedClassToSeries(elSeries, index) {
    const w = this.w
    function iterateOnAllCollapsedSeries(series) {
      for (let cs = 0; cs < series.length; cs++) {
        if (series[cs].index === index) {
          elSeries.node.classList.add('apexcharts-series-collapsed')
        }
      }
    }

    iterateOnAllCollapsedSeries(w.globals.collapsedSeries)
    iterateOnAllCollapsedSeries(w.globals.ancillaryCollapsedSeries)
  }

  toggleSeries(seriesName) {
    let isSeriesHidden = this.isSeriesHidden(seriesName)

    this.ctx.legend.legendHelpers.toggleDataSeries(
      isSeriesHidden.realIndex,
      isSeriesHidden.isHidden
    )

    return isSeriesHidden.isHidden
  }

  showSeries(seriesName) {
    let isSeriesHidden = this.isSeriesHidden(seriesName)

    if (isSeriesHidden.isHidden) {
      this.ctx.legend.legendHelpers.toggleDataSeries(
        isSeriesHidden.realIndex,
        true
      )
    }
  }

  hideSeries(seriesName) {
    let isSeriesHidden = this.isSeriesHidden(seriesName)

    if (!isSeriesHidden.isHidden) {
      this.ctx.legend.legendHelpers.toggleDataSeries(
        isSeriesHidden.realIndex,
        false
      )
    }
  }

  resetSeries(
    shouldUpdateChart = true,
    shouldResetZoom = true,
    shouldResetCollapsed = true
  ) {
    const w = this.w

    let series = Utils.clone(w.globals.initialSeries)

    w.globals.previousPaths = []

    if (shouldResetCollapsed) {
      w.globals.collapsedSeries = []
      w.globals.ancillaryCollapsedSeries = []
      w.globals.collapsedSeriesIndices = []
      w.globals.ancillaryCollapsedSeriesIndices = []
    } else {
      series = this.emptyCollapsedSeries(series)
    }

    w.config.series = series

    if (shouldUpdateChart) {
      if (shouldResetZoom) {
        w.globals.zoomed = false
        this.ctx.updateHelpers.revertDefaultAxisMinMax()
      }
      this.ctx.updateHelpers._updateSeries(
        series,
        w.config.chart.animations.dynamicAnimation.enabled
      )
    }
  }

  emptyCollapsedSeries(series) {
    const w = this.w
    for (let i = 0; i < series.length; i++) {
      if (w.globals.collapsedSeriesIndices.indexOf(i) > -1) {
        series[i].data = []
      }
    }
    return series
  }

  highlightSeries(seriesName) {
    const w = this.w

    const targetElement = this.getSeriesByName(seriesName)
    let realIndex = parseInt(targetElement?.getAttribute('data:realIndex'), 10)

    let allSeriesEls = w.globals.dom.baseEl.querySelectorAll(
      `.apexcharts-series, .apexcharts-datalabels, .apexcharts-yaxis`
    )

    let seriesEl = null
    let dataLabelEl = null
    let yaxisEl = null
    if (w.globals.axisCharts || w.config.chart.type === 'radialBar') {
      if (w.globals.axisCharts) {
        seriesEl = w.globals.dom.baseEl.querySelector(
          `.apexcharts-series[data\\:realIndex='${realIndex}']`
        )
        dataLabelEl = w.globals.dom.baseEl.querySelector(
          `.apexcharts-datalabels[data\\:realIndex='${realIndex}']`
        )
        let yaxisIndex = w.globals.seriesYAxisReverseMap[realIndex]
        yaxisEl = w.globals.dom.baseEl.querySelector(
          `.apexcharts-yaxis[rel='${yaxisIndex}']`
        )
      } else {
        seriesEl = w.globals.dom.baseEl.querySelector(
          `.apexcharts-series[rel='${realIndex + 1}']`
        )
      }
    } else {
      seriesEl = w.globals.dom.baseEl.querySelector(
        `.apexcharts-series[rel='${realIndex + 1}'] path`
      )
    }

    for (let se = 0; se < allSeriesEls.length; se++) {
      allSeriesEls[se].classList.add(this.legendInactiveClass)
    }

    if (seriesEl) {
      if (!w.globals.axisCharts) {
        seriesEl.parentNode.classList.remove(this.legendInactiveClass)
      }
      seriesEl.classList.remove(this.legendInactiveClass)

      if (dataLabelEl !== null) {
        dataLabelEl.classList.remove(this.legendInactiveClass)
      }

      if (yaxisEl !== null) {
        yaxisEl.classList.remove(this.legendInactiveClass)
      }
    } else {
      for (let se = 0; se < allSeriesEls.length; se++) {
        allSeriesEls[se].classList.remove(this.legendInactiveClass)
      }
    }
  }

  toggleSeriesOnHover(e, targetElement) {
    const w = this.w

    if (!targetElement) targetElement = e.target

    let allSeriesEls = w.globals.dom.baseEl.querySelectorAll(
      `.apexcharts-series, .apexcharts-datalabels, .apexcharts-yaxis`
    )

    if (e.type === 'mousemove') {
      let realIndex = parseInt(targetElement.getAttribute('rel'), 10) - 1

      this.highlightSeries(w.globals.seriesNames[realIndex])
    } else if (e.type === 'mouseout') {
      for (let se = 0; se < allSeriesEls.length; se++) {
        allSeriesEls[se].classList.remove(this.legendInactiveClass)
      }
    }
  }

  highlightRangeInSeries(e, targetElement) {
    const w = this.w
    const allHeatMapElements = w.globals.dom.baseEl.getElementsByClassName(
      'apexcharts-heatmap-rect'
    )

    const activeInactive = (action) => {
      for (let i = 0; i < allHeatMapElements.length; i++) {
        allHeatMapElements[i].classList[action](this.legendInactiveClass)
      }
    }

    const removeInactiveClassFromHoveredRange = (range, rangeMax) => {
      for (let i = 0; i < allHeatMapElements.length; i++) {
        const val = Number(allHeatMapElements[i].getAttribute('val'))
        if (
          val >= range.from &&
          (val < range.to || (range.to === rangeMax && val === rangeMax))
        ) {
          allHeatMapElements[i].classList.remove(this.legendInactiveClass)
        }
      }
    }

    if (e.type === 'mousemove') {
      let seriesCnt = parseInt(targetElement.getAttribute('rel'), 10) - 1
      activeInactive('add')

      const ranges = w.config.plotOptions.heatmap.colorScale.ranges
      const range = ranges[seriesCnt]
      const rangeMax = ranges.reduce((acc, cur) => Math.max(acc, cur.to), 0)

      removeInactiveClassFromHoveredRange(range, rangeMax)
    } else if (e.type === 'mouseout') {
      activeInactive('remove')
    }
  }

  getActiveConfigSeriesIndex(order = 'asc', chartTypes = []) {
    const w = this.w
    let activeIndex = 0

    if (w.config.series.length > 1) {
      // active series flag is required to know if user has not deactivated via legend click
      let activeSeriesIndex = w.config.series.map((s, index) => {
        const checkChartType = () => {
          if (w.globals.comboCharts) {
            return (
              chartTypes.length === 0 ||
              (chartTypes.length &&
                chartTypes.indexOf(w.config.series[index].type) > -1)
            )
          }
          return true
        }

        const hasData =
          s.data &&
          s.data.length > 0 &&
          w.globals.collapsedSeriesIndices.indexOf(index) === -1

        return hasData && checkChartType() ? index : -1
      })
      for (
        let a = order === 'asc' ? 0 : activeSeriesIndex.length - 1;
        order === 'asc' ? a < activeSeriesIndex.length : a >= 0;
        order === 'asc' ? a++ : a--
      ) {
        if (activeSeriesIndex[a] !== -1) {
          activeIndex = activeSeriesIndex[a]
          break
        }
      }
    }

    return activeIndex
  }

  getBarSeriesIndices() {
    const w = this.w
    if (w.globals.comboCharts) {
      return this.w.config.series
        .map((s, i) => {
          return s.type === 'bar' || s.type === 'column' ? i : -1
        })
        .filter((i) => {
          return i !== -1
        })
    }
    return this.w.config.series.map((s, i) => {
      return i
    })
  }

  getPreviousPaths() {
    let w = this.w

    w.globals.previousPaths = []

    function pushPaths(seriesEls, i, type) {
      let paths = seriesEls[i].childNodes
      let dArr = {
        type,
        paths: [],
        realIndex: seriesEls[i].getAttribute('data:realIndex'),
      }

      for (let j = 0; j < paths.length; j++) {
        if (paths[j].hasAttribute('pathTo')) {
          let d = paths[j].getAttribute('pathTo')
          dArr.paths.push({
            d,
          })
        }
      }

      w.globals.previousPaths.push(dArr)
    }

    const getPaths = (chartType) => {
      return w.globals.dom.baseEl.querySelectorAll(
        `.apexcharts-${chartType}-series .apexcharts-series`
      )
    }

    const chartTypes = [
      'line',
      'area',
      'bar',
      'rangebar',
      'rangeArea',
      'candlestick',
      'radar',
    ]
    chartTypes.forEach((type) => {
      const paths = getPaths(type)
      for (let p = 0; p < paths.length; p++) {
        pushPaths(paths, p, type)
      }
    })

    this.handlePrevBubbleScatterPaths('bubble')
    this.handlePrevBubbleScatterPaths('scatter')

    let heatTreeSeries = w.globals.dom.baseEl.querySelectorAll(
      `.apexcharts-${w.config.chart.type} .apexcharts-series`
    )

    if (heatTreeSeries.length > 0) {
      for (let h = 0; h < heatTreeSeries.length; h++) {
        let seriesEls = w.globals.dom.baseEl.querySelectorAll(
          `.apexcharts-${w.config.chart.type} .apexcharts-series[data\\:realIndex='${h}'] rect`
        )

        let dArr = []

        for (let i = 0; i < seriesEls.length; i++) {
          const getAttr = (x) => {
            return seriesEls[i].getAttribute(x)
          }
          const rect = {
            x: parseFloat(getAttr('x')),
            y: parseFloat(getAttr('y')),
            width: parseFloat(getAttr('width')),
            height: parseFloat(getAttr('height')),
          }
          dArr.push({
            rect,
            color: seriesEls[i].getAttribute('color'),
          })
        }
        w.globals.previousPaths.push(dArr)
      }
    }

    if (!w.globals.axisCharts) {
      // for non-axis charts (i.e., circular charts, pathFrom is not usable. We need whole series)
      w.globals.previousPaths = w.globals.series
    }
  }

  handlePrevBubbleScatterPaths(type) {
    const w = this.w
    let paths = w.globals.dom.baseEl.querySelectorAll(
      `.apexcharts-${type}-series .apexcharts-series`
    )
    if (paths.length > 0) {
      for (let s = 0; s < paths.length; s++) {
        let seriesEls = w.globals.dom.baseEl.querySelectorAll(
          `.apexcharts-${type}-series .apexcharts-series[data\\:realIndex='${s}'] circle`
        )
        let dArr = []

        for (let i = 0; i < seriesEls.length; i++) {
          dArr.push({
            x: seriesEls[i].getAttribute('cx'),
            y: seriesEls[i].getAttribute('cy'),
            r: seriesEls[i].getAttribute('r'),
          })
        }
        w.globals.previousPaths.push(dArr)
      }
    }
  }

  clearPreviousPaths() {
    const w = this.w
    w.globals.previousPaths = []
    w.globals.allSeriesCollapsed = false
  }

  handleNoData() {
    const w = this.w
    const me = this

    const noDataOpts = w.config.noData
    const graphics = new Graphics(me.ctx)

    let x = w.globals.svgWidth / 2
    let y = w.globals.svgHeight / 2
    let textAnchor = 'middle'

    w.globals.noData = true
    w.globals.animationEnded = true

    if (noDataOpts.align === 'left') {
      x = 10
      textAnchor = 'start'
    } else if (noDataOpts.align === 'right') {
      x = w.globals.svgWidth - 10
      textAnchor = 'end'
    }

    if (noDataOpts.verticalAlign === 'top') {
      y = 50
    } else if (noDataOpts.verticalAlign === 'bottom') {
      y = w.globals.svgHeight - 50
    }

    x = x + noDataOpts.offsetX
    y = y + parseInt(noDataOpts.style.fontSize, 10) + 2 + noDataOpts.offsetY

    if (noDataOpts.text !== undefined && noDataOpts.text !== '') {
      let titleText = graphics.drawText({
        x,
        y,
        text: noDataOpts.text,
        textAnchor,
        fontSize: noDataOpts.style.fontSize,
        fontFamily: noDataOpts.style.fontFamily,
        foreColor: noDataOpts.style.color,
        opacity: 1,
        class: 'apexcharts-text-nodata',
      })

      w.globals.dom.Paper.add(titleText)
    }
  }

  // When user clicks on legends, the collapsed series is filled with [0,0,0,...,0]
  // This is because we don't want to alter the series' length as it is used at many places
  setNullSeriesToZeroValues(series) {
    let w = this.w
    for (let sl = 0; sl < series.length; sl++) {
      if (series[sl].length === 0) {
        for (let j = 0; j < series[w.globals.maxValsInArrayIndex].length; j++) {
          series[sl].push(0)
        }
      }
    }
    return series
  }

  hasAllSeriesEqualX() {
    let equalLen = true
    const w = this.w

    const filteredSerX = this.filteredSeriesX()

    for (let i = 0; i < filteredSerX.length - 1; i++) {
      if (filteredSerX[i][0] !== filteredSerX[i + 1][0]) {
        equalLen = false
        break
      }
    }

    w.globals.allSeriesHasEqualX = equalLen

    return equalLen
  }

  filteredSeriesX() {
    const w = this.w

    const filteredSeriesX = w.globals.seriesX.map((ser) =>
      ser.length > 0 ? ser : []
    )

    return filteredSeriesX
  }
}
