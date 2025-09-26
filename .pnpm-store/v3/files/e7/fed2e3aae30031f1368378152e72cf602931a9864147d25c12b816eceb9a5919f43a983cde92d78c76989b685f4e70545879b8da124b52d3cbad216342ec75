import Graphics from '../Graphics'
import AxesUtils from './AxesUtils'

/**
 * ApexCharts XAxis Class for drawing X-Axis.
 *
 * @module XAxis
 **/

export default class XAxis {
  constructor(ctx, elgrid) {
    this.ctx = ctx
    this.elgrid = elgrid
    this.w = ctx.w

    const w = this.w
    this.axesUtils = new AxesUtils(ctx)

    this.xaxisLabels = w.globals.labels.slice()
    if (w.globals.timescaleLabels.length > 0 && !w.globals.isBarHorizontal) {
      //  timeline labels are there and chart is not rangeabr timeline
      this.xaxisLabels = w.globals.timescaleLabels.slice()
    }

    if (w.config.xaxis.overwriteCategories) {
      this.xaxisLabels = w.config.xaxis.overwriteCategories
    }
    this.drawnLabels = []
    this.drawnLabelsRects = []

    if (w.config.xaxis.position === 'top') {
      this.offY = 0
    } else {
      this.offY = w.globals.gridHeight
    }
    this.offY = this.offY + w.config.xaxis.axisBorder.offsetY
    this.isCategoryBarHorizontal =
      w.config.chart.type === 'bar' && w.config.plotOptions.bar.horizontal

    this.xaxisFontSize = w.config.xaxis.labels.style.fontSize
    this.xaxisFontFamily = w.config.xaxis.labels.style.fontFamily
    this.xaxisForeColors = w.config.xaxis.labels.style.colors
    this.xaxisBorderWidth = w.config.xaxis.axisBorder.width
    if (this.isCategoryBarHorizontal) {
      this.xaxisBorderWidth = w.config.yaxis[0].axisBorder.width.toString()
    }

    if (this.xaxisBorderWidth.indexOf('%') > -1) {
      this.xaxisBorderWidth =
        (w.globals.gridWidth * parseInt(this.xaxisBorderWidth, 10)) / 100
    } else {
      this.xaxisBorderWidth = parseInt(this.xaxisBorderWidth, 10)
    }
    this.xaxisBorderHeight = w.config.xaxis.axisBorder.height

    // For bars, we will only consider single y xais,
    // as we are not providing multiple yaxis for bar charts
    this.yaxis = w.config.yaxis[0]
  }

