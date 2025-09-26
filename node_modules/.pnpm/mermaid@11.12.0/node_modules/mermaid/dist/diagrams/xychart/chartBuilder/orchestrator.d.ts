import type { SVGGroup } from '../../../diagram-api/types.js';
import type { DrawableElem, XYChartConfig, XYChartData, XYChartThemeConfig } from './interfaces.js';
export declare class Orchestrator {
    private chartConfig;
    private chartData;
    private componentStore;
    constructor(chartConfig: XYChartConfig, chartData: XYChartData, chartThemeConfig: XYChartThemeConfig, tmpSVGGroup: SVGGroup);
    private calculateVerticalSpace;
    private calculateHorizontalSpace;
    private calculateSpace;
    getDrawableElement(): DrawableElem[];
}
