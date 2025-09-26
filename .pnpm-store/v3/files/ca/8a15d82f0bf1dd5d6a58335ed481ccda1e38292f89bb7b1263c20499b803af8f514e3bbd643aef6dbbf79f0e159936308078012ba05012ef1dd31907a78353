import Data from '../modules/Data'
import AxesUtils from '../modules/axes/AxesUtils'
import Series from '../modules/Series'
import Utils from '../utils/Utils'

class Exports {
  constructor(ctx) {
    this.ctx = ctx
    this.w = ctx.w
  }

  scaleSvgNode(svg, scale) {
    // get current both width and height of the svg
    let svgWidth = parseFloat(svg.getAttributeNS(null, 'width'))
    let svgHeight = parseFloat(svg.getAttributeNS(null, 'height'))
    // set new width and height based on the scale
    svg.setAttributeNS(null, 'width', svgWidth * scale)
    svg.setAttributeNS(null, 'height', svgHeight * scale)
    svg.setAttributeNS(null, 'viewBox', '0 0 ' + svgWidth + ' ' + svgHeight)
  }

  getSvgString() {
    return new Promise((resolve) => {
      const w = this.w
      const width = w.config.chart.toolbar.export.width
      let scale =
        w.config.chart.toolbar.export.scale || width / w.globals.svgWidth

      if (!scale) {
        scale = 1 // if no scale is specified, don't scale...
      }
      let svgString = this.w.globals.dom.Paper.svg()

      // clone the svg node so it remains intact in the UI
      const svgNode = this.w.globals.dom.Paper.node.cloneNode(true)

      // in case the scale is different than 1, the svg needs to be rescaled

      if (scale !== 1) {
        // scale the image
        this.scaleSvgNode(svgNode, scale)
      }
      // Convert image URLs to base64
      this.convertImagesToBase64(svgNode).then(() => {
        svgString = new XMLSerializer().serializeToString(svgNode)
        resolve(svgString.replace(/&nbsp;/g, '&#160;'))
      })
    })
  }

  convertImagesToBase64(svgNode) {
    const images = svgNode.getElementsByTagName('image')
    const promises = Array.from(images).map((img) => {
      const href = img.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
      if (href && !href.startsWith('data:')) {
        return this.getBase64FromUrl(href)
          .then((base64) => {
            img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', base64)
          })
          .catch((error) => {
            console.error('Error converting image to base64:', error)
          })
      }
      return Promise.resolve()
    })
    return Promise.all(promises)
  }

