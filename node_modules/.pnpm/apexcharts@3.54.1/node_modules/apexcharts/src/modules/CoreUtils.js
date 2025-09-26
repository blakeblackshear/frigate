/*
 ** Util functions which are dependent on ApexCharts instance
 */

class CoreUtils {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  static checkComboSeries(series, chartType) {
    let comboCharts = false
    let comboBarCount = 0
    let comboCount = 0

    if (chartType === undefined) {
      chartType = 'line'
    }

    // Check if user specified a type in series that may make us a combo chart.
    // The default type for chart is "line" and the default for series is the
    // chart type, therefore, if the types of all series match the chart type,
    // this should not be considered a combo chart.
    if (series.length && typeof series[0].type !== 'undefined') {
      series.forEach((s) => {
        if (
          s.type === 'bar' ||
          s.type === 'column' ||
          s.type === 'candlestick' ||
          s.type === 'boxPlot'
        ) {
          comboBarCount++
        }
        if (typeof s.type !== 'undefined' && s.type !== chartType) {
          comboCount++
        }
      })
    }
    if (comboCount > 0) {
      comboCharts = true
    }

    return {
      comboBarCount,
      comboCharts,
    }
  }

  /**
   * @memberof CoreUtils
   * returns the sum of all individual values in a multiple stacked series
   * Eg. w.globals.series = [[32,33,43,12], [2,3,5,1]]
   *  @return [34,36,48,13]
   **/
  getStackedSeriesTotals(excludedSeriesIndices = []) {
    const w = this.w
    let total = []

    if (w.globals.series.length === 0) return total

    for (
      let i = 0;
      i < w.globals.series[w.globals.maxValsInArrayIndex].length;
      i++
    ) {
      let t = 0
      for (let j = 0; j < w.globals.series.length; j++) {
        if (
          typeof w.globals.series[j][i] !== 'undefined' &&
          excludedSeriesIndices.indexOf(j) === -1
        ) {
          t += w.globals.series[j][i]
        }
      }
      total.push(t)
    }
    return total
  }

  // get total of the all values inside all series
  getSeriesTotalByIndex(index = null) {
    if (index === null) {
      // non-plot chart types - pie / donut / circle
      return this.w.config.series.reduce((acc, cur) => acc + cur, 0)
    } else {
      // axis charts - supporting multiple series
      return this.w.globals.series[index].reduce((acc, cur) => acc + cur, 0)
    }
  }

  /**
   * @memberof CoreUtils
   * returns the sum of values in a multiple stacked grouped charts
   * Eg. w.globals.series = [[32,33,43,12], [2,3,5,1], [43, 23, 34, 22]]
   * series 1 and 2 are in a group, while series 3 is in another group
   *  @return [[34, 36, 48, 12], [43, 23, 34, 22]]
   **/
  getStackedSeriesTotalsByGroups() {
    const w = this.w
    let total = []

    w.globals.seriesGroups.forEach((sg) => {
      let includedIndexes = []
      w.config.series.forEach((s, si) => {
        if (sg.indexOf(w.globals.seriesNames[si]) > -1) {
          includedIndexes.push(si)
        }
      })

      const excludedIndices = w.globals.series
        .map((_, fi) => (includedIndexes.indexOf(fi) === -1 ? fi : -1))
        .filter((f) => f !== -1)

      total.push(this.getStackedSeriesTotals(excludedIndices))
    })
    return total
  }

