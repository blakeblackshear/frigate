import Formatters from '../Formatters'
import DateTime from '../../utils/DateTime'
import Utils from './Utils'
import Data from '../Data'

/**
 * ApexCharts Tooltip.Labels Class to draw texts on the tooltip.
 * This file deals with printing actual text on the tooltip.
 *
 * @module Tooltip.Labels
 **/

export default class Labels {
  constructor(tooltipContext) {
    this.w = tooltipContext.w
    this.ctx = tooltipContext.ctx
    this.ttCtx = tooltipContext
    this.tooltipUtil = new Utils(tooltipContext)
  }

  drawSeriesTexts({ shared = true, ttItems, i = 0, j = null, y1, y2, e }) {
    let w = this.w

    if (w.config.tooltip.custom !== undefined) {
      this.handleCustomTooltip({ i, j, y1, y2, w })
    } else {
      this.toggleActiveInactiveSeries(shared, i)
    }

    let values = this.getValuesToPrint({
      i,
      j,
    })

    this.printLabels({
      i,
      j,
      values,
      ttItems,
      shared,
      e,
    })

    // Re-calculate tooltip dimensions now that we have drawn the text
    const tooltipEl = this.ttCtx.getElTooltip()

    this.ttCtx.tooltipRect.ttWidth = tooltipEl.getBoundingClientRect().width
    this.ttCtx.tooltipRect.ttHeight = tooltipEl.getBoundingClientRect().height
  }

  printLabels({ i, j, values, ttItems, shared, e }) {
    const w = this.w
    let val
    let goalVals = []
    const hasGoalValues = (gi) => {
      return (
        w.globals.seriesGoals[gi] &&
        w.globals.seriesGoals[gi][j] &&
        Array.isArray(w.globals.seriesGoals[gi][j])
      )
    }

    const { xVal, zVal, xAxisTTVal } = values

    let seriesName = ''

    let pColor = w.globals.colors[i] // The pColor here is for the markers inside tooltip
    if (j !== null && w.config.plotOptions.bar.distributed) {
      pColor = w.globals.colors[j]
    }

    for (
      let t = 0, inverset = w.globals.series.length - 1;
      t < w.globals.series.length;
      t++, inverset--
    ) {
      let f = this.getFormatters(i)
      seriesName = this.getSeriesName({
        fn: f.yLbTitleFormatter,
        index: i,
        seriesIndex: i,
        j,
      })

      if (w.config.chart.type === 'treemap') {
        seriesName = f.yLbTitleFormatter(String(w.config.series[i].data[j].x), {
          series: w.globals.series,
          seriesIndex: i,
          dataPointIndex: j,
          w,
        })
      }

      const tIndex = w.config.tooltip.inverseOrder ? inverset : t

      if (w.globals.axisCharts) {
        const getValBySeriesIndex = (index) => {
          if (w.globals.isRangeData) {
            return (
              f.yLbFormatter(w.globals.seriesRangeStart?.[index]?.[j], {
                series: w.globals.seriesRangeStart,
                seriesIndex: index,
                dataPointIndex: j,
                w,
              }) +
              ' - ' +
              f.yLbFormatter(w.globals.seriesRangeEnd?.[index]?.[j], {
                series: w.globals.seriesRangeEnd,
                seriesIndex: index,
                dataPointIndex: j,
                w,
              })
            )
          }
          return f.yLbFormatter(w.globals.series[index][j], {
            series: w.globals.series,
            seriesIndex: index,
            dataPointIndex: j,
            w,
          })
        }
        if (shared) {
          f = this.getFormatters(tIndex)

          seriesName = this.getSeriesName({
            fn: f.yLbTitleFormatter,
            index: tIndex,
            seriesIndex: i,
            j,
          })
          pColor = w.globals.colors[tIndex]

          val = getValBySeriesIndex(tIndex)
          if (hasGoalValues(tIndex)) {
            goalVals = w.globals.seriesGoals[tIndex][j].map((goal) => {
              return {
                attrs: goal,
                val: f.yLbFormatter(goal.value, {
                  seriesIndex: tIndex,
                  dataPointIndex: j,
                  w,
                }),
              }
            })
          }
        } else {
          // get a color from a hover area (if it's a line pattern then get from a first line)
          const targetFill = e?.target?.getAttribute('fill')
          if (targetFill) {
            if (targetFill.indexOf('url') !== -1) {
              // pattern fill
              if (targetFill.indexOf('Pattern') !== -1) {
                pColor = w.globals.dom.baseEl
                  .querySelector(targetFill.substr(4).slice(0, -1))
                  .childNodes[0].getAttribute('stroke')
              }
            } else {
              pColor = targetFill
            }
          }
          val = getValBySeriesIndex(i)
          if (hasGoalValues(i) && Array.isArray(w.globals.seriesGoals[i][j])) {
            goalVals = w.globals.seriesGoals[i][j].map((goal) => {
              return {
                attrs: goal,
                val: f.yLbFormatter(goal.value, {
                  seriesIndex: i,
                  dataPointIndex: j,
                  w,
                }),
              }
            })
          }
        }
      }

      // for pie / donuts
      if (j === null) {
        val = f.yLbFormatter(w.globals.series[i], {
          ...w,
          seriesIndex: i,
          dataPointIndex: i,
        })
      }

      this.DOMHandling({
        i,
        t: tIndex,
        j,
        ttItems,
        values: {
          val,
          goalVals,
          xVal,
          xAxisTTVal,
          zVal,
        },
        seriesName,
        shared,
        pColor,
      })
    }
  }

