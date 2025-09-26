import type { SVGGroup } from '../../../../../diagram-api/types.js';
import type { AxisDataType, ChartComponent, XYChartAxisConfig, XYChartAxisThemeConfig } from '../../interfaces.js';
export type AxisPosition = 'left' | 'right' | 'top' | 'bottom';
export interface Axis extends ChartComponent {
    getScaleValue(value: string | number): number;
    setAxisPosition(axisPosition: AxisPosition): void;
    getAxisOuterPadding(): number;
    getTickDistance(): number;
    recalculateOuterPaddingToDrawBar(): void;
    setRange(range: [number, number]): void;
}
export declare function getAxis(data: AxisDataType, axisConfig: XYChartAxisConfig, axisThemeConfig: XYChartAxisThemeConfig, tmpSVGGroup: SVGGroup): Axis;
