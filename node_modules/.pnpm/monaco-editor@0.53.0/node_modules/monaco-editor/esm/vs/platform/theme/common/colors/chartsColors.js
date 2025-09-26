/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { registerColor, transparent } from '../colorUtils.js';
import { foreground } from './baseColors.js';
import { editorErrorForeground, editorInfoForeground, editorWarningForeground } from './editorColors.js';
import { minimapFindMatch } from './minimapColors.js';
export const chartsForeground = registerColor('charts.foreground', foreground, nls.localize(1769, "The foreground color used in charts."));
export const chartsLines = registerColor('charts.lines', transparent(foreground, .5), nls.localize(1770, "The color used for horizontal lines in charts."));
export const chartsRed = registerColor('charts.red', editorErrorForeground, nls.localize(1771, "The red color used in chart visualizations."));
export const chartsBlue = registerColor('charts.blue', editorInfoForeground, nls.localize(1772, "The blue color used in chart visualizations."));
export const chartsYellow = registerColor('charts.yellow', editorWarningForeground, nls.localize(1773, "The yellow color used in chart visualizations."));
export const chartsOrange = registerColor('charts.orange', minimapFindMatch, nls.localize(1774, "The orange color used in chart visualizations."));
export const chartsGreen = registerColor('charts.green', { dark: '#89D185', light: '#388A34', hcDark: '#89D185', hcLight: '#374e06' }, nls.localize(1775, "The green color used in chart visualizations."));
export const chartsPurple = registerColor('charts.purple', { dark: '#B180D7', light: '#652D90', hcDark: '#B180D7', hcLight: '#652D90' }, nls.localize(1776, "The purple color used in chart visualizations."));
//# sourceMappingURL=chartsColors.js.map