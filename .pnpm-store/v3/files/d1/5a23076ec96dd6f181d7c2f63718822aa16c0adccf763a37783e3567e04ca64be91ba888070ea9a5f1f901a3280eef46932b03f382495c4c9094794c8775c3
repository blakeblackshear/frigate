import Graphics from '../Graphics'
import Utils from '../../utils/Utils'
import AxesUtils from './AxesUtils'

/**
 * ApexCharts YAxis Class for drawing Y-Axis.
 *
 * @module YAxis
 **/

export default class YAxis {
  constructor(ctx, elgrid) {
    this.ctx = ctx
    this.elgrid = elgrid
    this.w = ctx.w
    const w = this.w

    this.xaxisFontSize = w.config.xaxis.labels.style.fontSize
    this.axisFontFamily = w.config.xaxis.labels.style.fontFamily
    this.xaxisForeColors = w.config.xaxis.labels.style.colors
    this.isCategoryBarHorizontal =
      w.config.chart.type === 'bar' && w.config.plotOptions.bar.horizontal
    this.xAxisoffX =
      w.config.xaxis.position === 'bottom' ? w.globals.gridHeight : 0
    this.drawnLabels = []
    this.axesUtils = new AxesUtils(ctx)
  }

  drawYaxis(realIndex) {
    const w = this.w
    const graphics = new Graphics(this.ctx)
    const yaxisStyle = w.config.yaxis[realIndex].labels.style
    const {
      fontSize: yaxisFontSize,
      fontFamily: yaxisFontFamily,
      fontWeight: yaxisFontWeight,
    } = yaxisStyle

    const elYaxis = graphics.group({
      class: 'apexcharts-yaxis',
      rel: realIndex,
      transform: `translate(${w.globals.translateYAxisX[realIndex]}, 0)`,
    })

    if (this.axesUtils.isYAxisHidden(realIndex)) return elYaxis

    const elYaxisTexts = graphics.group({ class: 'apexcharts-yaxis-texts-g' })
    elYaxis.add(elYaxisTexts)

    const tickAmount = w.globals.yAxisScale[realIndex].result.length - 1
    const labelsDivider = w.globals.gridHeight / tickAmount
    const lbFormatter = w.globals.yLabelFormatters[realIndex]
    let labels = this.axesUtils.checkForReversedLabels(
      realIndex,
      w.globals.yAxisScale[realIndex].result.slice()
    )

    if (w.config.yaxis[realIndex].labels.show) {
      let lY = w.globals.translateY + w.config.yaxis[realIndex].labels.offsetY
      if (w.globals.isBarHorizontal) lY = 0
      else if (w.config.chart.type === 'heatmap') lY -= labelsDivider / 2
      lY += parseInt(yaxisFontSize, 10) / 3

      for (let i = tickAmount; i >= 0; i--) {
        let val = lbFormatter(labels[i], i, w)
        let xPad = w.config.yaxis[realIndex].labels.padding
        if (w.config.yaxis[realIndex].opposite && w.config.yaxis.length !== 0)
          xPad *= -1

        const textAnchor = this.getTextAnchor(
          w.config.yaxis[realIndex].labels.align,
          w.config.yaxis[realIndex].opposite
        )
        const yColors = this.axesUtils.getYAxisForeColor(
          yaxisStyle.colors,
          realIndex
        )
        const foreColor = Array.isArray(yColors) ? yColors[i] : yColors

        const existingYLabels = Utils.listToArray(
          w.globals.dom.baseEl.querySelectorAll(
            `.apexcharts-yaxis[rel='${realIndex}'] .apexcharts-yaxis-label tspan`
          )
        ).map((label) => label.textContent)

        const label = graphics.drawText({
          x: xPad,
          y: lY,
          text:
            existingYLabels.includes(val) &&
            !w.config.yaxis[realIndex].labels.showDuplicates
              ? ''
              : val,
          textAnchor,
          fontSize: yaxisFontSize,
          fontFamily: yaxisFontFamily,
          fontWeight: yaxisFontWeight,
          maxWidth: w.config.yaxis[realIndex].labels.maxWidth,
          foreColor,
          isPlainText: false,
          cssClass: `apexcharts-yaxis-label ${yaxisStyle.cssClass}`,
        })

        elYaxisTexts.add(label)
        this.addTooltip(label, val)

        if (w.config.yaxis[realIndex].labels.rotate !== 0) {
          this.rotateLabel(
            graphics,
            label,
            firstLabel,
            w.config.yaxis[realIndex].labels.rotate
          )
        }

        lY += labelsDivider
      }
    }

    this.addYAxisTitle(graphics, elYaxis, realIndex)
    this.addAxisBorder(graphics, elYaxis, realIndex, tickAmount, labelsDivider)

    return elYaxis
  }

