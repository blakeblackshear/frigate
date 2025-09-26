import XAxis from './XAxis'
import YAxis from './YAxis'

export default class Axes {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  drawAxis(type, elgrid) {
    let gl = this.w.globals
    let cnf = this.w.config

    let xAxis = new XAxis(this.ctx, elgrid)
    let yAxis = new YAxis(this.ctx, elgrid)

    if (gl.axisCharts && type !== 'radar') {
      let elXaxis, elYaxis

      if (gl.isBarHorizontal) {
        elYaxis = yAxis.drawYaxisInversed(0)
        elXaxis = xAxis.drawXaxisInversed(0)

        gl.dom.elGraphical.add(elXaxis)
        gl.dom.elGraphical.add(elYaxis)
      } else {
        elXaxis = xAxis.drawXaxis()
        gl.dom.elGraphical.add(elXaxis)

        cnf.yaxis.map((yaxe, index) => {
          if (gl.ignoreYAxisIndexes.indexOf(index) === -1) {
            elYaxis = yAxis.drawYaxis(index)
            gl.dom.Paper.add(elYaxis)

            if (this.w.config.grid.position === 'back') {
              const inner = gl.dom.Paper.children()[1]
              inner.remove()
              gl.dom.Paper.add(inner)
            }
          }
        })
      }
    }
  }
}