  drawXaxis() {
    let w = this.w
    let graphics = new Graphics(this.ctx)

    let elXaxis = graphics.group({
      class: 'apexcharts-xaxis',
      transform: `translate(${w.config.xaxis.offsetX}, ${w.config.xaxis.offsetY})`,
    })

    let elXaxisTexts = graphics.group({
      class: 'apexcharts-xaxis-texts-g',
      transform: `translate(${w.globals.translateXAxisX}, ${w.globals.translateXAxisY})`,
    })

    elXaxis.add(elXaxisTexts)

    let labels = []

    for (let i = 0; i < this.xaxisLabels.length; i++) {
      labels.push(this.xaxisLabels[i])
    }

    this.drawXAxisLabelAndGroup(
      true,
      graphics,
      elXaxisTexts,
      labels,
      w.globals.isXNumeric,
      (i, colWidth) => colWidth
    )

    if (w.globals.hasXaxisGroups) {
      let labelsGroup = w.globals.groups

      labels = []
      for (let i = 0; i < labelsGroup.length; i++) {
        labels.push(labelsGroup[i].title)
      }

      let overwriteStyles = {}
      if (w.config.xaxis.group.style) {
        overwriteStyles.xaxisFontSize = w.config.xaxis.group.style.fontSize
        overwriteStyles.xaxisFontFamily = w.config.xaxis.group.style.fontFamily
        overwriteStyles.xaxisForeColors = w.config.xaxis.group.style.colors
        overwriteStyles.fontWeight = w.config.xaxis.group.style.fontWeight
        overwriteStyles.cssClass = w.config.xaxis.group.style.cssClass
      }

      this.drawXAxisLabelAndGroup(
        false,
        graphics,
        elXaxisTexts,
        labels,
        false,
        (i, colWidth) => labelsGroup[i].cols * colWidth,
        overwriteStyles
      )
    }

    if (w.config.xaxis.title.text !== undefined) {
      let elXaxisTitle = graphics.group({
        class: 'apexcharts-xaxis-title',
      })

      let elXAxisTitleText = graphics.drawText({
        x: w.globals.gridWidth / 2 + w.config.xaxis.title.offsetX,
        y:
          this.offY +
          parseFloat(this.xaxisFontSize) +
          (w.config.xaxis.position === 'bottom'
            ? w.globals.xAxisLabelsHeight
            : -w.globals.xAxisLabelsHeight - 10) +
          w.config.xaxis.title.offsetY,
        text: w.config.xaxis.title.text,
        textAnchor: 'middle',
        fontSize: w.config.xaxis.title.style.fontSize,
        fontFamily: w.config.xaxis.title.style.fontFamily,
        fontWeight: w.config.xaxis.title.style.fontWeight,
        foreColor: w.config.xaxis.title.style.color,
        cssClass:
          'apexcharts-xaxis-title-text ' + w.config.xaxis.title.style.cssClass,
      })

      elXaxisTitle.add(elXAxisTitleText)

      elXaxis.add(elXaxisTitle)
    }

    if (w.config.xaxis.axisBorder.show) {
      const offX = w.globals.barPadForNumericAxis
      let elHorzLine = graphics.drawLine(
        w.globals.padHorizontal + w.config.xaxis.axisBorder.offsetX - offX,
        this.offY,
        this.xaxisBorderWidth + offX,
        this.offY,
        w.config.xaxis.axisBorder.color,
        0,
        this.xaxisBorderHeight
      )
      if (this.elgrid && this.elgrid.elGridBorders && w.config.grid.show) {
        this.elgrid.elGridBorders.add(elHorzLine)
      } else {
        elXaxis.add(elHorzLine)
      }
    }

    return elXaxis
  }

