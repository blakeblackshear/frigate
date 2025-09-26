import Scatter from './../charts/Scatter'
import Graphics from './Graphics'
import Filters from './Filters'

/**
 * ApexCharts DataLabels Class for drawing dataLabels on Axes based Charts.
 *
 * @module DataLabels
 **/

class DataLabels {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  // When there are many datalabels to be printed, and some of them overlaps each other in the same series, this method will take care of that
  // Also, when datalabels exceeds the drawable area and get clipped off, we need to adjust and move some pixels to make them visible again
  dataLabelsCorrection(
    x,
    y,
    val,
    i,
    dataPointIndex,
    alwaysDrawDataLabel,
    fontSize
  ) {
    let w = this.w
    let graphics = new Graphics(this.ctx)
    let drawnextLabel = false //

    let textRects = graphics.getTextRects(val, fontSize)
    let width = textRects.width
    let height = textRects.height

    if (y < 0) y = 0
    if (y > w.globals.gridHeight + height) y = w.globals.gridHeight + height / 2

    // first value in series, so push an empty array
    if (typeof w.globals.dataLabelsRects[i] === 'undefined')
      w.globals.dataLabelsRects[i] = []

    // then start pushing actual rects in that sub-array
    w.globals.dataLabelsRects[i].push({ x, y, width, height })

    let len = w.globals.dataLabelsRects[i].length - 2
    let lastDrawnIndex =
      typeof w.globals.lastDrawnDataLabelsIndexes[i] !== 'undefined'
        ? w.globals.lastDrawnDataLabelsIndexes[i][
            w.globals.lastDrawnDataLabelsIndexes[i].length - 1
          ]
        : 0

    if (typeof w.globals.dataLabelsRects[i][len] !== 'undefined') {
      let lastDataLabelRect = w.globals.dataLabelsRects[i][lastDrawnIndex]
      if (
        // next label forward and x not intersecting
        x > lastDataLabelRect.x + lastDataLabelRect.width ||
        y > lastDataLabelRect.y + lastDataLabelRect.height ||
        y + height < lastDataLabelRect.y ||
        x + width < lastDataLabelRect.x // next label is going to be drawn backwards
      ) {
        // the 2 indexes don't override, so OK to draw next label
        drawnextLabel = true
      }
    }

    if (dataPointIndex === 0 || alwaysDrawDataLabel) {
      drawnextLabel = true
    }

    return {
      x,
      y,
      textRects,
      drawnextLabel,
    }
  }