  setSeriesYAxisMappings() {
    const gl = this.w.globals
    const cnf = this.w.config

    // The old config method to map multiple series to a y axis is to
    // include one yaxis config per series but set each yaxis seriesName to the
    // same series name. This relies on indexing equivalence to map series to
    // an axis: series[n] => yaxis[n]. This needs to be retained for compatibility.
    // But we introduce an alternative that explicitly configures yaxis elements
    // with the series that will be referenced to them (seriesName: []). This
    // only requires including the yaxis elements that will be seen on the chart.
    // Old way:
    // ya: s
    // 0: 0
    // 1: 1
    // 2: 1
    // 3: 1
    // 4: 1
    // Axes 0..4 are all scaled and all will be rendered unless the axes are
    // show: false. If the chart is stacked, it's assumed that series 1..4 are
    // the contributing series. This is not particularly intuitive.
    // New way:
    // ya: s
    // 0: [0]
    // 1: [1,2,3,4]
    // If the chart is stacked, it can be assumed that any axis with multiple
    // series is stacked.
    //
    // If this is an old chart and we are being backward compatible, it will be
    // expected that each series is associated with it's corresponding yaxis
    // through their indices, one-to-one.
    // If yaxis.seriesName matches series.name, we have indices yi and si.
    // A name match where yi != si is interpretted as yaxis[yi] and yaxis[si]
    // will both be scaled to fit the combined series[si] and series[yi].
    // Consider series named: S0,S1,S2 and yaxes A0,A1,A2.
    //
    // Example 1: A0 and A1 scaled the same.
    // A0.seriesName: S0
    // A1.seriesName: S0
    // A2.seriesName: S2
    // Then A1 <-> A0
    //
    // Example 2: A0, A1 and A2 all scaled the same.
    // A0.seriesName: S2
    // A1.seriesName: S0
    // A2.seriesName: S1
    // A0 <-> A2, A1 <-> A0, A2 <-> A1 --->>> A0 <-> A1 <-> A2

    let axisSeriesMap = []
    let seriesYAxisReverseMap = []
    let unassignedSeriesIndices = []
    let seriesNameArrayStyle =
      gl.series.length > cnf.yaxis.length ||
      cnf.yaxis.some((a) => Array.isArray(a.seriesName))

    cnf.series.forEach((s, i) => {
      unassignedSeriesIndices.push(i)
      seriesYAxisReverseMap.push(null)
    })
    cnf.yaxis.forEach((yaxe, yi) => {
      axisSeriesMap[yi] = []
    })

    let unassignedYAxisIndices = []

    // here, we loop through the yaxis array and find the item which has "seriesName" property
    cnf.yaxis.forEach((yaxe, yi) => {
      let assigned = false
      // Allow seriesName to be either a string (for backward compatibility),
      // in which case, handle multiple yaxes referencing the same series.
      // or an array of strings so that a yaxis can reference multiple series.
      // Feature request #4237
      if (yaxe.seriesName) {
        let seriesNames = []
        if (Array.isArray(yaxe.seriesName)) {
          seriesNames = yaxe.seriesName
        } else {
          seriesNames.push(yaxe.seriesName)
        }
        seriesNames.forEach((name) => {
          cnf.series.forEach((s, si) => {
            if (s.name === name) {
              let remove = si
              if (yi === si || seriesNameArrayStyle) {
                // New style, don't allow series to be double referenced
                if (
                  !seriesNameArrayStyle ||
                  unassignedSeriesIndices.indexOf(si) > -1
                ) {
                  axisSeriesMap[yi].push([yi, si])
                } else {
                  console.warn(
                    "Series '" +
                      s.name +
                      "' referenced more than once in what looks like the new style." +
                      ' That is, when using either seriesName: [],' +
                      ' or when there are more series than yaxes.'
                  )
                }
              } else {
                // The series index refers to the target yaxis and the current
                // yaxis index refers to the actual referenced series.
                axisSeriesMap[si].push([si, yi])
                remove = yi
              }
              assigned = true
              remove = unassignedSeriesIndices.indexOf(remove)
              if (remove !== -1) {
                unassignedSeriesIndices.splice(remove, 1)
              }
            }
          })
        })
      }
      if (!assigned) {
        unassignedYAxisIndices.push(yi)
      }
    })
    axisSeriesMap = axisSeriesMap.map((yaxe, yi) => {
      let ra = []
      yaxe.forEach((sa) => {
        seriesYAxisReverseMap[sa[1]] = sa[0]
        ra.push(sa[1])
      })
      return ra
    })

    // All series referenced directly by yaxes have been assigned to those axes.
    // Any series so far unassigned will be assigned to any yaxes that have yet
    // to reference series directly, one-for-one in order of appearance, with
    // all left-over series assigned to either the last unassigned yaxis, or the
    // last yaxis if all have assigned series. This captures the
    // default single and multiaxis config options which simply includes zero,
    // one or as many yaxes as there are series but do not reference them by name.
    let lastUnassignedYAxis = cnf.yaxis.length - 1
    for (let i = 0; i < unassignedYAxisIndices.length; i++) {
      lastUnassignedYAxis = unassignedYAxisIndices[i]
      axisSeriesMap[lastUnassignedYAxis] = []
      if (unassignedSeriesIndices) {
        let si = unassignedSeriesIndices[0]
        unassignedSeriesIndices.shift()
        axisSeriesMap[lastUnassignedYAxis].push(si)
        seriesYAxisReverseMap[si] = lastUnassignedYAxis
      } else {
        break
      }
    }

    unassignedSeriesIndices.forEach((i) => {
      axisSeriesMap[lastUnassignedYAxis].push(i)
      seriesYAxisReverseMap[i] = lastUnassignedYAxis
    })

    // For the old-style seriesName-as-string-only, leave the zero-length yaxis
    // array elements in for compatibility so that series.length == yaxes.length
    // for multi axis charts.
    gl.seriesYAxisMap = axisSeriesMap.map((x) => x)
    gl.seriesYAxisReverseMap = seriesYAxisReverseMap.map((x) => x)
    // Set default series group names
    gl.seriesYAxisMap.forEach((axisSeries, ai) => {
      axisSeries.forEach((si) => {
        // series may be bare until loaded in realtime
        if (cnf.series[si] && cnf.series[si].group === undefined) {
          // A series with no group defined will be named after the axis that
          // referenced it and thus form a group automatically.
          cnf.series[si].group = 'apexcharts-axis-'.concat(ai.toString())
        }
      })
    })
  }