  getTextAnchor(align, opposite) {
    if (align === 'left') return 'start'
    if (align === 'center') return 'middle'
    if (align === 'right') return 'end'
    return opposite ? 'start' : 'end'
  }

  addTooltip(label, val) {
    const elTooltipTitle = document.createElementNS(
      this.w.globals.SVGNS,
      'title'
    )
    elTooltipTitle.textContent = Array.isArray(val) ? val.join(' ') : val
    label.node.appendChild(elTooltipTitle)
  }

  rotateLabel(graphics, label, firstLabel, rotate) {
    const firstLabelCenter = graphics.rotateAroundCenter(firstLabel.node)
    const labelCenter = graphics.rotateAroundCenter(label.node)
    label.node.setAttribute(
      'transform',
      `rotate(${rotate} ${firstLabelCenter.x} ${labelCenter.y})`
    )
  }

  addYAxisTitle(graphics, elYaxis, realIndex) {
    const w = this.w
    if (w.config.yaxis[realIndex].title.text !== undefined) {
      const elYaxisTitle = graphics.group({ class: 'apexcharts-yaxis-title' })
      const x = w.config.yaxis[realIndex].opposite
        ? w.globals.translateYAxisX[realIndex]
        : 0
      const elYAxisTitleText = graphics.drawText({
        x,
        y:
          w.globals.gridHeight / 2 +
          w.globals.translateY +
          w.config.yaxis[realIndex].title.offsetY,
        text: w.config.yaxis[realIndex].title.text,
        textAnchor: 'end',
        foreColor: w.config.yaxis[realIndex].title.style.color,
        fontSize: w.config.yaxis[realIndex].title.style.fontSize,
        fontWeight: w.config.yaxis[realIndex].title.style.fontWeight,
        fontFamily: w.config.yaxis[realIndex].title.style.fontFamily,
        cssClass: `apexcharts-yaxis-title-text ${w.config.yaxis[realIndex].title.style.cssClass}`,
      })
      elYaxisTitle.add(elYAxisTitleText)
      elYaxis.add(elYaxisTitle)
    }
  }

  addAxisBorder(graphics, elYaxis, realIndex, tickAmount, labelsDivider) {
    const w = this.w
    const axisBorder = w.config.yaxis[realIndex].axisBorder
    let x = 31 + axisBorder.offsetX
    if (w.config.yaxis[realIndex].opposite) x = -31 - axisBorder.offsetX

    if (axisBorder.show) {
      const elVerticalLine = graphics.drawLine(
        x,
        w.globals.translateY + axisBorder.offsetY - 2,
        x,
        w.globals.gridHeight + w.globals.translateY + axisBorder.offsetY + 2,
        axisBorder.color,
        0,
        axisBorder.width
      )
      elYaxis.add(elVerticalLine)
    }

    if (w.config.yaxis[realIndex].axisTicks.show) {
      this.axesUtils.drawYAxisTicks(
        x,
        tickAmount,
        axisBorder,
        w.config.yaxis[realIndex].axisTicks,
        realIndex,
        labelsDivider,
        elYaxis
      )
    }
  }