  getFormatters(i) {
    const w = this.w

    let yLbFormatter = w.globals.yLabelFormatters[i]
    let yLbTitleFormatter

    if (w.globals.ttVal !== undefined) {
      if (Array.isArray(w.globals.ttVal)) {
        yLbFormatter = w.globals.ttVal[i] && w.globals.ttVal[i].formatter
        yLbTitleFormatter =
          w.globals.ttVal[i] &&
          w.globals.ttVal[i].title &&
          w.globals.ttVal[i].title.formatter
      } else {
        yLbFormatter = w.globals.ttVal.formatter
        if (typeof w.globals.ttVal.title.formatter === 'function') {
          yLbTitleFormatter = w.globals.ttVal.title.formatter
        }
      }
    } else {
      yLbTitleFormatter = w.config.tooltip.y.title.formatter
    }

    if (typeof yLbFormatter !== 'function') {
      if (w.globals.yLabelFormatters[0]) {
        yLbFormatter = w.globals.yLabelFormatters[0]
      } else {
        yLbFormatter = function (label) {
          return label
        }
      }
    }

    if (typeof yLbTitleFormatter !== 'function') {
      yLbTitleFormatter = function (label) {
        return label
      }
    }

    return {
      yLbFormatter,
      yLbTitleFormatter,
    }
  }

  getSeriesName({ fn, index, seriesIndex, j }) {
    const w = this.w
    return fn(String(w.globals.seriesNames[index]), {
      series: w.globals.series,
      seriesIndex,
      dataPointIndex: j,
      w,
    })
  }