  getBase64FromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL())
      }
      img.onerror = reject
      img.src = url
    })
  }

  cleanup() {
    const w = this.w

    // hide some elements to avoid printing them on exported svg
    const xcrosshairs = w.globals.dom.baseEl.getElementsByClassName(
      'apexcharts-xcrosshairs'
    )
    const ycrosshairs = w.globals.dom.baseEl.getElementsByClassName(
      'apexcharts-ycrosshairs'
    )
    const zoomSelectionRects = w.globals.dom.baseEl.querySelectorAll(
      '.apexcharts-zoom-rect, .apexcharts-selection-rect'
    )
    Array.prototype.forEach.call(zoomSelectionRects, (z) => {
      z.setAttribute('width', 0)
    })
    if (xcrosshairs && xcrosshairs[0]) {
      xcrosshairs[0].setAttribute('x', -500)
      xcrosshairs[0].setAttribute('x1', -500)
      xcrosshairs[0].setAttribute('x2', -500)
    }
    if (ycrosshairs && ycrosshairs[0]) {
      ycrosshairs[0].setAttribute('y', -100)
      ycrosshairs[0].setAttribute('y1', -100)
      ycrosshairs[0].setAttribute('y2', -100)
    }
  }

  svgUrl() {
    return new Promise((resolve) => {
      this.cleanup()
      this.getSvgString().then((svgData) => {
        const svgBlob = new Blob([svgData], {
          type: 'image/svg+xml;charset=utf-8',
        })
        resolve(URL.createObjectURL(svgBlob))
      })
    })
  }

  dataURI(options) {
    return new Promise((resolve) => {
      const w = this.w

      const scale = options
        ? options.scale || options.width / w.globals.svgWidth
        : 1

      this.cleanup()
      const canvas = document.createElement('canvas')
      canvas.width = w.globals.svgWidth * scale
      canvas.height = parseInt(w.globals.dom.elWrap.style.height, 10) * scale // because of resizeNonAxisCharts

      const canvasBg =
        w.config.chart.background === 'transparent' ||
        !w.config.chart.background
          ? '#fff'
          : w.config.chart.background

      let ctx = canvas.getContext('2d')
      ctx.fillStyle = canvasBg
      ctx.fillRect(0, 0, canvas.width * scale, canvas.height * scale)

      this.getSvgString().then((svgData) => {
        const svgUrl = 'data:image/svg+xml,' + encodeURIComponent(svgData)
        let img = new Image()
        img.crossOrigin = 'anonymous'

        img.onload = () => {
          ctx.drawImage(img, 0, 0)

          if (canvas.msToBlob) {
            // Microsoft Edge can't navigate to data urls, so we return the blob instead
            let blob = canvas.msToBlob()
            resolve({ blob })
          } else {
            let imgURI = canvas.toDataURL('image/png')
            resolve({ imgURI })
          }
        }

        img.src = svgUrl
      })
    })
  }

  exportToSVG() {
    this.svgUrl().then((url) => {
      this.triggerDownload(
        url,
        this.w.config.chart.toolbar.export.svg.filename,
        '.svg'
      )
    })
  }

  exportToPng() {
    const scale = this.w.config.chart.toolbar.export.scale
    const width = this.w.config.chart.toolbar.export.width
    const option = scale
      ? { scale: scale }
      : width
      ? { width: width }
      : undefined
    this.dataURI(option).then(({ imgURI, blob }) => {
      if (blob) {
        navigator.msSaveOrOpenBlob(blob, this.w.globals.chartID + '.png')
      } else {
        this.triggerDownload(
          imgURI,
          this.w.config.chart.toolbar.export.png.filename,
          '.png'
        )
      }
    })
  }

  exportToCSV({
    series,
    fileName,
    columnDelimiter = ',',
    lineDelimiter = '\n',
  }) {
    const w = this.w

    if (!series) series = w.config.series

    let columns = []
    let rows = []
    let result = ''
    let universalBOM = '\uFEFF'
    let gSeries = w.globals.series.map((s, i) => {
      return w.globals.collapsedSeriesIndices.indexOf(i) === -1 ? s : []
    })

    const getFormattedCategory = (cat) => {
      if (
        typeof w.config.chart.toolbar.export.csv.categoryFormatter ===
        'function'
      ) {
        return w.config.chart.toolbar.export.csv.categoryFormatter(cat)
      }

      if (w.config.xaxis.type === 'datetime' && String(cat).length >= 10) {
        return new Date(cat).toDateString()
      }
      return Utils.isNumber(cat) ? cat : cat.split(columnDelimiter).join('')
    }

    const getFormattedValue = (value) => {
      return typeof w.config.chart.toolbar.export.csv.valueFormatter ===
        'function'
        ? w.config.chart.toolbar.export.csv.valueFormatter(value)
        : value
    }

    const seriesMaxDataLength = Math.max(
      ...series.map((s) => {
        return s.data ? s.data.length : 0
      })
    )
    const dataFormat = new Data(this.ctx)

    const axesUtils = new AxesUtils(this.ctx)
    const getCat = (i) => {
      let cat = ''

      // pie / donut/ radial
      if (!w.globals.axisCharts) {
        cat = w.config.labels[i]
      } else {
        // xy charts

        // non datetime
        if (
          w.config.xaxis.type === 'category' ||
          w.config.xaxis.convertedCatToNumeric
        ) {
          if (w.globals.isBarHorizontal) {
            let lbFormatter = w.globals.yLabelFormatters[0]
            let sr = new Series(this.ctx)
            let activeSeries = sr.getActiveConfigSeriesIndex()

            cat = lbFormatter(w.globals.labels[i], {
              seriesIndex: activeSeries,
              dataPointIndex: i,
              w,
            })
          } else {
            cat = axesUtils.getLabel(
              w.globals.labels,
              w.globals.timescaleLabels,
              0,
              i
            ).text
          }
        }

        // datetime, but labels specified in categories or labels
        if (w.config.xaxis.type === 'datetime') {
          if (w.config.xaxis.categories.length) {
            cat = w.config.xaxis.categories[i]
          } else if (w.config.labels.length) {
            cat = w.config.labels[i]
          }
        }
      }

      // let the caller know the current category is null. this can happen for example
      // when dealing with line charts having inconsistent time series data
      if (cat === null) return 'nullvalue'

      if (Array.isArray(cat)) {
        cat = cat.join(' ')
      }

      return Utils.isNumber(cat) ? cat : cat.split(columnDelimiter).join('')
    }

    // Fix https://github.com/apexcharts/apexcharts.js/issues/3365
    const getEmptyDataForCsvColumn = () => {
      return [...Array(seriesMaxDataLength)].map(() => '')
    }

    const handleAxisRowsColumns = (s, sI) => {
      if (columns.length && sI === 0) {
        // It's the first series.  Go ahead and create the first row with header information.
        rows.push(columns.join(columnDelimiter))
      }

      if (s.data) {
        // Use the data we have, or generate a properly sized empty array with empty data if some data is missing.
        s.data = (s.data.length && s.data) || getEmptyDataForCsvColumn()
        for (let i = 0; i < s.data.length; i++) {
          // Reset the columns array so that we can start building columns for this row.
          columns = []

          let cat = getCat(i)

          // current category is null, let's move on to the next one
          if (cat === 'nullvalue') continue

          if (!cat) {
            if (dataFormat.isFormatXY()) {
              cat = series[sI].data[i].x
            } else if (dataFormat.isFormat2DArray()) {
              cat = series[sI].data[i] ? series[sI].data[i][0] : ''
            }
          }

          if (sI === 0) {
            // It's the first series.  Also handle the category.
            columns.push(getFormattedCategory(cat))

            for (let ci = 0; ci < w.globals.series.length; ci++) {
              const value = dataFormat.isFormatXY()
                ? series[ci].data[i]?.y
                : gSeries[ci][i]
              columns.push(getFormattedValue(value))
            }
          }

          if (
            w.config.chart.type === 'candlestick' ||
            (s.type && s.type === 'candlestick')
          ) {
            columns.pop()
            columns.push(w.globals.seriesCandleO[sI][i])
            columns.push(w.globals.seriesCandleH[sI][i])
            columns.push(w.globals.seriesCandleL[sI][i])
            columns.push(w.globals.seriesCandleC[sI][i])
          }

          if (
            w.config.chart.type === 'boxPlot' ||
            (s.type && s.type === 'boxPlot')
          ) {
            columns.pop()
            columns.push(w.globals.seriesCandleO[sI][i])
            columns.push(w.globals.seriesCandleH[sI][i])
            columns.push(w.globals.seriesCandleM[sI][i])
            columns.push(w.globals.seriesCandleL[sI][i])
            columns.push(w.globals.seriesCandleC[sI][i])
          }

          if (w.config.chart.type === 'rangeBar') {
            columns.pop()
            columns.push(w.globals.seriesRangeStart[sI][i])
            columns.push(w.globals.seriesRangeEnd[sI][i])
          }

          if (columns.length) {
            rows.push(columns.join(columnDelimiter))
          }
        }
      }
    }

    const handleUnequalXValues = () => {
      const categories = new Set()
      const data = {}

      series.forEach((s, sI) => {
        s?.data.forEach((dataItem) => {
          let cat, value
          if (dataFormat.isFormatXY()) {
            cat = dataItem.x
            value = dataItem.y
          } else if (dataFormat.isFormat2DArray()) {
            cat = dataItem[0]
            value = dataItem[1]
          } else {
            return
          }
          if (!data[cat]) {
            data[cat] = Array(series.length).fill('')
          }
          data[cat][sI] = getFormattedValue(value)
          categories.add(cat)
        })
      })

      if (columns.length) {
        rows.push(columns.join(columnDelimiter))
      }

      Array.from(categories)
        .sort()
        .forEach((cat) => {
          rows.push([
            getFormattedCategory(cat),
            data[cat].join(columnDelimiter),
          ])
        })
    }

    columns.push(w.config.chart.toolbar.export.csv.headerCategory)

    if (w.config.chart.type === 'boxPlot') {
      columns.push('minimum')
      columns.push('q1')
      columns.push('median')
      columns.push('q3')
      columns.push('maximum')
    } else if (w.config.chart.type === 'candlestick') {
      columns.push('open')
      columns.push('high')
      columns.push('low')
      columns.push('close')
    } else if (w.config.chart.type === 'rangeBar') {
      columns.push('minimum')
      columns.push('maximum')
    } else {
      series.map((s, sI) => {
        const sname = (s.name ? s.name : `series-${sI}`) + ''
        if (w.globals.axisCharts) {
          columns.push(
            sname.split(columnDelimiter).join('')
              ? sname.split(columnDelimiter).join('')
              : `series-${sI}`
          )
        }
      })
    }

    if (!w.globals.axisCharts) {
      columns.push(w.config.chart.toolbar.export.csv.headerValue)
      rows.push(columns.join(columnDelimiter))
    }

    if (
      !w.globals.allSeriesHasEqualX &&
      w.globals.axisCharts &&
      !w.config.xaxis.categories.length &&
      !w.config.labels.length
    ) {
      handleUnequalXValues()
    } else {
      series.map((s, sI) => {
        if (w.globals.axisCharts) {
          handleAxisRowsColumns(s, sI)
        } else {
          columns = []

          columns.push(getFormattedCategory(w.globals.labels[sI]))
          columns.push(getFormattedValue(gSeries[sI]))
          rows.push(columns.join(columnDelimiter))
        }
      })
    }

    result += rows.join(lineDelimiter)

    this.triggerDownload(
      'data:text/csv; charset=utf-8,' +
        encodeURIComponent(universalBOM + result),
      fileName ? fileName : w.config.chart.toolbar.export.csv.filename,
      '.csv'
    )
  }

  triggerDownload(href, filename, ext) {
    const downloadLink = document.createElement('a')
    downloadLink.href = href
    downloadLink.download = (filename ? filename : this.w.globals.chartID) + ext
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }
}

export default Exports
