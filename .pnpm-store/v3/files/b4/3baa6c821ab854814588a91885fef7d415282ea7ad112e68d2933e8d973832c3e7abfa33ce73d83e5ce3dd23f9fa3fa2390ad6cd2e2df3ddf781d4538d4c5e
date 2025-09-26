import Graphics from '../Graphics'
import Utils from '../../utils/Utils'

export default class Helpers {
  constructor(lgCtx) {
    this.w = lgCtx.w
    this.lgCtx = lgCtx
  }

  getLegendStyles() {
    let stylesheet = document.createElement('style')
    stylesheet.setAttribute('type', 'text/css')
    const nonce =
      this.lgCtx.ctx?.opts?.chart?.nonce || this.w.config.chart.nonce
    if (nonce) {
      stylesheet.setAttribute('nonce', nonce)
    }

    const text = `
      .apexcharts-flip-y {
        transform: scaleY(-1) translateY(-100%);
        transform-origin: top;
        transform-box: fill-box;
      }
      .apexcharts-flip-x {
        transform: scaleX(-1);
        transform-origin: center;
        transform-box: fill-box;
      }
      .apexcharts-legend {
        display: flex;
        overflow: auto;
        padding: 0 10px;
      }
      .apexcharts-legend.apx-legend-position-bottom, .apexcharts-legend.apx-legend-position-top {
        flex-wrap: wrap
      }
      .apexcharts-legend.apx-legend-position-right, .apexcharts-legend.apx-legend-position-left {
        flex-direction: column;
        bottom: 0;
      }
      .apexcharts-legend.apx-legend-position-bottom.apexcharts-align-left, .apexcharts-legend.apx-legend-position-top.apexcharts-align-left, .apexcharts-legend.apx-legend-position-right, .apexcharts-legend.apx-legend-position-left {
        justify-content: flex-start;
      }
      .apexcharts-legend.apx-legend-position-bottom.apexcharts-align-center, .apexcharts-legend.apx-legend-position-top.apexcharts-align-center {
        justify-content: center;
      }
      .apexcharts-legend.apx-legend-position-bottom.apexcharts-align-right, .apexcharts-legend.apx-legend-position-top.apexcharts-align-right {
        justify-content: flex-end;
      }
      .apexcharts-legend-series {
        cursor: pointer;
        line-height: normal;
        display: flex;
        align-items: center;
      }
      .apexcharts-legend-text {
        position: relative;
        font-size: 14px;
      }
      .apexcharts-legend-text *, .apexcharts-legend-marker * {
        pointer-events: none;
      }
      .apexcharts-legend-marker {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-right: 1px;
      }

      .apexcharts-legend-series.apexcharts-no-click {
        cursor: auto;
      }
      .apexcharts-legend .apexcharts-hidden-zero-series, .apexcharts-legend .apexcharts-hidden-null-series {
        display: none !important;
      }
      .apexcharts-inactive-legend {
        opacity: 0.45;
      }`

    let rules = document.createTextNode(text)

    stylesheet.appendChild(rules)

    return stylesheet
  }

  getLegendDimensions() {
    const w = this.w
    let currLegendsWrap =
      w.globals.dom.baseEl.querySelector('.apexcharts-legend')
    let { width: currLegendsWrapWidth, height: currLegendsWrapHeight } =
      currLegendsWrap.getBoundingClientRect()

    return {
      clwh: currLegendsWrapHeight,
      clww: currLegendsWrapWidth,
    }
  }

  appendToForeignObject() {
    const gl = this.w.globals

    gl.dom.elLegendForeign.appendChild(this.getLegendStyles())
  }

  toggleDataSeries(seriesCnt, isHidden) {
    const w = this.w
    if (w.globals.axisCharts || w.config.chart.type === 'radialBar') {
      w.globals.resized = true // we don't want initial animations again

      let seriesEl = null

      let realIndex = null

      // yes, make it null. 1 series will rise at a time
      w.globals.risingSeries = []

      if (w.globals.axisCharts) {
        seriesEl = w.globals.dom.baseEl.querySelector(
          `.apexcharts-series[data\\:realIndex='${seriesCnt}']`
        )
        realIndex = parseInt(seriesEl.getAttribute('data:realIndex'), 10)
      } else {
        seriesEl = w.globals.dom.baseEl.querySelector(
          `.apexcharts-series[rel='${seriesCnt + 1}']`
        )
        realIndex = parseInt(seriesEl.getAttribute('rel'), 10) - 1
      }

      if (isHidden) {
        const seriesToMakeVisible = [
          {
            cs: w.globals.collapsedSeries,
            csi: w.globals.collapsedSeriesIndices,
          },
          {
            cs: w.globals.ancillaryCollapsedSeries,
            csi: w.globals.ancillaryCollapsedSeriesIndices,
          },
        ]
        seriesToMakeVisible.forEach((r) => {
          this.riseCollapsedSeries(r.cs, r.csi, realIndex)
        })
      } else {
        this.hideSeries({ seriesEl, realIndex })
      }
    } else {
      // for non-axis charts i.e pie / donuts
      let seriesEl = w.globals.dom.Paper.select(
        ` .apexcharts-series[rel='${seriesCnt + 1}'] path`
      )

      const type = w.config.chart.type
      if (type === 'pie' || type === 'polarArea' || type === 'donut') {
        let dataLabels = w.config.plotOptions.pie.donut.labels

        const graphics = new Graphics(this.lgCtx.ctx)
        graphics.pathMouseDown(seriesEl.members[0], null)
        this.lgCtx.ctx.pie.printDataLabelsInner(
          seriesEl.members[0].node,
          dataLabels
        )
      }

      seriesEl.fire('click')
    }
  }

