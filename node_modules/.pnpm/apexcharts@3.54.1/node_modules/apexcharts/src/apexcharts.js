import Annotations from './modules/annotations/Annotations'
import Base from './modules/Base'
import CoreUtils from './modules/CoreUtils'
import DataLabels from './modules/DataLabels'
import Defaults from './modules/settings/Defaults'
import Exports from './modules/Exports'
import Grid from './modules/axes/Grid'
import Markers from './modules/Markers'
import Range from './modules/Range'
import Utils from './utils/Utils'
import XAxis from './modules/axes/XAxis'
import YAxis from './modules/axes/YAxis'
import InitCtxVariables from './modules/helpers/InitCtxVariables'
import Destroy from './modules/helpers/Destroy'
import { addResizeListener, removeResizeListener } from './utils/Resize'
import apexCSS from './assets/apexcharts.css'

/**
 *
 * @module ApexCharts
 **/

export default class ApexCharts {
  constructor(el, opts) {
    this.opts = opts
    this.ctx = this

    // Pass the user supplied options to the Base Class where these options will be extended with defaults. The returned object from Base Class will become the config object in the entire codebase.
    this.w = new Base(opts).init()

    this.el = el

    this.w.globals.cuid = Utils.randomId()
    this.w.globals.chartID = this.w.config.chart.id
      ? Utils.escapeString(this.w.config.chart.id)
      : this.w.globals.cuid

    const initCtx = new InitCtxVariables(this)
    initCtx.initModules()

    this.create = Utils.bind(this.create, this)
    this.windowResizeHandler = this._windowResizeHandler.bind(this)
    this.parentResizeHandler = this._parentResizeCallback.bind(this)
  }

  /**
   * The primary method user will call to render the chart.
   */
  render() {
    // main method
    return new Promise((resolve, reject) => {
      // only draw chart, if element found
      if (this.el !== null) {
        if (typeof Apex._chartInstances === 'undefined') {
          Apex._chartInstances = []
        }
        if (this.w.config.chart.id) {
          Apex._chartInstances.push({
            id: this.w.globals.chartID,
            group: this.w.config.chart.group,
            chart: this,
          })
        }

        // set the locale here
        this.setLocale(this.w.config.chart.defaultLocale)
        const beforeMount = this.w.config.chart.events.beforeMount
        if (typeof beforeMount === 'function') {
          beforeMount(this, this.w)
        }

        this.events.fireEvent('beforeMount', [this, this.w])
        window.addEventListener('resize', this.windowResizeHandler)
        addResizeListener(this.el.parentNode, this.parentResizeHandler)

        let rootNode = this.el.getRootNode && this.el.getRootNode()
        let inShadowRoot = Utils.is('ShadowRoot', rootNode)
        let doc = this.el.ownerDocument
        let css = inShadowRoot
          ? rootNode.getElementById('apexcharts-css')
          : doc.getElementById('apexcharts-css')

        if (!css) {
          css = document.createElement('style')
          css.id = 'apexcharts-css'
          css.textContent = apexCSS
          const nonce = this.opts.chart?.nonce || this.w.config.chart.nonce
          if (nonce) {
            css.setAttribute('nonce', nonce)
          }

          if (inShadowRoot) {
            // We are in Shadow DOM, add to shadow root
            rootNode.prepend(css)
          } else {
            // Add to <head> of element's document
            doc.head.appendChild(css)
          }
        }

        let graphData = this.create(this.w.config.series, {})
        if (!graphData) return resolve(this)
        this.mount(graphData)
          .then(() => {
            if (typeof this.w.config.chart.events.mounted === 'function') {
              this.w.config.chart.events.mounted(this, this.w)
            }

            this.events.fireEvent('mounted', [this, this.w])
            resolve(graphData)
          })
          .catch((e) => {
            reject(e)
            // handle error in case no data or element not found
          })
      } else {
        reject(new Error('Element not found'))
      }
    })
  }

