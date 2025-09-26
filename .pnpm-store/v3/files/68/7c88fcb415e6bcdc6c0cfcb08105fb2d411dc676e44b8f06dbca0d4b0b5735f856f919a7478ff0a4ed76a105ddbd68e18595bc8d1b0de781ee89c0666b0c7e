import type { BaseDiagramConfig, QuadrantChartConfig } from '../../config.type.js';
import type { Point } from '../../types.js';
export type TextVerticalPos = 'left' | 'center' | 'right';
export type TextHorizontalPos = 'top' | 'middle' | 'bottom';
export interface StylesObject {
    className?: string;
    radius?: number;
    color?: string;
    strokeColor?: string;
    strokeWidth?: string;
}
export interface QuadrantPointInputType extends Point, StylesObject {
    text: string;
}
export interface QuadrantTextType extends Point {
    text: string;
    fill: string;
    verticalPos: TextVerticalPos;
    horizontalPos: TextHorizontalPos;
    fontSize: number;
    rotation: number;
}
export interface QuadrantPointType extends Point, Pick<StylesObject, 'strokeColor' | 'strokeWidth'> {
    fill: string;
    radius: number;
    text: QuadrantTextType;
}
export interface QuadrantQuadrantsType extends Point {
    text: QuadrantTextType;
    width: number;
    height: number;
    fill: string;
}
export interface QuadrantLineType {
    strokeWidth: number;
    strokeFill: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}
export interface QuadrantBuildType {
    points: QuadrantPointType[];
    quadrants: QuadrantQuadrantsType[];
    axisLabels: QuadrantTextType[];
    title?: QuadrantTextType;
    borderLines?: QuadrantLineType[];
}
export interface QuadrantBuilderData {
    titleText: string;
    quadrant1Text: string;
    quadrant2Text: string;
    quadrant3Text: string;
    quadrant4Text: string;
    xAxisLeftText: string;
    xAxisRightText: string;
    yAxisBottomText: string;
    yAxisTopText: string;
    points: QuadrantPointInputType[];
}
export interface QuadrantBuilderConfig extends Required<Omit<QuadrantChartConfig, keyof BaseDiagramConfig>> {
    showXAxis: boolean;
    showYAxis: boolean;
    showTitle: boolean;
}
export interface QuadrantBuilderThemeConfig {
    quadrantTitleFill: string;
    quadrant1Fill: string;
    quadrant2Fill: string;
    quadrant3Fill: string;
    quadrant4Fill: string;
    quadrant1TextFill: string;
    quadrant2TextFill: string;
    quadrant3TextFill: string;
    quadrant4TextFill: string;
    quadrantPointFill: string;
    quadrantPointTextFill: string;
    quadrantXAxisTextFill: string;
    quadrantYAxisTextFill: string;
    quadrantInternalBorderStrokeFill: string;
    quadrantExternalBorderStrokeFill: string;
}
interface CalculateSpaceData {
    xAxisSpace: {
        top: number;
        bottom: number;
    };
    yAxisSpace: {
        left: number;
        right: number;
    };
    titleSpace: {
        top: number;
    };
    quadrantSpace: {
        quadrantLeft: number;
        quadrantTop: number;
        quadrantWidth: number;
        quadrantHalfWidth: number;
        quadrantHeight: number;
        quadrantHalfHeight: number;
    };
}
export declare class QuadrantBuilder {
    private config;
    private themeConfig;
    private data;
    private classes;
    constructor();
    getDefaultData(): QuadrantBuilderData;
    getDefaultConfig(): QuadrantBuilderConfig;
    getDefaultThemeConfig(): QuadrantBuilderThemeConfig;
    clear(): void;
    setData(data: Partial<QuadrantBuilderData>): void;
    addPoints(points: QuadrantPointInputType[]): void;
    addClass(className: string, styles: StylesObject): void;
    setConfig(config: Partial<QuadrantBuilderConfig>): void;
    setThemeConfig(themeConfig: Partial<QuadrantBuilderThemeConfig>): void;
    calculateSpace(xAxisPosition: typeof this.config.xAxisPosition, showXAxis: boolean, showYAxis: boolean, showTitle: boolean): CalculateSpaceData;
    getAxisLabels(xAxisPosition: typeof this.config.xAxisPosition, showXAxis: boolean, showYAxis: boolean, spaceData: CalculateSpaceData): QuadrantTextType[];
    getQuadrants(spaceData: CalculateSpaceData): QuadrantQuadrantsType[];
    getQuadrantPoints(spaceData: CalculateSpaceData): QuadrantPointType[];
    getBorders(spaceData: CalculateSpaceData): QuadrantLineType[];
    getTitle(showTitle: boolean): QuadrantTextType | undefined;
    build(): QuadrantBuildType;
}
export {};
