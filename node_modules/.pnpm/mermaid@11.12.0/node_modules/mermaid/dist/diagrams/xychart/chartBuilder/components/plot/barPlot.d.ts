import type { BarPlotData, BoundingRect, DrawableElem, XYChartConfig } from '../../interfaces.js';
import type { Axis } from '../axis/index.js';
export declare class BarPlot {
    private barData;
    private boundingRect;
    private xAxis;
    private yAxis;
    private orientation;
    private plotIndex;
    constructor(barData: BarPlotData, boundingRect: BoundingRect, xAxis: Axis, yAxis: Axis, orientation: XYChartConfig['chartOrientation'], plotIndex: number);
    getDrawableElement(): DrawableElem[];
}
