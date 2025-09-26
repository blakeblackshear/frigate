import Bar from '../charts/Bar'
import BarStacked from '../charts/BarStacked'
import BoxCandleStick from '../charts/BoxCandleStick'
import CoreUtils from './CoreUtils'
import Crosshairs from './Crosshairs'
import HeatMap from '../charts/HeatMap'
import Globals from '../modules/settings/Globals'
import Pie from '../charts/Pie'
import Radar from '../charts/Radar'
import Radial from '../charts/Radial'
import RangeBar from '../charts/RangeBar'
import Legend from './legend/Legend'
import Line from '../charts/Line'
import Treemap from '../charts/Treemap'
import Graphics from './Graphics'
import Range from './Range'
import Utils from '../utils/Utils'
import TimeScale from './TimeScale'

/**
 * ApexCharts Core Class responsible for major calculations and creating elements.
 *
 * @module Core
 **/

export default class Core {
  constructor(el, ctx) {
    this.ctx = ctx
    this.w = ctx.w
    this.el = el
  }

  setupElements() {
    const { globals: gl, config: cnf } = this.w

    const ct = cnf.chart.type
    const axisChartsArrTypes = [
      'line',
      'area',
      'bar',
      'rangeBar',
      'rangeArea',
      'candlestick',
      'boxPlot',
      'scatter',
      'bubble',
      'radar',
      'heatmap',
      'treemap',
    ]

    const xyChartsArrTypes = [
      'line',
      'area',
      'bar',
      'rangeBar',
      'rangeArea',
      'candlestick',
      'boxPlot',
      'scatter',
      'bubble',
    ]

    gl.axisCharts = axisChartsArrTypes.includes(ct)
    gl.xyCharts = xyChartsArrTypes.includes(ct)

    gl.isBarHorizontal =
      ['bar', 'rangeBar', 'boxPlot'].includes(ct) &&
      cnf.plotOptions.bar.horizontal

    gl.chartClass = `.apexcharts${gl.chartID}`
    gl.dom.baseEl = this.el

    gl.dom.elWrap = document.createElement('div')
    Graphics.setAttrs(gl.dom.elWrap, {
      id: gl.chartClass.substring(1),
      class: `apexcharts-canvas ${gl.chartClass.substring(1)}`,
    })
    this.el.appendChild(gl.dom.elWrap)

    gl.dom.Paper = new window.SVG.Doc(gl.dom.elWrap)
    gl.dom.Paper.attr({
      class: 'apexcharts-svg',
      'xmlns:data': 'ApexChartsNS',
      transform: `translate(${cnf.chart.offsetX}, ${cnf.chart.offsetY})`,
    })

    gl.dom.Paper.node.style.background =
      cnf.theme.mode === 'dark' && !cnf.chart.background
        ? '#424242'
        : cnf.theme.mode === 'light' && !cnf.chart.background
        ? '#fff'
        : cnf.chart.background

    this.setSVGDimensions()

    gl.dom.elLegendForeign = document.createElementNS(gl.SVGNS, 'foreignObject')
    Graphics.setAttrs(gl.dom.elLegendForeign, {
      x: 0,
      y: 0,
      width: gl.svgWidth,
      height: gl.svgHeight,
    })

    gl.dom.elLegendWrap = document.createElement('div')
    gl.dom.elLegendWrap.classList.add('apexcharts-legend')

    gl.dom.elLegendWrap.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml')
    gl.dom.elLegendForeign.appendChild(gl.dom.elLegendWrap)

    gl.dom.Paper.node.appendChild(gl.dom.elLegendForeign)

    gl.dom.elGraphical = gl.dom.Paper.group().attr({
      class: 'apexcharts-inner apexcharts-graphical',
    })

    gl.dom.elDefs = gl.dom.Paper.defs()
    gl.dom.Paper.add(gl.dom.elGraphical)
    gl.dom.elGraphical.add(gl.dom.elDefs)
  }

