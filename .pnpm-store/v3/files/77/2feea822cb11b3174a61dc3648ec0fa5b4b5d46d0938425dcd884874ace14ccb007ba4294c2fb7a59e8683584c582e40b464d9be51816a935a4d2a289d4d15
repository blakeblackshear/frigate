import '../libs/Treemap-squared'
import Graphics from '../modules/Graphics'
import Animations from '../modules/Animations'
import Fill from '../modules/Fill'
import Helpers from './common/treemap/Helpers'
import Filters from '../modules/Filters'

import Utils from '../utils/Utils'

/**
 * ApexCharts TreemapChart Class.
 * @module TreemapChart
 **/

export default class TreemapChart {
  constructor(ctx, xyRatios) {
    this.ctx = ctx
    this.w = ctx.w

    this.strokeWidth = this.w.config.stroke.width
    this.helpers = new Helpers(ctx)
    this.dynamicAnim = this.w.config.chart.animations.dynamicAnimation

    this.labels = []
  }

  draw(series) {
    let w = this.w
    const graphics = new Graphics(this.ctx)
    const fill = new Fill(this.ctx)

    let ret = graphics.group({
      class: 'apexcharts-treemap',
    })

    if (w.globals.noData) return ret

    let ser = []
    series.forEach((s) => {
      let d = s.map((v) => {
        return Math.abs(v)
      })
      ser.push(d)
    })

    this.negRange = this.helpers.checkColorRange()

    w.config.series.forEach((s, i) => {
      s.data.forEach((l) => {
        if (!Array.isArray(this.labels[i])) this.labels[i] = []
        this.labels[i].push(l.x)
      })
    })

    const nodes = window.TreemapSquared.generate(
      ser,
      w.globals.gridWidth,
      w.globals.gridHeight
    )

    nodes.forEach((node, i) => {
      let elSeries = graphics.group({
        class: `apexcharts-series apexcharts-treemap-series`,
        seriesName: Utils.escapeString(w.globals.seriesNames[i]),
        rel: i + 1,
        'data:realIndex': i,
      })

      if (w.config.chart.dropShadow.enabled) {
        const shadow = w.config.chart.dropShadow
        const filters = new Filters(this.ctx)
        filters.dropShadow(ret, shadow, i)
      }

      let elDataLabelWrap = graphics.group({
        class: 'apexcharts-data-labels',
      })

      node.forEach((r, j) => {
        const x1 = r[0]
        const y1 = r[1]
        const x2 = r[2]
        const y2 = r[3]
        let elRect = graphics.drawRect(
          x1,
          y1,
          x2 - x1,
          y2 - y1,
          w.config.plotOptions.treemap.borderRadius,
          '#fff',
          1,
          this.strokeWidth,
          w.config.plotOptions.treemap.useFillColorAsStroke
            ? color
            : w.globals.stroke.colors[i]
        )
        elRect.attr({
          cx: x1,
          cy: y1,
          index: i,
          i,
          j,
          width: x2 - x1,
          height: y2 - y1,
        })

        let colorProps = this.helpers.getShadeColor(
          w.config.chart.type,
          i,
          j,
          this.negRange
        )
        let color = colorProps.color

        if (
          typeof w.config.series[i].data[j] !== 'undefined' &&
          w.config.series[i].data[j].fillColor
        ) {
          color = w.config.series[i].data[j].fillColor
        }
        let pathFill = fill.fillPath({
          color,
          seriesNumber: i,
          dataPointIndex: j,
        })

        elRect.node.classList.add('apexcharts-treemap-rect')

        elRect.attr({
          fill: pathFill,
        })

        this.helpers.addListeners(elRect)

        let fromRect = {
          x: x1 + (x2 - x1) / 2,
          y: y1 + (y2 - y1) / 2,
          width: 0,
          height: 0,
        }
        let toRect = {
          x: x1,
          y: y1,
          width: x2 - x1,
          height: y2 - y1,
        }

        if (w.config.chart.animations.enabled && !w.globals.dataChanged) {
          let speed = 1
          if (!w.globals.resized) {
            speed = w.config.chart.animations.speed
          }
          this.animateTreemap(elRect, fromRect, toRect, speed)
        }
        if (w.globals.dataChanged) {
          let speed = 1
          if (this.dynamicAnim.enabled && w.globals.shouldAnimate) {
            speed = this.dynamicAnim.speed

            if (
              w.globals.previousPaths[i] &&
              w.globals.previousPaths[i][j] &&
              w.globals.previousPaths[i][j].rect
            ) {
              fromRect = w.globals.previousPaths[i][j].rect
            }

            this.animateTreemap(elRect, fromRect, toRect, speed)
          }
        }

        let fontSize = this.getFontSize(r)

        let formattedText = w.config.dataLabels.formatter(this.labels[i][j], {
          value: w.globals.series[i][j],
          seriesIndex: i,
          dataPointIndex: j,
          w,
        })
        if (w.config.plotOptions.treemap.dataLabels.format === 'truncate') {
          fontSize = parseInt(w.config.dataLabels.style.fontSize, 10)
          formattedText = this.truncateLabels(
            formattedText,
            fontSize,
            x1,
            y1,
            x2,
            y2
          )
        }
        let dataLabels = null

        if (w.globals.series[i][j]) {
          dataLabels = this.helpers.calculateDataLabels({
            text: formattedText,
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2 + this.strokeWidth / 2 + fontSize / 3,
            i,
            j,
            colorProps,
            fontSize,
            series,
          })
        }
        if (w.config.dataLabels.enabled && dataLabels) {
          this.rotateToFitLabel(
            dataLabels,
            fontSize,
            formattedText,
            x1,
            y1,
            x2,
            y2
          )
        }
        elSeries.add(elRect)

        if (dataLabels !== null) {
          elSeries.add(dataLabels)
        }
      })
      elSeries.add(elDataLabelWrap)

      ret.add(elSeries)
    })

    return ret
  }

