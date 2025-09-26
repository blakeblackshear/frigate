import type { XYChartData, Dimension, DrawableElem, Point, XYChartThemeConfig, XYChartConfig } from '../../interfaces.js';
import type { Axis } from '../axis/index.js';
import type { ChartComponent } from '../../interfaces.js';
export interface Plot extends ChartComponent {
    setAxes(xAxis: Axis, yAxis: Axis): void;
}
export declare class BasePlot implements Plot {
    private chartConfig;
    private chartData;
    private chartThemeConfig;
    private boundingRect;
    private xAxis?;
    private yAxis?;
    constructor(chartConfig: XYChartConfig, chartData: XYChartData, chartThemeConfig: XYChartThemeConfig);
    setAxes(xAxis: Axis, yAxis: Axis): void;
    setBoundingBoxXY(point: Point): void;
    calculateSpace(availableSpace: Dimension): Dimension;
    getDrawableElements(): DrawableElem[];
}
export declare function getPlotComponent(chartConfig: XYChartConfig, chartData: XYChartData, chartThemeConfig: XYChartThemeConfig): Plot;
