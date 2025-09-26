import Fill from '../modules/Fill'
import Graphics from '../modules/Graphics'
import Markers from '../modules/Markers'
import DataLabels from '../modules/DataLabels'
import Filters from '../modules/Filters'
import Utils from '../utils/Utils'
import Helpers from './common/circle/Helpers'
import CoreUtils from '../modules/CoreUtils'

/**
 * ApexCharts Radar Class for Spider/Radar Charts.
 * @module Radar
 **/

class Radar {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.chartType = this.w.config.chart.type

    this.initialAnim = this.w.config.chart.animations.enabled
    this.dynamicAnim =
      this.initialAnim &&
      this.w.config.chart.animations.dynamicAnimation.enabled

    this.animDur = 0

    const w = this.w
    this.graphics = new Graphics(this.ctx)

    this.lineColorArr =
      w.globals.stroke.colors !== undefined
        ? w.globals.stroke.colors
        : w.globals.colors

    this.defaultSize =
      w.globals.svgHeight < w.globals.svgWidth
        ? w.globals.gridHeight
        : w.globals.gridWidth

    this.isLog = w.config.yaxis[0].logarithmic
    this.logBase = w.config.yaxis[0].logBase

    this.coreUtils = new CoreUtils(this.ctx)
    this.maxValue = this.isLog
      ? this.coreUtils.getLogVal(this.logBase, w.globals.maxY, 0)
      : w.globals.maxY
    this.minValue = this.isLog
      ? this.coreUtils.getLogVal(this.logBase, this.w.globals.minY, 0)
      : w.globals.minY

    this.polygons = w.config.plotOptions.radar.polygons

    this.strokeWidth = w.config.stroke.show ? w.config.stroke.width : 0

    this.size =
      this.defaultSize / 2.1 - this.strokeWidth - w.config.chart.dropShadow.blur

    if (w.config.xaxis.labels.show) {
      this.size = this.size - w.globals.xAxisLabelsWidth / 1.75
    }

    if (w.config.plotOptions.radar.size !== undefined) {
      this.size = w.config.plotOptions.radar.size
    }

    this.dataRadiusOfPercent = []
    this.dataRadius = []
    this.angleArr = []

