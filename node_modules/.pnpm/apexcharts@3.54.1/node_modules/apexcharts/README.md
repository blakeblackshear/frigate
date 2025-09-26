<p align="center"><img src="https://apexcharts.com/media/apexcharts-logo.png"></p>

<p align="center">
  <a href="https://github.com/apexcharts/apexcharts.js/blob/master/LICENSE"><img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License"></a>
  <a href="https://travis-ci.com/apexcharts/apexcharts.js"><img src="https://api.travis-ci.com/apexcharts/apexcharts.js.svg?branch=master" alt="build" /></a>
  <img alt="downloads" src="https://img.shields.io/npm/dm/apexcharts.svg"/>
  <a href="https://www.npmjs.com/package/apexcharts"><img src="https://img.shields.io/npm/v/apexcharts.svg" alt="ver"></a>
  <img alt="size" src="https://badgen.net/bundlephobia/min/apexcharts?label=size">
  <a href="https://cdn.jsdelivr.net/npm/apexcharts@3.12.0/types/apexcharts.d.ts"><img src="https://badgen.net/npm/types/apexcharts"/></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square" alt="prettier"></a>
  <a href="https://www.jsdelivr.com/package/npm/apexcharts"><img src="https://data.jsdelivr.com/v1/package/npm/apexcharts/badge" alt="jsdelivr" /></a>
  <a href="https://codeclimate.com/github/apexcharts/apexcharts.js"><img src="https://badgen.net/codeclimate/maintainability/apexcharts/apexcharts.js" /></a>
  <img src="https://badgen.net/codeclimate/tech-debt/apexcharts/apexcharts.js"/>
</p>

<p align="center">
  <a href="https://twitter.com/intent/tweet?text=Create%20visualizations%20with%20this%20free%20and%20open-source%20JavaScript%20Chart%20library&url=https://www.apexcharts.com&hashtags=javascript,charts,visualizations,developers,apexcharts"><img src="https://img.shields.io/twitter/url/http/shields.io.svg?style=social"> </a>
</p>

<p align="center">A modern JavaScript charting library that allows you to build interactive data visualizations with simple API and 100+ ready-to-use samples. Packed with the features that you expect, ApexCharts includes over a dozen chart types that deliver beautiful, responsive visualizations in your apps and dashboards. ApexCharts is an MIT-licensed open-source project that can be used in commercial and non-commercial projects.</p>

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/"><img
      src="https://apexcharts.com/media/apexcharts-banner.png"></a></p>

<br />

## Download and Installation

##### Installing via npm

```bash
npm install apexcharts --save
```

##### Direct &lt;script&gt; include

```html
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
```

## Wrappers for Vue/React/Angular/Stencil

Integrate easily with 3rd party frameworks