  create(ser, opts) {
    let w = this.w

    const initCtx = new InitCtxVariables(this)
    initCtx.initModules()
    let gl = this.w.globals

    gl.noData = false
    gl.animationEnded = false

    this.responsive.checkResponsiveConfig(opts)

    if (w.config.xaxis.convertedCatToNumeric) {
      const defaults = new Defaults(w.config)
      defaults.convertCatToNumericXaxis(w.config, this.ctx)
    }

    if (this.el === null) {
      gl.animationEnded = true
      return null
    }

    this.core.setupElements()

    if (w.config.chart.type === 'treemap') {
      w.config.grid.show = false
      w.config.yaxis[0].show = false
    }

    if (gl.svgWidth === 0) {
      // if the element is hidden, skip drawing
      gl.animationEnded = true
      return null
    }

    let series = ser
    ser.forEach((s, realIndex) => {
      if (s.hidden) {
        series = this.legend.legendHelpers.getSeriesAfterCollapsing({
          realIndex,
        })
      }
    })

    const combo = CoreUtils.checkComboSeries(series, w.config.chart.type)
    gl.comboCharts = combo.comboCharts
    gl.comboBarCount = combo.comboBarCount

    const allSeriesAreEmpty = series.every((s) => s.data && s.data.length === 0)

    if (
      series.length === 0 ||
      (allSeriesAreEmpty && gl.collapsedSeries.length < 1)
    ) {
      this.series.handleNoData()
    }

    this.events.setupEventHandlers()

    // Handle the data inputted by user and set some of the global variables (for eg, if data is datetime / numeric / category). Don't calculate the range / min / max at this time
    this.data.parseData(series)

    // this is a good time to set theme colors first
    this.theme.init()

    // as markers accepts array, we need to setup global markers for easier access
    const markers = new Markers(this)
    markers.setGlobalMarkerSize()

    // labelFormatters should be called before dimensions as in dimensions we need text labels width
    this.formatters.setLabelFormatters()
    this.titleSubtitle.draw()

    // legend is calculated here before coreCalculations because it affects the plottable area
    // if there is some data to show or user collapsed all series, then proceed drawing legend
    if (
      !gl.noData ||
      gl.collapsedSeries.length === gl.series.length ||
      w.config.legend.showForSingleSeries
    ) {
      this.legend.init()
    }

    // check whether in multiple series, all series share the same X
    this.series.hasAllSeriesEqualX()

    // coreCalculations will give the min/max range and yaxis/axis values. It should be called here to set series variable from config to globals
    if (gl.axisCharts) {
      this.core.coreCalculations()
      if (w.config.xaxis.type !== 'category') {
        // as we have minX and maxX values, determine the default DateTimeFormat for time series
        this.formatters.setLabelFormatters()
      }
      this.ctx.toolbar.minX = w.globals.minX
      this.ctx.toolbar.maxX = w.globals.maxX
    }

    // we need to generate yaxis for heatmap separately as we are not showing numerics there, but seriesNames. There are some tweaks which are required for heatmap to align labels correctly which are done in below function
    // Also we need to do this before calculating Dimensions plotCoords() method of Dimensions
    this.formatters.heatmapLabelFormatters()

    // get the largest marker size which will be needed in dimensions calc
    const coreUtils = new CoreUtils(this)
    coreUtils.getLargestMarkerSize()

    // We got plottable area here, next task would be to calculate axis areas
    this.dimensions.plotCoords()

    const xyRatios = this.core.xySettings()

    this.grid.createGridMask()

    const elGraph = this.core.plotChartType(series, xyRatios)

    const dataLabels = new DataLabels(this)
    dataLabels.bringForward()
    if (w.config.dataLabels.background.enabled) {
      dataLabels.dataLabelsBackground()
    }

    // after all the drawing calculations, shift the graphical area (actual charts/bars) excluding legends
    this.core.shiftGraphPosition()

    const dim = {
      plot: {
        left: w.globals.translateX,
        top: w.globals.translateY,
        width: w.globals.gridWidth,
        height: w.globals.gridHeight,
      },
    }

    return {
      elGraph,
      xyRatios,
      dimensions: dim,
    }
  }