  drawYaxisInversed(realIndex) {
    const w = this.w
    const graphics = new Graphics(this.ctx)

    const elXaxis = graphics.group({
      class: 'apexcharts-xaxis apexcharts-yaxis-inversed',
    })

    const elXaxisTexts = graphics.group({
      class: 'apexcharts-xaxis-texts-g',
      transform: `translate(${w.globals.translateXAxisX}, ${w.globals.translateXAxisY})`,
    })

    elXaxis.add(elXaxisTexts)

    let tickAmount = w.globals.yAxisScale[realIndex].result.length - 1
    const labelsDivider = w.globals.gridWidth / tickAmount + 0.1
    let l = labelsDivider + w.config.xaxis.labels.offsetX
    const lbFormatter = w.globals.xLabelFormatter
    let labels = this.axesUtils.checkForReversedLabels(
      realIndex,
      w.globals.yAxisScale[realIndex].result.slice()
    )
    const timescaleLabels = w.globals.timescaleLabels

    if (timescaleLabels.length > 0) {
      this.xaxisLabels = timescaleLabels.slice()
      labels = timescaleLabels.slice()
      tickAmount = labels.length
    }

    if (w.config.xaxis.labels.show) {
      for (
        let i = timescaleLabels.length ? 0 : tickAmount;
        timescaleLabels.length ? i < timescaleLabels.length : i >= 0;
        timescaleLabels.length ? i++ : i--
      ) {
        let val = lbFormatter(labels[i], i, w)
        let x =
          w.globals.gridWidth +
          w.globals.padHorizontal -
          (l - labelsDivider + w.config.xaxis.labels.offsetX)

        if (timescaleLabels.length) {
          const label = this.axesUtils.getLabel(
            labels,
            timescaleLabels,
            x,
            i,
            this.drawnLabels,
            this.xaxisFontSize
          )
          x = label.x
          val = label.text
          this.drawnLabels.push(label.text)
          if (i === 0 && w.globals.skipFirstTimelinelabel) val = ''
          if (i === labels.length - 1 && w.globals.skipLastTimelinelabel)
            val = ''
        }

        const elTick = graphics.drawText({
          x,
          y:
            this.xAxisoffX +
            w.config.xaxis.labels.offsetY +
            30 -
            (w.config.xaxis.position === 'top'
              ? w.globals.xAxisHeight + w.config.xaxis.axisTicks.height - 2
              : 0),
          text: val,
          textAnchor: 'middle',
          foreColor: Array.isArray(this.xaxisForeColors)
            ? this.xaxisForeColors[realIndex]
            : this.xaxisForeColors,
          fontSize: this.xaxisFontSize,
          fontFamily: this.xaxisFontFamily,
          fontWeight: w.config.xaxis.labels.style.fontWeight,
          isPlainText: false,
          cssClass: `apexcharts-xaxis-label ${w.config.xaxis.labels.style.cssClass}`,
        })

        elXaxisTexts.add(elTick)
        elTick.tspan(val)
        this.addTooltip(elTick, val)
        l += labelsDivider
      }
    }

    this.inversedYAxisTitleText(elXaxis)
    this.inversedYAxisBorder(elXaxis)

    return elXaxis
  }

  inversedYAxisBorder(parent) {
    const w = this.w
    const graphics = new Graphics(this.ctx)
    const axisBorder = w.config.xaxis.axisBorder

    if (axisBorder.show) {
      let lineCorrection = 0
      if (w.config.chart.type === 'bar' && w.globals.isXNumeric)
        lineCorrection -= 15

      const elHorzLine = graphics.drawLine(
        w.globals.padHorizontal + lineCorrection + axisBorder.offsetX,
        this.xAxisoffX,
        w.globals.gridWidth,
        this.xAxisoffX,
        axisBorder.color,
        0,
        axisBorder.height
      )

      if (this.elgrid && this.elgrid.elGridBorders && w.config.grid.show) {
        this.elgrid.elGridBorders.add(elHorzLine)
      } else {
        parent.add(elHorzLine)
      }
    }
  }

  inversedYAxisTitleText(parent) {
    const w = this.w
    const graphics = new Graphics(this.ctx)

    if (w.config.xaxis.title.text !== undefined) {
      const elYaxisTitle = graphics.group({
        class: 'apexcharts-xaxis-title apexcharts-yaxis-title-inversed',
      })
      const elYAxisTitleText = graphics.drawText({
        x: w.globals.gridWidth / 2 + w.config.xaxis.title.offsetX,
        y:
          this.xAxisoffX +
          parseFloat(this.xaxisFontSize) +
          parseFloat(w.config.xaxis.title.style.fontSize) +
          w.config.xaxis.title.offsetY +
          20,
        text: w.config.xaxis.title.text,
        textAnchor: 'middle',
        fontSize: w.config.xaxis.title.style.fontSize,
        fontFamily: w.config.xaxis.title.style.fontFamily,
        fontWeight: w.config.xaxis.title.style.fontWeight,
        foreColor: w.config.xaxis.title.style.color,
        cssClass: `apexcharts-xaxis-title-text ${w.config.xaxis.title.style.cssClass}`,
      })

      elYaxisTitle.add(elYAxisTitleText)
      parent.add(elYaxisTitle)
    }
  }

  yAxisTitleRotate(realIndex, yAxisOpposite) {
    const w = this.w
    const graphics = new Graphics(this.ctx)
    const elYAxisLabelsWrap = w.globals.dom.baseEl.querySelector(
      `.apexcharts-yaxis[rel='${realIndex}'] .apexcharts-yaxis-texts-g`
    )
    const yAxisLabelsCoord = elYAxisLabelsWrap
      ? elYAxisLabelsWrap.getBoundingClientRect()
      : { width: 0, height: 0 }
    const yAxisTitle = w.globals.dom.baseEl.querySelector(
      `.apexcharts-yaxis[rel='${realIndex}'] .apexcharts-yaxis-title text`
    )
    const yAxisTitleCoord = yAxisTitle
      ? yAxisTitle.getBoundingClientRect()
      : { width: 0, height: 0 }

    if (yAxisTitle) {
      const x = this.xPaddingForYAxisTitle(
        realIndex,
        yAxisLabelsCoord,
        yAxisTitleCoord,
        yAxisOpposite
      )
      yAxisTitle.setAttribute('x', x.xPos - (yAxisOpposite ? 10 : 0))
      const titleRotatingCenter = graphics.rotateAroundCenter(yAxisTitle)
      yAxisTitle.setAttribute(
        'transform',
        `rotate(${
          yAxisOpposite
            ? w.config.yaxis[realIndex].title.rotate * -1
            : w.config.yaxis[realIndex].title.rotate
        } ${titleRotatingCenter.x} ${titleRotatingCenter.y})`
      )
    }
  }