  plotChartType(ser, xyRatios) {
    const { w, ctx } = this
    const { config: cnf, globals: gl } = w

    const seriesTypes = {
      line: { series: [], i: [] },
      area: { series: [], i: [] },
      scatter: { series: [], i: [] },
      bubble: { series: [], i: [] },
      column: { series: [], i: [] },
      candlestick: { series: [], i: [] },
      boxPlot: { series: [], i: [] },
      rangeBar: { series: [], i: [] },
      rangeArea: { series: [], seriesRangeEnd: [], i: [] },
    }

    const chartType = cnf.chart.type || 'line'
    let nonComboType = null
    let comboCount = 0

    gl.series.forEach((serie, st) => {
      const seriesType = ser[st].type || chartType
      if (seriesTypes[seriesType]) {
        if (seriesType === 'rangeArea') {
          seriesTypes[seriesType].series.push(gl.seriesRangeStart[st])
          seriesTypes[seriesType].seriesRangeEnd.push(gl.seriesRangeEnd[st])
        } else {
          seriesTypes[seriesType].series.push(serie)
        }
        seriesTypes[seriesType].i.push(st)

        if (seriesType === 'column' || seriesType === 'bar')
          w.globals.columnSeries = seriesTypes.column
      } else if (
        [
          'heatmap',
          'treemap',
          'pie',
          'donut',
          'polarArea',
          'radialBar',
          'radar',
        ].includes(seriesType)
      ) {
        nonComboType = seriesType
      } else if (seriesType === 'bar') {
        seriesTypes['column'].series.push(serie)
        seriesTypes['column'].i.push(st)
      } else {
        console.warn(
          `You have specified an unrecognized series type (${seriesType}).`
        )
      }
      if (chartType !== seriesType && seriesType !== 'scatter') comboCount++
    })

    if (comboCount > 0) {
      if (nonComboType) {
        console.warn(
          `Chart or series type ${nonComboType} cannot appear with other chart or series types.`
        )
      }
      if (
        seriesTypes.column.series.length > 0 &&
        cnf.plotOptions.bar.horizontal
      ) {
        comboCount -= seriesTypes.column.series.length
        seriesTypes.column = { series: [], i: [] }
        w.globals.columnSeries = { series: [], i: [] }
        console.warn(
          'Horizontal bars are not supported in a mixed/combo chart. Please turn off `plotOptions.bar.horizontal`'
        )
      }
    }
    gl.comboCharts ||= comboCount > 0

    const line = new Line(ctx, xyRatios)
    const boxCandlestick = new BoxCandleStick(ctx, xyRatios)
    ctx.pie = new Pie(ctx)
    const radialBar = new Radial(ctx)
    ctx.rangeBar = new RangeBar(ctx, xyRatios)
    const radar = new Radar(ctx)
    let elGraph = []

    if (gl.comboCharts) {
      const coreUtils = new CoreUtils(ctx)
      if (seriesTypes.area.series.length > 0) {
        elGraph.push(
          ...coreUtils.drawSeriesByGroup(
            seriesTypes.area,
            gl.areaGroups,
            'area',
            line
          )
        )
      }
      if (seriesTypes.column.series.length > 0) {
        if (cnf.chart.stacked) {
          const barStacked = new BarStacked(ctx, xyRatios)
          elGraph.push(
            barStacked.draw(seriesTypes.column.series, seriesTypes.column.i)
          )
        } else {
          ctx.bar = new Bar(ctx, xyRatios)
          elGraph.push(
            ctx.bar.draw(seriesTypes.column.series, seriesTypes.column.i)
          )
        }
      }
      if (seriesTypes.rangeArea.series.length > 0) {
        elGraph.push(
          line.draw(
            seriesTypes.rangeArea.series,
            'rangeArea',
            seriesTypes.rangeArea.i,
            seriesTypes.rangeArea.seriesRangeEnd
          )
        )
      }
      if (seriesTypes.line.series.length > 0) {
        elGraph.push(
          ...coreUtils.drawSeriesByGroup(
            seriesTypes.line,
            gl.lineGroups,
            'line',
            line
          )
        )
      }
      if (seriesTypes.candlestick.series.length > 0) {
        elGraph.push(
          boxCandlestick.draw(
            seriesTypes.candlestick.series,
            'candlestick',
            seriesTypes.candlestick.i
          )
        )
      }
      if (seriesTypes.boxPlot.series.length > 0) {
        elGraph.push(
          boxCandlestick.draw(
            seriesTypes.boxPlot.series,
            'boxPlot',
            seriesTypes.boxPlot.i
          )
        )
      }
      if (seriesTypes.rangeBar.series.length > 0) {
        elGraph.push(
          ctx.rangeBar.draw(seriesTypes.rangeBar.series, seriesTypes.rangeBar.i)
        )
      }
      if (seriesTypes.scatter.series.length > 0) {
        const scatterLine = new Line(ctx, xyRatios, true)
        elGraph.push(
          scatterLine.draw(
            seriesTypes.scatter.series,
            'scatter',
            seriesTypes.scatter.i
          )
        )
      }
      if (seriesTypes.bubble.series.length > 0) {
        const bubbleLine = new Line(ctx, xyRatios, true)
        elGraph.push(
          bubbleLine.draw(
            seriesTypes.bubble.series,
            'bubble',
            seriesTypes.bubble.i
          )
        )
      }
    } else {
      switch (cnf.chart.type) {
        case 'line':
          elGraph = line.draw(gl.series, 'line')
          break
        case 'area':
          elGraph = line.draw(gl.series, 'area')
          break
        case 'bar':
          if (cnf.chart.stacked) {
            const barStacked = new BarStacked(ctx, xyRatios)
            elGraph = barStacked.draw(gl.series)
          } else {
            ctx.bar = new Bar(ctx, xyRatios)
            elGraph = ctx.bar.draw(gl.series)
          }
          break
        case 'candlestick':
          const candleStick = new BoxCandleStick(ctx, xyRatios)
          elGraph = candleStick.draw(gl.series, 'candlestick')
          break
        case 'boxPlot':
          const boxPlot = new BoxCandleStick(ctx, xyRatios)
          elGraph = boxPlot.draw(gl.series, cnf.chart.type)
          break
        case 'rangeBar':
          elGraph = ctx.rangeBar.draw(gl.series)
          break
        case 'rangeArea':
          elGraph = line.draw(
            gl.seriesRangeStart,
            'rangeArea',
            undefined,
            gl.seriesRangeEnd
          )
          break
        case 'heatmap':
          const heatmap = new HeatMap(ctx, xyRatios)
          elGraph = heatmap.draw(gl.series)
          break
        case 'treemap':
          const treemap = new Treemap(ctx, xyRatios)
          elGraph = treemap.draw(gl.series)
          break
        case 'pie':
        case 'donut':
        case 'polarArea':
          elGraph = ctx.pie.draw(gl.series)
          break
        case 'radialBar':
          elGraph = radialBar.draw(gl.series)
          break
        case 'radar':
          elGraph = radar.draw(gl.series)
          break
        default:
          elGraph = line.draw(gl.series)
      }
    }

    return elGraph
  }

