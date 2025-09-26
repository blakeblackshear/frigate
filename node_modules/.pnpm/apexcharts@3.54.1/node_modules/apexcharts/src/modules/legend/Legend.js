import CoreUtils from '../CoreUtils'
import Dimensions from '../dimensions/Dimensions'
import Graphics from '../Graphics'
import Series from '../Series'
import Utils from '../../utils/Utils'
import Helpers from './Helpers'
import Markers from '../Markers'

/**
 * ApexCharts Legend Class to draw legend.
 *
 * @module Legend
 **/

class Legend {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.onLegendClick = this.onLegendClick.bind(this)
    this.onLegendHovered = this.onLegendHovered.bind(this)

    this.isBarsDistributed =
      this.w.config.chart.type === 'bar' &&
      this.w.config.plotOptions.bar.distributed &&
      this.w.config.series.length === 1

    this.legendHelpers = new Helpers(this)
  }

  init() {
    const w = this.w

    const gl = w.globals
    const cnf = w.config

    const showLegendAlways =
      (cnf.legend.showForSingleSeries && gl.series.length === 1) ||
      this.isBarsDistributed ||
      gl.series.length > 1

    this.legendHelpers.appendToForeignObject()

    if ((showLegendAlways || !gl.axisCharts) && cnf.legend.show) {
      while (gl.dom.elLegendWrap.firstChild) {
        gl.dom.elLegendWrap.removeChild(gl.dom.elLegendWrap.firstChild)
      }

      this.drawLegends()

      if (cnf.legend.position === 'bottom' || cnf.legend.position === 'top') {
        this.legendAlignHorizontal()
      } else if (
        cnf.legend.position === 'right' ||
        cnf.legend.position === 'left'
      ) {
        this.legendAlignVertical()
      }
    }
  }

  createLegendMarker({ i, fillcolor }) {
    const w = this.w
    const elMarker = document.createElement('span')
    elMarker.classList.add('apexcharts-legend-marker')

    let mShape = w.config.legend.markers.shape || w.config.markers.shape
    let shape = mShape
    if (Array.isArray(mShape)) {
      shape = mShape[i]
    }
    let mSize = Array.isArray(w.config.legend.markers.size)
      ? parseFloat(w.config.legend.markers.size[i])
      : parseFloat(w.config.legend.markers.size)
    let mOffsetX = Array.isArray(w.config.legend.markers.offsetX)
      ? parseFloat(w.config.legend.markers.offsetX[i])
      : parseFloat(w.config.legend.markers.offsetX)
    let mOffsetY = Array.isArray(w.config.legend.markers.offsetY)
      ? parseFloat(w.config.legend.markers.offsetY[i])
      : parseFloat(w.config.legend.markers.offsetY)
    let mBorderWidth = Array.isArray(w.config.legend.markers.strokeWidth)
      ? parseFloat(w.config.legend.markers.strokeWidth[i])
      : parseFloat(w.config.legend.markers.strokeWidth)

    let mStyle = elMarker.style

    mStyle.height = (mSize + mBorderWidth) * 2 + 'px'
    mStyle.width = (mSize + mBorderWidth) * 2 + 'px'
    mStyle.left = mOffsetX + 'px'
    mStyle.top = mOffsetY + 'px'

    if (w.config.legend.markers.customHTML) {
      mStyle.background = 'transparent'
      mStyle.color = fillcolor[i]

      if (Array.isArray(w.config.legend.markers.customHTML)) {
        if (w.config.legend.markers.customHTML[i]) {
          elMarker.innerHTML = w.config.legend.markers.customHTML[i]()
        }
      } else {
        elMarker.innerHTML = w.config.legend.markers.customHTML()
      }
    } else {
      let markers = new Markers(this.ctx)

      const markerConfig = markers.getMarkerConfig({
        cssClass: `apexcharts-legend-marker apexcharts-marker apexcharts-marker-${shape}`,
        seriesIndex: i,
        strokeWidth: mBorderWidth,
        size: mSize,
      })

      const SVGMarker = SVG(elMarker).size('100%', '100%')
      const marker = new Graphics(this.ctx).drawMarker(0, 0, {
        ...markerConfig,
        pointFillColor: Array.isArray(fillcolor)
          ? fillcolor[i]
          : markerConfig.pointFillColor,
        shape,
      })

      const shapesEls = SVG.select(
        '.apexcharts-legend-marker.apexcharts-marker'
      ).members
      shapesEls.forEach((shapeEl) => {
        if (shapeEl.node.classList.contains('apexcharts-marker-triangle')) {
          shapeEl.node.style.transform = 'translate(50%, 45%)'
        } else {
          shapeEl.node.style.transform = 'translate(50%, 50%)'
        }
      })
      SVGMarker.add(marker)
    }
    return elMarker
  }

  drawLegends() {
    let me = this
    let w = this.w

    let fontFamily = w.config.legend.fontFamily

    let legendNames = w.globals.seriesNames
    let fillcolor = w.config.legend.markers.fillColors
      ? w.config.legend.markers.fillColors.slice()
      : w.globals.colors.slice()

    if (w.config.chart.type === 'heatmap') {
      const ranges = w.config.plotOptions.heatmap.colorScale.ranges
      legendNames = ranges.map((colorScale) => {
        return colorScale.name
          ? colorScale.name
          : colorScale.from + ' - ' + colorScale.to
      })
      fillcolor = ranges.map((color) => color.color)
    } else if (this.isBarsDistributed) {
      legendNames = w.globals.labels.slice()
    }

    if (w.config.legend.customLegendItems.length) {
      legendNames = w.config.legend.customLegendItems
    }
    let legendFormatter = w.globals.legendFormatter

    let isLegendInversed = w.config.legend.inverseOrder

    for (
      let i = isLegendInversed ? legendNames.length - 1 : 0;
      isLegendInversed ? i >= 0 : i <= legendNames.length - 1;
      isLegendInversed ? i-- : i++
    ) {
      let text = legendFormatter(legendNames[i], { seriesIndex: i, w })

      let collapsedSeries = false
      let ancillaryCollapsedSeries = false
      if (w.globals.collapsedSeries.length > 0) {
        for (let c = 0; c < w.globals.collapsedSeries.length; c++) {
          if (w.globals.collapsedSeries[c].index === i) {
            collapsedSeries = true
          }
        }
      }

      if (w.globals.ancillaryCollapsedSeriesIndices.length > 0) {
        for (
          let c = 0;
          c < w.globals.ancillaryCollapsedSeriesIndices.length;
          c++
        ) {
          if (w.globals.ancillaryCollapsedSeriesIndices[c] === i) {
            ancillaryCollapsedSeries = true
          }
        }
      }

      let elMarker = this.createLegendMarker({ i, fillcolor })

      Graphics.setAttrs(elMarker, {
        rel: i + 1,
        'data:collapsed': collapsedSeries || ancillaryCollapsedSeries,
      })

      if (collapsedSeries || ancillaryCollapsedSeries) {
        elMarker.classList.add('apexcharts-inactive-legend')
      }

      let elLegend = document.createElement('div')

      let elLegendText = document.createElement('span')
      elLegendText.classList.add('apexcharts-legend-text')
      elLegendText.innerHTML = Array.isArray(text) ? text.join(' ') : text

      let textColor = w.config.legend.labels.useSeriesColors
        ? w.globals.colors[i]
        : Array.isArray(w.config.legend.labels.colors)
        ? w.config.legend.labels.colors?.[i]
        : w.config.legend.labels.colors

      if (!textColor) {
        textColor = w.config.chart.foreColor
      }

      elLegendText.style.color = textColor

      elLegendText.style.fontSize = parseFloat(w.config.legend.fontSize) + 'px'
      elLegendText.style.fontWeight = w.config.legend.fontWeight
      elLegendText.style.fontFamily = fontFamily || w.config.chart.fontFamily

      Graphics.setAttrs(elLegendText, {
        rel: i + 1,
        i,
        'data:default-text': encodeURIComponent(text),
        'data:collapsed': collapsedSeries || ancillaryCollapsedSeries,
      })

      elLegend.appendChild(elMarker)
      elLegend.appendChild(elLegendText)

      const coreUtils = new CoreUtils(this.ctx)
      if (!w.config.legend.showForZeroSeries) {
        const total = coreUtils.getSeriesTotalByIndex(i)

        if (
          total === 0 &&
          coreUtils.seriesHaveSameValues(i) &&
          !coreUtils.isSeriesNull(i) &&
          w.globals.collapsedSeriesIndices.indexOf(i) === -1 &&
          w.globals.ancillaryCollapsedSeriesIndices.indexOf(i) === -1
        ) {
          elLegend.classList.add('apexcharts-hidden-zero-series')
        }
      }

      if (!w.config.legend.showForNullSeries) {
        if (
          coreUtils.isSeriesNull(i) &&
          w.globals.collapsedSeriesIndices.indexOf(i) === -1 &&
          w.globals.ancillaryCollapsedSeriesIndices.indexOf(i) === -1
        ) {
          elLegend.classList.add('apexcharts-hidden-null-series')
        }
      }

      w.globals.dom.elLegendWrap.appendChild(elLegend)
      w.globals.dom.elLegendWrap.classList.add(
        `apexcharts-align-${w.config.legend.horizontalAlign}`
      )
      w.globals.dom.elLegendWrap.classList.add(
        'apx-legend-position-' + w.config.legend.position
      )

      elLegend.classList.add('apexcharts-legend-series')
      elLegend.style.margin = `${w.config.legend.itemMargin.vertical}px ${w.config.legend.itemMargin.horizontal}px`
      w.globals.dom.elLegendWrap.style.width = w.config.legend.width
        ? w.config.legend.width + 'px'
        : ''
      w.globals.dom.elLegendWrap.style.height = w.config.legend.height
        ? w.config.legend.height + 'px'
        : ''

      Graphics.setAttrs(elLegend, {
        rel: i + 1,
        seriesName: Utils.escapeString(legendNames[i]),
        'data:collapsed': collapsedSeries || ancillaryCollapsedSeries,
      })

      if (collapsedSeries || ancillaryCollapsedSeries) {
        elLegend.classList.add('apexcharts-inactive-legend')
      }

      if (!w.config.legend.onItemClick.toggleDataSeries) {
        elLegend.classList.add('apexcharts-no-click')
      }
    }

    w.globals.dom.elWrap.addEventListener('click', me.onLegendClick, true)

    if (
      w.config.legend.onItemHover.highlightDataSeries &&
      w.config.legend.customLegendItems.length === 0
    ) {
      w.globals.dom.elWrap.addEventListener(
        'mousemove',
        me.onLegendHovered,
        true
      )
      w.globals.dom.elWrap.addEventListener(
        'mouseout',
        me.onLegendHovered,
        true
      )
    }
  }

  setLegendWrapXY(offsetX, offsetY) {
    let w = this.w

    let elLegendWrap = w.globals.dom.elLegendWrap

    const legendHeight = elLegendWrap.clientHeight

    let x = 0
    let y = 0

    if (w.config.legend.position === 'bottom') {
      y =
        w.globals.svgHeight -
        Math.min(legendHeight, w.globals.svgHeight / 2) -
        5
    } else if (w.config.legend.position === 'top') {
      const dim = new Dimensions(this.ctx)
      const titleH = dim.dimHelpers.getTitleSubtitleCoords('title').height
      const subtitleH = dim.dimHelpers.getTitleSubtitleCoords('subtitle').height

      y = (titleH > 0 ? titleH - 10 : 0) + (subtitleH > 0 ? subtitleH - 10 : 0)
    }

    elLegendWrap.style.position = 'absolute'

    x = x + offsetX + w.config.legend.offsetX
    y = y + offsetY + w.config.legend.offsetY

    elLegendWrap.style.left = x + 'px'
    elLegendWrap.style.top = y + 'px'

    if (w.config.legend.position === 'right') {
      elLegendWrap.style.left = 'auto'
      elLegendWrap.style.right = 25 + w.config.legend.offsetX + 'px'
    }

    const fixedHeigthWidth = ['width', 'height']
    fixedHeigthWidth.forEach((hw) => {
      if (elLegendWrap.style[hw]) {
        elLegendWrap.style[hw] = parseInt(w.config.legend[hw], 10) + 'px'
      }
    })
  }

  legendAlignHorizontal() {
    let w = this.w

    let elLegendWrap = w.globals.dom.elLegendWrap

    elLegendWrap.style.right = 0

    let dimensions = new Dimensions(this.ctx)
    let titleRect = dimensions.dimHelpers.getTitleSubtitleCoords('title')
    let subtitleRect = dimensions.dimHelpers.getTitleSubtitleCoords('subtitle')

    let offsetX = 20
    let offsetY = 0

    if (w.config.legend.position === 'top') {
      offsetY =
        titleRect.height +
        subtitleRect.height +
        w.config.title.margin +
        w.config.subtitle.margin -
        10
    }

    this.setLegendWrapXY(offsetX, offsetY)
  }

  legendAlignVertical() {
    let w = this.w

    let lRect = this.legendHelpers.getLegendDimensions()

    let offsetY = 20
    let offsetX = 0

    if (w.config.legend.position === 'left') {
      offsetX = 20
    }

    if (w.config.legend.position === 'right') {
      offsetX = w.globals.svgWidth - lRect.clww - 10
    }

    this.setLegendWrapXY(offsetX, offsetY)
  }

  onLegendHovered(e) {
    const w = this.w

    const hoverOverLegend =
      e.target.classList.contains('apexcharts-legend-series') ||
      e.target.classList.contains('apexcharts-legend-text') ||
      e.target.classList.contains('apexcharts-legend-marker')

    if (w.config.chart.type !== 'heatmap' && !this.isBarsDistributed) {
      if (
        !e.target.classList.contains('apexcharts-inactive-legend') &&
        hoverOverLegend
      ) {
        let series = new Series(this.ctx)
        series.toggleSeriesOnHover(e, e.target)
      }
    } else {
      // for heatmap handling
      if (hoverOverLegend) {
        let seriesCnt = parseInt(e.target.getAttribute('rel'), 10) - 1
        this.ctx.events.fireEvent('legendHover', [this.ctx, seriesCnt, this.w])

        let series = new Series(this.ctx)
        series.highlightRangeInSeries(e, e.target)
      }
    }
  }

  onLegendClick(e) {
    const w = this.w

    if (w.config.legend.customLegendItems.length) return

    if (
      e.target.classList.contains('apexcharts-legend-series') ||
      e.target.classList.contains('apexcharts-legend-text') ||
      e.target.classList.contains('apexcharts-legend-marker')
    ) {
      let seriesCnt = parseInt(e.target.getAttribute('rel'), 10) - 1
      let isHidden = e.target.getAttribute('data:collapsed') === 'true'

      const legendClick = this.w.config.chart.events.legendClick
      if (typeof legendClick === 'function') {
        legendClick(this.ctx, seriesCnt, this.w)
      }

      this.ctx.events.fireEvent('legendClick', [this.ctx, seriesCnt, this.w])

      const markerClick = this.w.config.legend.markers.onClick
      if (
        typeof markerClick === 'function' &&
        e.target.classList.contains('apexcharts-legend-marker')
      ) {
        markerClick(this.ctx, seriesCnt, this.w)
        this.ctx.events.fireEvent('legendMarkerClick', [
          this.ctx,
          seriesCnt,
          this.w,
        ])
      }

      // for now - just prevent click on heatmap legend - and allow hover only
      const clickAllowed =
        w.config.chart.type !== 'treemap' &&
        w.config.chart.type !== 'heatmap' &&
        !this.isBarsDistributed

      if (clickAllowed && w.config.legend.onItemClick.toggleDataSeries) {
        this.legendHelpers.toggleDataSeries(seriesCnt, isHidden)
      }
    }
  }
}

export default Legend
