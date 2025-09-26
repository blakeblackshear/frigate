import type { TextDimensionCalculator } from '../../textDimensionCalculator.js';
import { BaseAxis } from './baseAxis.js';
import type { XYChartAxisThemeConfig, XYChartAxisConfig } from '../../interfaces.js';
export declare class LinearAxis extends BaseAxis {
    private scale;
    private domain;
    constructor(axisConfig: XYChartAxisConfig, axisThemeConfig: XYChartAxisThemeConfig, domain: [number, number], title: string, textDimensionCalculator: TextDimensionCalculator);
    getTickValues(): (string | number)[];
    recalculateScale(): void;
    getScaleValue(value: number): number;
}
