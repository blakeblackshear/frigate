import CoreUtils from '../CoreUtils'

export default class Helpers {
  constructor(annoCtx) {
    this.w = annoCtx.w
    this.annoCtx = annoCtx
  }

  setOrientations(anno, annoIndex = null) {
    const w = this.w

    if (anno.label.orientation === 'vertical') {
      const i = annoIndex !== null ? annoIndex : 0
      const xAnno = w.globals.dom.baseEl.querySelector(
        `.apexcharts-xaxis-annotations .apexcharts-xaxis-annotation-label[rel='${i}']`
      )

      if (xAnno !== null) {
        const xAnnoCoord = xAnno.getBoundingClientRect()
        xAnno.setAttribute(
          'x',
          parseFloat(xAnno.getAttribute('x')) - xAnnoCoord.height + 4
        )

        const yOffset =
          anno.label.position === 'top' ? xAnnoCoord.width : -xAnnoCoord.width
        xAnno.setAttribute('y', parseFloat(xAnno.getAttribute('y')) + yOffset)

        const { x, y } = this.annoCtx.graphics.rotateAroundCenter(xAnno)
        xAnno.setAttribute('transform', `rotate(-90 ${x} ${y})`)
      }
    }
  }

  addBackgroundToAnno(annoEl, anno) {
    const w = this.w

    if (!annoEl || !anno.label.text || !String(anno.label.text).trim()) {
      return null
    }

    const elGridRect = w.globals.dom.baseEl
      .querySelector('.apexcharts-grid')
      .getBoundingClientRect()

    const coords = annoEl.getBoundingClientRect()

    let {
      left: pleft,
      right: pright,
      top: ptop,
      bottom: pbottom,
    } = anno.label.style.padding

    if (anno.label.orientation === 'vertical') {
      ;[ptop, pbottom, pleft, pright] = [pleft, pright, ptop, pbottom]
    }

    const x1 = coords.left - elGridRect.left - pleft
    const y1 = coords.top - elGridRect.top - ptop
    const elRect = this.annoCtx.graphics.drawRect(
      x1 - w.globals.barPadForNumericAxis,
      y1,
      coords.width + pleft + pright,
      coords.height + ptop + pbottom,
      anno.label.borderRadius,
      anno.label.style.background,
      1,
      anno.label.borderWidth,
      anno.label.borderColor,
      0
    )

    if (anno.id) {
      elRect.node.classList.add(anno.id)
    }

    return elRect
  }

  annotationsBackground() {
    const w = this.w

    const add = (anno, i, type) => {
      const annoLabel = w.globals.dom.baseEl.querySelector(
        `.apexcharts-${type}-annotations .apexcharts-${type}-annotation-label[rel='${i}']`
      )

      if (annoLabel) {
        const parent = annoLabel.parentNode
        const elRect = this.addBackgroundToAnno(annoLabel, anno)

        if (elRect) {
          parent.insertBefore(elRect.node, annoLabel)

          if (anno.label.mouseEnter) {
            elRect.node.addEventListener(
              'mouseenter',
              anno.label.mouseEnter.bind(this, anno)
            )
          }
          if (anno.label.mouseLeave) {
            elRect.node.addEventListener(
              'mouseleave',
              anno.label.mouseLeave.bind(this, anno)
            )
          }
          if (anno.label.click) {
            elRect.node.addEventListener(
              'click',
              anno.label.click.bind(this, anno)
            )
          }
        }
      }
    }

    w.config.annotations.xaxis.forEach((anno, i) => add(anno, i, 'xaxis'))
    w.config.annotations.yaxis.forEach((anno, i) => add(anno, i, 'yaxis'))
    w.config.annotations.points.forEach((anno, i) => add(anno, i, 'point'))
  }

