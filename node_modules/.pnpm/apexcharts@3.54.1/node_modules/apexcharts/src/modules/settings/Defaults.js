import Utils from '../../utils/Utils'
import DateTime from '../../utils/DateTime'
import Formatters from '../Formatters'

/**
 * ApexCharts Default Class for setting default options for all chart types.
 *
 * @module Defaults
 **/

const getRangeValues = ({
  isTimeline,
  ctx,
  seriesIndex,
  dataPointIndex,
  y1,
  y2,
  w,
}) => {
  let start = w.globals.seriesRangeStart[seriesIndex][dataPointIndex]
  let end = w.globals.seriesRangeEnd[seriesIndex][dataPointIndex]
  let ylabel = w.globals.labels[dataPointIndex]
  let seriesName = w.config.series[seriesIndex].name
    ? w.config.series[seriesIndex].name
    : ''
  const yLbFormatter = w.globals.ttKeyFormatter
  const yLbTitleFormatter = w.config.tooltip.y.title.formatter

  const opts = {
    w,
    seriesIndex,
    dataPointIndex,
    start,
    end,
  }

  if (typeof yLbTitleFormatter === 'function') {
    seriesName = yLbTitleFormatter(seriesName, opts)
  }
  if (w.config.series[seriesIndex].data[dataPointIndex]?.x) {
    ylabel = w.config.series[seriesIndex].data[dataPointIndex].x
  }

  if (!isTimeline) {
    if (w.config.xaxis.type === 'datetime') {
      let xFormat = new Formatters(ctx)
      ylabel = xFormat.xLabelFormat(w.globals.ttKeyFormatter, ylabel, ylabel, {
        i: undefined,
        dateFormatter: new DateTime(ctx).formatDate,
        w,
      })
    }
  }

  if (typeof yLbFormatter === 'function') {
    ylabel = yLbFormatter(ylabel, opts)
  }
  if (Number.isFinite(y1) && Number.isFinite(y2)) {
    start = y1
    end = y2
  }

  let startVal = ''
  let endVal = ''

  const color = w.globals.colors[seriesIndex]
  if (w.config.tooltip.x.formatter === undefined) {
    if (w.config.xaxis.type === 'datetime') {
      let datetimeObj = new DateTime(ctx)
      startVal = datetimeObj.formatDate(
        datetimeObj.getDate(start),
        w.config.tooltip.x.format
      )
      endVal = datetimeObj.formatDate(
        datetimeObj.getDate(end),
        w.config.tooltip.x.format
      )
    } else {
      startVal = start
      endVal = end
    }
  } else {
    startVal = w.config.tooltip.x.formatter(start)
    endVal = w.config.tooltip.x.formatter(end)
  }

  return { start, end, startVal, endVal, ylabel, color, seriesName }
}
const buildRangeTooltipHTML = (opts) => {
  let { color, seriesName, ylabel, start, end, seriesIndex, dataPointIndex } =
    opts

  const formatter = opts.ctx.tooltip.tooltipLabels.getFormatters(seriesIndex)

  start = formatter.yLbFormatter(start)
  end = formatter.yLbFormatter(end)
  const val = formatter.yLbFormatter(
    opts.w.globals.series[seriesIndex][dataPointIndex]
  )

  let valueHTML = ''
  const rangeValues = `<span class="value start-value">
  ${start}
  </span> <span class="separator">-</span> <span class="value end-value">
  ${end}
  </span>`

  if (opts.w.globals.comboCharts) {
    if (
      opts.w.config.series[seriesIndex].type === 'rangeArea' ||
      opts.w.config.series[seriesIndex].type === 'rangeBar'
    ) {
      valueHTML = rangeValues
    } else {
      valueHTML = `<span>${val}</span>`
    }
  } else {
    valueHTML = rangeValues
  }
  return (
    '<div class="apexcharts-tooltip-rangebar">' +
    '<div> <span class="series-name" style="color: ' +
    color +
    '">' +
    (seriesName ? seriesName : '') +
    '</span></div>' +
    '<div> <span class="category">' +
    ylabel +
    ': </span> ' +
    valueHTML +
    ' </div>' +
    '</div>'
  )
}

export default class Defaults {
  constructor(opts) {
    this.opts = opts
  }

  hideYAxis() {
    this.opts.yaxis[0].show = false
    this.opts.yaxis[0].title.text = ''
    this.opts.yaxis[0].axisBorder.show = false
    this.opts.yaxis[0].axisTicks.show = false
    this.opts.yaxis[0].floating = true
  }