  isSeriesNull(index = null) {
    let r = []
    if (index === null) {
      // non-plot chart types - pie / donut / circle
      r = this.w.config.series.filter((d) => d !== null)
    } else {
      // axis charts - supporting multiple series
      r = this.w.config.series[index].data.filter((d) => d !== null)
    }

    return r.length === 0
  }

  seriesHaveSameValues(index) {
    return this.w.globals.series[index].every((val, i, arr) => val === arr[0])
  }

  getCategoryLabels(labels) {
    const w = this.w
    let catLabels = labels.slice()
    if (w.config.xaxis.convertedCatToNumeric) {
      catLabels = labels.map((i, li) => {
        return w.config.xaxis.labels.formatter(i - w.globals.minX + 1)
      })
    }
    return catLabels
  }
  // maxValsInArrayIndex is the index of series[] which has the largest number of items
  getLargestSeries() {
    const w = this.w
    w.globals.maxValsInArrayIndex = w.globals.series
      .map((a) => a.length)
      .indexOf(
        Math.max.apply(
          Math,
          w.globals.series.map((a) => a.length)
        )
      )
  }

  getLargestMarkerSize() {
    const w = this.w
    let size = 0

    w.globals.markers.size.forEach((m) => {
      size = Math.max(size, m)
    })

    if (w.config.markers.discrete && w.config.markers.discrete.length) {
      w.config.markers.discrete.forEach((m) => {
        size = Math.max(size, m.size)
      })
    }

    if (size > 0) {
      if (w.config.markers.hover.size > 0) {
        size = w.config.markers.hover.size
      } else {
        size += w.config.markers.hover.sizeOffset
      }
    }

    w.globals.markers.largestSize = size

    return size
  }

  /**
   * @memberof Core
   * returns the sum of all values in a series
   * Eg. w.globals.series = [[32,33,43,12], [2,3,5,1]]
   *  @return [120, 11]
   **/
  getSeriesTotals() {
    const w = this.w

    w.globals.seriesTotals = w.globals.series.map((ser, index) => {
      let total = 0

      if (Array.isArray(ser)) {
        for (let j = 0; j < ser.length; j++) {
          total += ser[j]
        }
      } else {
        // for pie/donuts/gauges
        total += ser
      }

      return total
    })
  }

