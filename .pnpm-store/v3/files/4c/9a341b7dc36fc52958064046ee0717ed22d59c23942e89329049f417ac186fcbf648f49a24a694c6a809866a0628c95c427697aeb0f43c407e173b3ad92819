import Config from './settings/Config'
import Utils from '../utils/Utils'
import CoreUtils from './CoreUtils'

/**
 * ApexCharts Responsive Class to override options for different screen sizes.
 *
 * @module Responsive
 **/

export default class Responsive {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  // the opts parameter if not null has to be set overriding everything
  // as the opts is set by user externally
  checkResponsiveConfig(opts) {
    const w = this.w
    const cnf = w.config

    // check if responsive config exists
    if (cnf.responsive.length === 0) return

    let res = cnf.responsive.slice()
    res
      .sort((a, b) =>
        a.breakpoint > b.breakpoint ? 1 : b.breakpoint > a.breakpoint ? -1 : 0
      )
      .reverse()

    let config = new Config({})

    const iterateResponsiveOptions = (newOptions = {}) => {
      let largestBreakpoint = res[0].breakpoint
      const width = window.innerWidth > 0 ? window.innerWidth : screen.width

      if (width > largestBreakpoint) {
        let initialConfig = Utils.clone(w.globals.initialConfig)
        // Retain state of series in case any have been collapsed
        // (indicated by series.data === [], these series' will be zeroed later
        // enabling stacking to work correctly)
        initialConfig.series = Utils.clone(w.config.series)
        let options = CoreUtils.extendArrayProps(
          config,
          initialConfig,
          w
        )
        newOptions = Utils.extend(options, newOptions)
        newOptions = Utils.extend(w.config, newOptions)
        this.overrideResponsiveOptions(newOptions)
      } else {
        for (let i = 0; i < res.length; i++) {
          if (width < res[i].breakpoint) {
            newOptions = CoreUtils.extendArrayProps(config, res[i].options, w)
            newOptions = Utils.extend(w.config, newOptions)
            this.overrideResponsiveOptions(newOptions)
          }
        }
      }
    }

    if (opts) {
      let options = CoreUtils.extendArrayProps(config, opts, w)
      options = Utils.extend(w.config, options)
      options = Utils.extend(options, opts)
      iterateResponsiveOptions(options)
    } else {
      iterateResponsiveOptions({})
    }
  }

  overrideResponsiveOptions(newOptions) {
    let newConfig = new Config(newOptions).init({ responsiveOverride: true })
    this.w.config = newConfig
  }
}