  DOMHandling({ i, t, j, ttItems, values, seriesName, shared, pColor }) {
    const w = this.w
    const ttCtx = this.ttCtx

    const { val, goalVals, xVal, xAxisTTVal, zVal } = values

    let ttItemsChildren = null
    ttItemsChildren = ttItems[t].children

    if (w.config.tooltip.fillSeriesColor) {
      ttItems[t].style.backgroundColor = pColor
      ttItemsChildren[0].style.display = 'none'
    }

    if (ttCtx.showTooltipTitle) {
      if (ttCtx.tooltipTitle === null) {
        // get it once if null, and store it in class property
        ttCtx.tooltipTitle = w.globals.dom.baseEl.querySelector(
          '.apexcharts-tooltip-title'
        )
      }
      ttCtx.tooltipTitle.innerHTML = xVal
    }

    // if xaxis tooltip is constructed, we need to replace the innerHTML
    if (ttCtx.isXAxisTooltipEnabled) {
      ttCtx.xaxisTooltipText.innerHTML = xAxisTTVal !== '' ? xAxisTTVal : xVal
    }

    const ttYLabel = ttItems[t].querySelector(
      '.apexcharts-tooltip-text-y-label'
    )
    if (ttYLabel) {
      ttYLabel.innerHTML = seriesName ? seriesName : ''
    }
    const ttYVal = ttItems[t].querySelector('.apexcharts-tooltip-text-y-value')
    if (ttYVal) {
      ttYVal.innerHTML = typeof val !== 'undefined' ? val : ''
    }

    if (
      ttItemsChildren[0] &&
      ttItemsChildren[0].classList.contains('apexcharts-tooltip-marker')
    ) {
      if (
        w.config.tooltip.marker.fillColors &&
        Array.isArray(w.config.tooltip.marker.fillColors)
      ) {
        pColor = w.config.tooltip.marker.fillColors[t]
      }

      ttItemsChildren[0].style.backgroundColor = pColor
    }

    if (!w.config.tooltip.marker.show) {
      ttItemsChildren[0].style.display = 'none'
    }

    const ttGLabel = ttItems[t].querySelector(
      '.apexcharts-tooltip-text-goals-label'
    )
    const ttGVal = ttItems[t].querySelector(
      '.apexcharts-tooltip-text-goals-value'
    )

    if (goalVals.length && w.globals.seriesGoals[t]) {
      const createGoalsHtml = () => {
        let gLabels = '<div >'
        let gVals = '<div>'
        goalVals.forEach((goal, gi) => {
          gLabels += ` <div style="display: flex"><span class="apexcharts-tooltip-marker" style="background-color: ${goal.attrs.strokeColor}; height: 3px; border-radius: 0; top: 5px;"></span> ${goal.attrs.name}</div>`
          gVals += `<div>${goal.val}</div>`
        })
        ttGLabel.innerHTML = gLabels + `</div>`
        ttGVal.innerHTML = gVals + `</div>`
      }
      if (shared) {
        if (
          w.globals.seriesGoals[t][j] &&
          Array.isArray(w.globals.seriesGoals[t][j])
        ) {
          createGoalsHtml()
        } else {
          ttGLabel.innerHTML = ''
          ttGVal.innerHTML = ''
        }
      } else {
        createGoalsHtml()
      }
    } else {
      ttGLabel.innerHTML = ''
      ttGVal.innerHTML = ''
    }

    if (zVal !== null) {
      const ttZLabel = ttItems[t].querySelector(
        '.apexcharts-tooltip-text-z-label'
      )
      ttZLabel.innerHTML = w.config.tooltip.z.title
      const ttZVal = ttItems[t].querySelector(
        '.apexcharts-tooltip-text-z-value'
      )
      ttZVal.innerHTML = typeof zVal !== 'undefined' ? zVal : ''
    }

    if (shared && ttItemsChildren[0]) {
      // hide when no Val or series collapsed
      if (w.config.tooltip.hideEmptySeries) {
        let ttItemMarker = ttItems[t].querySelector(
          '.apexcharts-tooltip-marker'
        )
        let ttItemText = ttItems[t].querySelector('.apexcharts-tooltip-text')
        if (parseFloat(val) == 0) {
          ttItemMarker.style.display = 'none'
          ttItemText.style.display = 'none'
        } else {
          ttItemMarker.style.display = 'block'
          ttItemText.style.display = 'block'
        }
      }
      if (
        typeof val === 'undefined' ||
        val === null ||
        w.globals.ancillaryCollapsedSeriesIndices.indexOf(t) > -1 ||
        w.globals.collapsedSeriesIndices.indexOf(t) > -1 ||
        (Array.isArray(ttCtx.tConfig.enabledOnSeries) &&
          ttCtx.tConfig.enabledOnSeries.indexOf(t) === -1)
      ) {
        ttItemsChildren[0].parentNode.style.display = 'none'
      } else {
        ttItemsChildren[0].parentNode.style.display =
          w.config.tooltip.items.display
      }
    } else {
      if (
        Array.isArray(ttCtx.tConfig.enabledOnSeries) &&
        ttCtx.tConfig.enabledOnSeries.indexOf(t) === -1
      ) {
        ttItemsChildren[0].parentNode.style.display = 'none'
      }
    }
  }