  setSVGDimensions() {
    const { globals: gl, config: cnf } = this.w

    cnf.chart.width = cnf.chart.width || '100%'
    cnf.chart.height = cnf.chart.height || 'auto'

    gl.svgWidth = cnf.chart.width
    gl.svgHeight = cnf.chart.height

    let elDim = Utils.getDimensions(this.el)
    const widthUnit = cnf.chart.width
      .toString()
      .split(/[0-9]+/g)
      .pop()

    if (widthUnit === '%') {
      if (Utils.isNumber(elDim[0])) {
        if (elDim[0].width === 0) {
          elDim = Utils.getDimensions(this.el.parentNode)
        }
        gl.svgWidth = (elDim[0] * parseInt(cnf.chart.width, 10)) / 100
      }
    } else if (widthUnit === 'px' || widthUnit === '') {
      gl.svgWidth = parseInt(cnf.chart.width, 10)
    }

    const heightUnit = String(cnf.chart.height)
      .toString()
      .split(/[0-9]+/g)
      .pop()
    if (gl.svgHeight !== 'auto' && gl.svgHeight !== '') {
      if (heightUnit === '%') {
        const elParentDim = Utils.getDimensions(this.el.parentNode)
        gl.svgHeight = (elParentDim[1] * parseInt(cnf.chart.height, 10)) / 100
      } else {
        gl.svgHeight = parseInt(cnf.chart.height, 10)
      }
    } else {
      gl.svgHeight = gl.axisCharts ? gl.svgWidth / 1.61 : gl.svgWidth / 1.2
    }

    gl.svgWidth = Math.max(gl.svgWidth, 0)
    gl.svgHeight = Math.max(gl.svgHeight, 0)

    Graphics.setAttrs(gl.dom.Paper.node, {
      width: gl.svgWidth,
      height: gl.svgHeight,
    })

    if (heightUnit !== '%') {
      const offsetY = cnf.chart.sparkline.enabled
        ? 0
        : gl.axisCharts
        ? cnf.chart.parentHeightOffset
        : 0
      gl.dom.Paper.node.parentNode.parentNode.style.minHeight = `${
        gl.svgHeight + offsetY
      }px`
    }

    gl.dom.elWrap.style.width = `${gl.svgWidth}px`
    gl.dom.elWrap.style.height = `${gl.svgHeight}px`
  }

  shiftGraphPosition() {
    const { globals: gl } = this.w
    const { translateY: tY, translateX: tX } = gl

    Graphics.setAttrs(gl.dom.elGraphical.node, {
      transform: `translate(${tX}, ${tY})`,
    })
  }