  getSeriesTotalsXRange(minX, maxX) {
    const w = this.w

    const seriesTotalsXRange = w.globals.series.map((ser, index) => {
      let total = 0

      for (let j = 0; j < ser.length; j++) {
        if (
          w.globals.seriesX[index][j] > minX &&
          w.globals.seriesX[index][j] < maxX
        ) {
          total += ser[j]
        }
      }

      return total
    })

    return seriesTotalsXRange
  }

  /**
   * @memberof CoreUtils
   * returns the percentage value of all individual values which can be used in a 100% stacked series
   * Eg. w.globals.series = [[32, 33, 43, 12], [2, 3, 5, 1]]
   *  @return [[94.11, 91.66, 89.58, 92.30], [5.88, 8.33, 10.41, 7.7]]
   **/
  getPercentSeries() {
    const w = this.w

    w.globals.seriesPercent = w.globals.series.map((ser, index) => {
      let seriesPercent = []
      if (Array.isArray(ser)) {
        for (let j = 0; j < ser.length; j++) {
          let total = w.globals.stackedSeriesTotals[j]
          let percent = 0
          if (total) {
            percent = (100 * ser[j]) / total
          }
          seriesPercent.push(percent)
        }
      } else {
        const total = w.globals.seriesTotals.reduce((acc, val) => acc + val, 0)
        let percent = (100 * ser) / total
        seriesPercent.push(percent)
      }

      return seriesPercent
    })
  }

  getCalculatedRatios() {
    let w = this.w
    let gl = w.globals

    let yRatio = []
    let invertedYRatio = 0
    let xRatio = 0
    let invertedXRatio = 0
    let zRatio = 0
    let baseLineY = []
    let baseLineInvertedY = 0.1
    let baseLineX = 0

    gl.yRange = []
    if (gl.isMultipleYAxis) {
      for (let i = 0; i < gl.minYArr.length; i++) {
        gl.yRange.push(Math.abs(gl.minYArr[i] - gl.maxYArr[i]))
        baseLineY.push(0)
      }
    } else {
      gl.yRange.push(Math.abs(gl.minY - gl.maxY))
    }
    gl.xRange = Math.abs(gl.maxX - gl.minX)
    gl.zRange = Math.abs(gl.maxZ - gl.minZ)

    // multiple y axis
    for (let i = 0; i < gl.yRange.length; i++) {
      yRatio.push(gl.yRange[i] / gl.gridHeight)
    }

    xRatio = gl.xRange / gl.gridWidth

    invertedYRatio = gl.yRange / gl.gridWidth
    invertedXRatio = gl.xRange / gl.gridHeight
    zRatio = (gl.zRange / gl.gridHeight) * 16

    if (!zRatio) {
      zRatio = 1
    }

    if (gl.minY !== Number.MIN_VALUE && Math.abs(gl.minY) !== 0) {
      // Negative numbers present in series
      gl.hasNegs = true
    }

    // Check we have a map as series may still to be added/updated.
    if (w.globals.seriesYAxisReverseMap.length > 0) {
      let scaleBaseLineYScale = (y, i) => {
        let yAxis = w.config.yaxis[w.globals.seriesYAxisReverseMap[i]]
        let sign = y < 0 ? -1 : 1
        y = Math.abs(y)
        if (yAxis.logarithmic) {
          y = this.getBaseLog(yAxis.logBase, y)
        }
        return (-sign * y) / yRatio[i]
      }
      if (gl.isMultipleYAxis) {
        baseLineY = []
        // baseline variables is the 0 of the yaxis which will be needed when there are negatives
        for (let i = 0; i < yRatio.length; i++) {
          baseLineY.push(scaleBaseLineYScale(gl.minYArr[i], i))
        }
      } else {
        baseLineY = []
        baseLineY.push(scaleBaseLineYScale(gl.minY, 0))

        if (gl.minY !== Number.MIN_VALUE && Math.abs(gl.minY) !== 0) {
          baseLineInvertedY = -gl.minY / invertedYRatio // this is for bar chart
          baseLineX = gl.minX / xRatio
        }
      }
    } else {
      baseLineY = []
      baseLineY.push(0)
      baseLineInvertedY = 0
      baseLineX = 0
    }

    return {
      yRatio,
      invertedYRatio,
      zRatio,
      xRatio,
      invertedXRatio,
      baseLineInvertedY,
      baseLineY,
      baseLineX,
    }
  }

