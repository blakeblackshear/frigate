import Animations from '../modules/Animations'
import Fill from '../modules/Fill'
import Utils from '../utils/Utils'
import Graphics from '../modules/Graphics'
import Filters from '../modules/Filters'
import Scales from '../modules/Scales'
import Helpers from './common/circle/Helpers'
/**
 * ApexCharts Pie Class for drawing Pie / Donut Charts.
 * @module Pie
 **/

class Pie {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
    const w = this.w

    this.chartType = this.w.config.chart.type

    this.initialAnim = this.w.config.chart.animations.enabled
    this.dynamicAnim =
      this.initialAnim &&
      this.w.config.chart.animations.dynamicAnimation.enabled

    this.animBeginArr = [0]
    this.animDur = 0

    this.donutDataLabels = this.w.config.plotOptions.pie.donut.labels

    this.lineColorArr =
      w.globals.stroke.colors !== undefined
        ? w.globals.stroke.colors
        : w.globals.colors

    this.defaultSize = Math.min(w.globals.gridWidth, w.globals.gridHeight)

    this.centerY = this.defaultSize / 2
    this.centerX = w.globals.gridWidth / 2

    if (w.config.chart.type === 'radialBar') {
      this.fullAngle = 360
    } else {
      this.fullAngle = Math.abs(
        w.config.plotOptions.pie.endAngle - w.config.plotOptions.pie.startAngle
      )
    }
    this.initialAngle = w.config.plotOptions.pie.startAngle % this.fullAngle

    w.globals.radialSize =
      this.defaultSize / 2.05 -
      w.config.stroke.width -
      (!w.config.chart.sparkline.enabled ? w.config.chart.dropShadow.blur : 0)

    this.donutSize =
      (w.globals.radialSize *
        parseInt(w.config.plotOptions.pie.donut.size, 10)) /
      100

    let scaleSize = w.config.plotOptions.pie.customScale
    let halfW = w.globals.gridWidth / 2
    let halfH = w.globals.gridHeight / 2
    this.translateX = halfW - halfW * scaleSize
    this.translateY = halfH - halfH * scaleSize

    this.dataLabelsGroup = new Graphics(this.ctx).group({
      class: 'apexcharts-datalabels-group',
      transform: `translate(${this.translateX}, ${this.translateY}) scale(${scaleSize})`,
    })

    this.maxY = 0
    this.sliceLabels = []
    this.sliceSizes = []

