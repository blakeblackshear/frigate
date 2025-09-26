import CoreUtils from './CoreUtils'
import DateTime from './../utils/DateTime'
import Series from './Series'
import Utils from '../utils/Utils'
import Defaults from './settings/Defaults'

export default class Data {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w

    this.twoDSeries = []
    this.threeDSeries = []
    this.twoDSeriesX = []
    this.seriesGoals = []
    this.coreUtils = new CoreUtils(this.ctx)
  }

  isMultiFormat() {
    return this.isFormatXY() || this.isFormat2DArray()
  }

  // given format is [{x, y}, {x, y}]
  isFormatXY() {
    const series = this.w.config.series.slice()

    const sr = new Series(this.ctx)
    this.activeSeriesIndex = sr.getActiveConfigSeriesIndex()

    if (
      typeof series[this.activeSeriesIndex].data !== 'undefined' &&
      series[this.activeSeriesIndex].data.length > 0 &&
      series[this.activeSeriesIndex].data[0] !== null &&
      typeof series[this.activeSeriesIndex].data[0].x !== 'undefined' &&
      series[this.activeSeriesIndex].data[0] !== null
    ) {
      return true
    }
  }

  // given format is [[x, y], [x, y]]
  isFormat2DArray() {
    const series = this.w.config.series.slice()

    const sr = new Series(this.ctx)
    this.activeSeriesIndex = sr.getActiveConfigSeriesIndex()

    if (
      typeof series[this.activeSeriesIndex].data !== 'undefined' &&
      series[this.activeSeriesIndex].data.length > 0 &&
      typeof series[this.activeSeriesIndex].data[0] !== 'undefined' &&
      series[this.activeSeriesIndex].data[0] !== null &&
      series[this.activeSeriesIndex].data[0].constructor === Array
    ) {
      return true
    }
  }

  handleFormat2DArray(ser, i) {
    const cnf = this.w.config
    const gl = this.w.globals

    const isBoxPlot =
      cnf.chart.type === 'boxPlot' || cnf.series[i].type === 'boxPlot'

    for (let j = 0; j < ser[i].data.length; j++) {
      if (typeof ser[i].data[j][1] !== 'undefined') {
        if (
          Array.isArray(ser[i].data[j][1]) &&
          ser[i].data[j][1].length === 4 &&
          !isBoxPlot
        ) {
          // candlestick nested ohlc format
          this.twoDSeries.push(Utils.parseNumber(ser[i].data[j][1][3]))
        } else if (ser[i].data[j].length >= 5) {
          // candlestick non-nested ohlc format
          this.twoDSeries.push(Utils.parseNumber(ser[i].data[j][4]))
        } else {
          this.twoDSeries.push(Utils.parseNumber(ser[i].data[j][1]))
        }
        gl.dataFormatXNumeric = true
      }
      if (cnf.xaxis.type === 'datetime') {
        // if timestamps are provided and xaxis type is datetime,

        let ts = new Date(ser[i].data[j][0])
        ts = new Date(ts).getTime()
        this.twoDSeriesX.push(ts)
      } else {
        this.twoDSeriesX.push(ser[i].data[j][0])
      }
    }

    for (let j = 0; j < ser[i].data.length; j++) {
      if (typeof ser[i].data[j][2] !== 'undefined') {
        this.threeDSeries.push(ser[i].data[j][2])
        gl.isDataXYZ = true
      }
    }
  }

  handleFormatXY(ser, i) {
    const cnf = this.w.config
    const gl = this.w.globals

    const dt = new DateTime(this.ctx)

    let activeI = i
    if (gl.collapsedSeriesIndices.indexOf(i) > -1) {
      // fix #368
      activeI = this.activeSeriesIndex
    }

    // get series
    for (let j = 0; j < ser[i].data.length; j++) {
      if (typeof ser[i].data[j].y !== 'undefined') {
        if (Array.isArray(ser[i].data[j].y)) {
          this.twoDSeries.push(
            Utils.parseNumber(ser[i].data[j].y[ser[i].data[j].y.length - 1])
          )
        } else {
          this.twoDSeries.push(Utils.parseNumber(ser[i].data[j].y))
        }
      }

      if (
        typeof ser[i].data[j].goals !== 'undefined' &&
        Array.isArray(ser[i].data[j].goals)
      ) {
        if (typeof this.seriesGoals[i] === 'undefined') {
          this.seriesGoals[i] = []
        }
        this.seriesGoals[i].push(ser[i].data[j].goals)
      } else {
        if (typeof this.seriesGoals[i] === 'undefined') {
          this.seriesGoals[i] = []
        }
        this.seriesGoals[i].push(null)
      }
    }

    // get seriesX
    for (let j = 0; j < ser[activeI].data.length; j++) {
      const isXString = typeof ser[activeI].data[j].x === 'string'
      const isXArr = Array.isArray(ser[activeI].data[j].x)
      const isXDate = !isXArr && !!dt.isValidDate(ser[activeI].data[j].x)

      if (isXString || isXDate) {
        // user supplied '01/01/2017' or a date string (a JS date object is not supported)
        if (isXString || cnf.xaxis.convertedCatToNumeric) {
          const isRangeColumn = gl.isBarHorizontal && gl.isRangeData

          if (cnf.xaxis.type === 'datetime' && !isRangeColumn) {
            this.twoDSeriesX.push(dt.parseDate(ser[activeI].data[j].x))
          } else {
            // a category and not a numeric x value
            this.fallbackToCategory = true
            this.twoDSeriesX.push(ser[activeI].data[j].x)

            if (
              !isNaN(ser[activeI].data[j].x) &&
              this.w.config.xaxis.type !== 'category' &&
              typeof ser[activeI].data[j].x !== 'string'
            ) {
              gl.isXNumeric = true
            }
          }
        } else {
          if (cnf.xaxis.type === 'datetime') {
            this.twoDSeriesX.push(
              dt.parseDate(ser[activeI].data[j].x.toString())
            )
          } else {
            gl.dataFormatXNumeric = true
            gl.isXNumeric = true
            this.twoDSeriesX.push(parseFloat(ser[activeI].data[j].x))
          }
        }
      } else if (isXArr) {
        // a multiline label described in array format
        this.fallbackToCategory = true
        this.twoDSeriesX.push(ser[activeI].data[j].x)
      } else {
        // a numeric value in x property
        gl.isXNumeric = true
        gl.dataFormatXNumeric = true
        this.twoDSeriesX.push(ser[activeI].data[j].x)
      }
    }

    if (ser[i].data[0] && typeof ser[i].data[0].z !== 'undefined') {
      for (let t = 0; t < ser[i].data.length; t++) {
        this.threeDSeries.push(ser[i].data[t].z)
      }
      gl.isDataXYZ = true
    }
  }

  handleRangeData(ser, i) {
    const gl = this.w.globals

    let range = {}
    if (this.isFormat2DArray()) {
      range = this.handleRangeDataFormat('array', ser, i)
    } else if (this.isFormatXY()) {
      range = this.handleRangeDataFormat('xy', ser, i)
    }

    // Fix: RangeArea Chart: hide all series results in a crash #3984
    gl.seriesRangeStart.push(range.start === undefined ? [] : range.start)
    gl.seriesRangeEnd.push(range.end === undefined ? [] : range.end)

    gl.seriesRange.push(range.rangeUniques)

    // check for overlaps to avoid clashes in a timeline chart
    gl.seriesRange.forEach((sr, si) => {
      if (sr) {
        sr.forEach((sarr, sarri) => {
          sarr.y.forEach((arr, arri) => {
            for (let sri = 0; sri < sarr.y.length; sri++) {
              if (arri !== sri) {
                const range1y1 = arr.y1
                const range1y2 = arr.y2
                const range2y1 = sarr.y[sri].y1
                const range2y2 = sarr.y[sri].y2
                if (range1y1 <= range2y2 && range2y1 <= range1y2) {
                  if (sarr.overlaps.indexOf(arr.rangeName) < 0) {
                    sarr.overlaps.push(arr.rangeName)
                  }
                  if (sarr.overlaps.indexOf(sarr.y[sri].rangeName) < 0) {
                    sarr.overlaps.push(sarr.y[sri].rangeName)
                  }
                }
              }
            }
          })
        })
      }
    })

    return range
  }

  handleCandleStickBoxData(ser, i) {
    const gl = this.w.globals

    let ohlc = {}
    if (this.isFormat2DArray()) {
      ohlc = this.handleCandleStickBoxDataFormat('array', ser, i)
    } else if (this.isFormatXY()) {
      ohlc = this.handleCandleStickBoxDataFormat('xy', ser, i)
    }

    gl.seriesCandleO[i] = ohlc.o
    gl.seriesCandleH[i] = ohlc.h
    gl.seriesCandleM[i] = ohlc.m
    gl.seriesCandleL[i] = ohlc.l
    gl.seriesCandleC[i] = ohlc.c

    return ohlc
  }

  handleRangeDataFormat(format, ser, i) {
    const rangeStart = []
    const rangeEnd = []

    const uniqueKeys = ser[i].data
      .filter(
        (thing, index, self) => index === self.findIndex((t) => t.x === thing.x)
      )
      .map((r, index) => {
        return {
          x: r.x,
          overlaps: [],
          y: [],
        }
      })

    if (format === 'array') {
      for (let j = 0; j < ser[i].data.length; j++) {
        if (Array.isArray(ser[i].data[j])) {
          rangeStart.push(ser[i].data[j][1][0])
          rangeEnd.push(ser[i].data[j][1][1])
        } else {
          rangeStart.push(ser[i].data[j])
          rangeEnd.push(ser[i].data[j])
        }
      }
    } else if (format === 'xy') {
      for (let j = 0; j < ser[i].data.length; j++) {
        let isDataPoint2D = Array.isArray(ser[i].data[j].y)
        const id = Utils.randomId()
        const x = ser[i].data[j].x
        const y = {
          y1: isDataPoint2D ? ser[i].data[j].y[0] : ser[i].data[j].y,
          y2: isDataPoint2D ? ser[i].data[j].y[1] : ser[i].data[j].y,
          rangeName: id,
        }

        // CAUTION: mutating config object by adding a new property
        // TODO: As this is specifically for timeline rangebar charts, update the docs mentioning the series only supports xy format
        ser[i].data[j].rangeName = id

        const uI = uniqueKeys.findIndex((t) => t.x === x)
        uniqueKeys[uI].y.push(y)

        rangeStart.push(y.y1)
        rangeEnd.push(y.y2)
      }
    }

    return {
      start: rangeStart,
      end: rangeEnd,
      rangeUniques: uniqueKeys,
    }
  }

  handleCandleStickBoxDataFormat(format, ser, i) {
    const w = this.w
    const isBoxPlot =
      w.config.chart.type === 'boxPlot' || w.config.series[i].type === 'boxPlot'

    const serO = []
    const serH = []
    const serM = []
    const serL = []
    const serC = []

    if (format === 'array') {
      if (
        (isBoxPlot && ser[i].data[0].length === 6) ||
        (!isBoxPlot && ser[i].data[0].length === 5)
      ) {
        for (let j = 0; j < ser[i].data.length; j++) {
          serO.push(ser[i].data[j][1])
          serH.push(ser[i].data[j][2])

          if (isBoxPlot) {
            serM.push(ser[i].data[j][3])
            serL.push(ser[i].data[j][4])
            serC.push(ser[i].data[j][5])
          } else {
            serL.push(ser[i].data[j][3])
            serC.push(ser[i].data[j][4])
          }
        }
      } else {
        for (let j = 0; j < ser[i].data.length; j++) {
          if (Array.isArray(ser[i].data[j][1])) {
            serO.push(ser[i].data[j][1][0])
            serH.push(ser[i].data[j][1][1])
            if (isBoxPlot) {
              serM.push(ser[i].data[j][1][2])
              serL.push(ser[i].data[j][1][3])
              serC.push(ser[i].data[j][1][4])
            } else {
              serL.push(ser[i].data[j][1][2])
              serC.push(ser[i].data[j][1][3])
            }
          }
        }
      }
    } else if (format === 'xy') {
      for (let j = 0; j < ser[i].data.length; j++) {
        if (Array.isArray(ser[i].data[j].y)) {
          serO.push(ser[i].data[j].y[0])
          serH.push(ser[i].data[j].y[1])
          if (isBoxPlot) {
            serM.push(ser[i].data[j].y[2])
            serL.push(ser[i].data[j].y[3])
            serC.push(ser[i].data[j].y[4])
          } else {
            serL.push(ser[i].data[j].y[2])
            serC.push(ser[i].data[j].y[3])
          }
        }
      }
    }

    return {
      o: serO,
      h: serH,
      m: serM,
      l: serL,
      c: serC,
    }
  }

  parseDataAxisCharts(ser, ctx = this.ctx) {
    const cnf = this.w.config
    const gl = this.w.globals

    const dt = new DateTime(ctx)

    const xlabels =
      cnf.labels.length > 0 ? cnf.labels.slice() : cnf.xaxis.categories.slice()

    gl.isRangeBar = cnf.chart.type === 'rangeBar' && gl.isBarHorizontal

    gl.hasXaxisGroups =
      cnf.xaxis.type === 'category' && cnf.xaxis.group.groups.length > 0
    if (gl.hasXaxisGroups) {
      gl.groups = cnf.xaxis.group.groups
    }

    ser.forEach((s, i) => {
      if (s.name !== undefined) {
        gl.seriesNames.push(s.name)
      } else {
        gl.seriesNames.push('series-' + parseInt(i + 1, 10))
      }
    })

    this.coreUtils.setSeriesYAxisMappings()
    // At this point, every series that didn't have a user defined group name
    // has been given a name according to the yaxis the series is referenced by.
    // This fits the existing behaviour where all series associated with an axis
    // are defacto presented as a single group. It is now formalised.
    let buckets = []
    let groups = [...new Set(cnf.series.map((s) => s.group))]
    cnf.series.forEach((s, i) => {
      let index = groups.indexOf(s.group)
      if (!buckets[index]) buckets[index] = []

      buckets[index].push(gl.seriesNames[i])
    })
    gl.seriesGroups = buckets

    const handleDates = () => {
      for (let j = 0; j < xlabels.length; j++) {
        if (typeof xlabels[j] === 'string') {
          // user provided date strings
          let isDate = dt.isValidDate(xlabels[j])
          if (isDate) {
            this.twoDSeriesX.push(dt.parseDate(xlabels[j]))
          } else {
            throw new Error(
              'You have provided invalid Date format. Please provide a valid JavaScript Date'
            )
          }
        } else {
          // user provided timestamps
          this.twoDSeriesX.push(xlabels[j])
        }
      }
    }

    for (let i = 0; i < ser.length; i++) {
      this.twoDSeries = []
      this.twoDSeriesX = []
      this.threeDSeries = []

      if (typeof ser[i].data === 'undefined') {
        console.error(
          "It is a possibility that you may have not included 'data' property in series."
        )
        return
      }

      if (
        cnf.chart.type === 'rangeBar' ||
        cnf.chart.type === 'rangeArea' ||
        ser[i].type === 'rangeBar' ||
        ser[i].type === 'rangeArea'
      ) {
        gl.isRangeData = true
        if (cnf.chart.type === 'rangeBar' || cnf.chart.type === 'rangeArea') {
          this.handleRangeData(ser, i)
        }
      }

      if (this.isMultiFormat()) {
        if (this.isFormat2DArray()) {
          this.handleFormat2DArray(ser, i)
        } else if (this.isFormatXY()) {
          this.handleFormatXY(ser, i)
        }

        if (
          cnf.chart.type === 'candlestick' ||
          ser[i].type === 'candlestick' ||
          cnf.chart.type === 'boxPlot' ||
          ser[i].type === 'boxPlot'
        ) {
          this.handleCandleStickBoxData(ser, i)
        }

        gl.series.push(this.twoDSeries)
        gl.labels.push(this.twoDSeriesX)
        gl.seriesX.push(this.twoDSeriesX)
        gl.seriesGoals = this.seriesGoals

        if (i === this.activeSeriesIndex && !this.fallbackToCategory) {
          gl.isXNumeric = true
        }
      } else {
        if (cnf.xaxis.type === 'datetime') {
          // user didn't supplied [{x,y}] or [[x,y]], but single array in data.
          // Also labels/categories were supplied differently
          gl.isXNumeric = true

          handleDates()

          gl.seriesX.push(this.twoDSeriesX)
        } else if (cnf.xaxis.type === 'numeric') {
          gl.isXNumeric = true

          if (xlabels.length > 0) {
            this.twoDSeriesX = xlabels
            gl.seriesX.push(this.twoDSeriesX)
          }
        }
        gl.labels.push(this.twoDSeriesX)
        const singleArray = ser[i].data.map((d) => Utils.parseNumber(d))
        gl.series.push(singleArray)
      }

      gl.seriesZ.push(this.threeDSeries)

      // overrided default color if user inputs color with series data
      if (ser[i].color !== undefined) {
        gl.seriesColors.push(ser[i].color)
      } else {
        gl.seriesColors.push(undefined)
      }
    }

    return this.w
  }

  parseDataNonAxisCharts(ser) {
    const gl = this.w.globals
    const cnf = this.w.config

    gl.series = ser.slice()
    gl.seriesNames = cnf.labels.slice()
    for (let i = 0; i < gl.series.length; i++) {
      if (gl.seriesNames[i] === undefined) {
        gl.seriesNames.push('series-' + (i + 1))
      }
    }

    return this.w
  }

  /** User possibly set string categories in xaxis.categories or labels prop
   * Or didn't set xaxis labels at all - in which case we manually do it.
   * If user passed series data as [[3, 2], [4, 5]] or [{ x: 3, y: 55 }],
   * this shouldn't be called
   * @param {array} ser - the series which user passed to the config
   */
  handleExternalLabelsData(ser) {
    const cnf = this.w.config
    const gl = this.w.globals

    if (cnf.xaxis.categories.length > 0) {
      // user provided labels in xaxis.category prop
      gl.labels = cnf.xaxis.categories
    } else if (cnf.labels.length > 0) {
      // user provided labels in labels props
      gl.labels = cnf.labels.slice()
    } else if (this.fallbackToCategory) {
      // user provided labels in x prop in [{ x: 3, y: 55 }] data, and those labels are already stored in gl.labels[0], so just re-arrange the gl.labels array
      gl.labels = gl.labels[0]

      if (gl.seriesRange.length) {
        gl.seriesRange.map((srt) => {
          srt.forEach((sr) => {
            if (gl.labels.indexOf(sr.x) < 0 && sr.x) {
              gl.labels.push(sr.x)
            }
          })
        })
        // remove duplicate x-axis labels
        gl.labels = Array.from(
          new Set(gl.labels.map(JSON.stringify)),
          JSON.parse
        )
      }

      if (cnf.xaxis.convertedCatToNumeric) {
        const defaults = new Defaults(cnf)
        defaults.convertCatToNumericXaxis(cnf, this.ctx, gl.seriesX[0])
        this._generateExternalLabels(ser)
      }
    } else {
      this._generateExternalLabels(ser)
    }
  }

  _generateExternalLabels(ser) {
    const gl = this.w.globals
    const cnf = this.w.config
    // user didn't provided any labels, fallback to 1-2-3-4-5
    let labelArr = []

    if (gl.axisCharts) {
      if (gl.series.length > 0) {
        if (this.isFormatXY()) {
          // in case there is a combo chart (boxplot/scatter)
          // and there are duplicated x values, we need to eliminate duplicates
          const seriesDataFiltered = cnf.series.map((serie, s) => {
            return serie.data.filter(
              (v, i, a) => a.findIndex((t) => t.x === v.x) === i
            )
          })

          const len = seriesDataFiltered.reduce(
            (p, c, i, a) => (a[p].length > c.length ? p : i),
            0
          )

          for (let i = 0; i < seriesDataFiltered[len].length; i++) {
            labelArr.push(i + 1)
          }
        } else {
          for (let i = 0; i < gl.series[gl.maxValsInArrayIndex].length; i++) {
            labelArr.push(i + 1)
          }
        }
      }

      gl.seriesX = []
      // create gl.seriesX as it will be used in calculations of x positions
      for (let i = 0; i < ser.length; i++) {
        gl.seriesX.push(labelArr)
      }

      // turn on the isXNumeric flag to allow minX and maxX to function properly
      if (!this.w.globals.isBarHorizontal) {
        gl.isXNumeric = true
      }
    }

    // no series to pull labels from, put a 0-10 series
    // possibly, user collapsed all series. Hence we can't work with above calc
    if (labelArr.length === 0) {
      labelArr = gl.axisCharts
        ? []
        : gl.series.map((gls, glsi) => {
            return glsi + 1
          })
      for (let i = 0; i < ser.length; i++) {
        gl.seriesX.push(labelArr)
      }
    }

    // Finally, pass the labelArr in gl.labels which will be printed on x-axis
    gl.labels = labelArr

    if (cnf.xaxis.convertedCatToNumeric) {
      gl.categoryLabels = labelArr.map((l) => {
        return cnf.xaxis.labels.formatter(l)
      })
    }

    // Turn on this global flag to indicate no labels were provided by user
    gl.noLabelsProvided = true
  }

  // Segregate user provided data into appropriate vars
  parseData(ser) {
    let w = this.w
    let cnf = w.config
    let gl = w.globals
    this.excludeCollapsedSeriesInYAxis()

    // If we detected string in X prop of series, we fallback to category x-axis
    this.fallbackToCategory = false

    this.ctx.core.resetGlobals()
    this.ctx.core.isMultipleY()

    if (gl.axisCharts) {
      // axisCharts includes line / area / column / scatter
      this.parseDataAxisCharts(ser)
      this.coreUtils.getLargestSeries()
    } else {
      // non-axis charts are pie / donut
      this.parseDataNonAxisCharts(ser)
    }

    // set Null values to 0 in all series when user hides/shows some series
    if (cnf.chart.stacked) {
      const series = new Series(this.ctx)
      gl.series = series.setNullSeriesToZeroValues(gl.series)
    }

    this.coreUtils.getSeriesTotals()
    if (gl.axisCharts) {
      gl.stackedSeriesTotals = this.coreUtils.getStackedSeriesTotals()
      gl.stackedSeriesTotalsByGroups =
        this.coreUtils.getStackedSeriesTotalsByGroups()
    }

    this.coreUtils.getPercentSeries()

    if (
      !gl.dataFormatXNumeric &&
      (!gl.isXNumeric ||
        (cnf.xaxis.type === 'numeric' &&
          cnf.labels.length === 0 &&
          cnf.xaxis.categories.length === 0))
    ) {
      // x-axis labels couldn't be detected; hence try searching every option in config
      this.handleExternalLabelsData(ser)
    }

    // check for multiline xaxis
    const catLabels = this.coreUtils.getCategoryLabels(gl.labels)
    for (let l = 0; l < catLabels.length; l++) {
      if (Array.isArray(catLabels[l])) {
        gl.isMultiLineX = true
        break
      }
    }
  }

  excludeCollapsedSeriesInYAxis() {
    const w = this.w
    // Post revision 3.46.0 there is no longer a strict one-to-one
    // correspondence between series and Y axes.
    // An axis can be ignored only while all series referenced by it
    // are collapsed.
    let yAxisIndexes = []
    w.globals.seriesYAxisMap.forEach((yAxisArr, yi) => {
      let collapsedCount = 0
      yAxisArr.forEach((seriesIndex) => {
        if (w.globals.collapsedSeriesIndices.indexOf(seriesIndex) !== -1) {
          collapsedCount++
        }
      })
      // It's possible to have a yaxis that doesn't reference any series yet,
      // eg, because there are no series' yet, so don't list it as ignored
      // prematurely.
      if (collapsedCount > 0 && collapsedCount == yAxisArr.length) {
        yAxisIndexes.push(yi)
      }
    })
    w.globals.ignoreYAxisIndexes = yAxisIndexes.map((x) => x)
  }
}