  mount(graphData = null) {
    let me = this
    let w = me.w

    return new Promise((resolve, reject) => {
      // no data to display
      if (me.el === null) {
        return reject(
          new Error('Not enough data to display or target element not found')
        )
      } else if (graphData === null || w.globals.allSeriesCollapsed) {
        me.series.handleNoData()
      }

      me.grid = new Grid(me)
      let elgrid = me.grid.drawGrid()

      me.annotations = new Annotations(me)
      me.annotations.drawImageAnnos()
      me.annotations.drawTextAnnos()

      if (w.config.grid.position === 'back') {
        if (elgrid) {
          w.globals.dom.elGraphical.add(elgrid.el)
        }
        if (elgrid?.elGridBorders?.node) {
          w.globals.dom.elGraphical.add(elgrid.elGridBorders)
        }
      }

      if (Array.isArray(graphData.elGraph)) {
        for (let g = 0; g < graphData.elGraph.length; g++) {
          w.globals.dom.elGraphical.add(graphData.elGraph[g])
        }
      } else {
        w.globals.dom.elGraphical.add(graphData.elGraph)
      }

      if (w.config.grid.position === 'front') {
        if (elgrid) {
          w.globals.dom.elGraphical.add(elgrid.el)
        }
        if (elgrid?.elGridBorders?.node) {
          w.globals.dom.elGraphical.add(elgrid.elGridBorders)
        }
      }

      if (w.config.xaxis.crosshairs.position === 'front') {
        me.crosshairs.drawXCrosshairs()
      }

      if (w.config.yaxis[0].crosshairs.position === 'front') {
        me.crosshairs.drawYCrosshairs()
      }

      if (w.config.chart.type !== 'treemap') {
        me.axes.drawAxis(w.config.chart.type, elgrid)
      }

      let xAxis = new XAxis(this.ctx, elgrid)
      let yaxis = new YAxis(this.ctx, elgrid)
      if (elgrid !== null) {
        xAxis.xAxisLabelCorrections(elgrid.xAxisTickWidth)
        yaxis.setYAxisTextAlignments()

        w.config.yaxis.map((yaxe, index) => {
          if (w.globals.ignoreYAxisIndexes.indexOf(index) === -1) {
            yaxis.yAxisTitleRotate(index, yaxe.opposite)
          }
        })
      }

      me.annotations.drawAxesAnnotations()

      if (!w.globals.noData) {
        // draw tooltips at the end
        if (w.config.tooltip.enabled && !w.globals.noData) {
          me.w.globals.tooltip.drawTooltip(graphData.xyRatios)
        }

        if (
          w.globals.axisCharts &&
          (w.globals.isXNumeric ||
            w.config.xaxis.convertedCatToNumeric ||
            w.globals.isRangeBar)
        ) {
          if (
            w.config.chart.zoom.enabled ||
            (w.config.chart.selection && w.config.chart.selection.enabled) ||
            (w.config.chart.pan && w.config.chart.pan.enabled)
          ) {
            me.zoomPanSelection.init({
              xyRatios: graphData.xyRatios,
            })
          }
        } else {
          const tools = w.config.chart.toolbar.tools
          let toolsArr = [
            'zoom',
            'zoomin',
            'zoomout',
            'selection',
            'pan',
            'reset',
          ]
          toolsArr.forEach((t) => {
            tools[t] = false
          })
        }

        if (w.config.chart.toolbar.show && !w.globals.allSeriesCollapsed) {
          me.toolbar.createToolbar()
        }
      }

      if (w.globals.memory.methodsToExec.length > 0) {
        w.globals.memory.methodsToExec.forEach((fn) => {
          fn.method(fn.params, false, fn.context)
        })
      }

      if (!w.globals.axisCharts && !w.globals.noData) {
        me.core.resizeNonAxisCharts()
      }
      resolve(me)
    })
  }

