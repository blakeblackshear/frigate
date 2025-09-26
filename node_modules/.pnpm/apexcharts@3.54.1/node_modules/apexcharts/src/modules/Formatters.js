import DateTime from '../utils/DateTime'
import Utils from '../utils/Utils'

/**
 * ApexCharts Formatter Class for setting value formatters for axes as well as tooltips.
 *
 * @module Formatters
 **/

class Formatters {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
    this.tooltipKeyFormat = 'dd MMM'
  }

  xLabelFormat(fn, val, timestamp, opts) {
    let w = this.w

    if (w.config.xaxis.type === 'datetime') {
      if (w.config.xaxis.labels.formatter === undefined) {
        // if user has not specified a custom formatter, use the default tooltip.x.format
        if (w.config.tooltip.x.formatter === undefined) {
          let datetimeObj = new DateTime(this.ctx)
          return datetimeObj.formatDate(
            datetimeObj.getDate(val),
            w.config.tooltip.x.format
          )
        }
      }
    }

    return fn(val, timestamp, opts)
  }

  defaultGeneralFormatter(val) {
    if (Array.isArray(val)) {
      return val.map((v) => {
        return v
      })
    } else {
      return val
    }
  }

  defaultYFormatter(v, yaxe, i) {
    let w = this.w

    if (Utils.isNumber(v)) {
      if (w.globals.yValueDecimal !== 0) {
        v = v.toFixed(
          yaxe.decimalsInFloat !== undefined
            ? yaxe.decimalsInFloat
            : w.globals.yValueDecimal
        )
      } else {
        // We have an integer value but the label is not an integer. We can
        // deduce this is due to the number of ticks exceeding the even lower
        // integer range. Add an additional decimal place only in this case.
        const f = v.toFixed(0)
        // Do not change the == to ===
        v = v == f ? f : v.toFixed(1)
      }
    }
    return v
  }

  setLabelFormatters() {
    let w = this.w

    w.globals.xaxisTooltipFormatter = (val) => {
      return this.defaultGeneralFormatter(val)
    }

    w.globals.ttKeyFormatter = (val) => {
      return this.defaultGeneralFormatter(val)
    }

    w.globals.ttZFormatter = (val) => {
      return val
    }

    w.globals.legendFormatter = (val) => {
      return this.defaultGeneralFormatter(val)
    }

    // formatter function will always overwrite format property
    if (w.config.xaxis.labels.formatter !== undefined) {
      w.globals.xLabelFormatter = w.config.xaxis.labels.formatter
    } else {
      w.globals.xLabelFormatter = (val) => {
        if (Utils.isNumber(val)) {
          if (
            !w.config.xaxis.convertedCatToNumeric &&
            w.config.xaxis.type === 'numeric'
          ) {
            if (Utils.isNumber(w.config.xaxis.decimalsInFloat)) {
              return val.toFixed(w.config.xaxis.decimalsInFloat)
            } else {
              const diff = w.globals.maxX - w.globals.minX
              if (diff > 0 && diff < 100) {
                return val.toFixed(1)
              }
              return val.toFixed(0)
            }
          }

          if (w.globals.isBarHorizontal) {
            const range = w.globals.maxY - w.globals.minYArr
            if (range < 4) {
              return val.toFixed(1)
            }
          }
          return val.toFixed(0)
        }
        return val
      }
    }

    if (typeof w.config.tooltip.x.formatter === 'function') {
      w.globals.ttKeyFormatter = w.config.tooltip.x.formatter
    } else {
      w.globals.ttKeyFormatter = w.globals.xLabelFormatter
    }

    if (typeof w.config.xaxis.tooltip.formatter === 'function') {
      w.globals.xaxisTooltipFormatter = w.config.xaxis.tooltip.formatter
    }

    if (Array.isArray(w.config.tooltip.y)) {
      w.globals.ttVal = w.config.tooltip.y
    } else {
      if (w.config.tooltip.y.formatter !== undefined) {
        w.globals.ttVal = w.config.tooltip.y
      }
    }

    if (w.config.tooltip.z.formatter !== undefined) {
      w.globals.ttZFormatter = w.config.tooltip.z.formatter
    }

    // legend formatter - if user wants to append any global values of series to legend text
    if (w.config.legend.formatter !== undefined) {
      w.globals.legendFormatter = w.config.legend.formatter
    }

    // formatter function will always overwrite format property
    w.config.yaxis.forEach((yaxe, i) => {
      if (yaxe.labels.formatter !== undefined) {
        w.globals.yLabelFormatters[i] = yaxe.labels.formatter
      } else {
        w.globals.yLabelFormatters[i] = (val) => {
          if (!w.globals.xyCharts) return val

          if (Array.isArray(val)) {
            return val.map((v) => {
              return this.defaultYFormatter(v, yaxe, i)
            })
          } else {
            return this.defaultYFormatter(val, yaxe, i)
          }
        }
      }
    })

    return w.globals
  }

  heatmapLabelFormatters() {
    const w = this.w
    if (w.config.chart.type === 'heatmap') {
      w.globals.yAxisScale[0].result = w.globals.seriesNames.slice()

      //  get the longest string from the labels array and also apply label formatter to it
      let longest = w.globals.seriesNames.reduce(
        (a, b) => (a.length > b.length ? a : b),
        0
      )
      w.globals.yAxisScale[0].niceMax = longest
      w.globals.yAxisScale[0].niceMin = longest
    }
  }
}

export default Formatters
