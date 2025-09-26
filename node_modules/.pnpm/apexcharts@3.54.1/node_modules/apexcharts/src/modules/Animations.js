import Utils from '../utils/Utils'

/**
 * ApexCharts Animation Class.
 *
 * @module Animations
 **/

export default class Animations {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.setEasingFunctions()
  }

  setEasingFunctions() {
    let easing

    if (this.w.globals.easing) return

    const userDefinedEasing = this.w.config.chart.animations.easing

    switch (userDefinedEasing) {
      case 'linear': {
        easing = '-'
        break
      }
      case 'easein': {
        easing = '<'
        break
      }
      case 'easeout': {
        easing = '>'
        break
      }
      case 'easeinout': {
        easing = '<>'
        break
      }
      case 'swing': {
        easing = (pos) => {
          let s = 1.70158
          let ret = (pos -= 1) * pos * ((s + 1) * pos + s) + 1
          return ret
        }
        break
      }
      case 'bounce': {
        easing = (pos) => {
          let ret = ''
          if (pos < 1 / 2.75) {
            ret = 7.5625 * pos * pos
          } else if (pos < 2 / 2.75) {
            ret = 7.5625 * (pos -= 1.5 / 2.75) * pos + 0.75
          } else if (pos < 2.5 / 2.75) {
            ret = 7.5625 * (pos -= 2.25 / 2.75) * pos + 0.9375
          } else {
            ret = 7.5625 * (pos -= 2.625 / 2.75) * pos + 0.984375
          }
          return ret
        }
        break
      }
      case 'elastic': {
        easing = (pos) => {
          if (pos === !!pos) return pos
          return (
            Math.pow(2, -10 * pos) *
              Math.sin(((pos - 0.075) * (2 * Math.PI)) / 0.3) +
            1
          )
        }
        break
      }

      default: {
        easing = '<>'
      }
    }

    this.w.globals.easing = easing
  }

  animateLine(el, from, to, speed) {
    el.attr(from).animate(speed).attr(to)
  }

  /*
   ** Animate radius of a circle element
   */
  animateMarker(el, speed, easing, cb) {
    el.attr({
      opacity: 0,
    })
      .animate(speed, easing)
      .attr({
        opacity: 1,
      })
      .afterAll(() => {
        cb()
      })
  }

  /*
   ** Animate rect properties
   */
  animateRect(el, from, to, speed, fn) {
    el.attr(from)
      .animate(speed)
      .attr(to)
      .afterAll(() => fn())
  }

  animatePathsGradually(params) {
    let { el, realIndex, j, fill, pathFrom, pathTo, speed, delay } = params

    let me = this
    let w = this.w

    let delayFactor = 0

    if (w.config.chart.animations.animateGradually.enabled) {
      delayFactor = w.config.chart.animations.animateGradually.delay
    }

    if (
      w.config.chart.animations.dynamicAnimation.enabled &&
      w.globals.dataChanged &&
      w.config.chart.type !== 'bar'
    ) {
      // disabled due to this bug - https://github.com/apexcharts/vue-apexcharts/issues/75
      delayFactor = 0
    }
    me.morphSVG(
      el,
      realIndex,
      j,
      w.config.chart.type === 'line' && !w.globals.comboCharts
        ? 'stroke'
        : fill,
      pathFrom,
      pathTo,
      speed,
      delay * delayFactor
    )
  }

  showDelayedElements() {
    this.w.globals.delayedElements.forEach((d) => {
      const ele = d.el
      ele.classList.remove('apexcharts-element-hidden')
      ele.classList.add('apexcharts-hidden-element-shown')
    })
  }

  animationCompleted(el) {
    const w = this.w
    if (w.globals.animationEnded) return

    w.globals.animationEnded = true
    this.showDelayedElements()

    if (typeof w.config.chart.events.animationEnd === 'function') {
      w.config.chart.events.animationEnd(this.ctx, { el, w })
    }
  }

  // SVG.js animation for morphing one path to another
  morphSVG(el, realIndex, j, fill, pathFrom, pathTo, speed, delay) {
    let w = this.w

    if (!pathFrom) {
      pathFrom = el.attr('pathFrom')
    }

    if (!pathTo) {
      pathTo = el.attr('pathTo')
    }

    const disableAnimationForCorrupPath = (path) => {
      if (w.config.chart.type === 'radar') {
        // radar chart drops the path to bottom and hence a corrup path looks ugly
        // therefore, disable animation for such a case
        speed = 1
      }
      return `M 0 ${w.globals.gridHeight}`
    }

    if (
      !pathFrom ||
      pathFrom.indexOf('undefined') > -1 ||
      pathFrom.indexOf('NaN') > -1
    ) {
      pathFrom = disableAnimationForCorrupPath()
    }

    if (
      !pathTo ||
      pathTo.indexOf('undefined') > -1 ||
      pathTo.indexOf('NaN') > -1
    ) {
      pathTo = disableAnimationForCorrupPath()
    }
    if (!w.globals.shouldAnimate) {
      speed = 1
    }

    el.plot(pathFrom)
      .animate(1, w.globals.easing, delay)
      .plot(pathFrom)
      .animate(speed, w.globals.easing, delay)
      .plot(pathTo)
      .afterAll(() => {
        // a flag to indicate that the original mount function can return true now as animation finished here

        if (Utils.isNumber(j)) {
          if (
            j === w.globals.series[w.globals.maxValsInArrayIndex].length - 2 &&
            w.globals.shouldAnimate
          ) {
            this.animationCompleted(el)
          }
        } else if (fill !== 'none' && w.globals.shouldAnimate) {
          if (
            (!w.globals.comboCharts &&
              realIndex === w.globals.series.length - 1) ||
            w.globals.comboCharts
          ) {
            this.animationCompleted(el)
          }
        }

        this.showDelayedElements()
      })
  }
}