  /**
   * Destroy the chart instance by removing all elements which also clean up event listeners on those elements.
   */
  destroy() {
    window.removeEventListener('resize', this.windowResizeHandler)

    removeResizeListener(this.el.parentNode, this.parentResizeHandler)
    // remove the chart's instance from the global Apex._chartInstances
    const chartID = this.w.config.chart.id
    if (chartID) {
      Apex._chartInstances.forEach((c, i) => {
        if (c.id === Utils.escapeString(chartID)) {
          Apex._chartInstances.splice(i, 1)
        }
      })
    }
    new Destroy(this.ctx).clear({ isUpdating: false })
  }

  /**
   * Allows users to update Options after the chart has rendered.
   *
   * @param {object} options - A new config object can be passed which will be merged with the existing config object
   * @param {boolean} redraw - should redraw from beginning or should use existing paths and redraw from there
   * @param {boolean} animate - should animate or not on updating Options
   */
  updateOptions(
    options,
    redraw = false,
    animate = true,
    updateSyncedCharts = true,
    overwriteInitialConfig = true
  ) {
    const w = this.w

    // when called externally, clear some global variables
    // fixes apexcharts.js#1488
    w.globals.selection = undefined

    if (options.series) {
      this.series.resetSeries(false, true, false)
      if (options.series.length && options.series[0].data) {
        options.series = options.series.map((s, i) => {
          return this.updateHelpers._extendSeries(s, i)
        })
      }

      // user updated the series via updateOptions() function.
      // Hence, we need to reset axis min/max to avoid zooming issues
      this.updateHelpers.revertDefaultAxisMinMax()
    }
    // user has set x-axis min/max externally - hence we need to forcefully set the xaxis min/max
    if (options.xaxis) {
      options = this.updateHelpers.forceXAxisUpdate(options)
    }
    if (options.yaxis) {
      options = this.updateHelpers.forceYAxisUpdate(options)
    }
    if (w.globals.collapsedSeriesIndices.length > 0) {
      this.series.clearPreviousPaths()
    }
    /* update theme mode#459 */
    if (options.theme) {
      options = this.theme.updateThemeOptions(options)
    }
    return this.updateHelpers._updateOptions(
      options,
      redraw,
      animate,
      updateSyncedCharts,
      overwriteInitialConfig
    )
  }

  /**
   * Allows users to update Series after the chart has rendered.
   *
   * @param {array} series - New series which will override the existing
   */
  updateSeries(newSeries = [], animate = true, overwriteInitialSeries = true) {
    this.series.resetSeries(false)
    this.updateHelpers.revertDefaultAxisMinMax()
    return this.updateHelpers._updateSeries(
      newSeries,
      animate,
      overwriteInitialSeries
    )
  }

  /**
   * Allows users to append a new series after the chart has rendered.
   *
   * @param {array} newSerie - New serie which will be appended to the existing series
   */
  appendSeries(newSerie, animate = true, overwriteInitialSeries = true) {
    const newSeries = this.w.config.series.slice()
    newSeries.push(newSerie)
    this.series.resetSeries(false)
    this.updateHelpers.revertDefaultAxisMinMax()
    return this.updateHelpers._updateSeries(
      newSeries,
      animate,
      overwriteInitialSeries
    )
  }

