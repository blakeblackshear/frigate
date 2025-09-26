import Graphics from '../../../modules/Graphics'

export default class CircularChartsHelpers {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  drawYAxisTexts(x, y, i, text) {
    const w = this.w

    const yaxisConfig = w.config.yaxis[0]
    const formatter = w.globals.yLabelFormatters[0]

    const graphics = new Graphics(this.ctx)
    const yaxisLabel = graphics.drawText({
      x: x + yaxisConfig.labels.offsetX,
      y: y + yaxisConfig.labels.offsetY,
      text: formatter(text, i),
      textAnchor: 'middle',
      fontSize: yaxisConfig.labels.style.fontSize,
      fontFamily: yaxisConfig.labels.style.fontFamily,
      foreColor: Array.isArray(yaxisConfig.labels.style.colors)
        ? yaxisConfig.labels.style.colors[i]
        : yaxisConfig.labels.style.colors
    })

    return yaxisLabel
  }
}
