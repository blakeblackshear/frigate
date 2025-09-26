import Formatters from '../Formatters'
import Graphics from '../Graphics'
import CoreUtils from '../CoreUtils'
import DateTime from '../../utils/DateTime'

export default class AxesUtils {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  // Based on the formatter function, get the label text and position
  getLabel(
    labels,
    timescaleLabels,
    x,
    i,
    drawnLabels = [],
    fontSize = '12px',
    isLeafGroup = true
  ) {
    const w = this.w
    let rawLabel = typeof labels[i] === 'undefined' ? '' : labels[i]
    let label = rawLabel

    let xlbFormatter = w.globals.xLabelFormatter
    let customFormatter = w.config.xaxis.labels.formatter

    let isBold = false

    let xFormat = new Formatters(this.ctx)
    let timestamp = rawLabel

    if (isLeafGroup) {
      label = xFormat.xLabelFormat(xlbFormatter, rawLabel, timestamp, {
        i,
        dateFormatter: new DateTime(this.ctx).formatDate,
        w,
      })

      if (customFormatter !== undefined) {
        label = customFormatter(rawLabel, labels[i], {
          i,
          dateFormatter: new DateTime(this.ctx).formatDate,
          w,
        })
      }
    }

    const determineHighestUnit = (unit) => {
      let highestUnit = null
      timescaleLabels.forEach((t) => {
        if (t.unit === 'month') {
          highestUnit = 'year'
        } else if (t.unit === 'day') {
          highestUnit = 'month'
        } else if (t.unit === 'hour') {
          highestUnit = 'day'
        } else if (t.unit === 'minute') {
          highestUnit = 'hour'
        }
      })

      return highestUnit === unit
    }
    if (timescaleLabels.length > 0) {
      isBold = determineHighestUnit(timescaleLabels[i].unit)
      x = timescaleLabels[i].position
      label = timescaleLabels[i].value
    } else {
      if (w.config.xaxis.type === 'datetime' && customFormatter === undefined) {
        label = ''
      }
    }

    if (typeof label === 'undefined') label = ''

    label = Array.isArray(label) ? label : label.toString()

    let graphics = new Graphics(this.ctx)
    let textRect = {}
    if (w.globals.rotateXLabels && isLeafGroup) {
      textRect = graphics.getTextRects(
        label,
        parseInt(fontSize, 10),
        null,
        `rotate(${w.config.xaxis.labels.rotate} 0 0)`,
        false
      )
    } else {
      textRect = graphics.getTextRects(label, parseInt(fontSize, 10))
    }

    const allowDuplicatesInTimeScale =
      !w.config.xaxis.labels.showDuplicates && this.ctx.timeScale

    if (
      !Array.isArray(label) &&
      (String(label) === 'NaN' ||
        (drawnLabels.indexOf(label) >= 0 && allowDuplicatesInTimeScale))
    ) {
      label = ''
    }

    return {
      x,
      text: label,
      textRect,
      isBold,
    }
  }

  checkLabelBasedOnTickamount(i, label, labelsLen) {
    const w = this.w

    let ticks = w.config.xaxis.tickAmount
    if (ticks === 'dataPoints') ticks = Math.round(w.globals.gridWidth / 120)

    if (ticks > labelsLen) return label
    let tickMultiple = Math.round(labelsLen / (ticks + 1))

    if (i % tickMultiple === 0) {
      return label
    } else {
      label.text = ''
    }

    return label
  }

  checkForOverflowingLabels(
    i,
    label,
    labelsLen,
    drawnLabels,
    drawnLabelsRects
  ) {
    const w = this.w

    if (i === 0) {
      // check if first label is being truncated
      if (w.globals.skipFirstTimelinelabel) {
        label.text = ''
      }
    }

    if (i === labelsLen - 1) {
      // check if last label is being truncated
      if (w.globals.skipLastTimelinelabel) {
        label.text = ''
      }
    }

    if (w.config.xaxis.labels.hideOverlappingLabels && drawnLabels.length > 0) {
      const prev = drawnLabelsRects[drawnLabelsRects.length - 1]
      if (
        label.x <
        prev.textRect.width /
          (w.globals.rotateXLabels
            ? Math.abs(w.config.xaxis.labels.rotate) / 12
            : 1.01) +
          prev.x
      ) {
        label.text = ''
      }
    }

    return label
  }

  checkForReversedLabels(i, labels) {
    const w = this.w
    if (w.config.yaxis[i] && w.config.yaxis[i].reversed) {
      labels.reverse()
    }
    return labels
  }
  
  yAxisAllSeriesCollapsed(index) {
    const gl = this.w.globals

    return !gl.seriesYAxisMap[index].some((si) => {
      return gl.collapsedSeriesIndices.indexOf(si) === -1
    })
    
  }
  
  // Method to translate annotation.yAxisIndex values from
  // seriesName-as-a-string values to seriesName-as-an-array values (old style
  // series mapping to new style).
  translateYAxisIndex(index) {
    const w = this.w
    const gl = w.globals
    const yaxis = w.config.yaxis
    let newStyle =
          gl.series.length > yaxis.length
          || yaxis.some((a) => Array.isArray(a.seriesName))
    if (newStyle) {
      return index
    } else {
      return gl.seriesYAxisReverseMap[index]
    }
  }

  isYAxisHidden(index) {
    const w = this.w
    const yaxis = w.config.yaxis[index]

    if (!yaxis.show || this.yAxisAllSeriesCollapsed(index) 
    ) {
      return true
    }
    if (!yaxis.showForNullSeries) {
      const seriesIndices = w.globals.seriesYAxisMap[index]
      const coreUtils = new CoreUtils(this.ctx)
      return seriesIndices.every((si) => coreUtils.isSeriesNull(si))
    }
    return false
  }

  // get the label color for y-axis
  // realIndex is the actual series index, while i is the tick Index
  getYAxisForeColor(yColors, realIndex) {
    const w = this.w
    if (Array.isArray(yColors) && w.globals.yAxisScale[realIndex]) {
      this.ctx.theme.pushExtraColors(
        yColors,
        w.globals.yAxisScale[realIndex].result.length,
        false
      )
    }
    return yColors
  }

  drawYAxisTicks(
    x,
    tickAmount,
    axisBorder,
    axisTicks,
    realIndex,
    labelsDivider,
    elYaxis
  ) {
    let w = this.w
    let graphics = new Graphics(this.ctx)

    // initial label position = 0;
    let tY = w.globals.translateY + w.config.yaxis[realIndex].labels.offsetY
    if (w.globals.isBarHorizontal) {
      tY = 0
    } else if (w.config.chart.type === 'heatmap') {
      tY += labelsDivider / 2
    }

    if (axisTicks.show && tickAmount > 0) {
      if (w.config.yaxis[realIndex].opposite === true) x = x + axisTicks.width

      for (let i = tickAmount; i >= 0; i--) {
        let elTick = graphics.drawLine(
          x + axisBorder.offsetX - axisTicks.width + axisTicks.offsetX,
          tY + axisTicks.offsetY,
          x + axisBorder.offsetX + axisTicks.offsetX,
          tY + axisTicks.offsetY,
          axisTicks.color
        )
        elYaxis.add(elTick)
        tY += labelsDivider
      }
    }
  }
}
