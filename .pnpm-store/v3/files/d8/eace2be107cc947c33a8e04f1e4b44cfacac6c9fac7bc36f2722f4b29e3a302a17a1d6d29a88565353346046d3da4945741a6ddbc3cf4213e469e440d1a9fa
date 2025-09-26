import Formatters from '../Formatters'
import Graphics from '../Graphics'
import Utils from '../../utils/Utils'
import DateTime from '../../utils/DateTime'

export default class DimXAxis {
  constructor(dCtx) {
    this.w = dCtx.w
    this.dCtx = dCtx
  }

  /**
   * Get X Axis Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getxAxisLabelsCoords() {
    let w = this.w

    let xaxisLabels = w.globals.labels.slice()
    if (w.config.xaxis.convertedCatToNumeric && xaxisLabels.length === 0) {
      xaxisLabels = w.globals.categoryLabels
    }

    let rect

    if (w.globals.timescaleLabels.length > 0) {
      const coords = this.getxAxisTimeScaleLabelsCoords()
      rect = {
        width: coords.width,
        height: coords.height,
      }
      w.globals.rotateXLabels = false
    } else {
      this.dCtx.lgWidthForSideLegends =
        (w.config.legend.position === 'left' ||
          w.config.legend.position === 'right') &&
        !w.config.legend.floating
          ? this.dCtx.lgRect.width
          : 0

      // get the longest string from the labels array and also apply label formatter
      let xlbFormatter = w.globals.xLabelFormatter
      // prevent changing xaxisLabels to avoid issues in multi-yaxes - fix #522
      let val = Utils.getLargestStringFromArr(xaxisLabels)
      let valArr = this.dCtx.dimHelpers.getLargestStringFromMultiArr(
        val,
        xaxisLabels
      )

      // the labels gets changed for bar charts
      if (w.globals.isBarHorizontal) {
        val = w.globals.yAxisScale[0].result.reduce(
          (a, b) => (a.length > b.length ? a : b),
          0
        )
        valArr = val
      }

      let xFormat = new Formatters(this.dCtx.ctx)
      let timestamp = val
      val = xFormat.xLabelFormat(xlbFormatter, val, timestamp, {
        i: undefined,
        dateFormatter: new DateTime(this.dCtx.ctx).formatDate,
        w,
      })
      valArr = xFormat.xLabelFormat(xlbFormatter, valArr, timestamp, {
        i: undefined,
        dateFormatter: new DateTime(this.dCtx.ctx).formatDate,
        w,
      })

      if (
        (w.config.xaxis.convertedCatToNumeric && typeof val === 'undefined') ||
        String(val).trim() === ''
      ) {
        val = '1'
        valArr = val
      }

      let graphics = new Graphics(this.dCtx.ctx)
      let xLabelrect = graphics.getTextRects(
        val,
        w.config.xaxis.labels.style.fontSize
      )
      let xArrLabelrect = xLabelrect
      if (val !== valArr) {
        xArrLabelrect = graphics.getTextRects(
          valArr,
          w.config.xaxis.labels.style.fontSize
        )
      }

      rect = {
        width:
          xLabelrect.width >= xArrLabelrect.width
            ? xLabelrect.width
            : xArrLabelrect.width,
        height:
          xLabelrect.height >= xArrLabelrect.height
            ? xLabelrect.height
            : xArrLabelrect.height,
      }

      if (
        (rect.width * xaxisLabels.length >
          w.globals.svgWidth -
            this.dCtx.lgWidthForSideLegends -
            this.dCtx.yAxisWidth -
            this.dCtx.gridPad.left -
            this.dCtx.gridPad.right &&
          w.config.xaxis.labels.rotate !== 0) ||
        w.config.xaxis.labels.rotateAlways
      ) {
        if (!w.globals.isBarHorizontal) {
          w.globals.rotateXLabels = true
          const getRotatedTextRects = (text) => {
            return graphics.getTextRects(
              text,
              w.config.xaxis.labels.style.fontSize,
              w.config.xaxis.labels.style.fontFamily,
              `rotate(${w.config.xaxis.labels.rotate} 0 0)`,
              false
            )
          }
          xLabelrect = getRotatedTextRects(val)
          if (val !== valArr) {
            xArrLabelrect = getRotatedTextRects(valArr)
          }

          rect.height =
            (xLabelrect.height > xArrLabelrect.height
              ? xLabelrect.height
              : xArrLabelrect.height) / 1.5
          rect.width =
            xLabelrect.width > xArrLabelrect.width
              ? xLabelrect.width
              : xArrLabelrect.width
        }
      } else {
        w.globals.rotateXLabels = false
      }
    }

    if (!w.config.xaxis.labels.show) {
      rect = {
        width: 0,
        height: 0,
      }
    }

    return {
      width: rect.width,
      height: rect.height,
    }
  }

  /**
   * Get X Axis Label Group height
   * @memberof Dimensions
   * @return {{width, height}}
   */
  getxAxisGroupLabelsCoords() {
    let w = this.w

    if (!w.globals.hasXaxisGroups) {
      return { width: 0, height: 0 }
    }

    const fontSize =
      w.config.xaxis.group.style?.fontSize ||
      w.config.xaxis.labels.style.fontSize

    let xaxisLabels = w.globals.groups.map((g) => g.title)

    let rect

    // prevent changing xaxisLabels to avoid issues in multi-yaxes - fix #522
    let val = Utils.getLargestStringFromArr(xaxisLabels)
    let valArr = this.dCtx.dimHelpers.getLargestStringFromMultiArr(
      val,
      xaxisLabels
    )

    let graphics = new Graphics(this.dCtx.ctx)
    let xLabelrect = graphics.getTextRects(val, fontSize)
    let xArrLabelrect = xLabelrect
    if (val !== valArr) {
      xArrLabelrect = graphics.getTextRects(valArr, fontSize)
    }

    rect = {
      width:
        xLabelrect.width >= xArrLabelrect.width
          ? xLabelrect.width
          : xArrLabelrect.width,
      height:
        xLabelrect.height >= xArrLabelrect.height
          ? xLabelrect.height
          : xArrLabelrect.height,
    }

    if (!w.config.xaxis.labels.show) {
      rect = {
        width: 0,
        height: 0,
      }
    }

    return {
      width: rect.width,
      height: rect.height,
    }
  }