- [vue-apexcharts](https://github.com/apexcharts/vue-apexcharts)
- [react-apexcharts](https://github.com/apexcharts/react-apexcharts)
- [ng-apexcharts](https://github.com/apexcharts/ng-apexcharts) - Plugin by [Morris Janatzek](https://morrisj.net/)
- [stencil-apexcharts](https://github.com/apexcharts/stencil-apexcharts)

### Unofficial Wrappers

Useful links to wrappers other than the popular frameworks mentioned above

- [apexcharter](https://github.com/dreamRs/apexcharter) - Htmlwidget for ApexCharts
- [apexcharts.rb](https://github.com/styd/apexcharts.rb) - Ruby wrapper for ApexCharts
- [larapex-charts](https://github.com/ArielMejiaDev/larapex-charts) - Laravel wrapper for ApexCharts
- [blazor-apexcharts](https://github.com/apexcharts/Blazor-ApexCharts) - Blazor wrapper for ApexCharts [demo](https://apexcharts.github.io/Blazor-ApexCharts/)
- [svelte-apexcharts](https://github.com/galkatz373/svelte-apexcharts) - Svelte wrapper for ApexCharts


## Usage

```js
import ApexCharts from 'apexcharts'
```

To create a basic bar chart with minimal configuration, write as follows:

```js
var options = {
  chart: {
    type: 'bar'
  },
  series: [
    {
      name: 'sales',
      data: [30, 40, 35, 50, 49, 60, 70, 91, 125]
    }
  ],
  xaxis: {
    categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999]
  }
}

var chart = new ApexCharts(document.querySelector('#chart'), options)
chart.render()
```

This will render the following chart

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/column-charts/"><img src="https://apexcharts.com/media/first-bar-chart.svg"></a></p>

### A little more than the basic

You can create a combination of different charts, sync them and give your desired look with unlimited possibilities.
Below is an example of synchronized charts with github style.

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/area-charts/github-style/"><img src="https://apexcharts.com/media/github-charts.gif"></a></p>

## Interactivity

Zoom, Pan, and Scroll through data. Make selections and load other charts using those selections.
An example showing some interactivity

<p align="center"><a href="https://codepen.io/apexcharts/pen/QrbEQg" target="_blank"><img src="https://apexcharts.com/media/interactivity.gif" alt="interactive chart"></a></p>

## Dynamic Series Update

Another approach is to Drill down charts where one selection updates the data of other charts.
An example of loading dynamic series into charts is shown below

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/column-charts/dynamic-loaded-chart/"><img src="https://apexcharts.com/media/dynamic-selection.gif" alt="dynamic-loading-chart" /></a></p>

## Annotations

Annotations allow you to write custom text on specific values or on axes values. Valuable to expand the visual appeal of your chart and make it more informative.

<p align="center"><a href="https://apexcharts.com/docs/annotations/"><img src="https://apexcharts.com/media/annotations.png" alt="annotations" /></a></p>

## Mixed Charts

You can combine more than one chart type to create a combo/mixed chart. Possible combinations can be line/area/column together in a single chart. Each chart type can have its own y-axis.

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/mixed-charts/"><img src="https://apexcharts.com/wp-content/uploads/2018/05/line-column-area-mixed-chart.svg" alt="annotations" width="490" /></a></p>

## Candlestick

Use a candlestick chart (a common financial chart) to describe price changes of a security, derivative, or currency. The below image shows how you can use another chart as a brush/preview pane which acts as a handle to browse the main candlestick chart.

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/candlestick-charts/"><img src="https://apexcharts.com/media/candlestick.png" alt="candlestick" width="490" /></a></p>

## Heatmaps

Use Heatmaps to represent data through colors and shades. Frequently used with bigger data collections, they are valuable for recognizing patterns and areas of focus.

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/heatmap-charts/"><img src="https://apexcharts.com/media/heatmap-charts.png" alt="heatmap" /></a></p>

## Gauges

The tiny gauges are an important part of a dashboard and are useful in displaying single-series data. A demo of these gauges:

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/radialbar-charts/"><img src="https://apexcharts.com/media/radialbars-gauges.png" width="490" alt="radialbar-chart" /></a></p>

## Sparklines

Utilize sparklines to indicate trends in data, for example, occasional increments or declines, monetary cycles, or to feature the most extreme and least values:

<p align="center"><a href="https://apexcharts.com/javascript-chart-demos/sparklines/"><img src="https://apexcharts.com/media/sparklines.png" alt="sparkline-chart" /></a></p>


## Need Advanced Data Grid for your next project?
We partnered with Infragistics, creators of the fastest data grids on the planet! Ignite UI Grids can handle unlimited rows and columns of data while providing access to custom templates and real-time data updates.

<p align="center"><a href="https://www.infragistics.com/products/ignite-ui-angular/angular/components/grid/grid" target="_blank"><img src="https://apexcharts.com/media/infragistics-data-grid.png" /></a></p>

Featuring an intuitive API for easy theming and branding, you can quickly bind to data with minimal hand-on coding. The grid is available in most of your favorite frameworks:

<a target="_blank" href="https://www.infragistics.com/products/ignite-ui-angular/angular/components/grid/grid">Angular Data Grid</a> | <a target="_blank" href="https://www.infragistics.com/products/ignite-ui-react/react/components/grids">React Data Grid</a> | <a target="_blank" href="https://www.infragistics.com/products/ignite-ui-blazor/blazor/components/data-grid">Blazor Data Grid</a> | <a target="_blank" href="https://www.infragistics.com/products/ignite-ui-web-components/web-components/components/data-grid">Web Components DataGrid</a> | <a target="_blank" href="https://www.igniteui.com/grid/overview">jQuery Data Grid </a>

## What's included

The download bundle includes the following files and directories providing a minified single file in the dist folder. Every asset including icon/css is bundled in the js itself to avoid loading multiple files.

```
apexcharts/
├── dist/
│   └── apexcharts.min.js
├── src/
│   ├── assets/
│   ├── charts/
│   ├── modules/
│   ├── utils/
│   └── apexcharts.js
└── samples/
```

## Development

#### Install dependencies and run the project

```bash
npm install
npm run dev
```

This will start the webpack watch and any changes you make to `src` folder will auto-compile and output will be produced in the `dist` folder.

More details in [Contributing Guidelines](CONTRIBUTING.md).

#### Minifying the src

```bash
npm run build
```

## Where do I go next?

Head over to the <a href="https://apexcharts.com/docs/">documentation</a> section to read more about how to use different kinds of charts and explore all options.

## Contacts

Email: <a href="info@apexcharts.com">info@apexcharts.com</a>

Twitter: <a href="https://twitter.com/apexcharts">@apexcharts</a>

Facebook: <a href="https://facebook.com/apexcharts">fb.com/apexcharts</a>

## Dependency

ApexCharts uses <a href="https://svgdotjs.github.io/" target="_blank">SVG.js</a> for drawing shapes, animations, applying svg filters, and a lot more under the hood. The library is bundled in the final build file, so you don't need to include it.

## License

ApexCharts is released under MIT license. You are free to use, modify and distribute this software, as long as the copyright header is left intact.