  /**
   * Allows users to append Data to series.
   *
   * @param {array} newData - New data in the same format as series
   */
  appendData(newData, overwriteInitialSeries = true) {
    let me = this

    me.w.globals.dataChanged = true

    me.series.getPreviousPaths()

    let newSeries = me.w.config.series.slice()

    for (let i = 0; i < newSeries.length; i++) {
      if (newData[i] !== null && typeof newData[i] !== 'undefined') {
        for (let j = 0; j < newData[i].data.length; j++) {
          newSeries[i].data.push(newData[i].data[j])
        }
      }
    }
    me.w.config.series = newSeries
    if (overwriteInitialSeries) {
      me.w.globals.initialSeries = Utils.clone(me.w.config.series)
    }

    return this.update()
  }

  update(options) {
    return new Promise((resolve, reject) => {
      new Destroy(this.ctx).clear({ isUpdating: true })

      const graphData = this.create(this.w.config.series, options)
      if (!graphData) return resolve(this)
      this.mount(graphData)
        .then(() => {
          if (typeof this.w.config.chart.events.updated === 'function') {
            this.w.config.chart.events.updated(this, this.w)
          }
          this.events.fireEvent('updated', [this, this.w])

          this.w.globals.isDirty = true

          resolve(this)
        })
        .catch((e) => {
          reject(e)
        })
    })
  }

  /**
   * Get all charts in the same "group" (including the instance which is called upon) to sync them when user zooms in/out or pan.
   */
  getSyncedCharts() {
    const chartGroups = this.getGroupedCharts()
    let allCharts = [this]
    if (chartGroups.length) {
      allCharts = []
      chartGroups.forEach((ch) => {
        allCharts.push(ch)
      })
    }

    return allCharts
  }

  /**
   * Get charts in the same "group" (excluding the instance which is called upon) to perform operations on the other charts of the same group (eg., tooltip hovering)
   */
  getGroupedCharts() {
    return Apex._chartInstances
      .filter((ch) => {
        if (ch.group) {
          return true
        }
      })
      .map((ch) => (this.w.config.chart.group === ch.group ? ch.chart : this))
  }

  static getChartByID(id) {
    const chartId = Utils.escapeString(id)
    if (!Apex._chartInstances) return undefined

    const c = Apex._chartInstances.filter((ch) => ch.id === chartId)[0]
    return c && c.chart
  }

  /**
   * Allows the user to provide data attrs in the element and the chart will render automatically when this method is called by searching for the elements containing 'data-apexcharts' attribute
   */
  static initOnLoad() {
    const els = document.querySelectorAll('[data-apexcharts]')

    for (let i = 0; i < els.length; i++) {
      const el = els[i]
      const options = JSON.parse(els[i].getAttribute('data-options'))
      const apexChart = new ApexCharts(el, options)
      apexChart.render()
    }
  }

  /**
   * This static method allows users to call chart methods without necessarily from the
   * instance of the chart in case user has assigned chartID to the targeted chart.
   * The chartID is used for mapping the instance stored in Apex._chartInstances global variable
   *
   * This is helpful in cases when you don't have reference of the chart instance
   * easily and need to call the method from anywhere.
   * For eg, in React/Vue applications when you have many parent/child components,
   * and need easy reference to other charts for performing dynamic operations
   *
   * @param {string} chartID - The unique identifier which will be used to call methods
   * on that chart instance
   * @param {function} fn - The method name to call
   * @param {object} opts - The parameters which are accepted in the original method will be passed here in the same order.
   */
  static exec(chartID, fn, ...opts) {
    const chart = this.getChartByID(chartID)
    if (!chart) return

    // turn on the global exec flag to indicate this method was called
    chart.w.globals.isExecCalled = true

    let ret = null
    if (chart.publicMethods.indexOf(fn) !== -1) {
      ret = chart[fn](...opts)
    }
    return ret
  }

  static merge(target, source) {
    return Utils.extend(target, source)
  }

  toggleSeries(seriesName) {
    return this.series.toggleSeries(seriesName)
  }

  highlightSeriesOnLegendHover(e, targetElement) {
    return this.series.toggleSeriesOnHover(e, targetElement)
  }

  showSeries(seriesName) {
    this.series.showSeries(seriesName)
  }