  getY1Y2(type, anno) {
    const w = this.w
    let y = type === 'y1' ? anno.y : anno.y2
    let yP
    let clipped = false

    if (this.annoCtx.invertAxis) {
      const labels = w.config.xaxis.convertedCatToNumeric
        ? w.globals.categoryLabels
        : w.globals.labels
      const catIndex = labels.indexOf(y)
      const xLabel = w.globals.dom.baseEl.querySelector(
        `.apexcharts-yaxis-texts-g text:nth-child(${catIndex + 1})`
      )

      yP = xLabel
        ? parseFloat(xLabel.getAttribute('y'))
        : (w.globals.gridHeight / labels.length - 1) * (catIndex + 1) -
          w.globals.barHeight

      if (anno.seriesIndex !== undefined && w.globals.barHeight) {
        yP -=
          (w.globals.barHeight / 2) * (w.globals.series.length - 1) -
          w.globals.barHeight * anno.seriesIndex
      }
    } else {
      const seriesIndex = w.globals.seriesYAxisMap[anno.yAxisIndex][0]
      const yPos = w.config.yaxis[anno.yAxisIndex].logarithmic
        ? new CoreUtils(this.annoCtx.ctx).getLogVal(
            w.config.yaxis[anno.yAxisIndex].logBase,
            y,
            seriesIndex
          ) / w.globals.yLogRatio[seriesIndex]
        : (y - w.globals.minYArr[seriesIndex]) /
          (w.globals.yRange[seriesIndex] / w.globals.gridHeight)

      yP =
        w.globals.gridHeight - Math.min(Math.max(yPos, 0), w.globals.gridHeight)
      clipped = yPos > w.globals.gridHeight || yPos < 0

      if (anno.marker && (anno.y === undefined || anno.y === null)) {
        yP = 0
      }

      if (w.config.yaxis[anno.yAxisIndex]?.reversed) {
        yP = yPos
      }
    }

    if (typeof y === 'string' && y.includes('px')) {
      yP = parseFloat(y)
    }

    return { yP, clipped }
  }

  getX1X2(type, anno) {
    const w = this.w
    const x = type === 'x1' ? anno.x : anno.x2
    const min = this.annoCtx.invertAxis ? w.globals.minY : w.globals.minX
    const max = this.annoCtx.invertAxis ? w.globals.maxY : w.globals.maxX
    const range = this.annoCtx.invertAxis
      ? w.globals.yRange[0]
      : w.globals.xRange
    let clipped = false

    let xP = this.annoCtx.inversedReversedAxis
      ? (max - x) / (range / w.globals.gridWidth)
      : (x - min) / (range / w.globals.gridWidth)

    if (
      (w.config.xaxis.type === 'category' ||
        w.config.xaxis.convertedCatToNumeric) &&
      !this.annoCtx.invertAxis &&
      !w.globals.dataFormatXNumeric
    ) {
      if (!w.config.chart.sparkline.enabled) {
        xP = this.getStringX(x)
      }
    }

    if (typeof x === 'string' && x.includes('px')) {
      xP = parseFloat(x)
    }

    if ((x === undefined || x === null) && anno.marker) {
      xP = w.globals.gridWidth
    }

    if (
      anno.seriesIndex !== undefined &&
      w.globals.barWidth &&
      !this.annoCtx.invertAxis
    ) {
      xP -=
        (w.globals.barWidth / 2) * (w.globals.series.length - 1) -
        w.globals.barWidth * anno.seriesIndex
    }

    if (xP > w.globals.gridWidth) {
      xP = w.globals.gridWidth
      clipped = true
    } else if (xP < 0) {
      xP = 0
      clipped = true
    }

    return { x: xP, clipped }
  }

  getStringX(x) {
    const w = this.w
    let rX = x

    if (
      w.config.xaxis.convertedCatToNumeric &&
      w.globals.categoryLabels.length
    ) {
      x = w.globals.categoryLabels.indexOf(x) + 1
    }

    const catIndex = w.globals.labels
      .map((item) => (Array.isArray(item) ? item.join(' ') : item))
      .indexOf(x)

    const xLabel = w.globals.dom.baseEl.querySelector(
      `.apexcharts-xaxis-texts-g text:nth-child(${catIndex + 1})`
    )

    if (xLabel) {
      rX = parseFloat(xLabel.getAttribute('x'))
    }

    return rX
  }
}