  line() {
    return {
      chart: {
        animations: {
          easing: 'swing',
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 5,
        curve: 'straight',
      },
      markers: {
        size: 0,
        hover: {
          sizeOffset: 6,
        },
      },
      xaxis: {
        crosshairs: {
          width: 1,
        },
      },
    }
  }

  sparkline(defaults) {
    this.hideYAxis()
    const ret = {
      grid: {
        show: false,
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
      legend: {
        show: false,
      },
      xaxis: {
        labels: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      chart: {
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
    }

    return Utils.extend(defaults, ret)
  }

  slope() {
    this.hideYAxis()

    return {
      chart: {
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: true,
        formatter(val, opts) {
          const seriesName = opts.w.config.series[opts.seriesIndex].name
          return val !== null ? seriesName + ': ' + val : ''
        },
        background: {
          enabled: false,
        },
        offsetX: -5,
      },
      grid: {
        xaxis: {
          lines: {
            show: true,
          },
        },
        yaxis: {
          lines: {
            show: false,
          },
        },
      },
      xaxis: {
        position: 'top',
        labels: {
          style: {
            fontSize: 14,
            fontWeight: 900,
          },
        },
        tooltip: {
          enabled: false,
        },
        crosshairs: {
          show: false,
        },
      },
      markers: {
        size: 8,
        hover: {
          sizeOffset: 1,
        },
      },
      legend: {
        show: false,
      },
      tooltip: {
        shared: false,
        intersect: true,
        followCursor: true,
      },
      stroke: {
        width: 5,
        curve: 'straight',
      },
    }
  }

  bar() {
    return {
      chart: {
        stacked: false,
        animations: {
          easing: 'swing',
        },
      },
      plotOptions: {
        bar: {
          dataLabels: {
            position: 'center',
          },
        },
      },
      dataLabels: {
        style: {
          colors: ['#fff'],
        },
        background: {
          enabled: false,
        },
      },
      stroke: {
        width: 0,
        lineCap: 'round',
      },
      fill: {
        opacity: 0.85,
      },
      legend: {
        markers: {
          shape: 'square',
        },
      },
      tooltip: {
        shared: false,
        intersect: true,
      },
      xaxis: {
        tooltip: {
          enabled: false,
        },
        tickPlacement: 'between',
        crosshairs: {
          width: 'barWidth',
          position: 'back',
          fill: {
            type: 'gradient',
          },
          dropShadow: {
            enabled: false,
          },
          stroke: {
            width: 0,
          },
        },
      },
    }
  }

  funnel() {
    this.hideYAxis()

    return {
      ...this.bar(),
      chart: {
        animations: {
          easing: 'linear',
          speed: 800,
          animateGradually: {
            enabled: false,
          },
        },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadiusApplication: 'around',
          borderRadius: 0,
          dataLabels: {
            position: 'center',
          },
        },
      },
      grid: {
        show: false,
        padding: {
          left: 0,
          right: 0,
        },
      },
      xaxis: {
        labels: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
    }
  }

  candlestick() {
    return {
      stroke: {
        width: 1,
        colors: ['#333'],
      },
      fill: {
        opacity: 1,
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        shared: true,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          return this._getBoxTooltip(
            w,
            seriesIndex,
            dataPointIndex,
            ['Open', 'High', '', 'Low', 'Close'],
            'candlestick'
          )
        },
      },
      states: {
        active: {
          filter: {
            type: 'none',
          },
        },
      },
      xaxis: {
        crosshairs: {
          width: 1,
        },
      },
    }
  }

  boxPlot() {
    return {
      chart: {
        animations: {
          dynamicAnimation: {
            enabled: false,
          },
        },
      },
      stroke: {
        width: 1,
        colors: ['#24292e'],
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        shared: true,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          return this._getBoxTooltip(
            w,
            seriesIndex,
            dataPointIndex,
            ['Minimum', 'Q1', 'Median', 'Q3', 'Maximum'],
            'boxPlot'
          )
        },
      },
      markers: {
        size: 7,
        strokeWidth: 1,
        strokeColors: '#111',
      },
      xaxis: {
        crosshairs: {
          width: 1,
        },
      },
    }
  }

  rangeBar() {
    const handleTimelineTooltip = (opts) => {
      const { color, seriesName, ylabel, startVal, endVal } = getRangeValues({
        ...opts,
        isTimeline: true,
      })
      return buildRangeTooltipHTML({
        ...opts,
        color,
        seriesName,
        ylabel,
        start: startVal,
        end: endVal,
      })
    }

    const handleRangeColumnTooltip = (opts) => {
      const { color, seriesName, ylabel, start, end } = getRangeValues(opts)
      return buildRangeTooltipHTML({
        ...opts,
        color,
        seriesName,
        ylabel,
        start,
        end,
      })
    }
    return {
      chart: {
        animations: {
          animateGradually: false,
        },
      },
      stroke: {
        width: 0,
        lineCap: 'square',
      },
      plotOptions: {
        bar: {
          borderRadius: 0,
          dataLabels: {
            position: 'center',
          },
        },
      },
      dataLabels: {
        enabled: false,
        formatter(val, { ctx, seriesIndex, dataPointIndex, w }) {
          const getVal = () => {
            const start =
              w.globals.seriesRangeStart[seriesIndex][dataPointIndex]
            const end = w.globals.seriesRangeEnd[seriesIndex][dataPointIndex]
            return end - start
          }
          if (w.globals.comboCharts) {
            if (
              w.config.series[seriesIndex].type === 'rangeBar' ||
              w.config.series[seriesIndex].type === 'rangeArea'
            ) {
              return getVal()
            } else {
              return val
            }
          } else {
            return getVal()
          }
        },
        background: {
          enabled: false,
        },
        style: {
          colors: ['#fff'],
        },
      },
      markers: {
        size: 10,
      },
      tooltip: {
        shared: false,
        followCursor: true,
        custom(opts) {
          if (
            opts.w.config.plotOptions &&
            opts.w.config.plotOptions.bar &&
            opts.w.config.plotOptions.bar.horizontal
          ) {
            return handleTimelineTooltip(opts)
          } else {
            return handleRangeColumnTooltip(opts)
          }
        },
      },
      xaxis: {
        tickPlacement: 'between',
        tooltip: {
          enabled: false,
        },
        crosshairs: {
          stroke: {
            width: 0,
          },
        },
      },
    }
  }

  dumbbell(opts) {
    if (!opts.plotOptions.bar?.barHeight) {
      opts.plotOptions.bar.barHeight = 2
    }
    if (!opts.plotOptions.bar?.columnWidth) {
      opts.plotOptions.bar.columnWidth = 2
    }
    return opts
  }

  area() {
    return {
      stroke: {
        width: 4,
        fill: {
          type: 'solid',
          gradient: {
            inverseColors: false,
            shade: 'light',
            type: 'vertical',
            opacityFrom: 0.65,
            opacityTo: 0.5,
            stops: [0, 100, 100],
          },
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          inverseColors: false,
          shade: 'light',
          type: 'vertical',
          opacityFrom: 0.65,
          opacityTo: 0.5,
          stops: [0, 100, 100],
        },
      },
      markers: {
        size: 0,
        hover: {
          sizeOffset: 6,
        },
      },
      tooltip: {
        followCursor: false,
      },
    }
  }

  rangeArea() {
    const handleRangeAreaTooltip = (opts) => {
      const { color, seriesName, ylabel, start, end } = getRangeValues(opts)
      return buildRangeTooltipHTML({
        ...opts,
        color,
        seriesName,
        ylabel,
        start,
        end,
      })
    }
    return {
      stroke: {
        curve: 'straight',
        width: 0,
      },
      fill: {
        type: 'solid',
        opacity: 0.6,
      },
      markers: {
        size: 0,
      },
      states: {
        hover: {
          filter: {
            type: 'none',
          },
        },
        active: {
          filter: {
            type: 'none',
          },
        },
      },
      tooltip: {
        intersect: false,
        shared: true,
        followCursor: true,
        custom(opts) {
          return handleRangeAreaTooltip(opts)
        },
      },
    }
  }

  brush(defaults) {
    const ret = {
      chart: {
        toolbar: {
          autoSelected: 'selection',
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        width: 1,
      },
      tooltip: {
        enabled: false,
      },
      xaxis: {
        tooltip: {
          enabled: false,
        },
      },
    }

    return Utils.extend(defaults, ret)
  }

  stacked100(opts) {
    opts.dataLabels = opts.dataLabels || {}
    opts.dataLabels.formatter = opts.dataLabels.formatter || undefined
    const existingDataLabelFormatter = opts.dataLabels.formatter

    opts.yaxis.forEach((yaxe, index) => {
      opts.yaxis[index].min = 0
      opts.yaxis[index].max = 100
    })

    const isBar = opts.chart.type === 'bar'

    if (isBar) {
      opts.dataLabels.formatter =
        existingDataLabelFormatter ||
        function (val) {
          if (typeof val === 'number') {
            return val ? val.toFixed(0) + '%' : val
          }
          return val
        }
    }
    return opts
  }

  stackedBars() {
    const barDefaults = this.bar()
    return {
      ...barDefaults,
      plotOptions: {
        ...barDefaults.plotOptions,
        bar: {
          ...barDefaults.plotOptions.bar,
          borderRadiusApplication: 'end',
          borderRadiusWhenStacked: 'last',
        },
      },
    }
  }

  // This function removes the left and right spacing in chart for line/area/scatter if xaxis type = category for those charts by converting xaxis = numeric. Numeric/Datetime xaxis prevents the unnecessary spacing in the left/right of the chart area
  convertCatToNumeric(opts) {
    opts.xaxis.convertedCatToNumeric = true

    return opts
  }

  convertCatToNumericXaxis(opts, ctx, cats) {
    opts.xaxis.type = 'numeric'
    opts.xaxis.labels = opts.xaxis.labels || {}
    opts.xaxis.labels.formatter =
      opts.xaxis.labels.formatter ||
      function (val) {
        return Utils.isNumber(val) ? Math.floor(val) : val
      }

    const defaultFormatter = opts.xaxis.labels.formatter
    let labels =
      opts.xaxis.categories && opts.xaxis.categories.length
        ? opts.xaxis.categories
        : opts.labels

    if (cats && cats.length) {
      labels = cats.map((c) => {
        return Array.isArray(c) ? c : String(c)
      })
    }

    if (labels && labels.length) {
      opts.xaxis.labels.formatter = function (val) {
        return Utils.isNumber(val)
          ? defaultFormatter(labels[Math.floor(val) - 1])
          : defaultFormatter(val)
      }
    }

    opts.xaxis.categories = []
    opts.labels = []
    opts.xaxis.tickAmount = opts.xaxis.tickAmount || 'dataPoints'
    return opts
  }

  bubble() {
    return {
      dataLabels: {
        style: {
          colors: ['#fff'],
        },
      },
      tooltip: {
        shared: false,
        intersect: true,
      },
      xaxis: {
        crosshairs: {
          width: 0,
        },
      },
      fill: {
        type: 'solid',
        gradient: {
          shade: 'light',
          inverse: true,
          shadeIntensity: 0.55,
          opacityFrom: 0.4,
          opacityTo: 0.8,
        },
      },
    }
  }

  scatter() {
    return {
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        shared: false,
        intersect: true,
      },
      markers: {
        size: 6,
        strokeWidth: 1,
        hover: {
          sizeOffset: 2,
        },
      },
    }
  }

  heatmap() {
    return {
      chart: {
        stacked: false,
      },
      fill: {
        opacity: 1,
      },
      dataLabels: {
        style: {
          colors: ['#fff'],
        },
      },
      stroke: {
        colors: ['#fff'],
      },
      tooltip: {
        followCursor: true,
        marker: {
          show: false,
        },
        x: {
          show: false,
        },
      },
      legend: {
        position: 'top',
        markers: {
          shape: 'square',
        },
      },
      grid: {
        padding: {
          right: 20,
        },
      },
    }
  }

  treemap() {
    return {
      chart: {
        zoom: {
          enabled: false,
        },
      },
      dataLabels: {
        style: {
          fontSize: 14,
          fontWeight: 600,
          colors: ['#fff'],
        },
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['#fff'],
      },
      legend: {
        show: false,
      },
      fill: {
        opacity: 1,
        gradient: {
          stops: [0, 100],
        },
      },
      tooltip: {
        followCursor: true,
        x: {
          show: false,
        },
      },
      grid: {
        padding: {
          left: 0,
          right: 0,
        },
      },
      xaxis: {
        crosshairs: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
      },
    }
  }

  pie() {
    return {
      chart: {
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: false,
            },
          },
        },
      },
      dataLabels: {
        formatter(val) {
          return val.toFixed(1) + '%'
        },
        style: {
          colors: ['#fff'],
        },
        background: {
          enabled: false,
        },
        dropShadow: {
          enabled: true,
        },
      },
      stroke: {
        colors: ['#fff'],
      },
      fill: {
        opacity: 1,
        gradient: {
          shade: 'light',
          stops: [0, 100],
        },
      },
      tooltip: {
        theme: 'dark',
        fillSeriesColor: true,
      },
      legend: {
        position: 'right',
      },
      grid: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    }
  }

  donut() {
    return {
      chart: {
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        formatter(val) {
          return val.toFixed(1) + '%'
        },
        style: {
          colors: ['#fff'],
        },
        background: {
          enabled: false,
        },
        dropShadow: {
          enabled: true,
        },
      },
      stroke: {
        colors: ['#fff'],
      },
      fill: {
        opacity: 1,
        gradient: {
          shade: 'light',
          shadeIntensity: 0.35,
          stops: [80, 100],
          opacityFrom: 1,
          opacityTo: 1,
        },
      },
      tooltip: {
        theme: 'dark',
        fillSeriesColor: true,
      },
      legend: {
        position: 'right',
      },
      grid: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    }
  }

  polarArea() {
    return {
      chart: {
        toolbar: {
          show: false,
        },
      },
      dataLabels: {
        formatter(val) {
          return val.toFixed(1) + '%'
        },
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
      },
      fill: {
        opacity: 0.7,
      },
      tooltip: {
        theme: 'dark',
        fillSeriesColor: true,
      },
      legend: {
        position: 'right',
      },
      grid: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    }
  }

  radar() {
    this.opts.yaxis[0].labels.offsetY = this.opts.yaxis[0].labels.offsetY
      ? this.opts.yaxis[0].labels.offsetY
      : 6

    return {
      dataLabels: {
        enabled: false,
        style: {
          fontSize: '11px',
        },
      },
      stroke: {
        width: 2,
      },
      markers: {
        size: 5,
        strokeWidth: 1,
        strokeOpacity: 1,
      },
      fill: {
        opacity: 0.2,
      },
      tooltip: {
        shared: false,
        intersect: true,
        followCursor: true,
      },
      grid: {
        show: false,
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
      xaxis: {
        labels: {
          formatter: (val) => val,
          style: {
            colors: ['#a8a8a8'],
            fontSize: '11px',
          },
        },
        tooltip: {
          enabled: false,
        },
        crosshairs: {
          show: false,
        },
      },
    }
  }

  radialBar() {
    return {
      chart: {
        animations: {
          dynamicAnimation: {
            enabled: true,
            speed: 800,
          },
        },
        toolbar: {
          show: false,
        },
      },
      fill: {
        gradient: {
          shade: 'dark',
          shadeIntensity: 0.4,
          inverseColors: false,
          type: 'diagonal2',
          opacityFrom: 1,
          opacityTo: 1,
          stops: [70, 98, 100],
        },
      },
      legend: {
        show: false,
        position: 'right',
      },
      tooltip: {
        enabled: false,
        fillSeriesColor: true,
      },
      grid: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },
    }
  }

  _getBoxTooltip(w, seriesIndex, dataPointIndex, labels, chartType) {
    const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex]
    const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex]
    const m = w.globals.seriesCandleM[seriesIndex][dataPointIndex]
    const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex]
    const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex]

    if (
      w.config.series[seriesIndex].type &&
      w.config.series[seriesIndex].type !== chartType
    ) {
      return `<div class="apexcharts-custom-tooltip">
          ${
            w.config.series[seriesIndex].name
              ? w.config.series[seriesIndex].name
              : 'series-' + (seriesIndex + 1)
          }: <strong>${w.globals.series[seriesIndex][dataPointIndex]}</strong>
        </div>`
    } else {
      return (
        `<div class="apexcharts-tooltip-box apexcharts-tooltip-${w.config.chart.type}">` +
        `<div>${labels[0]}: <span class="value">` +
        o +
        '</span></div>' +
        `<div>${labels[1]}: <span class="value">` +
        h +
        '</span></div>' +
        (m
          ? `<div>${labels[2]}: <span class="value">` + m + '</span></div>'
          : '') +
        `<div>${labels[3]}: <span class="value">` +
        l +
        '</span></div>' +
        `<div>${labels[4]}: <span class="value">` +
        c +
        '</span></div>' +
        '</div>'
      )
    }
  }
}