  resizeNonAxisCharts() {
    const { w } = this
    const { globals: gl } = w

    let legendHeight = 0
    let offY = w.config.chart.sparkline.enabled ? 1 : 15
    offY += w.config.grid.padding.bottom

    if (
      ['top', 'bottom'].includes(w.config.legend.position) &&
      w.config.legend.show &&
      !w.config.legend.floating
    ) {
      legendHeight =
        new Legend(this.ctx).legendHelpers.getLegendDimensions().clwh + 7
    }

    const el = w.globals.dom.baseEl.querySelector(
      '.apexcharts-radialbar, .apexcharts-pie'
    )
    let chartInnerDimensions = w.globals.radialSize * 2.05

    if (
      el &&
      !w.config.chart.sparkline.enabled &&
      w.config.plotOptions.radialBar.startAngle !== 0
    ) {
      const elRadialRect = Utils.getBoundingClientRect(el)
      chartInnerDimensions = elRadialRect.bottom
      const maxHeight = elRadialRect.bottom - elRadialRect.top
      chartInnerDimensions = Math.max(w.globals.radialSize * 2.05, maxHeight)
    }

    const newHeight = Math.ceil(
      chartInnerDimensions + gl.translateY + legendHeight + offY
    )

    if (gl.dom.elLegendForeign) {
      gl.dom.elLegendForeign.setAttribute('height', newHeight)
    }

    if (w.config.chart.height && String(w.config.chart.height).includes('%'))
      return

    gl.dom.elWrap.style.height = `${newHeight}px`
    Graphics.setAttrs(gl.dom.Paper.node, { height: newHeight })
    gl.dom.Paper.node.parentNode.parentNode.style.minHeight = `${newHeight}px`
  }

  coreCalculations() {
    new Range(this.ctx).init()
  }

  resetGlobals() {
    const resetxyValues = () => this.w.config.series.map(() => [])
    const globalObj = new Globals()

    const { globals: gl } = this.w
    globalObj.initGlobalVars(gl)
    gl.seriesXvalues = resetxyValues()
    gl.seriesYvalues = resetxyValues()
  }

  isMultipleY() {
    if (Array.isArray(this.w.config.yaxis) && this.w.config.yaxis.length > 1) {
      this.w.globals.isMultipleYAxis = true
      return true
    }
    return false
  }

  xySettings() {
    const { w } = this
    let xyRatios = null

    if (w.globals.axisCharts) {
      if (w.config.xaxis.crosshairs.position === 'back') {
        new Crosshairs(this.ctx).drawXCrosshairs()
      }
      if (w.config.yaxis[0].crosshairs.position === 'back') {
        new Crosshairs(this.ctx).drawYCrosshairs()
      }

      if (
        w.config.xaxis.type === 'datetime' &&
        w.config.xaxis.labels.formatter === undefined
      ) {
        this.ctx.timeScale = new TimeScale(this.ctx)
        let formattedTimeScale = []
        if (
          isFinite(w.globals.minX) &&
          isFinite(w.globals.maxX) &&
          !w.globals.isBarHorizontal
        ) {
          formattedTimeScale = this.ctx.timeScale.calculateTimeScaleTicks(
            w.globals.minX,
            w.globals.maxX
          )
        } else if (w.globals.isBarHorizontal) {
          formattedTimeScale = this.ctx.timeScale.calculateTimeScaleTicks(
            w.globals.minY,
            w.globals.maxY
          )
        }
        this.ctx.timeScale.recalcDimensionsBasedOnFormat(formattedTimeScale)
      }

      const coreUtils = new CoreUtils(this.ctx)
      xyRatios = coreUtils.getCalculatedRatios()
    }
    return xyRatios
  }

  updateSourceChart(targetChart) {
    this.ctx.w.globals.selection = undefined
    this.ctx.updateHelpers._updateOptions(
      {
        chart: {
          selection: {
            xaxis: {
              min: targetChart.w.globals.minX,
              max: targetChart.w.globals.maxX,
            },
          },
        },
      },
      false,
      false
    )
  }

  setupBrushHandler() {
    const { w } = this

    if (!w.config.chart.brush.enabled) return

    if (typeof w.config.chart.events.selection !== 'function') {
      const targets = Array.isArray(w.config.chart.brush.targets)
        ? w.config.chart.brush.targets
        : [w.config.chart.brush.target]
      targets.forEach((target) => {
        const targetChart = ApexCharts.getChartByID(target)
        targetChart.w.globals.brushSource = this.ctx

        if (typeof targetChart.w.config.chart.events.zoomed !== 'function') {
          targetChart.w.config.chart.events.zoomed = () =>
            this.updateSourceChart(targetChart)
        }
        if (typeof targetChart.w.config.chart.events.scrolled !== 'function') {
          targetChart.w.config.chart.events.scrolled = () =>
            this.updateSourceChart(targetChart)
        }
      })

      w.config.chart.events.selection = (chart, e) => {
        targets.forEach((target) => {
          const targetChart = ApexCharts.getChartByID(target)
          targetChart.ctx.updateHelpers._updateOptions(
            {
              xaxis: {
                min: e.xaxis.min,
                max: e.xaxis.max,
              },
            },
            false,
            false,
            false,
            false
          )
        })
      }
    }
  }
}
