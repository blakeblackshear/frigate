import Graphics from '../Graphics'
import Utils from '../../utils/Utils'
import AxesUtils from '../axes/AxesUtils'

export default class DimYAxis {
  constructor(dCtx) {
    this.w = dCtx.w
    this.dCtx = dCtx
  }

  /**
   * Get Y Axis Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getyAxisLabelsCoords() {
    let w = this.w

    let width = 0
    let height = 0
    let ret = []
    let labelPad = 10
    const axesUtils = new AxesUtils(this.dCtx.ctx)

    w.config.yaxis.map((yaxe, index) => {
      const formatterArgs = {
        seriesIndex: index,
        dataPointIndex: -1,
        w,
      }
      const yS = w.globals.yAxisScale[index]
      let yAxisMinWidth = 0
      if (
        !axesUtils.isYAxisHidden(index) &&
        yaxe.labels.show &&
        yaxe.labels.minWidth !== undefined
      )
        yAxisMinWidth = yaxe.labels.minWidth

      if (
        !axesUtils.isYAxisHidden(index) &&
        yaxe.labels.show &&
        yS.result.length
      ) {
        let lbFormatter = w.globals.yLabelFormatters[index]
        let minV = yS.niceMin === Number.MIN_VALUE ? 0 : yS.niceMin
        let val = yS.result.reduce((acc, curr) => {
          return String(lbFormatter(acc, formatterArgs))?.length >
            String(lbFormatter(curr, formatterArgs))?.length
            ? acc
            : curr
        }, minV)

        val = lbFormatter(val, formatterArgs)

        // the second parameter -1 is the index of tick which user can use in the formatter
        let valArr = val

        // if user has specified a custom formatter, and the result is null or empty, we need to discard the formatter and take the value as it is.
        if (typeof val === 'undefined' || val.length === 0) {
          val = yS.niceMax
        }

        if (w.globals.isBarHorizontal) {
          labelPad = 0

          let barYaxisLabels = w.globals.labels.slice()

          //  get the longest string from the labels array and also apply label formatter to it
          val = Utils.getLargestStringFromArr(barYaxisLabels)

          val = lbFormatter(val, { seriesIndex: index, dataPointIndex: -1, w })
          valArr = this.dCtx.dimHelpers.getLargestStringFromMultiArr(
            val,
            barYaxisLabels
          )
        }

        let graphics = new Graphics(this.dCtx.ctx)

        let rotateStr = 'rotate('.concat(yaxe.labels.rotate, ' 0 0)')
        let rect = graphics.getTextRects(
          val,
          yaxe.labels.style.fontSize,
          yaxe.labels.style.fontFamily,
          rotateStr,
          false
        )

        let arrLabelrect = rect

        if (val !== valArr) {
          arrLabelrect = graphics.getTextRects(
            valArr,
            yaxe.labels.style.fontSize,
            yaxe.labels.style.fontFamily,
            rotateStr,
            false
          )
        }

        ret.push({
          width:
            (yAxisMinWidth > arrLabelrect.width || yAxisMinWidth > rect.width
              ? yAxisMinWidth
              : arrLabelrect.width > rect.width
              ? arrLabelrect.width
              : rect.width) + labelPad,
          height:
            arrLabelrect.height > rect.height
              ? arrLabelrect.height
              : rect.height,
        })
      } else {
        ret.push({
          width,
          height,
        })
      }
    })

    return ret
  }

  /**
   * Get Y Axis Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getyAxisTitleCoords() {
    let w = this.w
    let ret = []

    w.config.yaxis.map((yaxe, index) => {
      if (yaxe.show && yaxe.title.text !== undefined) {
        let graphics = new Graphics(this.dCtx.ctx)
        let rotateStr = 'rotate('.concat(yaxe.title.rotate, ' 0 0)')
        let rect = graphics.getTextRects(
          yaxe.title.text,
          yaxe.title.style.fontSize,
          yaxe.title.style.fontFamily,
          rotateStr,
          false
        )

        ret.push({
          width: rect.width,
          height: rect.height,
        })
      } else {
        ret.push({
          width: 0,
          height: 0,
        })
      }
    })

    return ret
  }

  getTotalYAxisWidth() {
    let w = this.w
    let yAxisWidth = 0
    let yAxisWidthLeft = 0
    let yAxisWidthRight = 0
    let padding = w.globals.yAxisScale.length > 1 ? 10 : 0
    const axesUtils = new AxesUtils(this.dCtx.ctx)

    const isHiddenYAxis = function (index) {
      return w.globals.ignoreYAxisIndexes.indexOf(index) > -1
    }

    const padForLabelTitle = (coord, index) => {
      let floating = w.config.yaxis[index].floating
      let width = 0

      if (coord.width > 0 && !floating) {
        width = coord.width + padding
        if (isHiddenYAxis(index)) {
          width = width - coord.width - padding
        }
      } else {
        width = floating || axesUtils.isYAxisHidden(index) ? 0 : 5
      }

      w.config.yaxis[index].opposite
        ? (yAxisWidthRight = yAxisWidthRight + width)
        : (yAxisWidthLeft = yAxisWidthLeft + width)

      yAxisWidth = yAxisWidth + width
    }

    w.globals.yLabelsCoords.map((yLabelCoord, index) => {
      padForLabelTitle(yLabelCoord, index)
    })

    w.globals.yTitleCoords.map((yTitleCoord, index) => {
      padForLabelTitle(yTitleCoord, index)
    })

    if (w.globals.isBarHorizontal && !w.config.yaxis[0].floating) {
      yAxisWidth =
        w.globals.yLabelsCoords[0].width + w.globals.yTitleCoords[0].width + 15
    }

    this.dCtx.yAxisWidthLeft = yAxisWidthLeft
    this.dCtx.yAxisWidthRight = yAxisWidthRight

    return yAxisWidth
  }
}
