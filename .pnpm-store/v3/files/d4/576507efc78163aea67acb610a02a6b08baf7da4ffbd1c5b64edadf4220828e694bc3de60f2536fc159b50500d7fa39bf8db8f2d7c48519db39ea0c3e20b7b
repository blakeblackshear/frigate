/**
 * ApexCharts Options for setting the initial configuration of ApexCharts
 **/
import en from './../../locales/en.json'

export default class Options {
  constructor() {
    this.yAxis = {
      show: true,
      showAlways: false,
      showForNullSeries: true,
      seriesName: undefined,
      opposite: false,
      reversed: false,
      logarithmic: false,
      logBase: 10,
      tickAmount: undefined,
      stepSize: undefined,
      forceNiceScale: false,
      max: undefined,
      min: undefined,
      floating: false,
      decimalsInFloat: undefined,
      labels: {
        show: true,
        showDuplicates: false,
        minWidth: 0,
        maxWidth: 160,
        offsetX: 0,
        offsetY: 0,
        align: undefined,
        rotate: 0,
        padding: 20,
        style: {
          colors: [],
          fontSize: '11px',
          fontWeight: 400,
          fontFamily: undefined,
          cssClass: '',
        },
        formatter: undefined,
      },
      axisBorder: {
        show: false,
        color: '#e0e0e0',
        width: 1,
        offsetX: 0,
        offsetY: 0,
      },
      axisTicks: {
        show: false,
        color: '#e0e0e0',
        width: 6,
        offsetX: 0,
        offsetY: 0,
      },
      title: {
        text: undefined,
        rotate: -90,
        offsetY: 0,
        offsetX: 0,
        style: {
          color: undefined,
          fontSize: '11px',
          fontWeight: 900,
          fontFamily: undefined,
          cssClass: '',
        },
      },
      tooltip: {
        enabled: false,
        offsetX: 0,
      },
      crosshairs: {
        show: true,
        position: 'front',
        stroke: {
          color: '#b6b6b6',
          width: 1,
          dashArray: 0,
        },
      },
    }

    this.pointAnnotation = {
      id: undefined,
      x: 0,
      y: null,
      yAxisIndex: 0,
      seriesIndex: undefined,
      mouseEnter: undefined,
      mouseLeave: undefined,
      click: undefined,
      marker: {
        size: 4,
        fillColor: '#fff',
        strokeWidth: 2,
        strokeColor: '#333',
        shape: 'circle',
        offsetX: 0,
        offsetY: 0,
        // radius: 2, // DEPRECATED
        cssClass: '',
      },
      label: {
        borderColor: '#c2c2c2',
        borderWidth: 1,
        borderRadius: 2,
        text: undefined,
        textAnchor: 'middle',
        offsetX: 0,
        offsetY: 0,
        mouseEnter: undefined,
        mouseLeave: undefined,
        click: undefined,
        style: {
          background: '#fff',
          color: undefined,
          fontSize: '11px',
          fontFamily: undefined,
          fontWeight: 400,
          cssClass: '',
          padding: {
            left: 5,
            right: 5,
            top: 2,
            bottom: 2,
          },
        },
      },
      customSVG: {
        // this will be deprecated in the next major version as it is going to be replaced with a better alternative below (image)
        SVG: undefined,
        cssClass: undefined,
        offsetX: 0,
        offsetY: 0,
      },
      image: {
        path: undefined,
        width: 20,
        height: 20,
        offsetX: 0,
        offsetY: 0,
      },
    }

    this.yAxisAnnotation = {
      id: undefined,
      y: 0,
      y2: null,
      strokeDashArray: 1,
      fillColor: '#c2c2c2',
      borderColor: '#c2c2c2',
      borderWidth: 1,
      opacity: 0.3,
      offsetX: 0,
      offsetY: 0,
      width: '100%',
      yAxisIndex: 0,
      label: {
        borderColor: '#c2c2c2',
        borderWidth: 1,
        borderRadius: 2,
        text: undefined,
        textAnchor: 'end',
        position: 'right',
        offsetX: 0,
        offsetY: -3,
        mouseEnter: undefined,
        mouseLeave: undefined,
        click: undefined,
        style: {
          background: '#fff',
          color: undefined,
          fontSize: '11px',
          fontFamily: undefined,
          fontWeight: 400,
          cssClass: '',
          padding: {
            left: 5,
            right: 5,
            top: 2,
            bottom: 2,
          },
        },
      },
    }

    this.xAxisAnnotation = {
      id: undefined,
      x: 0,
      x2: null,
      strokeDashArray: 1,
      fillColor: '#c2c2c2',
      borderColor: '#c2c2c2',
      borderWidth: 1,
      opacity: 0.3,
      offsetX: 0,
      offsetY: 0,
      label: {
        borderColor: '#c2c2c2',
        borderWidth: 1,
        borderRadius: 2,
        text: undefined,
        textAnchor: 'middle',
        orientation: 'vertical',
        position: 'top',
        offsetX: 0,
        offsetY: 0,
        mouseEnter: undefined,
        mouseLeave: undefined,
        click: undefined,
        style: {
          background: '#fff',
          color: undefined,
          fontSize: '11px',
          fontFamily: undefined,
          fontWeight: 400,
          cssClass: '',
          padding: {
            left: 5,
            right: 5,
            top: 2,
            bottom: 2,
          },
        },
      },
    }

    this.text = {
      x: 0,
      y: 0,
      text: '',
      textAnchor: 'start',
      foreColor: undefined,
      fontSize: '13px',
      fontFamily: undefined,
      fontWeight: 400,
      appendTo: '.apexcharts-annotations',
      backgroundColor: 'transparent',
      borderColor: '#c2c2c2',
      borderRadius: 0,
      borderWidth: 0,
      paddingLeft: 4,
      paddingRight: 4,
      paddingTop: 2,
      paddingBottom: 2,
    }
  }
  init() {
    return {
      annotations: {
        yaxis: [this.yAxisAnnotation],
        xaxis: [this.xAxisAnnotation],
        points: [this.pointAnnotation],
        texts: [],
        images: [],
        shapes: [],
      },
      chart: {
        animations: {
          enabled: true,
          easing: 'easeinout', // linear, easeout, easein, easeinout, swing, bounce, elastic
          speed: 800,
          animateGradually: {
            delay: 150,
            enabled: true,
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350,
          },
        },
        background: '',
        locales: [en],
        defaultLocale: 'en',
        dropShadow: {
          enabled: false,
          enabledOnSeries: undefined,
          top: 2,
          left: 2,
          blur: 4,
          color: '#000',
          opacity: 0.35,
        },
        events: {
          animationEnd: undefined,
          beforeMount: undefined,
          mounted: undefined,
          updated: undefined,
          click: undefined,
          mouseMove: undefined,
          mouseLeave: undefined,
          xAxisLabelClick: undefined,
          legendClick: undefined,
          markerClick: undefined,
          selection: undefined,
          dataPointSelection: undefined,
          dataPointMouseEnter: undefined,
          dataPointMouseLeave: undefined,
          beforeZoom: undefined,
          beforeResetZoom: undefined,
          zoomed: undefined,
          scrolled: undefined,
          brushScrolled: undefined,
        },
        foreColor: '#373d3f',
        fontFamily: 'Helvetica, Arial, sans-serif',
        height: 'auto',
        parentHeightOffset: 15,
        redrawOnParentResize: true,
        redrawOnWindowResize: true,
        id: undefined,
        group: undefined,
        nonce: undefined,
        offsetX: 0,
        offsetY: 0,
        selection: {
          enabled: false,
          type: 'x',
          // selectedPoints: undefined, // default datapoints that should be selected automatically
          fill: {
            color: '#24292e',
            opacity: 0.1,
          },
          stroke: {
            width: 1,
            color: '#24292e',
            opacity: 0.4,
            dashArray: 3,
          },
          xaxis: {
            min: undefined,
            max: undefined,
          },
          yaxis: {
            min: undefined,
            max: undefined,
          },
        },
        sparkline: {
          enabled: false,
        },
        brush: {
          enabled: false,
          autoScaleYaxis: true,
          target: undefined,
          targets: undefined,
        },
        stacked: false,
        stackOnlyBar: true, // mixed chart with stacked bars and line series - incorrect line draw #907
        stackType: 'normal',
        toolbar: {
          show: true,
          offsetX: 0,
          offsetY: 0,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
            customIcons: [],
          },
          export: {
            csv: {
              filename: undefined,
              columnDelimiter: ',',
              headerCategory: 'category',
              headerValue: 'value',
              categoryFormatter: undefined,
              valueFormatter: undefined,
            },
            png: {
              filename: undefined,
            },
            svg: {
              filename: undefined,
            },
            scale: undefined,
            width: undefined,
          },
          autoSelected: 'zoom', // accepts -> zoom, pan, selection
        },
        type: 'line',
        width: '100%',
        zoom: {
          enabled: true,
          type: 'x',
          autoScaleYaxis: false,
          allowMouseWheelZoom: true,
          zoomedArea: {
            fill: {
              color: '#90CAF9',
              opacity: 0.4,
            },
            stroke: {
              color: '#0D47A1',
              opacity: 0.4,
              width: 1,
            },
          },
        },
      },
      plotOptions: {
        line: {
          isSlopeChart: false,
        },
        area: {
          fillTo: 'origin',
        },
        bar: {
          horizontal: false,
          columnWidth: '70%', // should be in percent 0 - 100
          barHeight: '70%', // should be in percent 0 - 100
          distributed: false,
          borderRadius: 0,
          borderRadiusApplication: 'around', // [around, end]
          borderRadiusWhenStacked: 'last', // [all, last]
          rangeBarOverlap: true,
          rangeBarGroupRows: false,
          hideZeroBarsWhenGrouped: false,
          isDumbbell: false,
          dumbbellColors: undefined,
          isFunnel: false,
          isFunnel3d: true,
          colors: {
            ranges: [],
            backgroundBarColors: [],
            backgroundBarOpacity: 1,
            backgroundBarRadius: 0,
          },
          dataLabels: {
            position: 'top', // top, center, bottom
            maxItems: 100,
            hideOverflowingLabels: true,
            orientation: 'horizontal',
            total: {
              enabled: false,
              formatter: undefined,
              offsetX: 0,
              offsetY: 0,
              style: {
                color: '#373d3f',
                fontSize: '12px',
                fontFamily: undefined,
                fontWeight: 600,
              },
            },
          },
        },
        bubble: {
          zScaling: true,
          minBubbleRadius: undefined,
          maxBubbleRadius: undefined,
        },
        candlestick: {
          colors: {
            upward: '#00B746',
            downward: '#EF403C',
          },
          wick: {
            useFillColor: true,
          },
        },
        boxPlot: {
          colors: {
            upper: '#00E396',
            lower: '#008FFB',
          },
        },
        heatmap: {
          radius: 2,
          enableShades: true,
          shadeIntensity: 0.5,
          reverseNegativeShade: false,
          distributed: false,
          useFillColorAsStroke: false,
          colorScale: {
            inverse: false,
            ranges: [],
            min: undefined,
            max: undefined,
          },
        },
        treemap: {
          enableShades: true,
          shadeIntensity: 0.5,
          distributed: false,
          reverseNegativeShade: false,
          useFillColorAsStroke: false,
          borderRadius: 4,
          dataLabels: {
            format: 'scale', // scale | truncate
          },
          colorScale: {
            inverse: false,
            ranges: [],
            min: undefined,
            max: undefined,
          },
        },
        radialBar: {
          inverseOrder: false,
          startAngle: 0,
          endAngle: 360,
          offsetX: 0,
          offsetY: 0,
          hollow: {
            margin: 5,
            size: '50%',
            background: 'transparent',
            image: undefined,
            imageWidth: 150,
            imageHeight: 150,
            imageOffsetX: 0,
            imageOffsetY: 0,
            imageClipped: true,
            position: 'front',
            dropShadow: {
              enabled: false,
              top: 0,
              left: 0,
              blur: 3,
              color: '#000',
              opacity: 0.5,
            },
          },
          track: {
            show: true,
            startAngle: undefined,
            endAngle: undefined,
            background: '#f2f2f2',
            strokeWidth: '97%',
            opacity: 1,
            margin: 5, // margin is in pixels
            dropShadow: {
              enabled: false,
              top: 0,
              left: 0,
              blur: 3,
              color: '#000',
              opacity: 0.5,
            },
          },
          dataLabels: {
            show: true,
            name: {
              show: true,
              fontSize: '16px',
              fontFamily: undefined,
              fontWeight: 600,
              color: undefined,
              offsetY: 0,
              formatter(val) {
                return val
              },
            },
            value: {
              show: true,
              fontSize: '14px',
              fontFamily: undefined,
              fontWeight: 400,
              color: undefined,
              offsetY: 16,
              formatter(val) {
                return val + '%'
              },
            },
            total: {
              show: false,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: undefined,
              color: undefined,
              formatter(w) {
                return (
                  w.globals.seriesTotals.reduce((a, b) => a + b, 0) /
                    w.globals.series.length +
                  '%'
                )
              },
            },
          },
          barLabels: {
            enabled: false,
            offsetX: 0,
            offsetY: 0,
            useSeriesColors: true,
            fontFamily: undefined,
            fontWeight: 600,
            fontSize: '16px',
            formatter(val) {
              return val
            },
            onClick: undefined,
          },
        },
        pie: {
          customScale: 1,
          offsetX: 0,
          offsetY: 0,
          startAngle: 0,
          endAngle: 360,
          expandOnClick: true,
          dataLabels: {
            // These are the percentage values which are displayed on slice
            offset: 0, // offset by which labels will move outside
            minAngleToShowLabel: 10,
          },
          donut: {
            size: '65%',
            background: 'transparent',
            labels: {
              // These are the inner labels appearing inside donut
              show: false,
              name: {
                show: true,
                fontSize: '16px',
                fontFamily: undefined,
                fontWeight: 600,
                color: undefined,
                offsetY: -10,
                formatter(val) {
                  return val
                },
              },
              value: {
                show: true,
                fontSize: '20px',
                fontFamily: undefined,
                fontWeight: 400,
                color: undefined,
                offsetY: 10,
                formatter(val) {
                  return val
                },
              },
              total: {
                show: false,
                showAlways: false,
                label: 'Total',
                fontSize: '16px',
                fontWeight: 400,
                fontFamily: undefined,
                color: undefined,
                formatter(w) {
                  return w.globals.seriesTotals.reduce((a, b) => a + b, 0)
                },
              },
            },
          },
        },
        polarArea: {
          rings: {
            strokeWidth: 1,
            strokeColor: '#e8e8e8',
          },
          spokes: {
            strokeWidth: 1,
            connectorColors: '#e8e8e8',
          },
        },
        radar: {
          size: undefined,
          offsetX: 0,
          offsetY: 0,
          polygons: {
            // strokeColor: '#e8e8e8', // should be deprecated in the minor version i.e 3.2
            strokeWidth: 1,
            strokeColors: '#e8e8e8',
            connectorColors: '#e8e8e8',
            fill: {
              colors: undefined,
            },
          },
        },
      },
      colors: undefined,
      dataLabels: {
        enabled: true,
        enabledOnSeries: undefined,
        formatter(val) {
          return val !== null ? val : ''
        },
        textAnchor: 'middle',
        distributed: false,
        offsetX: 0,
        offsetY: 0,
        style: {
          fontSize: '12px',
          fontFamily: undefined,
          fontWeight: 600,
          colors: undefined,
        },
        background: {
          enabled: true,
          foreColor: '#fff',
          borderRadius: 2,
          padding: 4,
          opacity: 0.9,
          borderWidth: 1,
          borderColor: '#fff',
          dropShadow: {
            enabled: false,
            top: 1,
            left: 1,
            blur: 1,
            color: '#000',
            opacity: 0.45,
          },
        },
        dropShadow: {
          enabled: false,
          top: 1,
          left: 1,
          blur: 1,
          color: '#000',
          opacity: 0.45,
        },
      },
      fill: {
        type: 'solid',
        colors: undefined, // array of colors
        opacity: 0.85,
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: undefined,
          inverseColors: true,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 50, 100],
          colorStops: [],
        },
        image: {
          src: [],
          width: undefined, // optional
          height: undefined, // optional
        },
        pattern: {
          style: 'squares', // String | Array of Strings
          width: 6,
          height: 6,
          strokeWidth: 2,
        },
      },
      forecastDataPoints: {
        count: 0,
        fillOpacity: 0.5,
        strokeWidth: undefined,
        dashArray: 4,
      },
      grid: {
        show: true,
        borderColor: '#e0e0e0',
        strokeDashArray: 0,
        position: 'back',
        xaxis: {
          lines: {
            show: false,
          },
        },
        yaxis: {
          lines: {
            show: true,
          },
        },
        row: {
          colors: undefined, // takes as array which will be repeated on rows
          opacity: 0.5,
        },
        column: {
          colors: undefined, // takes an array which will be repeated on columns
          opacity: 0.5,
        },
        padding: {
          top: 0,
          right: 10,
          bottom: 0,
          left: 12,
        },
      },
      labels: [],
      legend: {
        show: true,
        showForSingleSeries: false,
        showForNullSeries: true,
        showForZeroSeries: true,
        floating: false,
        position: 'bottom', // whether to position legends in 1 of 4
        // direction - top, bottom, left, right
        horizontalAlign: 'center', // when position top/bottom, you can specify whether to align legends left, right or center
        inverseOrder: false,
        fontSize: '12px',
        fontFamily: undefined,
        fontWeight: 400,
        width: undefined,
        height: undefined,
        formatter: undefined,
        tooltipHoverFormatter: undefined,
        offsetX: -20,
        offsetY: 4,
        customLegendItems: [],
        labels: {
          colors: undefined,
          useSeriesColors: false,
        },
        markers: {
          size: 7,
          fillColors: undefined,
          strokeWidth: 1,
          shape: undefined,
          offsetX: 0,
          offsetY: 0,
          customHTML: undefined,
          onClick: undefined,
        },
        itemMargin: {
          horizontal: 5,
          vertical: 4,
        },
        onItemClick: {
          toggleDataSeries: true,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      markers: {
        discrete: [],
        size: 0,
        colors: undefined,
        strokeColors: '#fff',
        strokeWidth: 2,
        strokeOpacity: 0.9,
        strokeDashArray: 0,
        fillOpacity: 1,
        shape: 'circle',
        offsetX: 0,
        offsetY: 0,
        showNullDataPoints: true,
        onClick: undefined,
        onDblClick: undefined,
        hover: {
          size: undefined,
          sizeOffset: 3,
        },
      },
      noData: {
        text: undefined,
        align: 'center',
        verticalAlign: 'middle',
        offsetX: 0,
        offsetY: 0,
        style: {
          color: undefined,
          fontSize: '14px',
          fontFamily: undefined,
        },
      },
      responsive: [], // breakpoints should follow ascending order 400, then 700, then 1000
      series: undefined,
      states: {
        normal: {
          filter: {
            type: 'none',
            value: 0,
          },
        },
        hover: {
          filter: {
            type: 'lighten',
            value: 0.1,
          },
        },
        active: {
          allowMultipleDataPointsSelection: false,
          filter: {
            type: 'darken',
            value: 0.5,
          },
        },
      },
      title: {
        text: undefined,
        align: 'left',
        margin: 5,
        offsetX: 0,
        offsetY: 0,
        floating: false,
        style: {
          fontSize: '14px',
          fontWeight: 900,
          fontFamily: undefined,
          color: undefined,
        },
      },
      subtitle: {
        text: undefined,
        align: 'left',
        margin: 5,
        offsetX: 0,
        offsetY: 30,
        floating: false,
        style: {
          fontSize: '12px',
          fontWeight: 400,
          fontFamily: undefined,
          color: undefined,
        },
      },
      stroke: {
        show: true,
        curve: 'smooth', // "smooth" / "straight" / "monotoneCubic" / "stepline" / "linestep"
        lineCap: 'butt', // round, butt , square
        width: 2,
        colors: undefined, // array of colors
        dashArray: 0, // single value or array of values
        fill: {
          type: 'solid',
          colors: undefined, // array of colors
          opacity: 0.85,
          gradient: {
            shade: 'dark',
            type: 'horizontal',
            shadeIntensity: 0.5,
            gradientToColors: undefined,
            inverseColors: true,
            opacityFrom: 1,
            opacityTo: 1,
            stops: [0, 50, 100],
            colorStops: [],
          },
        },
      },
      tooltip: {
        enabled: true,
        enabledOnSeries: undefined,
        shared: true,
        hideEmptySeries: false,
        followCursor: false, // when disabled, the tooltip will show on top of the series instead of mouse position
        intersect: false, // when enabled, tooltip will only show when user directly hovers over point
        inverseOrder: false,
        custom: undefined,
        fillSeriesColor: false,
        theme: 'light',
        cssClass: '',
        style: {
          fontSize: '12px',
          fontFamily: undefined,
        },
        onDatasetHover: {
          highlightDataSeries: false,
        },
        x: {
          // x value
          show: true,
          format: 'dd MMM', // dd/MM, dd MMM yy, dd MMM yyyy
          formatter: undefined, // a custom user supplied formatter function
        },
        y: {
          formatter: undefined,
          title: {
            formatter(seriesName) {
              return seriesName ? seriesName + ': ' : ''
            },
          },
        },
        z: {
          formatter: undefined,
          title: 'Size: ',
        },
        marker: {
          show: true,
          fillColors: undefined,
        },
        items: {
          display: 'flex',
        },
        fixed: {
          enabled: false,
          position: 'topRight', // topRight, topLeft, bottomRight, bottomLeft
          offsetX: 0,
          offsetY: 0,
        },
      },
      xaxis: {
        type: 'category',
        categories: [],
        convertedCatToNumeric: false, // internal property which should not be altered outside
        offsetX: 0,
        offsetY: 0,
        overwriteCategories: undefined,
        labels: {
          show: true,
          rotate: -45,
          rotateAlways: false,
          hideOverlappingLabels: true,
          trim: false,
          minHeight: undefined,
          maxHeight: 120,
          showDuplicates: true,
          style: {
            colors: [],
            fontSize: '12px',
            fontWeight: 400,
            fontFamily: undefined,
            cssClass: '',
          },
          offsetX: 0,
          offsetY: 0,
          format: undefined,
          formatter: undefined, // custom formatter function which will override format
          datetimeUTC: true,
          datetimeFormatter: {
            year: 'yyyy',
            month: "MMM 'yy",
            day: 'dd MMM',
            hour: 'HH:mm',
            minute: 'HH:mm:ss',
            second: 'HH:mm:ss',
          },
        },
        group: {
          groups: [],
          style: {
            colors: [],
            fontSize: '12px',
            fontWeight: 400,
            fontFamily: undefined,
            cssClass: '',
          },
        },
        axisBorder: {
          show: true,
          color: '#e0e0e0',
          width: '100%',
          height: 1,
          offsetX: 0,
          offsetY: 0,
        },
        axisTicks: {
          show: true,
          color: '#e0e0e0',
          height: 6,
          offsetX: 0,
          offsetY: 0,
        },
        stepSize: undefined,
        tickAmount: undefined,
        tickPlacement: 'on',
        min: undefined,
        max: undefined,
        range: undefined,
        floating: false,
        decimalsInFloat: undefined,
        position: 'bottom',
        title: {
          text: undefined,
          offsetX: 0,
          offsetY: 0,
          style: {
            color: undefined,
            fontSize: '12px',
            fontWeight: 900,
            fontFamily: undefined,
            cssClass: '',
          },
        },
        crosshairs: {
          show: true,
          width: 1, // tickWidth/barWidth or an integer
          position: 'back',
          opacity: 0.9,
          stroke: {
            color: '#b6b6b6',
            width: 1,
            dashArray: 3,
          },
          fill: {
            type: 'solid', // solid, gradient
            color: '#B1B9C4',
            gradient: {
              colorFrom: '#D8E3F0',
              colorTo: '#BED1E6',
              stops: [0, 100],
              opacityFrom: 0.4,
              opacityTo: 0.5,
            },
          },
          dropShadow: {
            enabled: false,
            left: 0,
            top: 0,
            blur: 1,
            opacity: 0.4,
          },
        },
        tooltip: {
          enabled: true,
          offsetY: 0,
          formatter: undefined,
          style: {
            fontSize: '12px',
            fontFamily: undefined,
          },
        },
      },
      yaxis: this.yAxis,
      theme: {
        mode: '',
        palette: 'palette1', // If defined, it will overwrite globals.colors variable
        monochrome: {
          // monochrome allows you to select just 1 color and fill out the rest with light/dark shade (intensity can be selected)
          enabled: false,
          color: '#008FFB',
          shadeTo: 'light',
          shadeIntensity: 0.65,
        },
      },
    }
  }
}