  xPaddingForYAxisTitle(
    realIndex,
    yAxisLabelsCoord,
    yAxisTitleCoord,
    yAxisOpposite
  ) {
    const w = this.w
    let x = 0
    let padd = 10

    if (w.config.yaxis[realIndex].title.text === undefined || realIndex < 0) {
      return { xPos: x, padd: 0 }
    }

    if (yAxisOpposite) {
      x =
        yAxisLabelsCoord.width +
        w.config.yaxis[realIndex].title.offsetX +
        yAxisTitleCoord.width / 2 +
        padd / 2
    } else {
      x =
        yAxisLabelsCoord.width * -1 +
        w.config.yaxis[realIndex].title.offsetX +
        padd / 2 +
        yAxisTitleCoord.width / 2
      if (w.globals.isBarHorizontal) {
        padd = 25
        x =
          yAxisLabelsCoord.width * -1 -
          w.config.yaxis[realIndex].title.offsetX -
          padd
      }
    }

    return { xPos: x, padd }
  }

  setYAxisXPosition(yaxisLabelCoords, yTitleCoords) {
    const w = this.w
    let xLeft = 0
    let xRight = 0
    let leftOffsetX = 18
    let rightOffsetX = 1

    if (w.config.yaxis.length > 1) this.multipleYs = true

    w.config.yaxis.forEach((yaxe, index) => {
      const shouldNotDrawAxis =
        w.globals.ignoreYAxisIndexes.includes(index) ||
        !yaxe.show ||
        yaxe.floating ||
        yaxisLabelCoords[index].width === 0
      const axisWidth =
        yaxisLabelCoords[index].width + yTitleCoords[index].width

      if (!yaxe.opposite) {
        xLeft = w.globals.translateX - leftOffsetX
        if (!shouldNotDrawAxis) leftOffsetX += axisWidth + 20
        w.globals.translateYAxisX[index] = xLeft + yaxe.labels.offsetX
      } else {
        if (w.globals.isBarHorizontal) {
          xRight = w.globals.gridWidth + w.globals.translateX - 1
          w.globals.translateYAxisX[index] = xRight - yaxe.labels.offsetX
        } else {
          xRight = w.globals.gridWidth + w.globals.translateX + rightOffsetX
          if (!shouldNotDrawAxis) rightOffsetX += axisWidth + 20
          w.globals.translateYAxisX[index] = xRight - yaxe.labels.offsetX + 20
        }
      }
    })
  }

  setYAxisTextAlignments() {
    const w = this.w
    const yaxis = Utils.listToArray(
      w.globals.dom.baseEl.getElementsByClassName('apexcharts-yaxis')
    )

    yaxis.forEach((y, index) => {
      const yaxe = w.config.yaxis[index]
      if (yaxe && !yaxe.floating && yaxe.labels.align !== undefined) {
        const yAxisInner = w.globals.dom.baseEl.querySelector(
          `.apexcharts-yaxis[rel='${index}'] .apexcharts-yaxis-texts-g`
        )
        const yAxisTexts = Utils.listToArray(
          w.globals.dom.baseEl.querySelectorAll(
            `.apexcharts-yaxis[rel='${index}'] .apexcharts-yaxis-label`
          )
        )
        const rect = yAxisInner.getBoundingClientRect()

        yAxisTexts.forEach((label) => {
          label.setAttribute('text-anchor', yaxe.labels.align)
        })

        if (yaxe.labels.align === 'left' && !yaxe.opposite) {
          yAxisInner.setAttribute('transform', `translate(-${rect.width}, 0)`)
        } else if (yaxe.labels.align === 'center') {
          yAxisInner.setAttribute(
            'transform',
            `translate(${(rect.width / 2) * (!yaxe.opposite ? -1 : 1)}, 0)`
          )
        } else if (yaxe.labels.align === 'right' && yaxe.opposite) {
          yAxisInner.setAttribute('transform', `translate(${rect.width}, 0)`)
        }
      }
    })
  }
}
