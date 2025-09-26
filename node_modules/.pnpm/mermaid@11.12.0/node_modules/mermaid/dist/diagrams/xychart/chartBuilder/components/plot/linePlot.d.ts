import type { DrawableElem, LinePlotData, XYChartConfig } from '../../interfaces.js';
import type { Axis } from '../axis/index.js';
export declare class LinePlot {
    private plotData;
    private xAxis;
    private yAxis;
    private orientation;
    private plotIndex;
    constructor(plotData: LinePlotData, xAxis: Axis, yAxis: Axis, orientation: XYChartConfig['chartOrientation'], plotIndex: number);
    getDrawableElement(): DrawableElem[];
}