  drawXAxisLabelAndGroup(
    isLeafGroup,
    graphics,
    elXaxisTexts,
    labels,
    isXNumeric,
    colWidthCb,
    overwriteStyles = {}
  ) {
    let drawnLabels = []
    let drawnLabelsRects = []
    let w = this.w

    const xaxisFontSize = overwriteStyles.xaxisFontSize || this.xaxisFontSize
    const xaxisFontFamily =
      overwriteStyles.xaxisFontFamily || this.xaxisFontFamily
    const xaxisForeColors =
      overwriteStyles.xaxisForeColors || this.xaxisForeColors
    const fontWeight =
      overwriteStyles.fontWeight || w.config.xaxis.labels.style.fontWeight
    const cssClass =
      overwriteStyles.cssClass || w.config.xaxis.labels.style.cssClass

    let colWidth

    // initial x Position (keep adding column width in the loop)
    let xPos = w.globals.padHorizontal

    let labelsLen = labels.length

    /**
     * labelsLen can be different (whether you are drawing x-axis labels or x-axis group labels)
     * hence, we introduce dataPoints to be consistent.
     * Also, in datetime/numeric xaxis, dataPoints can be misleading, so we resort to labelsLen for such xaxis type
     */
    let dataPoints =
      w.config.xaxis.type === 'category' ? w.globals.dataPoints : labelsLen

    // when all series are collapsed, fixes #3381
    if (dataPoints === 0 && labelsLen > dataPoints) dataPoints = labelsLen

    if (isXNumeric) {
      let len = dataPoints > 1 ? dataPoints - 1 : dataPoints
      colWidth = w.globals.gridWidth / Math.min(len, labelsLen - 1)

      xPos = xPos + colWidthCb(0, colWidth) / 2 + w.config.xaxis.labels.offsetX
    } else {
      colWidth = w.globals.gridWidth / dataPoints
      xPos = xPos + colWidthCb(0, colWidth) + w.config.xaxis.labels.offsetX
    }

    for (let i = 0; i <= labelsLen - 1; i++) {
      let x = xPos - colWidthCb(i, colWidth) / 2 + w.config.xaxis.labels.offsetX

      if (
        i === 0 &&
        labelsLen === 1 &&
        colWidth / 2 === xPos &&
        dataPoints === 1
      ) {
        // single datapoint
        x = w.globals.gridWidth / 2
      }
      let label = this.axesUtils.getLabel(
        labels,
        w.globals.timescaleLabels,
        x,
        i,
        drawnLabels,
        xaxisFontSize,
        isLeafGroup
      )

      let offsetYCorrection = 28
      if (w.globals.rotateXLabels && isLeafGroup) {
        offsetYCorrection = 22
      }

      if (w.config.xaxis.title.text && w.config.xaxis.position === 'top') {
        offsetYCorrection += parseFloat(w.config.xaxis.title.style.fontSize) + 2
      }

      if (!isLeafGroup) {
        offsetYCorrection =
          offsetYCorrection +
          parseFloat(xaxisFontSize) +
          (w.globals.xAxisLabelsHeight - w.globals.xAxisGroupLabelsHeight) +
          (w.globals.rotateXLabels ? 10 : 0)
      }

      const isCategoryTickAmounts =
        typeof w.config.xaxis.tickAmount !== 'undefined' &&
        w.config.xaxis.tickAmount !== 'dataPoints' &&
        w.config.xaxis.type !== 'datetime'

      if (isCategoryTickAmounts) {
        label = this.axesUtils.checkLabelBasedOnTickamount(i, label, labelsLen)
      } else {
        label = this.axesUtils.checkForOverflowingLabels(
          i,
          label,
          labelsLen,
          drawnLabels,
          drawnLabelsRects
        )
      }

      const getCatForeColor = () => {
        return isLeafGroup && w.config.xaxis.convertedCatToNumeric
          ? xaxisForeColors[w.globals.minX + i - 1]
          : xaxisForeColors[i]
      }

      if (w.config.xaxis.labels.show) {
        let elText = graphics.drawText({
          x: label.x,
          y:
            this.offY +
            w.config.xaxis.labels.offsetY +
            offsetYCorrection -
            (w.config.xaxis.position === 'top'
              ? w.globals.xAxisHeight + w.config.xaxis.axisTicks.height - 2
              : 0),
          text: label.text,
          textAnchor: 'middle',
          fontWeight: label.isBold ? 600 : fontWeight,
          fontSize: xaxisFontSize,
          fontFamily: xaxisFontFamily,
          foreColor: Array.isArray(xaxisForeColors)
            ? getCatForeColor()
            : xaxisForeColors,
          isPlainText: false,
          cssClass:
            (isLeafGroup
              ? 'apexcharts-xaxis-label '
              : 'apexcharts-xaxis-group-label ') + cssClass,
        })
        elXaxisTexts.add(elText)

        elText.on('click', (e) => {
          if (typeof w.config.chart.events.xAxisLabelClick === 'function') {
            const opts = Object.assign({}, w, {
              labelIndex: i,
            })

            w.config.chart.events.xAxisLabelClick(e, this.ctx, opts)
          }
        })

        if (isLeafGroup) {
          let elTooltipTitle = document.createElementNS(
            w.globals.SVGNS,
            'title'
          )
          elTooltipTitle.textContent = Array.isArray(label.text)
            ? label.text.join(' ')
            : label.text
          elText.node.appendChild(elTooltipTitle)
          if (label.text !== '') {
            drawnLabels.push(label.text)
            drawnLabelsRects.push(label)
          }
        }
      }
      if (i < labelsLen - 1) {
        xPos = xPos + colWidthCb(i + 1, colWidth)
      }
    }
  }