  hideSeries(seriesName) {
    this.series.hideSeries(seriesName)
  }

  highlightSeries(seriesName) {
    this.series.highlightSeries(seriesName)
  }

  isSeriesHidden(seriesName) {
    this.series.isSeriesHidden(seriesName)
  }

  resetSeries(shouldUpdateChart = true, shouldResetZoom = true) {
    this.series.resetSeries(shouldUpdateChart, shouldResetZoom)
  }

  // Public method to add event listener on chart context
  addEventListener(name, handler) {
    this.events.addEventListener(name, handler)
  }

  // Public method to remove event listener on chart context
  removeEventListener(name, handler) {
    this.events.removeEventListener(name, handler)
  }

  addXaxisAnnotation(opts, pushToMemory = true, context = undefined) {
    let me = this
    if (context) {
      me = context
    }
    me.annotations.addXaxisAnnotationExternal(opts, pushToMemory, me)
  }

  addYaxisAnnotation(opts, pushToMemory = true, context = undefined) {
    let me = this
    if (context) {
      me = context
    }
    me.annotations.addYaxisAnnotationExternal(opts, pushToMemory, me)
  }

  addPointAnnotation(opts, pushToMemory = true, context = undefined) {
    let me = this
    if (context) {
      me = context
    }
    me.annotations.addPointAnnotationExternal(opts, pushToMemory, me)
  }

  clearAnnotations(context = undefined) {
    let me = this
    if (context) {
      me = context
    }
    me.annotations.clearAnnotations(me)
  }

  removeAnnotation(id, context = undefined) {
    let me = this
    if (context) {
      me = context
    }
    me.annotations.removeAnnotation(me, id)
  }

  getChartArea() {
    const el = this.w.globals.dom.baseEl.querySelector('.apexcharts-inner')

    return el
  }

  getSeriesTotalXRange(minX, maxX) {
    return this.coreUtils.getSeriesTotalsXRange(minX, maxX)
  }

  getHighestValueInSeries(seriesIndex = 0) {
    const range = new Range(this.ctx)
    return range.getMinYMaxY(seriesIndex).highestY
  }

  getLowestValueInSeries(seriesIndex = 0) {
    const range = new Range(this.ctx)
    return range.getMinYMaxY(seriesIndex).lowestY
  }

  getSeriesTotal() {
    return this.w.globals.seriesTotals
  }

  toggleDataPointSelection(seriesIndex, dataPointIndex) {
    return this.updateHelpers.toggleDataPointSelection(
      seriesIndex,
      dataPointIndex
    )
  }

  zoomX(min, max) {
    this.ctx.toolbar.zoomUpdateOptions(min, max)
  }

  setLocale(localeName) {
    this.localization.setCurrentLocaleValues(localeName)
  }

  dataURI(options) {
    const exp = new Exports(this.ctx)
    return exp.dataURI(options)
  }

  exportToCSV(options = {}) {
    const exp = new Exports(this.ctx)
    return exp.exportToCSV(options)
  }

  paper() {
    return this.w.globals.dom.Paper
  }

  _parentResizeCallback() {
    if (
      this.w.globals.animationEnded &&
      this.w.config.chart.redrawOnParentResize
    ) {
      this._windowResize()
    }
  }

  /**
   * Handle window resize and re-draw the whole chart.
   */
  _windowResize() {
    clearTimeout(this.w.globals.resizeTimer)
    this.w.globals.resizeTimer = window.setTimeout(() => {
      this.w.globals.resized = true
      this.w.globals.dataChanged = false

      // we need to redraw the whole chart on window resize (with a small delay).
      this.ctx.update()
    }, 150)
  }

  _windowResizeHandler() {
    let { redrawOnWindowResize: redraw } = this.w.config.chart

    if (typeof redraw === 'function') {
      redraw = redraw()
    }

    redraw && this._windowResize()
  }
}