  getLogSeries(series) {
    const w = this.w

    w.globals.seriesLog = series.map((s, i) => {
      let yAxisIndex = w.globals.seriesYAxisReverseMap[i]
      if (
        w.config.yaxis[yAxisIndex] &&
        w.config.yaxis[yAxisIndex].logarithmic
      ) {
        return s.map((d) => {
          if (d === null) return null
          return this.getLogVal(w.config.yaxis[yAxisIndex].logBase, d, i)
        })
      } else {
        return s
      }
    })

    return w.globals.invalidLogScale ? series : w.globals.seriesLog
  }
  getBaseLog(base, value) {
    return Math.log(value) / Math.log(base)
  }
  getLogVal(b, d, seriesIndex) {
    if (d <= 0) {
      return 0 // Should be Number.NEGATIVE_INFINITY
    }
    const w = this.w
    const min_log_val =
      w.globals.minYArr[seriesIndex] === 0
        ? -1 // make sure we dont calculate log of 0
        : this.getBaseLog(b, w.globals.minYArr[seriesIndex])
    const max_log_val =
      w.globals.maxYArr[seriesIndex] === 0
        ? 0 // make sure we dont calculate log of 0
        : this.getBaseLog(b, w.globals.maxYArr[seriesIndex])
    const number_of_height_levels = max_log_val - min_log_val
    if (d < 1) return d / number_of_height_levels
    const log_height_value = this.getBaseLog(b, d) - min_log_val
    return log_height_value / number_of_height_levels
  }

  getLogYRatios(yRatio) {
    const w = this.w
    const gl = this.w.globals

    gl.yLogRatio = yRatio.slice()

    gl.logYRange = gl.yRange.map((_, i) => {
      let yAxisIndex = w.globals.seriesYAxisReverseMap[i]
      if (
        w.config.yaxis[yAxisIndex] &&
        this.w.config.yaxis[yAxisIndex].logarithmic
      ) {
        let maxY = -Number.MAX_VALUE
        let minY = Number.MIN_VALUE
        let range = 1
        gl.seriesLog.forEach((s, si) => {
          s.forEach((v) => {
            if (w.config.yaxis[si] && w.config.yaxis[si].logarithmic) {
              maxY = Math.max(v, maxY)
              minY = Math.min(v, minY)
            }
          })
        })

        range = Math.pow(gl.yRange[i], Math.abs(minY - maxY) / gl.yRange[i])

        gl.yLogRatio[i] = range / gl.gridHeight
        return range
      }
    })

    return gl.invalidLogScale ? yRatio.slice() : gl.yLogRatio
  }

  // Some config objects can be array - and we need to extend them correctly
  static extendArrayProps(configInstance, options, w) {
    if (options?.yaxis) {
      options = configInstance.extendYAxis(options, w)
    }
    if (options?.annotations) {
      if (options.annotations.yaxis) {
        options = configInstance.extendYAxisAnnotations(options)
      }
      if (options?.annotations?.xaxis) {
        options = configInstance.extendXAxisAnnotations(options)
      }
      if (options?.annotations?.points) {
        options = configInstance.extendPointAnnotations(options)
      }
    }

    return options
  }

  // Series of the same group and type can be stacked together distinct from
  // other series of the same type on the same axis.
  drawSeriesByGroup(typeSeries, typeGroups, type, chartClass) {
    let w = this.w
    let graph = []
    if (typeSeries.series.length > 0) {
      // draw each group separately
      typeGroups.forEach((gn) => {
        let gs = []
        let gi = []
        typeSeries.i.forEach((i, ii) => {
          if (w.config.series[i].group === gn) {
            gs.push(typeSeries.series[ii])
            gi.push(i)
          }
        })
        gs.length > 0 && graph.push(chartClass.draw(gs, type, gi))
      })
    }
    return graph
  }
}

export default CoreUtils