  drawDataLabel({ type, pos, i, j, isRangeStart, strokeWidth = 2 }) {
    // this method handles line, area, bubble, scatter charts as those charts contains markers/points which have pre-defined x/y positions
    // all other charts like radar / bars / heatmaps will define their own drawDataLabel routine
    let w = this.w

    const graphics = new Graphics(this.ctx)

    let dataLabelsConfig = w.config.dataLabels

    let x = 0
    let y = 0

    let dataPointIndex = j

    let elDataLabelsWrap = null

    const seriesCollapsed = w.globals.collapsedSeriesIndices.indexOf(i) !== -1

    if (seriesCollapsed || !dataLabelsConfig.enabled || !Array.isArray(pos.x)) {
      return elDataLabelsWrap
    }

    elDataLabelsWrap = graphics.group({
      class: 'apexcharts-data-labels',
    })

    for (let q = 0; q < pos.x.length; q++) {
      x = pos.x[q] + dataLabelsConfig.offsetX
      y = pos.y[q] + dataLabelsConfig.offsetY + strokeWidth

      if (!isNaN(x)) {
        // a small hack as we have 2 points for the first val to connect it
        if (j === 1 && q === 0) dataPointIndex = 0
        if (j === 1 && q === 1) dataPointIndex = 1

        let val = w.globals.series[i][dataPointIndex]

        if (type === 'rangeArea') {
          if (isRangeStart) {
            val = w.globals.seriesRangeStart[i][dataPointIndex]
          } else {
            val = w.globals.seriesRangeEnd[i][dataPointIndex]
          }
        }

        let text = ''

        const getText = (v) => {
          return w.config.dataLabels.formatter(v, {
            ctx: this.ctx,
            seriesIndex: i,
            dataPointIndex,
            w,
          })
        }

        if (w.config.chart.type === 'bubble') {
          val = w.globals.seriesZ[i][dataPointIndex]
          text = getText(val)

          y = pos.y[q]
          const scatter = new Scatter(this.ctx)
          let centerTextInBubbleCoords = scatter.centerTextInBubble(
            y,
            i,
            dataPointIndex
          )
          y = centerTextInBubbleCoords.y
        } else {
          if (typeof val !== 'undefined') {
            text = getText(val)
          }
        }

        let textAnchor = w.config.dataLabels.textAnchor

        if (w.globals.isSlopeChart) {
          if (dataPointIndex === 0) {
            textAnchor = 'end'
          } else if (dataPointIndex === w.config.series[i].data.length - 1) {
            textAnchor = 'start'
          } else {
            textAnchor = 'middle'
          }
        }

        this.plotDataLabelsText({
          x,
          y,
          text,
          i,
          j: dataPointIndex,
          parent: elDataLabelsWrap,
          offsetCorrection: true,
          dataLabelsConfig: w.config.dataLabels,
          textAnchor,
        })
      }
    }

    return elDataLabelsWrap
  }

  plotDataLabelsText(opts) {
    let w = this.w
    let graphics = new Graphics(this.ctx)
    let {
      x,
      y,
      i,
      j,
      text,
      textAnchor,
      fontSize,
      parent,
      dataLabelsConfig,
      color,
      alwaysDrawDataLabel,
      offsetCorrection,
      className,
    } = opts

    let dataLabelText = null
    if (Array.isArray(w.config.dataLabels.enabledOnSeries)) {
      if (w.config.dataLabels.enabledOnSeries.indexOf(i) < 0) {
        return dataLabelText
      }
    }

    let correctedLabels = {
      x,
      y,
      drawnextLabel: true,
      textRects: null,
    }

    if (offsetCorrection) {
      correctedLabels = this.dataLabelsCorrection(
        x,
        y,
        text,
        i,
        j,
        alwaysDrawDataLabel,
        parseInt(dataLabelsConfig.style.fontSize, 10)
      )
    }

    // when zoomed, we don't need to correct labels offsets,
    // but if normally, labels get cropped, correct them
    if (!w.globals.zoomed) {
      x = correctedLabels.x
      y = correctedLabels.y
    }

    if (correctedLabels.textRects) {
      // fixes #2264
      if (
        x < -20 - correctedLabels.textRects.width ||
        x > w.globals.gridWidth + correctedLabels.textRects.width + 30
      ) {
        // datalabels fall outside drawing area, so draw a blank label
        text = ''
      }
    }

    let dataLabelColor = w.globals.dataLabels.style.colors[i]
    if (
      ((w.config.chart.type === 'bar' || w.config.chart.type === 'rangeBar') &&
        w.config.plotOptions.bar.distributed) ||
      w.config.dataLabels.distributed
    ) {
      dataLabelColor = w.globals.dataLabels.style.colors[j]
    }
    if (typeof dataLabelColor === 'function') {
      dataLabelColor = dataLabelColor({
        series: w.globals.series,
        seriesIndex: i,
        dataPointIndex: j,
        w,
      })
    }
    if (color) {
      dataLabelColor = color
    }

    let offX = dataLabelsConfig.offsetX
    let offY = dataLabelsConfig.offsetY

    if (w.config.chart.type === 'bar' || w.config.chart.type === 'rangeBar') {
      // for certain chart types, we handle offsets while calculating datalabels pos
      // why? because bars/column may have negative values and based on that
      // offsets becomes reversed
      offX = 0
      offY = 0
    }

    if (w.globals.isSlopeChart) {
      if (j !== 0) {
        offX = dataLabelsConfig.offsetX * -2 + 5
      }
      if (j !== 0 && j !== w.config.series[i].data.length - 1) {
        offX = 0
      }
    }

    if (correctedLabels.drawnextLabel) {
      dataLabelText = graphics.drawText({
        width: 100,
        height: parseInt(dataLabelsConfig.style.fontSize, 10),
        x: x + offX,
        y: y + offY,
        foreColor: dataLabelColor,
        textAnchor: textAnchor || dataLabelsConfig.textAnchor,
        text,
        fontSize: fontSize || dataLabelsConfig.style.fontSize,
        fontFamily: dataLabelsConfig.style.fontFamily,
        fontWeight: dataLabelsConfig.style.fontWeight || 'normal',
      })

      dataLabelText.attr({
        class: className || 'apexcharts-datalabel',
        cx: x,
        cy: y,
      })

      if (dataLabelsConfig.dropShadow.enabled) {
        const textShadow = dataLabelsConfig.dropShadow
        const filters = new Filters(this.ctx)
        filters.dropShadow(dataLabelText, textShadow)
      }

      parent.add(dataLabelText)

      if (typeof w.globals.lastDrawnDataLabelsIndexes[i] === 'undefined') {
        w.globals.lastDrawnDataLabelsIndexes[i] = []
      }

      w.globals.lastDrawnDataLabelsIndexes[i].push(j)
    }

    return dataLabelText
  }

