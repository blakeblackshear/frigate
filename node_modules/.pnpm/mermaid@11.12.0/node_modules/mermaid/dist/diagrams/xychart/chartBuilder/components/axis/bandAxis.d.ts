import type { TextDimensionCalculator } from '../../textDimensionCalculator.js';
import { BaseAxis } from './baseAxis.js';
import type { XYChartAxisThemeConfig, XYChartAxisConfig } from '../../interfaces.js';
export declare class BandAxis extends BaseAxis {
    private scale;
    private categories;
    constructor(axisConfig: XYChartAxisConfig, axisThemeConfig: XYChartAxisThemeConfig, categories: string[], title: string, textDimensionCalculator: TextDimensionCalculator);
    setRange(range: [number, number]): void;
    recalculateScale(): void;
    getTickValues(): (string | number)[];
    getScaleValue(value: string): number;
}