  // This calculates a font-size based upon
  // average label length and the size of the box the label is
  // going into. The maximum font size is set in chart config.
  getFontSize(coordinates) {
    const w = this.w

    // total length of labels (i.e [["Italy"],["Spain", "Greece"]] -> 16)
    function totalLabelLength(arr) {
      let i,
        total = 0
      if (Array.isArray(arr[0])) {
        for (i = 0; i < arr.length; i++) {
          total += totalLabelLength(arr[i])
        }
      } else {
        for (i = 0; i < arr.length; i++) {
          total += arr[i].length
        }
      }
      return total
    }

    // count of labels (i.e [["Italy"],["Spain", "Greece"]] -> 3)
    function countLabels(arr) {
      let i,
        total = 0
      if (Array.isArray(arr[0])) {
        for (i = 0; i < arr.length; i++) {
          total += countLabels(arr[i])
        }
      } else {
        for (i = 0; i < arr.length; i++) {
          total += 1
        }
      }
      return total
    }
    let averagelabelsize =
      totalLabelLength(this.labels) / countLabels(this.labels)

    function fontSize(width, height) {
      // the font size should be proportional to the size of the box (and the value)
      // otherwise you can end up creating a visual distortion where two boxes of identical
      // size have different sized labels, and thus make it look as if the two boxes
      // represent different sizes
      let area = width * height
      let arearoot = Math.pow(area, 0.5)
      return Math.min(
        arearoot / averagelabelsize,
        parseInt(w.config.dataLabels.style.fontSize, 10)
      )
    }

    return fontSize(
      coordinates[2] - coordinates[0],
      coordinates[3] - coordinates[1]
    )
  }

  rotateToFitLabel(elText, fontSize, text, x1, y1, x2, y2) {
    const graphics = new Graphics(this.ctx)
    const textRect = graphics.getTextRects(text, fontSize)

    //if the label fits better sideways then rotate it
    if (
      textRect.width + this.w.config.stroke.width + 5 > x2 - x1 &&
      textRect.width <= y2 - y1
    ) {
      let labelRotatingCenter = graphics.rotateAroundCenter(elText.node)

      elText.node.setAttribute(
        'transform',
        `rotate(-90 ${labelRotatingCenter.x} ${
          labelRotatingCenter.y
        }) translate(${textRect.height / 3})`
      )
    }
  }

  // This is an alternative label formatting method that uses a
  // consistent font size, and trims the edge of long labels
  truncateLabels(text, fontSize, x1, y1, x2, y2) {
    const graphics = new Graphics(this.ctx)
    const textRect = graphics.getTextRects(text, fontSize)

    // Determine max width based on ideal orientation of text
    const labelMaxWidth =
      textRect.width + this.w.config.stroke.width + 5 > x2 - x1 &&
      y2 - y1 > x2 - x1
        ? y2 - y1
        : x2 - x1
    const truncatedText = graphics.getTextBasedOnMaxWidth({
      text: text,
      maxWidth: labelMaxWidth,
      fontSize: fontSize,
    })

    // Return empty label when text has been trimmed for very small rects
    if (text.length !== truncatedText.length && labelMaxWidth / fontSize < 5) {
      return ''
    } else {
      return truncatedText
    }
  }

  animateTreemap(el, fromRect, toRect, speed) {
    const animations = new Animations(this.ctx)
    animations.animateRect(
      el,
      {
        x: fromRect.x,
        y: fromRect.y,
        width: fromRect.width,
        height: fromRect.height,
      },
      {
        x: toRect.x,
        y: toRect.y,
        width: toRect.width,
        height: toRect.height,
      },
      speed,
      () => {
        animations.animationCompleted(el)
      }
    )
  }
}