  // this actually becomes the vertical axis (for bar charts)
  drawXaxisInversed(realIndex) {
    let w = this.w
    let graphics = new Graphics(this.ctx)

    let translateYAxisX = w.config.yaxis[0].opposite
      ? w.globals.translateYAxisX[realIndex]
      : 0

    let elYaxis = graphics.group({
      class: 'apexcharts-yaxis apexcharts-xaxis-inversed',
      rel: realIndex,
    })

    let elYaxisTexts = graphics.group({
      class: 'apexcharts-yaxis-texts-g apexcharts-xaxis-inversed-texts-g',
      transform: 'translate(' + translateYAxisX + ', 0)',
    })

    elYaxis.add(elYaxisTexts)

    let colHeight

    // initial x Position (keep adding column width in the loop)
    let yPos
    let labels = []

    if (w.config.yaxis[realIndex].show) {
      for (let i = 0; i < this.xaxisLabels.length; i++) {
        labels.push(this.xaxisLabels[i])
      }
    }

    colHeight = w.globals.gridHeight / labels.length
    yPos = -(colHeight / 2.2)

    let lbFormatter = w.globals.yLabelFormatters[0]

    const ylabels = w.config.yaxis[0].labels

    if (ylabels.show) {
      for (let i = 0; i <= labels.length - 1; i++) {
        let label = typeof labels[i] === 'undefined' ? '' : labels[i]

        label = lbFormatter(label, {
          seriesIndex: realIndex,
          dataPointIndex: i,
          w,
        })

        const yColors = this.axesUtils.getYAxisForeColor(
          ylabels.style.colors,
          realIndex
        )
        const getForeColor = () => {
          return Array.isArray(yColors) ? yColors[i] : yColors
        }

        let multiY = 0
        if (Array.isArray(label)) {
          multiY = (label.length / 2) * parseInt(ylabels.style.fontSize, 10)
        }

        let offsetX = ylabels.offsetX - 15
        let textAnchor = 'end'
        if (this.yaxis.opposite) {
          textAnchor = 'start'
        }
        if (w.config.yaxis[0].labels.align === 'left') {
          offsetX = ylabels.offsetX
          textAnchor = 'start'
        } else if (w.config.yaxis[0].labels.align === 'center') {
          offsetX = ylabels.offsetX
          textAnchor = 'middle'
        } else if (w.config.yaxis[0].labels.align === 'right') {
          textAnchor = 'end'
        }

        let elLabel = graphics.drawText({
          x: offsetX,
          y: yPos + colHeight + ylabels.offsetY - multiY,
          text: label,
          textAnchor,
          foreColor: getForeColor(),
          fontSize: ylabels.style.fontSize,
          fontFamily: ylabels.style.fontFamily,
          fontWeight: ylabels.style.fontWeight,
          isPlainText: false,
          cssClass: 'apexcharts-yaxis-label ' + ylabels.style.cssClass,
          maxWidth: ylabels.maxWidth,
        })

        elYaxisTexts.add(elLabel)

        elLabel.on('click', (e) => {
          if (typeof w.config.chart.events.xAxisLabelClick === 'function') {
            const opts = Object.assign({}, w, {
              labelIndex: i,
            })

            w.config.chart.events.xAxisLabelClick(e, this.ctx, opts)
          }
        })

        let elTooltipTitle = document.createElementNS(w.globals.SVGNS, 'title')
        elTooltipTitle.textContent = Array.isArray(label)
          ? label.join(' ')
          : label
        elLabel.node.appendChild(elTooltipTitle)

        if (w.config.yaxis[realIndex].labels.rotate !== 0) {
          let labelRotatingCenter = graphics.rotateAroundCenter(elLabel.node)
          elLabel.node.setAttribute(
            'transform',
            `rotate(${w.config.yaxis[realIndex].labels.rotate} 0 ${labelRotatingCenter.y})`
          )
        }
        yPos = yPos + colHeight
      }
    }

    if (w.config.yaxis[0].title.text !== undefined) {
      let elXaxisTitle = graphics.group({
        class: 'apexcharts-yaxis-title apexcharts-xaxis-title-inversed',
        transform: 'translate(' + translateYAxisX + ', 0)',
      })

      let elXAxisTitleText = graphics.drawText({
        x: w.config.yaxis[0].title.offsetX,
        y: w.globals.gridHeight / 2 + w.config.yaxis[0].title.offsetY,
        text: w.config.yaxis[0].title.text,
        textAnchor: 'middle',
        foreColor: w.config.yaxis[0].title.style.color,
        fontSize: w.config.yaxis[0].title.style.fontSize,
        fontWeight: w.config.yaxis[0].title.style.fontWeight,
        fontFamily: w.config.yaxis[0].title.style.fontFamily,
        cssClass:
          'apexcharts-yaxis-title-text ' +
          w.config.yaxis[0].title.style.cssClass,
      })

      elXaxisTitle.add(elXAxisTitleText)

      elYaxis.add(elXaxisTitle)
    }

    let offX = 0
    if (this.isCategoryBarHorizontal && w.config.yaxis[0].opposite) {
      offX = w.globals.gridWidth
    }
    const axisBorder = w.config.xaxis.axisBorder
    if (axisBorder.show) {
      let elVerticalLine = graphics.drawLine(
        w.globals.padHorizontal + axisBorder.offsetX + offX,
        1 + axisBorder.offsetY,
        w.globals.padHorizontal + axisBorder.offsetX + offX,
        w.globals.gridHeight + axisBorder.offsetY,
        axisBorder.color,
        0
      )

      if (this.elgrid && this.elgrid.elGridBorders && w.config.grid.show) {
        this.elgrid.elGridBorders.add(elVerticalLine)
      } else {
        elYaxis.add(elVerticalLine)
      }
    }

    if (w.config.yaxis[0].axisTicks.show) {
      this.axesUtils.drawYAxisTicks(
        offX,
        labels.length,
        w.config.yaxis[0].axisBorder,
        w.config.yaxis[0].axisTicks,
        0,
        colHeight,
        elYaxis
      )
    }

    return elYaxis
  }