    this.yaxisLabelsTextsPos = []
  }

  draw(series) {
    let w = this.w
    const fill = new Fill(this.ctx)

    const allSeries = []
    const dataLabels = new DataLabels(this.ctx)

    if (series.length) {
      this.dataPointsLen = series[w.globals.maxValsInArrayIndex].length
    }
    this.disAngle = (Math.PI * 2) / this.dataPointsLen

    let halfW = w.globals.gridWidth / 2
    let halfH = w.globals.gridHeight / 2
    let translateX = halfW + w.config.plotOptions.radar.offsetX
    let translateY = halfH + w.config.plotOptions.radar.offsetY

    let ret = this.graphics.group({
      class: 'apexcharts-radar-series apexcharts-plot-series',
      transform: `translate(${translateX || 0}, ${translateY || 0})`,
    })

    let dataPointsPos = []
    let elPointsMain = null
    let elDataPointsMain = null

    this.yaxisLabels = this.graphics.group({
      class: 'apexcharts-yaxis',
    })

    series.forEach((s, i) => {
      let longestSeries = s.length === w.globals.dataPoints

      // el to which series will be drawn
      let elSeries = this.graphics.group().attr({
        class: `apexcharts-series`,
        'data:longestSeries': longestSeries,
        seriesName: Utils.escapeString(w.globals.seriesNames[i]),
        rel: i + 1,
        'data:realIndex': i,
      })

      this.dataRadiusOfPercent[i] = []
      this.dataRadius[i] = []
      this.angleArr[i] = []

      s.forEach((dv, j) => {
        const range = Math.abs(this.maxValue - this.minValue)
        dv = dv - this.minValue

        if (this.isLog) {
          dv = this.coreUtils.getLogVal(this.logBase, dv, 0)
        }

        this.dataRadiusOfPercent[i][j] = dv / range

        this.dataRadius[i][j] = this.dataRadiusOfPercent[i][j] * this.size
        this.angleArr[i][j] = j * this.disAngle
      })

      dataPointsPos = this.getDataPointsPos(
        this.dataRadius[i],
        this.angleArr[i]
      )
      const paths = this.createPaths(dataPointsPos, {
        x: 0,
        y: 0,
      })

      // points
      elPointsMain = this.graphics.group({
        class: 'apexcharts-series-markers-wrap apexcharts-element-hidden',
      })

      // datapoints
      elDataPointsMain = this.graphics.group({
        class: `apexcharts-datalabels`,
        'data:realIndex': i,
      })

      w.globals.delayedElements.push({
        el: elPointsMain.node,
        index: i,
      })

      const defaultRenderedPathOptions = {
        i,
        realIndex: i,
        animationDelay: i,
        initialSpeed: w.config.chart.animations.speed,
        dataChangeSpeed: w.config.chart.animations.dynamicAnimation.speed,
        className: `apexcharts-radar`,
        shouldClipToGrid: false,
        bindEventsOnPaths: false,
        stroke: w.globals.stroke.colors[i],
        strokeLineCap: w.config.stroke.lineCap,
      }

      let pathFrom = null

      if (w.globals.previousPaths.length > 0) {
        pathFrom = this.getPreviousPath(i)
      }

      for (let p = 0; p < paths.linePathsTo.length; p++) {
        let renderedLinePath = this.graphics.renderPaths({
          ...defaultRenderedPathOptions,
          pathFrom: pathFrom === null ? paths.linePathsFrom[p] : pathFrom,
          pathTo: paths.linePathsTo[p],
          strokeWidth: Array.isArray(this.strokeWidth)
            ? this.strokeWidth[i]
            : this.strokeWidth,
          fill: 'none',
          drawShadow: false,
        })

        elSeries.add(renderedLinePath)

        let pathFill = fill.fillPath({
          seriesNumber: i,
        })

        let renderedAreaPath = this.graphics.renderPaths({
          ...defaultRenderedPathOptions,
          pathFrom: pathFrom === null ? paths.areaPathsFrom[p] : pathFrom,
          pathTo: paths.areaPathsTo[p],
          strokeWidth: 0,
          fill: pathFill,
          drawShadow: false,
        })

        if (w.config.chart.dropShadow.enabled) {
          const filters = new Filters(this.ctx)

          const shadow = w.config.chart.dropShadow
          filters.dropShadow(
            renderedAreaPath,
            Object.assign({}, shadow, { noUserSpaceOnUse: true }),
            i
          )
        }

        elSeries.add(renderedAreaPath)
      }

      s.forEach((sj, j) => {
        let markers = new Markers(this.ctx)

        let opts = markers.getMarkerConfig({
          cssClass: 'apexcharts-marker',
          seriesIndex: i,
          dataPointIndex: j,
        })

        let point = this.graphics.drawMarker(
          dataPointsPos[j].x,
          dataPointsPos[j].y,
          opts
        )

        point.attr('rel', j)
        point.attr('j', j)
        point.attr('index', i)
        point.node.setAttribute('default-marker-size', opts.pSize)

        let elPointsWrap = this.graphics.group({
          class: 'apexcharts-series-markers',
        })

        if (elPointsWrap) {
          elPointsWrap.add(point)
        }

        elPointsMain.add(elPointsWrap)

        elSeries.add(elPointsMain)

        const dataLabelsConfig = w.config.dataLabels

        if (dataLabelsConfig.enabled) {
          let text = dataLabelsConfig.formatter(w.globals.series[i][j], {
            seriesIndex: i,
            dataPointIndex: j,
            w,
          })

          dataLabels.plotDataLabelsText({
            x: dataPointsPos[j].x,
            y: dataPointsPos[j].y,
            text,
            textAnchor: 'middle',
            i,
            j: i,
            parent: elDataPointsMain,
            offsetCorrection: false,
            dataLabelsConfig: {
              ...dataLabelsConfig,
            },
          })
        }
        elSeries.add(elDataPointsMain)
      })

      allSeries.push(elSeries)
    })

    this.drawPolygons({
      parent: ret,
    })

    if (w.config.xaxis.labels.show) {
      const xaxisTexts = this.drawXAxisTexts()
      ret.add(xaxisTexts)
    }

    allSeries.forEach((elS) => {
      ret.add(elS)
    })

    ret.add(this.yaxisLabels)

    return ret
  }

  drawPolygons(opts) {
    const w = this.w
    const { parent } = opts
    const helpers = new Helpers(this.ctx)

    const yaxisTexts = w.globals.yAxisScale[0].result.reverse()
    const layers = yaxisTexts.length

    let radiusSizes = []
    let layerDis = this.size / (layers - 1)
    for (let i = 0; i < layers; i++) {
      radiusSizes[i] = layerDis * i
    }
    radiusSizes.reverse()

    let polygonStrings = []
    let lines = []

    radiusSizes.forEach((radiusSize, r) => {
      const polygon = Utils.getPolygonPos(radiusSize, this.dataPointsLen)
      let string = ''

      polygon.forEach((p, i) => {
        if (r === 0) {
          const line = this.graphics.drawLine(
            p.x,
            p.y,
            0,
            0,
            Array.isArray(this.polygons.connectorColors)
              ? this.polygons.connectorColors[i]
              : this.polygons.connectorColors
          )

          lines.push(line)
        }

        if (i === 0) {
          this.yaxisLabelsTextsPos.push({
            x: p.x,
            y: p.y,
          })
        }

        string += p.x + ',' + p.y + ' '
      })

      polygonStrings.push(string)
    })

    polygonStrings.forEach((p, i) => {
      const strokeColors = this.polygons.strokeColors
      const strokeWidth = this.polygons.strokeWidth
      const polygon = this.graphics.drawPolygon(
        p,
        Array.isArray(strokeColors) ? strokeColors[i] : strokeColors,
        Array.isArray(strokeWidth) ? strokeWidth[i] : strokeWidth,
        w.globals.radarPolygons.fill.colors[i]
      )
      parent.add(polygon)
    })

    lines.forEach((l) => {
      parent.add(l)
    })

    if (w.config.yaxis[0].show) {
      this.yaxisLabelsTextsPos.forEach((p, i) => {
        const yText = helpers.drawYAxisTexts(p.x, p.y, i, yaxisTexts[i])
        this.yaxisLabels.add(yText)
      })
    }
  }

  drawXAxisTexts() {
    const w = this.w

    const xaxisLabelsConfig = w.config.xaxis.labels
    let elXAxisWrap = this.graphics.group({
      class: 'apexcharts-xaxis',
    })

    let polygonPos = Utils.getPolygonPos(this.size, this.dataPointsLen)

    w.globals.labels.forEach((label, i) => {
      let formatter = w.config.xaxis.labels.formatter
      let dataLabels = new DataLabels(this.ctx)

      if (polygonPos[i]) {
        let textPos = this.getTextPos(polygonPos[i], this.size)

        let text = formatter(label, {
          seriesIndex: -1,
          dataPointIndex: i,
          w,
        })

        const dataLabelText = dataLabels.plotDataLabelsText({
          x: textPos.newX,
          y: textPos.newY,
          text,
          textAnchor: textPos.textAnchor,
          i,
          j: i,
          parent: elXAxisWrap,
          className: 'apexcharts-xaxis-label',
          color:
            Array.isArray(xaxisLabelsConfig.style.colors) &&
            xaxisLabelsConfig.style.colors[i]
              ? xaxisLabelsConfig.style.colors[i]
              : '#a8a8a8',
          dataLabelsConfig: {
            textAnchor: textPos.textAnchor,
            dropShadow: { enabled: false },
            ...xaxisLabelsConfig,
          },
          offsetCorrection: false,
        })

        dataLabelText.on('click', (e) => {
          if (typeof w.config.chart.events.xAxisLabelClick === 'function') {
            const opts = Object.assign({}, w, {
              labelIndex: i,
            })

            w.config.chart.events.xAxisLabelClick(e, this.ctx, opts)
          }
        })
      }
    })

    return elXAxisWrap
  }

  createPaths(pos, origin) {
    let linePathsTo = []
    let linePathsFrom = []
    let areaPathsTo = []
    let areaPathsFrom = []

    if (pos.length) {
      linePathsFrom = [this.graphics.move(origin.x, origin.y)]
      areaPathsFrom = [this.graphics.move(origin.x, origin.y)]

      let linePathTo = this.graphics.move(pos[0].x, pos[0].y)
      let areaPathTo = this.graphics.move(pos[0].x, pos[0].y)

      pos.forEach((p, i) => {
        linePathTo += this.graphics.line(p.x, p.y)
        areaPathTo += this.graphics.line(p.x, p.y)
        if (i === pos.length - 1) {
          linePathTo += 'Z'
          areaPathTo += 'Z'
        }
      })

      linePathsTo.push(linePathTo)
      areaPathsTo.push(areaPathTo)
    }

    return {
      linePathsFrom,
      linePathsTo,
      areaPathsFrom,
      areaPathsTo,
    }
  }

  getTextPos(pos, polygonSize) {
    let limit = 10
    let textAnchor = 'middle'

    let newX = pos.x
    let newY = pos.y

    if (Math.abs(pos.x) >= limit) {
      if (pos.x > 0) {
        textAnchor = 'start'
        newX += 10
      } else if (pos.x < 0) {
        textAnchor = 'end'
        newX -= 10
      }
    } else {
      textAnchor = 'middle'
    }
    if (Math.abs(pos.y) >= polygonSize - limit) {
      if (pos.y < 0) {
        newY -= 10
      } else if (pos.y > 0) {
        newY += 10
      }
    }

    return {
      textAnchor,
      newX,
      newY,
    }
  }

  getPreviousPath(realIndex) {
    let w = this.w
    let pathFrom = null
    for (let pp = 0; pp < w.globals.previousPaths.length; pp++) {
      let gpp = w.globals.previousPaths[pp]

      if (
        gpp.paths.length > 0 &&
        parseInt(gpp.realIndex, 10) === parseInt(realIndex, 10)
      ) {
        if (typeof w.globals.previousPaths[pp].paths[0] !== 'undefined') {
          pathFrom = w.globals.previousPaths[pp].paths[0].d
        }
      }
    }
    return pathFrom
  }

  getDataPointsPos(
    dataRadiusArr,
    angleArr,
    dataPointsLen = this.dataPointsLen
  ) {
    dataRadiusArr = dataRadiusArr || []
    angleArr = angleArr || []
    let dataPointsPosArray = []
    for (let j = 0; j < dataPointsLen; j++) {
      let curPointPos = {}
      curPointPos.x = dataRadiusArr[j] * Math.sin(angleArr[j])
      curPointPos.y = -dataRadiusArr[j] * Math.cos(angleArr[j])
      dataPointsPosArray.push(curPointPos)
    }
    return dataPointsPosArray
  }
}

export default Radar
