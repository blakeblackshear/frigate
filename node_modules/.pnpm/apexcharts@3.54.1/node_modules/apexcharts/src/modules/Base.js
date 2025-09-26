import Config from './settings/Config'
import Globals from './settings/Globals'

/**
 * ApexCharts Base Class for extending user options with pre-defined ApexCharts config.
 *
 * @module Base
 **/
export default class Base {
  constructor(opts) {
    this.opts = opts
  }

  init() {
    const config = new Config(this.opts).init({ responsiveOverride: false })
    const globals = new Globals().init(config)

    const w = {
      config,
      globals
    }

    return w
  }
}