  toggleActiveInactiveSeries(shared, i) {
    const w = this.w
    if (shared) {
      // make all tooltips active
      this.tooltipUtil.toggleAllTooltipSeriesGroups('enable')
    } else {
      // disable all tooltip text groups
      this.tooltipUtil.toggleAllTooltipSeriesGroups('disable')

      // enable the first tooltip text group
      let firstTooltipSeriesGroup = w.globals.dom.baseEl.querySelector(
        `.apexcharts-tooltip-series-group-${i}`
      )

      if (firstTooltipSeriesGroup) {
        firstTooltipSeriesGroup.classList.add('apexcharts-active')
        firstTooltipSeriesGroup.style.display = w.config.tooltip.items.display
      }
    }
  }

  getValuesToPrint({ i, j }) {
    const w = this.w
    const filteredSeriesX = this.ctx.series.filteredSeriesX()

    let xVal = ''
    let xAxisTTVal = ''
    let zVal = null
    let val = null

    const customFormatterOpts = {
      series: w.globals.series,
      seriesIndex: i,
      dataPointIndex: j,
      w,
    }

    let zFormatter = w.globals.ttZFormatter

    if (j === null) {
      val = w.globals.series[i]
    } else {
      if (w.globals.isXNumeric && w.config.chart.type !== 'treemap') {
        xVal = filteredSeriesX[i][j]
        if (filteredSeriesX[i].length === 0) {
          // a series (possibly the first one) might be collapsed, so get the next active index
          const firstActiveSeriesIndex =
            this.tooltipUtil.getFirstActiveXArray(filteredSeriesX)
          xVal = filteredSeriesX[firstActiveSeriesIndex][j]
        }
      } else {
        const dataFormat = new Data(this.ctx)
        if (dataFormat.isFormatXY()) {
          xVal =
            typeof w.config.series[i].data[j] !== 'undefined'
              ? w.config.series[i].data[j].x
              : ''
        } else {
          xVal =
            typeof w.globals.labels[j] !== 'undefined'
              ? w.globals.labels[j]
              : ''
        }
      }
    }

    let bufferXVal = xVal

    if (w.globals.isXNumeric && w.config.xaxis.type === 'datetime') {
      let xFormat = new Formatters(this.ctx)
      xVal = xFormat.xLabelFormat(
        w.globals.ttKeyFormatter,
        bufferXVal,
        bufferXVal,
        {
          i: undefined,
          dateFormatter: new DateTime(this.ctx).formatDate,
          w: this.w,
        }
      )
    } else {
      if (w.globals.isBarHorizontal) {
        xVal = w.globals.yLabelFormatters[0](bufferXVal, customFormatterOpts)
      } else {
        xVal = w.globals.xLabelFormatter(bufferXVal, customFormatterOpts)
      }
    }

    // override default x-axis formatter with tooltip formatter
    if (w.config.tooltip.x.formatter !== undefined) {
      xVal = w.globals.ttKeyFormatter(bufferXVal, customFormatterOpts)
    }

    if (w.globals.seriesZ.length > 0 && w.globals.seriesZ[i].length > 0) {
      zVal = zFormatter(w.globals.seriesZ[i][j], w)
    }

    if (typeof w.config.xaxis.tooltip.formatter === 'function') {
      xAxisTTVal = w.globals.xaxisTooltipFormatter(
        bufferXVal,
        customFormatterOpts
      )
    } else {
      xAxisTTVal = xVal
    }

    return {
      val: Array.isArray(val) ? val.join(' ') : val,
      xVal: Array.isArray(xVal) ? xVal.join(' ') : xVal,
      xAxisTTVal: Array.isArray(xAxisTTVal) ? xAxisTTVal.join(' ') : xAxisTTVal,
      zVal,
    }
  }

  handleCustomTooltip({ i, j, y1, y2, w }) {
    const tooltipEl = this.ttCtx.getElTooltip()
    let fn = w.config.tooltip.custom

    if (Array.isArray(fn) && fn[i]) {
      fn = fn[i]
    }

    // override everything with a custom html tooltip and replace it
    tooltipEl.innerHTML = fn({
      ctx: this.ctx,
      series: w.globals.series,
      seriesIndex: i,
      dataPointIndex: j,
      y1,
      y2,
      w,
    })
  }
}