    this.prevSectorAngleArr = [] // for dynamic animations
  }

  draw(series) {
    let self = this
    let w = this.w

    const graphics = new Graphics(this.ctx)

    let elPie = graphics.group({
      class: 'apexcharts-pie',
    })

    if (w.globals.noData) return elPie

    let total = 0
    for (let k = 0; k < series.length; k++) {
      // CALCULATE THE TOTAL
      total += Utils.negToZero(series[k])
    }

    let sectorAngleArr = []

    // el to which series will be drawn
    let elSeries = graphics.group()

    // prevent division by zero error if there is no data
    if (total === 0) {
      total = 0.00001
    }

    series.forEach((m) => {
      this.maxY = Math.max(this.maxY, m)
    })

    // override maxY if user provided in config
    if (w.config.yaxis[0].max) {
      this.maxY = w.config.yaxis[0].max
    }

    if (w.config.grid.position === 'back' && this.chartType === 'polarArea') {
      this.drawPolarElements(elPie)
    }

    for (let i = 0; i < series.length; i++) {
      // CALCULATE THE ANGLES
      let angle = (this.fullAngle * Utils.negToZero(series[i])) / total
      sectorAngleArr.push(angle)

      if (this.chartType === 'polarArea') {
        sectorAngleArr[i] = this.fullAngle / series.length
        this.sliceSizes.push((w.globals.radialSize * series[i]) / this.maxY)
      } else {
        this.sliceSizes.push(w.globals.radialSize)
      }
    }

    if (w.globals.dataChanged) {
      let prevTotal = 0
      for (let k = 0; k < w.globals.previousPaths.length; k++) {
        // CALCULATE THE PREV TOTAL
        prevTotal += Utils.negToZero(w.globals.previousPaths[k])
      }

      let previousAngle

      for (let i = 0; i < w.globals.previousPaths.length; i++) {
        // CALCULATE THE PREVIOUS ANGLES
        previousAngle =
          (this.fullAngle * Utils.negToZero(w.globals.previousPaths[i])) /
          prevTotal
        this.prevSectorAngleArr.push(previousAngle)
      }
    }

    // on small chart size after few count of resizes browser window donutSize can be negative
    if (this.donutSize < 0) {
      this.donutSize = 0
    }

    if (this.chartType === 'donut') {
      // draw the inner circle and add some text to it
      const circle = graphics.drawCircle(this.donutSize)

      circle.attr({
        cx: this.centerX,
        cy: this.centerY,
        fill: w.config.plotOptions.pie.donut.background
          ? w.config.plotOptions.pie.donut.background
          : 'transparent',
      })

      elSeries.add(circle)
    }

    let elG = self.drawArcs(sectorAngleArr, series)

    // add slice dataLabels at the end
    this.sliceLabels.forEach((s) => {
      elG.add(s)
    })

    elSeries.attr({
      transform: `translate(${this.translateX}, ${this.translateY}) scale(${w.config.plotOptions.pie.customScale})`,
    })

    elSeries.add(elG)

    elPie.add(elSeries)

    if (this.donutDataLabels.show) {
      let dataLabels = this.renderInnerDataLabels(
        this.dataLabelsGroup,
        this.donutDataLabels,
        {
          hollowSize: this.donutSize,
          centerX: this.centerX,
          centerY: this.centerY,
          opacity: this.donutDataLabels.show,
        }
      )

      elPie.add(dataLabels)
    }

    if (w.config.grid.position === 'front' && this.chartType === 'polarArea') {
      this.drawPolarElements(elPie)
    }

    return elPie
  }

  // core function for drawing pie arcs
  drawArcs(sectorAngleArr, series) {
    let w = this.w
    const filters = new Filters(this.ctx)

    let graphics = new Graphics(this.ctx)
    let fill = new Fill(this.ctx)
    let g = graphics.group({
      class: 'apexcharts-slices',
    })

    let startAngle = this.initialAngle
    let prevStartAngle = this.initialAngle
    let endAngle = this.initialAngle
    let prevEndAngle = this.initialAngle

    this.strokeWidth = w.config.stroke.show ? w.config.stroke.width : 0

    for (let i = 0; i < sectorAngleArr.length; i++) {
      let elPieArc = graphics.group({
        class: `apexcharts-series apexcharts-pie-series`,
        seriesName: Utils.escapeString(w.globals.seriesNames[i]),
        rel: i + 1,
        'data:realIndex': i,
      })

      g.add(elPieArc)

      startAngle = endAngle
      prevStartAngle = prevEndAngle

      endAngle = startAngle + sectorAngleArr[i]
      prevEndAngle = prevStartAngle + this.prevSectorAngleArr[i]

      const angle =
        endAngle < startAngle
          ? this.fullAngle + endAngle - startAngle
          : endAngle - startAngle

      let pathFill = fill.fillPath({
        seriesNumber: i,
        size: this.sliceSizes[i],
        value: series[i],
      }) // additionally, pass size for gradient drawing in the fillPath function

      let path = this.getChangedPath(prevStartAngle, prevEndAngle)

      let elPath = graphics.drawPath({
        d: path,
        stroke: Array.isArray(this.lineColorArr)
          ? this.lineColorArr[i]
          : this.lineColorArr,
        strokeWidth: 0,
        fill: pathFill,
        fillOpacity: w.config.fill.opacity,
        classes: `apexcharts-pie-area apexcharts-${this.chartType.toLowerCase()}-slice-${i}`,
      })

      elPath.attr({
        index: 0,
        j: i,
      })

      filters.setSelectionFilter(elPath, 0, i)

      if (w.config.chart.dropShadow.enabled) {
        const shadow = w.config.chart.dropShadow
        filters.dropShadow(elPath, shadow, i)
      }

      this.addListeners(elPath, this.donutDataLabels)

      Graphics.setAttrs(elPath.node, {
        'data:angle': angle,
        'data:startAngle': startAngle,
        'data:strokeWidth': this.strokeWidth,
        'data:value': series[i],
      })

      let labelPosition = {
        x: 0,
        y: 0,
      }

      if (this.chartType === 'pie' || this.chartType === 'polarArea') {
        labelPosition = Utils.polarToCartesian(
          this.centerX,
          this.centerY,
          w.globals.radialSize / 1.25 +
            w.config.plotOptions.pie.dataLabels.offset,
          (startAngle + angle / 2) % this.fullAngle
        )
      } else if (this.chartType === 'donut') {
        labelPosition = Utils.polarToCartesian(
          this.centerX,
          this.centerY,
          (w.globals.radialSize + this.donutSize) / 2 +
            w.config.plotOptions.pie.dataLabels.offset,
          (startAngle + angle / 2) % this.fullAngle
        )
      }

      elPieArc.add(elPath)

      // Animation code starts
      let dur = 0
      if (this.initialAnim && !w.globals.resized && !w.globals.dataChanged) {
        dur = (angle / this.fullAngle) * w.config.chart.animations.speed

        if (dur === 0) dur = 1
        this.animDur = dur + this.animDur
        this.animBeginArr.push(this.animDur)
      } else {
        this.animBeginArr.push(0)
      }

      if (this.dynamicAnim && w.globals.dataChanged) {
        this.animatePaths(elPath, {
          size: this.sliceSizes[i],
          endAngle,
          startAngle,
          prevStartAngle,
          prevEndAngle,
          animateStartingPos: true,
          i,
          animBeginArr: this.animBeginArr,
          shouldSetPrevPaths: true,
          dur: w.config.chart.animations.dynamicAnimation.speed,
        })
      } else {
        this.animatePaths(elPath, {
          size: this.sliceSizes[i],
          endAngle,
          startAngle,
          i,
          totalItems: sectorAngleArr.length - 1,
          animBeginArr: this.animBeginArr,
          dur,
        })
      }
      // animation code ends

      if (
        w.config.plotOptions.pie.expandOnClick &&
        this.chartType !== 'polarArea'
      ) {
        elPath.node.addEventListener('mouseup', this.pieClicked.bind(this, i))
      }

      if (
        typeof w.globals.selectedDataPoints[0] !== 'undefined' &&
        w.globals.selectedDataPoints[0].indexOf(i) > -1
      ) {
        this.pieClicked(i)
      }

      if (w.config.dataLabels.enabled) {
        let xPos = labelPosition.x
        let yPos = labelPosition.y
        let text = (100 * angle) / this.fullAngle + '%'

        if (
          angle !== 0 &&
          w.config.plotOptions.pie.dataLabels.minAngleToShowLabel <
            sectorAngleArr[i]
        ) {
          let formatter = w.config.dataLabels.formatter
          if (formatter !== undefined) {
            text = formatter(w.globals.seriesPercent[i][0], {
              seriesIndex: i,
              w,
            })
          }
          let foreColor = w.globals.dataLabels.style.colors[i]

          const elPieLabelWrap = graphics.group({
            class: `apexcharts-datalabels`,
          })
          let elPieLabel = graphics.drawText({
            x: xPos,
            y: yPos,
            text,
            textAnchor: 'middle',
            fontSize: w.config.dataLabels.style.fontSize,
            fontFamily: w.config.dataLabels.style.fontFamily,
            fontWeight: w.config.dataLabels.style.fontWeight,
            foreColor,
          })

          elPieLabelWrap.add(elPieLabel)
          if (w.config.dataLabels.dropShadow.enabled) {
            const textShadow = w.config.dataLabels.dropShadow
            filters.dropShadow(elPieLabel, textShadow)
          }

          elPieLabel.node.classList.add('apexcharts-pie-label')
          if (
            w.config.chart.animations.animate &&
            w.globals.resized === false
          ) {
            elPieLabel.node.classList.add('apexcharts-pie-label-delay')
            elPieLabel.node.style.animationDelay =
              w.config.chart.animations.speed / 940 + 's'
          }

          this.sliceLabels.push(elPieLabelWrap)
        }
      }
    }

    return g
  }

  addListeners(elPath, dataLabels) {
    const graphics = new Graphics(this.ctx)
    // append filters on mouseenter and mouseleave
    elPath.node.addEventListener(
      'mouseenter',
      graphics.pathMouseEnter.bind(this, elPath)
    )

    elPath.node.addEventListener(
      'mouseleave',
      graphics.pathMouseLeave.bind(this, elPath)
    )
    elPath.node.addEventListener(
      'mouseleave',
      this.revertDataLabelsInner.bind(this, elPath.node, dataLabels)
    )
    elPath.node.addEventListener(
      'mousedown',
      graphics.pathMouseDown.bind(this, elPath)
    )

    if (!this.donutDataLabels.total.showAlways) {
      elPath.node.addEventListener(
        'mouseenter',
        this.printDataLabelsInner.bind(this, elPath.node, dataLabels)
      )

      elPath.node.addEventListener(
        'mousedown',
        this.printDataLabelsInner.bind(this, elPath.node, dataLabels)
      )
    }
  }

  // This function can be used for other circle charts too
  animatePaths(el, opts) {
    let w = this.w
    let me = this

    let angle =
      opts.endAngle < opts.startAngle
        ? this.fullAngle + opts.endAngle - opts.startAngle
        : opts.endAngle - opts.startAngle
    let prevAngle = angle

    let fromStartAngle = opts.startAngle
    let toStartAngle = opts.startAngle

    if (opts.prevStartAngle !== undefined && opts.prevEndAngle !== undefined) {
      fromStartAngle = opts.prevEndAngle
      prevAngle =
        opts.prevEndAngle < opts.prevStartAngle
          ? this.fullAngle + opts.prevEndAngle - opts.prevStartAngle
          : opts.prevEndAngle - opts.prevStartAngle
    }
    if (opts.i === w.config.series.length - 1) {
      // some adjustments for the last overlapping paths
      if (angle + toStartAngle > this.fullAngle) {
        opts.endAngle = opts.endAngle - (angle + toStartAngle)
      } else if (angle + toStartAngle < this.fullAngle) {
        opts.endAngle =
          opts.endAngle + (this.fullAngle - (angle + toStartAngle))
      }
    }

    if (angle === this.fullAngle) angle = this.fullAngle - 0.01

    me.animateArc(el, fromStartAngle, toStartAngle, angle, prevAngle, opts)
  }

  animateArc(el, fromStartAngle, toStartAngle, angle, prevAngle, opts) {
    let me = this
    const w = this.w
    const animations = new Animations(this.ctx)

    let size = opts.size

    let path

    if (isNaN(fromStartAngle) || isNaN(prevAngle)) {
      fromStartAngle = toStartAngle
      prevAngle = angle
      opts.dur = 0
    }

    let currAngle = angle
    let startAngle = toStartAngle
    let fromAngle =
      fromStartAngle < toStartAngle
        ? this.fullAngle + fromStartAngle - toStartAngle
        : fromStartAngle - toStartAngle

    if (w.globals.dataChanged && opts.shouldSetPrevPaths) {
      // to avoid flicker when updating, set prev path first and then animate from there
      if (opts.prevEndAngle) {
        path = me.getPiePath({
          me,
          startAngle: opts.prevStartAngle,
          angle:
            opts.prevEndAngle < opts.prevStartAngle
              ? this.fullAngle + opts.prevEndAngle - opts.prevStartAngle
              : opts.prevEndAngle - opts.prevStartAngle,
          size,
        })
        el.attr({ d: path })
      }
    }

    if (opts.dur !== 0) {
      el.animate(opts.dur, w.globals.easing, opts.animBeginArr[opts.i])
        .afterAll(function () {
          if (
            me.chartType === 'pie' ||
            me.chartType === 'donut' ||
            me.chartType === 'polarArea'
          ) {
            this.animate(w.config.chart.animations.dynamicAnimation.speed).attr(
              {
                'stroke-width': me.strokeWidth,
              }
            )
          }

          if (opts.i === w.config.series.length - 1) {
            animations.animationCompleted(el)
          }
        })
        .during((pos) => {
          currAngle = fromAngle + (angle - fromAngle) * pos
          if (opts.animateStartingPos) {
            currAngle = prevAngle + (angle - prevAngle) * pos
            startAngle =
              fromStartAngle -
              prevAngle +
              (toStartAngle - (fromStartAngle - prevAngle)) * pos
          }

          path = me.getPiePath({
            me,
            startAngle,
            angle: currAngle,
            size,
          })

          el.node.setAttribute('data:pathOrig', path)

          el.attr({
            d: path,
          })
        })
    } else {
      path = me.getPiePath({
        me,
        startAngle,
        angle,
        size,
      })

      if (!opts.isTrack) {
        w.globals.animationEnded = true
      }
      el.node.setAttribute('data:pathOrig', path)

      el.attr({
        d: path,
        'stroke-width': me.strokeWidth,
      })
    }
  }

  pieClicked(i) {
    let w = this.w
    let me = this
    let path

    let size =
      me.sliceSizes[i] + (w.config.plotOptions.pie.expandOnClick ? 4 : 0)
    let elPath = w.globals.dom.Paper.select(
      `.apexcharts-${me.chartType.toLowerCase()}-slice-${i}`
    ).members[0]

    if (elPath.attr('data:pieClicked') === 'true') {
      elPath.attr({
        'data:pieClicked': 'false',
      })
      this.revertDataLabelsInner(elPath.node, this.donutDataLabels)

      let origPath = elPath.attr('data:pathOrig')
      elPath.attr({
        d: origPath,
      })
      return
    } else {
      // reset all elems
      let allEls = w.globals.dom.baseEl.getElementsByClassName(
        'apexcharts-pie-area'
      )
      Array.prototype.forEach.call(allEls, (pieSlice) => {
        pieSlice.setAttribute('data:pieClicked', 'false')
        let origPath = pieSlice.getAttribute('data:pathOrig')
        if (origPath) {
          pieSlice.setAttribute('d', origPath)
        }
      })
      w.globals.capturedDataPointIndex = i

      elPath.attr('data:pieClicked', 'true')
    }

    let startAngle = parseInt(elPath.attr('data:startAngle'), 10)
    let angle = parseInt(elPath.attr('data:angle'), 10)

    path = me.getPiePath({
      me,
      startAngle,
      angle,
      size,
    })

    if (angle === 360) return

    elPath.plot(path)
  }

  getChangedPath(prevStartAngle, prevEndAngle) {
    let path = ''
    if (this.dynamicAnim && this.w.globals.dataChanged) {
      path = this.getPiePath({
        me: this,
        startAngle: prevStartAngle,
        angle: prevEndAngle - prevStartAngle,
        size: this.size,
      })
    }
    return path
  }

  getPiePath({ me, startAngle, angle, size }) {
    let path
    const graphics = new Graphics(this.ctx)

    let startDeg = startAngle
    let startRadians = (Math.PI * (startDeg - 90)) / 180

    let endDeg = angle + startAngle
    // prevent overlap
    if (
      Math.ceil(endDeg) >=
      this.fullAngle +
        (this.w.config.plotOptions.pie.startAngle % this.fullAngle)
    ) {
      endDeg =
        this.fullAngle +
        (this.w.config.plotOptions.pie.startAngle % this.fullAngle) -
        0.01
    }
    if (Math.ceil(endDeg) > this.fullAngle) endDeg -= this.fullAngle

    let endRadians = (Math.PI * (endDeg - 90)) / 180

    let x1 = me.centerX + size * Math.cos(startRadians)
    let y1 = me.centerY + size * Math.sin(startRadians)
    let x2 = me.centerX + size * Math.cos(endRadians)
    let y2 = me.centerY + size * Math.sin(endRadians)

    let startInner = Utils.polarToCartesian(
      me.centerX,
      me.centerY,
      me.donutSize,
      endDeg
    )
    let endInner = Utils.polarToCartesian(
      me.centerX,
      me.centerY,
      me.donutSize,
      startDeg
    )

    let largeArc = angle > 180 ? 1 : 0

    const pathBeginning = ['M', x1, y1, 'A', size, size, 0, largeArc, 1, x2, y2]

    if (me.chartType === 'donut') {
      path = [
        ...pathBeginning,
        'L',
        startInner.x,
        startInner.y,
        'A',
        me.donutSize,
        me.donutSize,
        0,
        largeArc,
        0,
        endInner.x,
        endInner.y,
        'L',
        x1,
        y1,
        'z',
      ].join(' ')
    } else if (me.chartType === 'pie' || me.chartType === 'polarArea') {
      path = [...pathBeginning, 'L', me.centerX, me.centerY, 'L', x1, y1].join(
        ' '
      )
    } else {
      path = [...pathBeginning].join(' ')
    }

    return graphics.roundPathCorners(path, this.strokeWidth * 2)
  }

  drawPolarElements(parent) {
    const w = this.w
    const scale = new Scales(this.ctx)
    const graphics = new Graphics(this.ctx)
    const helpers = new Helpers(this.ctx)

    const gCircles = graphics.group()
    const gYAxis = graphics.group()

    const yScale = scale.niceScale(0, Math.ceil(this.maxY), 0)

    const yTexts = yScale.result.reverse()
    let len = yScale.result.length

    this.maxY = yScale.niceMax

    let circleSize = w.globals.radialSize
    let diff = circleSize / (len - 1)

    for (let i = 0; i < len - 1; i++) {
      const circle = graphics.drawCircle(circleSize)

      circle.attr({
        cx: this.centerX,
        cy: this.centerY,
        fill: 'none',
        'stroke-width': w.config.plotOptions.polarArea.rings.strokeWidth,
        stroke: w.config.plotOptions.polarArea.rings.strokeColor,
      })

      if (w.config.yaxis[0].show) {
        const yLabel = helpers.drawYAxisTexts(
          this.centerX,
          this.centerY -
            circleSize +
            parseInt(w.config.yaxis[0].labels.style.fontSize, 10) / 2,
          i,
          yTexts[i]
        )

        gYAxis.add(yLabel)
      }

      gCircles.add(circle)

      circleSize = circleSize - diff
    }

    this.drawSpokes(parent)

    parent.add(gCircles)
    parent.add(gYAxis)
  }

  renderInnerDataLabels(dataLabelsGroup, dataLabelsConfig, opts) {
    let w = this.w
    const graphics = new Graphics(this.ctx)

    const showTotal = dataLabelsConfig.total.show

    dataLabelsGroup.node.innerHTML = ''
    dataLabelsGroup.node.style.opacity = opts.opacity

    let x = opts.centerX
    let y = !this.donutDataLabels.total.label
      ? opts.centerY - opts.centerY / 6
      : opts.centerY

    let labelColor, valueColor

    if (dataLabelsConfig.name.color === undefined) {
      labelColor = w.globals.colors[0]
    } else {
      labelColor = dataLabelsConfig.name.color
    }
    let labelFontSize = dataLabelsConfig.name.fontSize
    let labelFontFamily = dataLabelsConfig.name.fontFamily
    let labelFontWeight = dataLabelsConfig.name.fontWeight

    if (dataLabelsConfig.value.color === undefined) {
      valueColor = w.config.chart.foreColor
    } else {
      valueColor = dataLabelsConfig.value.color
    }

    let lbFormatter = dataLabelsConfig.value.formatter
    let val = ''
    let name = ''

    if (showTotal) {
      labelColor = dataLabelsConfig.total.color
      labelFontSize = dataLabelsConfig.total.fontSize
      labelFontFamily = dataLabelsConfig.total.fontFamily
      labelFontWeight = dataLabelsConfig.total.fontWeight
      name = !this.donutDataLabels.total.label
        ? ''
        : dataLabelsConfig.total.label
      val = dataLabelsConfig.total.formatter(w)
    } else {
      if (w.globals.series.length === 1) {
        val = lbFormatter(w.globals.series[0], w)
        name = w.globals.seriesNames[0]
      }
    }

    if (name) {
      name = dataLabelsConfig.name.formatter(
        name,
        dataLabelsConfig.total.show,
        w
      )
    }

    if (dataLabelsConfig.name.show) {
      let elLabel = graphics.drawText({
        x,
        y: y + parseFloat(dataLabelsConfig.name.offsetY),
        text: name,
        textAnchor: 'middle',
        foreColor: labelColor,
        fontSize: labelFontSize,
        fontWeight: labelFontWeight,
        fontFamily: labelFontFamily,
      })
      elLabel.node.classList.add('apexcharts-datalabel-label')
      dataLabelsGroup.add(elLabel)
    }

    if (dataLabelsConfig.value.show) {
      let valOffset = dataLabelsConfig.name.show
        ? parseFloat(dataLabelsConfig.value.offsetY) + 16
        : dataLabelsConfig.value.offsetY

      let elValue = graphics.drawText({
        x,
        y: y + valOffset,
        text: val,
        textAnchor: 'middle',
        foreColor: valueColor,
        fontWeight: dataLabelsConfig.value.fontWeight,
        fontSize: dataLabelsConfig.value.fontSize,
        fontFamily: dataLabelsConfig.value.fontFamily,
      })
      elValue.node.classList.add('apexcharts-datalabel-value')
      dataLabelsGroup.add(elValue)
    }

    // for a multi-series circle chart, we need to show total value instead of first series labels

    return dataLabelsGroup
  }

  /**
   *
   * @param {string} name - The name of the series
   * @param {string} val - The value of that series
   * @param {object} el - Optional el (indicates which series was hovered/clicked). If this param is not present, means we need to show total
   */
  printInnerLabels(labelsConfig, name, val, el) {
    const w = this.w

    let labelColor

    if (el) {
      if (labelsConfig.name.color === undefined) {
        labelColor =
          w.globals.colors[parseInt(el.parentNode.getAttribute('rel'), 10) - 1]
      } else {
        labelColor = labelsConfig.name.color
      }
    } else {
      if (w.globals.series.length > 1 && labelsConfig.total.show) {
        labelColor = labelsConfig.total.color
      }
    }

    let elLabel = w.globals.dom.baseEl.querySelector(
      '.apexcharts-datalabel-label'
    )
    let elValue = w.globals.dom.baseEl.querySelector(
      '.apexcharts-datalabel-value'
    )

    let lbFormatter = labelsConfig.value.formatter
    val = lbFormatter(val, w)

    // we need to show Total Val - so get the formatter of it
    if (!el && typeof labelsConfig.total.formatter === 'function') {
      val = labelsConfig.total.formatter(w)
    }

    const isTotal = name === labelsConfig.total.label
    name = !this.donutDataLabels.total.label
      ? ''
      : labelsConfig.name.formatter(name, isTotal, w)

    if (elLabel !== null) {
      elLabel.textContent = name
    }

    if (elValue !== null) {
      elValue.textContent = val
    }
    if (elLabel !== null) {
      elLabel.style.fill = labelColor
    }
  }

  printDataLabelsInner(el, dataLabelsConfig) {
    let w = this.w

    let val = el.getAttribute('data:value')
    let name =
      w.globals.seriesNames[parseInt(el.parentNode.getAttribute('rel'), 10) - 1]

    if (w.globals.series.length > 1) {
      this.printInnerLabels(dataLabelsConfig, name, val, el)
    }

    let dataLabelsGroup = w.globals.dom.baseEl.querySelector(
      '.apexcharts-datalabels-group'
    )
    if (dataLabelsGroup !== null) {
      dataLabelsGroup.style.opacity = 1
    }
  }

  drawSpokes(parent) {
    const w = this.w
    const graphics = new Graphics(this.ctx)
    const spokeConfig = w.config.plotOptions.polarArea.spokes

    if (spokeConfig.strokeWidth === 0) return

    let spokes = []

    let angleDivision = 360 / w.globals.series.length
    for (let i = 0; i < w.globals.series.length; i++) {
      spokes.push(
        Utils.polarToCartesian(
          this.centerX,
          this.centerY,
          w.globals.radialSize,
          w.config.plotOptions.pie.startAngle + angleDivision * i
        )
      )
    }

    spokes.forEach((p, i) => {
      const line = graphics.drawLine(
        p.x,
        p.y,
        this.centerX,
        this.centerY,
        Array.isArray(spokeConfig.connectorColors)
          ? spokeConfig.connectorColors[i]
          : spokeConfig.connectorColors
      )

      parent.add(line)
    })
  }

  revertDataLabelsInner() {
    const w = this.w
    if (this.donutDataLabels.show) {
      let dataLabelsGroup = w.globals.dom.Paper.select(
        `.apexcharts-datalabels-group`
      ).members[0]

      let dataLabels = this.renderInnerDataLabels(
        dataLabelsGroup,
        this.donutDataLabels,
        {
          hollowSize: this.donutSize,
          centerX: this.centerX,
          centerY: this.centerY,
          opacity: this.donutDataLabels.show,
        }
      )

      let elPie = w.globals.dom.Paper.select(
        '.apexcharts-radialbar, .apexcharts-pie'
      ).members[0]
      elPie.add(dataLabels)
    }
  }
}

export default Pie
