import Utils from './../utils/Utils'

/**
 * ApexCharts Filters Class for setting hover/active states on the paths.
 *
 * @module Formatters
 **/
class Filters {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  // create a re-usable filter which can be appended other filter effects and applied to multiple elements
  getDefaultFilter(el, i) {
    const w = this.w
    el.unfilter(true)

    let filter = new window.SVG.Filter()
    filter.size('120%', '180%', '-5%', '-40%')

    if (w.config.states.normal.filter !== 'none') {
      this.applyFilter(
        el,
        i,
        w.config.states.normal.filter.type,
        w.config.states.normal.filter.value
      )
    } else {
      if (w.config.chart.dropShadow.enabled) {
        this.dropShadow(el, w.config.chart.dropShadow, i)
      }
    }
  }

  addNormalFilter(el, i) {
    const w = this.w

    // revert shadow if it was there
    // but, ignore marker as marker don't have dropshadow yet
    if (
      w.config.chart.dropShadow.enabled &&
      !el.node.classList.contains('apexcharts-marker')
    ) {
      this.dropShadow(el, w.config.chart.dropShadow, i)
    }
  }

  // appends dropShadow to the filter object which can be chained with other filter effects
  addLightenFilter(el, i, attrs) {
    const w = this.w
    const { intensity } = attrs

    el.unfilter(true)

    let filter = new window.SVG.Filter()

    el.filter((add) => {
      const shadowAttr = w.config.chart.dropShadow
      if (shadowAttr.enabled) {
        filter = this.addShadow(add, i, shadowAttr)
      } else {
        filter = add
      }
      filter.componentTransfer({
        rgb: { type: 'linear', slope: 1.5, intercept: intensity },
      })
    })
    el.filterer.node.setAttribute('filterUnits', 'userSpaceOnUse')

    this._scaleFilterSize(el.filterer.node)
  }

  // appends dropShadow to the filter object which can be chained with other filter effects
  addDarkenFilter(el, i, attrs) {
    const w = this.w
    const { intensity } = attrs

    el.unfilter(true)

    let filter = new window.SVG.Filter()

    el.filter((add) => {
      const shadowAttr = w.config.chart.dropShadow
      if (shadowAttr.enabled) {
        filter = this.addShadow(add, i, shadowAttr)
      } else {
        filter = add
      }
      filter.componentTransfer({
        rgb: { type: 'linear', slope: intensity },
      })
    })
    el.filterer.node.setAttribute('filterUnits', 'userSpaceOnUse')
    this._scaleFilterSize(el.filterer.node)
  }

  applyFilter(el, i, filter, intensity = 0.5) {
    switch (filter) {
      case 'none': {
        this.addNormalFilter(el, i)
        break
      }
      case 'lighten': {
        this.addLightenFilter(el, i, {
          intensity,
        })
        break
      }
      case 'darken': {
        this.addDarkenFilter(el, i, {
          intensity,
        })
        break
      }
      default:
        // do nothing
        break
    }
  }

  // appends dropShadow to the filter object which can be chained with other filter effects
  addShadow(add, i, attrs) {
    const w = this.w
    const { blur, top, left, color, opacity } = attrs

    if (w.config.chart.dropShadow.enabledOnSeries?.length > 0) {
      if (w.config.chart.dropShadow.enabledOnSeries.indexOf(i) === -1) {
        return add
      }
    }

    let shadowBlur = add
      .flood(Array.isArray(color) ? color[i] : color, opacity)
      .composite(add.sourceAlpha, 'in')
      .offset(left, top)
      .gaussianBlur(blur)
      .merge(add.source)
    return add.blend(add.source, shadowBlur)
  }

  // directly adds dropShadow to the element and returns the same element.
  // the only way it is different from the addShadow() function is that addShadow is chainable to other filters, while this function discards all filters and add dropShadow
  dropShadow(el, attrs, i = 0) {
    let { top, left, blur, color, opacity, noUserSpaceOnUse } = attrs
    const w = this.w

    el.unfilter(true)

    if (Utils.isMsEdge() && w.config.chart.type === 'radialBar') {
      // in radialbar charts, dropshadow is clipping actual drawing in IE
      return el
    }

    if (w.config.chart.dropShadow.enabledOnSeries?.length > 0) {
      if (w.config.chart.dropShadow.enabledOnSeries?.indexOf(i) === -1) {
        return el
      }
    }

    color = Array.isArray(color) ? color[i] : color

    el.filter((add) => {
      let shadowBlur = null
      if (Utils.isSafari() || Utils.isFirefox() || Utils.isMsEdge()) {
        // safari/firefox/IE have some alternative way to use this filter
        shadowBlur = add
          .flood(color, opacity)
          .composite(add.sourceAlpha, 'in')
          .offset(left, top)
          .gaussianBlur(blur)
      } else {
        shadowBlur = add
          .flood(color, opacity)
          .composite(add.sourceAlpha, 'in')
          .offset(left, top)
          .gaussianBlur(blur)
          .merge(add.source)
      }

      add.blend(add.source, shadowBlur)
    })

    if (!noUserSpaceOnUse) {
      el.filterer.node.setAttribute('filterUnits', 'userSpaceOnUse')
    }

    this._scaleFilterSize(el.filterer.node)

    return el
  }

  setSelectionFilter(el, realIndex, dataPointIndex) {
    const w = this.w
    if (typeof w.globals.selectedDataPoints[realIndex] !== 'undefined') {
      if (
        w.globals.selectedDataPoints[realIndex].indexOf(dataPointIndex) > -1
      ) {
        el.node.setAttribute('selected', true)
        let activeFilter = w.config.states.active.filter
        if (activeFilter !== 'none') {
          this.applyFilter(el, realIndex, activeFilter.type, activeFilter.value)
        }
      }
    }
  }

  _scaleFilterSize(el) {
    const setAttributes = (attrs) => {
      for (let key in attrs) {
        if (attrs.hasOwnProperty(key)) {
          el.setAttribute(key, attrs[key])
        }
      }
    }
    setAttributes({
      width: '200%',
      height: '200%',
      x: '-50%',
      y: '-50%',
    })
  }
}

export default Filters
