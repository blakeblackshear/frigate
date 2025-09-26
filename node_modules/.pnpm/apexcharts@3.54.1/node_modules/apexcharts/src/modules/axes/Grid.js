import Graphics from '../Graphics'
import XAxis from './XAxis'
import AxesUtils from './AxesUtils'

/**
 * ApexCharts Grid Class for drawing Cartesian Grid.
 *
 * @module Grid
 **/

class Grid {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    const w = this.w
    this.xaxisLabels = w.globals.labels.slice()
    this.axesUtils = new AxesUtils(ctx)

    this.isRangeBar = w.globals.seriesRange.length && w.globals.isBarHorizontal

    if (w.globals.timescaleLabels.length > 0) {
      //  timescaleLabels labels are there
      this.xaxisLabels = w.globals.timescaleLabels.slice()
    }
  }

  drawGridArea(elGrid = null) {
    const w = this.w
    const graphics = new Graphics(this.ctx)

    if (!elGrid) {
      elGrid = graphics.group({ class: 'apexcharts-grid' })
    }

    const elVerticalLine = graphics.drawLine(
      w.globals.padHorizontal,
      1,
      w.globals.padHorizontal,
      w.globals.gridHeight,
      'transparent'
    )

    const elHorzLine = graphics.drawLine(
      w.globals.padHorizontal,
      w.globals.gridHeight,
      w.globals.gridWidth,
      w.globals.gridHeight,
      'transparent'
    )

    elGrid.add(elHorzLine)
    elGrid.add(elVerticalLine)

    return elGrid
  }

  drawGrid() {
    const gl = this.w.globals

    if (gl.axisCharts) {
      const elgrid = this.renderGrid()
      this.drawGridArea(elgrid.el)
      return elgrid
    }
    return null
  }

  createGridMask() {
    const w = this.w
    const gl = w.globals
    const graphics = new Graphics(this.ctx)

    const strokeSize = Array.isArray(w.config.stroke.width)
      ? Math.max(...w.config.stroke.width)
      : w.config.stroke.width

    const createClipPath = (id) => {
      const clipPath = document.createElementNS(gl.SVGNS, 'clipPath')
      clipPath.setAttribute('id', id)
      return clipPath
    }

    gl.dom.elGridRectMask = createClipPath(`gridRectMask${gl.cuid}`)
    gl.dom.elGridRectBarMask = createClipPath(`gridRectBarMask${gl.cuid}`)
    gl.dom.elGridRectMarkerMask = createClipPath(`gridRectMarkerMask${gl.cuid}`)
    gl.dom.elForecastMask = createClipPath(`forecastMask${gl.cuid}`)
    gl.dom.elNonForecastMask = createClipPath(`nonForecastMask${gl.cuid}`)

    const hasBar =
      ['bar', 'rangeBar', 'candlestick', 'boxPlot'].includes(
        w.config.chart.type
      ) || w.globals.comboBarCount > 0

    let barWidthLeft = 0
    let barWidthRight = 0
    if (hasBar && w.globals.isXNumeric && !w.globals.isBarHorizontal) {
      barWidthLeft = Math.max(
        w.config.grid.padding.left,
        gl.barPadForNumericAxis
      )
      barWidthRight = Math.max(
        w.config.grid.padding.right,
        gl.barPadForNumericAxis
      )
    }

    gl.dom.elGridRect = graphics.drawRect(
      0,
      0,
      gl.gridWidth,
      gl.gridHeight,
      0,
      '#fff'
    )

    gl.dom.elGridRectBar = graphics.drawRect(
      -strokeSize / 2 - barWidthLeft - 2,
      -strokeSize / 2 - 2,
      gl.gridWidth + strokeSize + barWidthRight + barWidthLeft + 4,
      gl.gridHeight + strokeSize + 4,
      0,
      '#fff'
    )

    const markerSize = w.globals.markers.largestSize

    gl.dom.elGridRectMarker = graphics.drawRect(
      -markerSize,
      -markerSize,
      gl.gridWidth + markerSize * 2,
      gl.gridHeight + markerSize * 2,
      0,
      '#fff'
    )

    gl.dom.elGridRectMask.appendChild(gl.dom.elGridRect.node)
    gl.dom.elGridRectBarMask.appendChild(gl.dom.elGridRectBar.node)
    gl.dom.elGridRectMarkerMask.appendChild(gl.dom.elGridRectMarker.node)

    const defs = gl.dom.baseEl.querySelector('defs')
    defs.appendChild(gl.dom.elGridRectMask)
    defs.appendChild(gl.dom.elGridRectBarMask)
    defs.appendChild(gl.dom.elGridRectMarkerMask)
    defs.appendChild(gl.dom.elForecastMask)
    defs.appendChild(gl.dom.elNonForecastMask)
  }

  _drawGridLines({ i, x1, y1, x2, y2, xCount, parent }) {
    const w = this.w

    const shouldDraw = () => {
      if (i === 0 && w.globals.skipFirstTimelinelabel) return false
      if (
        i === xCount - 1 &&
        w.globals.skipLastTimelinelabel &&
        !w.config.xaxis.labels.formatter
      )
        return false
      if (w.config.chart.type === 'radar') return false
      return true
    }

    if (shouldDraw()) {
      if (w.config.grid.xaxis.lines.show) {
        this._drawGridLine({ i, x1, y1, x2, y2, xCount, parent })
      }

      let y_2 = 0
      if (
        w.globals.hasXaxisGroups &&
        w.config.xaxis.tickPlacement === 'between'
      ) {
        const groups = w.globals.groups
        if (groups) {
          let gacc = 0
          for (let gi = 0; gacc < i && gi < groups.length; gi++) {
            gacc += groups[gi].cols
          }
          if (gacc === i) {
            y_2 = w.globals.xAxisLabelsHeight * 0.6
          }
        }
      }

      const xAxis = new XAxis(this.ctx)
      xAxis.drawXaxisTicks(x1, y_2, w.globals.dom.elGraphical)
    }
  }

  _drawGridLine({ i, x1, y1, x2, y2, xCount, parent }) {
    const w = this.w
    const isHorzLine = parent.node.classList.contains(
      'apexcharts-gridlines-horizontal'
    )
    const offX = w.globals.barPadForNumericAxis

    const excludeBorders =
      (y1 === 0 && y2 === 0) ||
      (x1 === 0 && x2 === 0) ||
      (y1 === w.globals.gridHeight && y2 === w.globals.gridHeight) ||
      (w.globals.isBarHorizontal && (i === 0 || i === xCount - 1))

    const graphics = new Graphics(this)
    const line = graphics.drawLine(
      x1 - (isHorzLine ? offX : 0),
      y1,
      x2 + (isHorzLine ? offX : 0),
      y2,
      w.config.grid.borderColor,
      w.config.grid.strokeDashArray
    )
    line.node.classList.add('apexcharts-gridline')

    if (excludeBorders && w.config.grid.show) {
      this.elGridBorders.add(line)
    } else {
      parent.add(line)
    }
  }

  _drawGridBandRect({ c, x1, y1, x2, y2, type }) {
    const w = this.w
    const graphics = new Graphics(this.ctx)
    const offX = w.globals.barPadForNumericAxis

    const color = w.config.grid[type].colors[c]

    const rect = graphics.drawRect(
      x1 - (type === 'row' ? offX : 0),
      y1,
      x2 + (type === 'row' ? offX * 2 : 0),
      y2,
      0,
      color,
      w.config.grid[type].opacity
    )
    this.elg.add(rect)
    rect.attr('clip-path', `url(#gridRectMask${w.globals.cuid})`)
    rect.node.classList.add(`apexcharts-grid-${type}`)
  }

  _drawXYLines({ xCount, tickAmount }) {
    const w = this.w

    const datetimeLines = ({ xC, x1, y1, x2, y2 }) => {
      for (let i = 0; i < xC; i++) {
        x1 = this.xaxisLabels[i].position
        x2 = this.xaxisLabels[i].position

        this._drawGridLines({
          i,
          x1,
          y1,
          x2,
          y2,
          xCount,
          parent: this.elgridLinesV,
        })
      }
    }

    const categoryLines = ({ xC, x1, y1, x2, y2 }) => {
      for (let i = 0; i < xC + (w.globals.isXNumeric ? 0 : 1); i++) {
        if (i === 0 && xC === 1 && w.globals.dataPoints === 1) {
          x1 = w.globals.gridWidth / 2
          x2 = x1
        }
        this._drawGridLines({
          i,
          x1,
          y1,
          x2,
          y2,
          xCount,
          parent: this.elgridLinesV,
        })

        x1 += w.globals.gridWidth / (w.globals.isXNumeric ? xC - 1 : xC)
        x2 = x1
      }
    }

    if (w.config.grid.xaxis.lines.show || w.config.xaxis.axisTicks.show) {
      let x1 = w.globals.padHorizontal
      let y1 = 0
      let x2
      let y2 = w.globals.gridHeight

      if (w.globals.timescaleLabels.length) {
        datetimeLines({ xC: xCount, x1, y1, x2, y2 })
      } else {
        if (w.globals.isXNumeric) {
          xCount = w.globals.xAxisScale.result.length
        }
        categoryLines({ xC: xCount, x1, y1, x2, y2 })
      }
    }

    if (w.config.grid.yaxis.lines.show) {
      let x1 = 0
      let y1 = 0
      let y2 = 0
      let x2 = w.globals.gridWidth
      let tA = tickAmount + 1

      if (this.isRangeBar) {
        tA = w.globals.labels.length
      }

      for (let i = 0; i < tA + (this.isRangeBar ? 1 : 0); i++) {
        this._drawGridLine({
          i,
          xCount: tA + (this.isRangeBar ? 1 : 0),
          x1,
          y1,
          x2,
          y2,
          parent: this.elgridLinesH,
        })

        y1 += w.globals.gridHeight / (this.isRangeBar ? tA : tickAmount)
        y2 = y1
      }
    }
  }

  _drawInvertedXYLines({ xCount }) {
    const w = this.w

    if (w.config.grid.xaxis.lines.show || w.config.xaxis.axisTicks.show) {
      let x1 = w.globals.padHorizontal
      let y1 = 0
      let x2
      let y2 = w.globals.gridHeight
      for (let i = 0; i < xCount + 1; i++) {
        if (w.config.grid.xaxis.lines.show) {
          this._drawGridLine({
            i,
            xCount: xCount + 1,
            x1,
            y1,
            x2,
            y2,
            parent: this.elgridLinesV,
          })
        }

        const xAxis = new XAxis(this.ctx)
        xAxis.drawXaxisTicks(x1, 0, w.globals.dom.elGraphical)
        x1 += w.globals.gridWidth / xCount
        x2 = x1
      }
    }

    if (w.config.grid.yaxis.lines.show) {
      let x1 = 0
      let y1 = 0
      let y2 = 0
      let x2 = w.globals.gridWidth

      for (let i = 0; i < w.globals.dataPoints + 1; i++) {
        this._drawGridLine({
          i,
          xCount: w.globals.dataPoints + 1,
          x1,
          y1,
          x2,
          y2,
          parent: this.elgridLinesH,
        })

        y1 += w.globals.gridHeight / w.globals.dataPoints
        y2 = y1
      }
    }
  }

  renderGrid() {
    const w = this.w
    const gl = w.globals
    const graphics = new Graphics(this.ctx)

    this.elg = graphics.group({ class: 'apexcharts-grid' })
    this.elgridLinesH = graphics.group({
      class: 'apexcharts-gridlines-horizontal',
    })
    this.elgridLinesV = graphics.group({
      class: 'apexcharts-gridlines-vertical',
    })
    this.elGridBorders = graphics.group({ class: 'apexcharts-grid-borders' })

    this.elg.add(this.elgridLinesH)
    this.elg.add(this.elgridLinesV)

    if (!w.config.grid.show) {
      this.elgridLinesV.hide()
      this.elgridLinesH.hide()
      this.elGridBorders.hide()
    }

    let gridAxisIndex = 0
    while (
      gridAxisIndex < gl.seriesYAxisMap.length &&
      gl.ignoreYAxisIndexes.includes(gridAxisIndex)
    ) {
      gridAxisIndex++
    }
    if (gridAxisIndex === gl.seriesYAxisMap.length) {
      gridAxisIndex = 0
    }

    let yTickAmount = gl.yAxisScale[gridAxisIndex].result.length - 1

    let xCount

    if (!gl.isBarHorizontal || this.isRangeBar) {
      xCount = this.xaxisLabels.length

      if (this.isRangeBar) {
        yTickAmount = gl.labels.length

        if (w.config.xaxis.tickAmount && w.config.xaxis.labels.formatter) {
          xCount = w.config.xaxis.tickAmount
        }
        if (
          gl.yAxisScale?.[gridAxisIndex]?.result?.length > 0 &&
          w.config.xaxis.type !== 'datetime'
        ) {
          xCount = gl.yAxisScale[gridAxisIndex].result.length - 1
        }
      }

      this._drawXYLines({ xCount, tickAmount: yTickAmount })
    } else {
      xCount = yTickAmount

      // for horizontal bar chart, get the xaxis tickamount
      yTickAmount = gl.xTickAmount
      this._drawInvertedXYLines({ xCount, tickAmount: yTickAmount })
    }

    this.drawGridBands(xCount, yTickAmount)
    return {
      el: this.elg,
      elGridBorders: this.elGridBorders,
      xAxisTickWidth: gl.gridWidth / xCount,
    }
  }

  drawGridBands(xCount, tickAmount) {
    const w = this.w

    const drawBands = (type, count, x1, y1, x2, y2) => {
      for (let i = 0, c = 0; i < count; i++, c++) {
        if (c >= w.config.grid[type].colors.length) {
          c = 0
        }
        this._drawGridBandRect({ c, x1, y1, x2, y2, type })
        y1 += w.globals.gridHeight / tickAmount
      }
    }

    if (w.config.grid.row.colors?.length > 0) {
      drawBands(
        'row',
        tickAmount,
        0,
        0,
        w.globals.gridWidth,
        w.globals.gridHeight / tickAmount
      )
    }

    if (w.config.grid.column.colors?.length > 0) {
      let xc =
        !w.globals.isBarHorizontal &&
        w.config.xaxis.tickPlacement === 'on' &&
        (w.config.xaxis.type === 'category' ||
          w.config.xaxis.convertedCatToNumeric)
          ? xCount - 1
          : xCount

      if (w.globals.isXNumeric) {
        xc = w.globals.xAxisScale.result.length - 1
      }

      let x1 = w.globals.padHorizontal
      let y1 = 0
      let x2 = w.globals.padHorizontal + w.globals.gridWidth / xc
      let y2 = w.globals.gridHeight

      for (let i = 0, c = 0; i < xCount; i++, c++) {
        if (c >= w.config.grid.column.colors.length) {
          c = 0
        }

        if (w.config.xaxis.type === 'datetime') {
          x1 = this.xaxisLabels[i].position
          x2 =
            (this.xaxisLabels[i + 1]?.position || w.globals.gridWidth) -
            this.xaxisLabels[i].position
        }

        this._drawGridBandRect({ c, x1, y1, x2, y2, type: 'column' })
        x1 += w.globals.gridWidth / xc
      }
    }
  }
}

export default Grid