  addBackgroundToDataLabel(el, coords) {
    const w = this.w

    const bCnf = w.config.dataLabels.background

    const paddingH = bCnf.padding
    const paddingV = bCnf.padding / 2

    const width = coords.width
    const height = coords.height
    const graphics = new Graphics(this.ctx)
    const elRect = graphics.drawRect(
      coords.x - paddingH,
      coords.y - paddingV / 2,
      width + paddingH * 2,
      height + paddingV,
      bCnf.borderRadius,
      w.config.chart.background === 'transparent' || !w.config.chart.background
        ? '#fff'
        : w.config.chart.background,
      bCnf.opacity,
      bCnf.borderWidth,
      bCnf.borderColor
    )

    if (bCnf.dropShadow.enabled) {
      const filters = new Filters(this.ctx)
      filters.dropShadow(elRect, bCnf.dropShadow)
    }

    return elRect
  }

  dataLabelsBackground() {
    const w = this.w

    if (w.config.chart.type === 'bubble') return

    const elDataLabels = w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-datalabels text'
    )

    for (let i = 0; i < elDataLabels.length; i++) {
      const el = elDataLabels[i]
      const coords = el.getBBox()
      let elRect = null

      if (coords.width && coords.height) {
        elRect = this.addBackgroundToDataLabel(el, coords)
      }
      if (elRect) {
        el.parentNode.insertBefore(elRect.node, el)
        const background = el.getAttribute('fill')

        const shouldAnim =
          w.config.chart.animations.enabled &&
          !w.globals.resized &&
          !w.globals.dataChanged

        if (shouldAnim) {
          elRect.animate().attr({ fill: background })
        } else {
          elRect.attr({ fill: background })
        }
        el.setAttribute('fill', w.config.dataLabels.background.foreColor)
      }
    }
  }

  bringForward() {
    const w = this.w
    const elDataLabelsNodes = w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-datalabels'
    )

    const elSeries = w.globals.dom.baseEl.querySelector(
      '.apexcharts-plot-series:last-child'
    )

    for (let i = 0; i < elDataLabelsNodes.length; i++) {
      if (elSeries) {
        elSeries.insertBefore(elDataLabelsNodes[i], elSeries.nextSibling)
      }
    }
  }
}

export default DataLabels