  getSeriesAfterCollapsing({ realIndex }) {
    const w = this.w
    const gl = w.globals

    let series = Utils.clone(w.config.series)

    if (gl.axisCharts) {
      let yaxis = w.config.yaxis[gl.seriesYAxisReverseMap[realIndex]]

      const collapseData = {
        index: realIndex,
        data: series[realIndex].data.slice(),
        type: series[realIndex].type || w.config.chart.type,
      }
      if (yaxis && yaxis.show && yaxis.showAlways) {
        if (gl.ancillaryCollapsedSeriesIndices.indexOf(realIndex) < 0) {
          gl.ancillaryCollapsedSeries.push(collapseData)
          gl.ancillaryCollapsedSeriesIndices.push(realIndex)
        }
      } else {
        if (gl.collapsedSeriesIndices.indexOf(realIndex) < 0) {
          gl.collapsedSeries.push(collapseData)
          gl.collapsedSeriesIndices.push(realIndex)

          let removeIndexOfRising = gl.risingSeries.indexOf(realIndex)
          gl.risingSeries.splice(removeIndexOfRising, 1)
        }
      }
    } else {
      gl.collapsedSeries.push({
        index: realIndex,
        data: series[realIndex],
      })
      gl.collapsedSeriesIndices.push(realIndex)
    }

    gl.allSeriesCollapsed =
      gl.collapsedSeries.length + gl.ancillaryCollapsedSeries.length ===
      w.config.series.length

    return this._getSeriesBasedOnCollapsedState(series)
  }

  hideSeries({ seriesEl, realIndex }) {
    const w = this.w

    let series = this.getSeriesAfterCollapsing({
      realIndex,
    })

    let seriesChildren = seriesEl.childNodes
    for (let sc = 0; sc < seriesChildren.length; sc++) {
      if (
        seriesChildren[sc].classList.contains('apexcharts-series-markers-wrap')
      ) {
        if (seriesChildren[sc].classList.contains('apexcharts-hide')) {
          seriesChildren[sc].classList.remove('apexcharts-hide')
        } else {
          seriesChildren[sc].classList.add('apexcharts-hide')
        }
      }
    }

    this.lgCtx.ctx.updateHelpers._updateSeries(
      series,
      w.config.chart.animations.dynamicAnimation.enabled
    )
  }

  riseCollapsedSeries(collapsedSeries, seriesIndices, realIndex) {
    const w = this.w
    let series = Utils.clone(w.config.series)

    if (collapsedSeries.length > 0) {
      for (let c = 0; c < collapsedSeries.length; c++) {
        if (collapsedSeries[c].index === realIndex) {
          if (w.globals.axisCharts) {
            series[realIndex].data = collapsedSeries[c].data.slice()
          } else {
            series[realIndex] = collapsedSeries[c].data
          }
          series[realIndex].hidden = false
          collapsedSeries.splice(c, 1)
          seriesIndices.splice(c, 1)
          w.globals.risingSeries.push(realIndex)
        }
      }

      series = this._getSeriesBasedOnCollapsedState(series)

      this.lgCtx.ctx.updateHelpers._updateSeries(
        series,
        w.config.chart.animations.dynamicAnimation.enabled
      )
    }
  }

  _getSeriesBasedOnCollapsedState(series) {
    const w = this.w
    let collapsed = 0

    if (w.globals.axisCharts) {
      series.forEach((s, sI) => {
        if (
          !(
            w.globals.collapsedSeriesIndices.indexOf(sI) < 0 &&
            w.globals.ancillaryCollapsedSeriesIndices.indexOf(sI) < 0
          )
        ) {
          series[sI].data = []
          collapsed++
        }
      })
    } else {
      series.forEach((s, sI) => {
        if (!w.globals.collapsedSeriesIndices.indexOf(sI) < 0) {
          series[sI] = 0
          collapsed++
        }
      })
    }

    w.globals.allSeriesCollapsed = collapsed === series.length

    return series
  }
}
