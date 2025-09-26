import Graphics from './Graphics'

export default class TitleSubtitle {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  draw() {
    this.drawTitleSubtitle('title')
    this.drawTitleSubtitle('subtitle')
  }

  drawTitleSubtitle(type) {
    let w = this.w
    const tsConfig = type === 'title' ? w.config.title : w.config.subtitle

    let x = w.globals.svgWidth / 2
    let y = tsConfig.offsetY
    let textAnchor = 'middle'

    if (tsConfig.align === 'left') {
      x = 10
      textAnchor = 'start'
    } else if (tsConfig.align === 'right') {
      x = w.globals.svgWidth - 10
      textAnchor = 'end'
    }

    x = x + tsConfig.offsetX
    y = y + parseInt(tsConfig.style.fontSize, 10) + tsConfig.margin / 2

    if (tsConfig.text !== undefined) {
      let graphics = new Graphics(this.ctx)
      let titleText = graphics.drawText({
        x,
        y,
        text: tsConfig.text,
        textAnchor,
        fontSize: tsConfig.style.fontSize,
        fontFamily: tsConfig.style.fontFamily,
        fontWeight: tsConfig.style.fontWeight,
        foreColor: tsConfig.style.color,
        opacity: 1
      })

      titleText.node.setAttribute('class', `apexcharts-${type}-text`)

      w.globals.dom.Paper.add(titleText)
    }
  }
}