  drawXaxisTicks(x1, y2, appendToElement) {
    let w = this.w
    let x2 = x1

    if (x1 < 0 || x1 - 2 > w.globals.gridWidth) return

    let y1 = this.offY + w.config.xaxis.axisTicks.offsetY
    y2 = y2 + y1 + w.config.xaxis.axisTicks.height
    if (w.config.xaxis.position === 'top') {
      y2 = y1 - w.config.xaxis.axisTicks.height
    }

    if (w.config.xaxis.axisTicks.show) {
      let graphics = new Graphics(this.ctx)

      let line = graphics.drawLine(
        x1 + w.config.xaxis.axisTicks.offsetX,
        y1 + w.config.xaxis.offsetY,
        x2 + w.config.xaxis.axisTicks.offsetX,
        y2 + w.config.xaxis.offsetY,
        w.config.xaxis.axisTicks.color
      )

      // we are not returning anything, but appending directly to the element passed in param
      appendToElement.add(line)
      line.node.classList.add('apexcharts-xaxis-tick')
    }
  }

  getXAxisTicksPositions() {
    const w = this.w
    let xAxisTicksPositions = []

    const xCount = this.xaxisLabels.length
    let x1 = w.globals.padHorizontal

    if (w.globals.timescaleLabels.length > 0) {
      for (let i = 0; i < xCount; i++) {
        x1 = this.xaxisLabels[i].position
        xAxisTicksPositions.push(x1)
      }
    } else {
      let xCountForCategoryCharts = xCount
      for (let i = 0; i < xCountForCategoryCharts; i++) {
        let x1Count = xCountForCategoryCharts
        if (w.globals.isXNumeric && w.config.chart.type !== 'bar') {
          x1Count -= 1
        }
        x1 = x1 + w.globals.gridWidth / x1Count
        xAxisTicksPositions.push(x1)
      }
    }

    return xAxisTicksPositions
  }