  /**
   * Get X Axis Title Dimensions
   * @memberof Dimensions
   * @return {{width, height}}
   **/
  getxAxisTitleCoords() {
    let w = this.w
    let width = 0
    let height = 0

    if (w.config.xaxis.title.text !== undefined) {
      let graphics = new Graphics(this.dCtx.ctx)

      let rect = graphics.getTextRects(
        w.config.xaxis.title.text,
        w.config.xaxis.title.style.fontSize
      )

      width = rect.width
      height = rect.height
    }

    return {
      width,
      height,
    }
  }

  getxAxisTimeScaleLabelsCoords() {
    let w = this.w
    let rect

    this.dCtx.timescaleLabels = w.globals.timescaleLabels.slice()

    let labels = this.dCtx.timescaleLabels.map((label) => label.value)

    //  get the longest string from the labels array and also apply label formatter to it
    let val = labels.reduce((a, b) => {
      // if undefined, maybe user didn't pass the datetime(x) values
      if (typeof a === 'undefined') {
        console.error(
          'You have possibly supplied invalid Date format. Please supply a valid JavaScript Date'
        )
        return 0
      } else {
        return a.length > b.length ? a : b
      }
    }, 0)

    let graphics = new Graphics(this.dCtx.ctx)
    rect = graphics.getTextRects(val, w.config.xaxis.labels.style.fontSize)

    let totalWidthRotated = rect.width * 1.05 * labels.length

    if (
      totalWidthRotated > w.globals.gridWidth &&
      w.config.xaxis.labels.rotate !== 0
    ) {
      w.globals.overlappingXLabels = true
    }

    return rect
  }

  // In certain cases, the last labels gets cropped in xaxis.
  // Hence, we add some additional padding based on the label length to avoid the last label being cropped or we don't draw it at all
  additionalPaddingXLabels(xaxisLabelCoords) {
    const w = this.w
    const gl = w.globals
    const cnf = w.config
    const xtype = cnf.xaxis.type

    let lbWidth = xaxisLabelCoords.width

    gl.skipLastTimelinelabel = false
    gl.skipFirstTimelinelabel = false
    const isBarOpposite =
      w.config.yaxis[0].opposite && w.globals.isBarHorizontal

    const isCollapsed = (i) => gl.collapsedSeriesIndices.indexOf(i) !== -1

    const rightPad = (yaxe) => {
      if (this.dCtx.timescaleLabels && this.dCtx.timescaleLabels.length) {
        // for timeline labels, we take the last label and check if it exceeds gridWidth
        const firstimescaleLabel = this.dCtx.timescaleLabels[0]
        const lastTimescaleLabel =
          this.dCtx.timescaleLabels[this.dCtx.timescaleLabels.length - 1]

        const lastLabelPosition =
          lastTimescaleLabel.position +
          lbWidth / 1.75 -
          this.dCtx.yAxisWidthRight

        const firstLabelPosition =
          firstimescaleLabel.position -
          lbWidth / 1.75 +
          this.dCtx.yAxisWidthLeft

        let lgRightRectWidth =
          w.config.legend.position === 'right' && this.dCtx.lgRect.width > 0
            ? this.dCtx.lgRect.width
            : 0
        if (
          lastLabelPosition >
          gl.svgWidth - gl.translateX - lgRightRectWidth
        ) {
          gl.skipLastTimelinelabel = true
        }

        if (
          firstLabelPosition <
          -((!yaxe.show || yaxe.floating) &&
          (cnf.chart.type === 'bar' ||
            cnf.chart.type === 'candlestick' ||
            cnf.chart.type === 'rangeBar' ||
            cnf.chart.type === 'boxPlot')
            ? lbWidth / 1.75
            : 10)
        ) {
          gl.skipFirstTimelinelabel = true
        }
      } else if (xtype === 'datetime') {
        // If user has enabled DateTime, but uses own's formatter
        if (this.dCtx.gridPad.right < lbWidth && !gl.rotateXLabels) {
          gl.skipLastTimelinelabel = true
        }
      } else if (xtype !== 'datetime') {
        if (
          this.dCtx.gridPad.right < lbWidth / 2 - this.dCtx.yAxisWidthRight &&
          !gl.rotateXLabels &&
          !w.config.xaxis.labels.trim
        ) {
          this.dCtx.xPadRight = lbWidth / 2 + 1
        }
      }
    }

    const padYAxe = (yaxe, i) => {
      if (cnf.yaxis.length > 1 && isCollapsed(i)) return

      rightPad(yaxe)
    }

    cnf.yaxis.forEach((yaxe, i) => {
      if (isBarOpposite) {
        if (this.dCtx.gridPad.left < lbWidth) {
          this.dCtx.xPadLeft = lbWidth / 2 + 1
        }
        this.dCtx.xPadRight = lbWidth / 2 + 1
      } else {
        padYAxe(yaxe, i)
      }
    })
  }
}