  // to rotate x-axis labels or to put ... for longer text in xaxis
  xAxisLabelCorrections() {
    let w = this.w

    let graphics = new Graphics(this.ctx)

    let xAxis = w.globals.dom.baseEl.querySelector('.apexcharts-xaxis-texts-g')

    let xAxisTexts = w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-xaxis-texts-g text:not(.apexcharts-xaxis-group-label)'
    )
    let yAxisTextsInversed = w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-yaxis-inversed text'
    )
    let xAxisTextsInversed = w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-xaxis-inversed-texts-g text tspan'
    )

    if (w.globals.rotateXLabels || w.config.xaxis.labels.rotateAlways) {
      for (let xat = 0; xat < xAxisTexts.length; xat++) {
        let textRotatingCenter = graphics.rotateAroundCenter(xAxisTexts[xat])
        textRotatingCenter.y = textRotatingCenter.y - 1 // + tickWidth/4;
        textRotatingCenter.x = textRotatingCenter.x + 1

        xAxisTexts[xat].setAttribute(
          'transform',
          `rotate(${w.config.xaxis.labels.rotate} ${textRotatingCenter.x} ${textRotatingCenter.y})`
        )

        xAxisTexts[xat].setAttribute('text-anchor', `end`)

        let offsetHeight = 10

        xAxis.setAttribute('transform', `translate(0, ${-offsetHeight})`)

        let tSpan = xAxisTexts[xat].childNodes

        if (w.config.xaxis.labels.trim) {
          Array.prototype.forEach.call(tSpan, (ts) => {
            graphics.placeTextWithEllipsis(
              ts,
              ts.textContent,
              w.globals.xAxisLabelsHeight -
                (w.config.legend.position === 'bottom' ? 20 : 10)
            )
          })
        }
      }
    } else {
      let width = w.globals.gridWidth / (w.globals.labels.length + 1)

      for (let xat = 0; xat < xAxisTexts.length; xat++) {
        let tSpan = xAxisTexts[xat].childNodes

        if (w.config.xaxis.labels.trim && w.config.xaxis.type !== 'datetime') {
          Array.prototype.forEach.call(tSpan, (ts) => {
            graphics.placeTextWithEllipsis(ts, ts.textContent, width)
          })
        }
      }
    }

    if (yAxisTextsInversed.length > 0) {
      // truncate rotated y axis in bar chart (x axis)
      let firstLabelPosX =
        yAxisTextsInversed[yAxisTextsInversed.length - 1].getBBox()
      let lastLabelPosX = yAxisTextsInversed[0].getBBox()

      if (firstLabelPosX.x < -20) {
        yAxisTextsInversed[
          yAxisTextsInversed.length - 1
        ].parentNode.removeChild(
          yAxisTextsInversed[yAxisTextsInversed.length - 1]
        )
      }

      if (
        lastLabelPosX.x + lastLabelPosX.width > w.globals.gridWidth &&
        !w.globals.isBarHorizontal
      ) {
        yAxisTextsInversed[0].parentNode.removeChild(yAxisTextsInversed[0])
      }

      // truncate rotated x axis in bar chart (y axis)
      for (let xat = 0; xat < xAxisTextsInversed.length; xat++) {
        graphics.placeTextWithEllipsis(
          xAxisTextsInversed[xat],
          xAxisTextsInversed[xat].textContent,
          w.config.yaxis[0].labels.maxWidth -
            (w.config.yaxis[0].title.text
              ? parseFloat(w.config.yaxis[0].title.style.fontSize) * 2
              : 0) -
            15
        )
      }
    }
  }

  // renderXAxisBands() {
  //   let w = this.w;

  //   let plotBand = document.createElementNS(w.globals.SVGNS, 'rect')
  //   w.globals.dom.elGraphical.add(plotBand)
  // }
}
