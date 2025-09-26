/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, transparent, lessProminent, darken, lighten } from '../colorUtils.js';
// Import the colors we need
import { foreground, contrastBorder, activeContrastBorder } from './baseColors.js';
import { scrollbarShadow, badgeBackground } from './miscColors.js';
// ----- editor
export const editorBackground = registerColor('editor.background', { light: '#ffffff', dark: '#1E1E1E', hcDark: Color.black, hcLight: Color.white }, nls.localize(1777, "Editor background color."));
export const editorForeground = registerColor('editor.foreground', { light: '#333333', dark: '#BBBBBB', hcDark: Color.white, hcLight: foreground }, nls.localize(1778, "Editor default foreground color."));
export const editorStickyScrollBackground = registerColor('editorStickyScroll.background', editorBackground, nls.localize(1779, "Background color of sticky scroll in the editor"));
export const editorStickyScrollGutterBackground = registerColor('editorStickyScrollGutter.background', editorBackground, nls.localize(1780, "Background color of the gutter part of sticky scroll in the editor"));
export const editorStickyScrollHoverBackground = registerColor('editorStickyScrollHover.background', { dark: '#2A2D2E', light: '#F0F0F0', hcDark: null, hcLight: Color.fromHex('#0F4A85').transparent(0.1) }, nls.localize(1781, "Background color of sticky scroll on hover in the editor"));
export const editorStickyScrollBorder = registerColor('editorStickyScroll.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1782, "Border color of sticky scroll in the editor"));
export const editorStickyScrollShadow = registerColor('editorStickyScroll.shadow', scrollbarShadow, nls.localize(1783, " Shadow color of sticky scroll in the editor"));
export const editorWidgetBackground = registerColor('editorWidget.background', { dark: '#252526', light: '#F3F3F3', hcDark: '#0C141F', hcLight: Color.white }, nls.localize(1784, 'Background color of editor widgets, such as find/replace.'));
export const editorWidgetForeground = registerColor('editorWidget.foreground', foreground, nls.localize(1785, 'Foreground color of editor widgets, such as find/replace.'));
export const editorWidgetBorder = registerColor('editorWidget.border', { dark: '#454545', light: '#C8C8C8', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1786, 'Border color of editor widgets. The color is only used if the widget chooses to have a border and if the color is not overridden by a widget.'));
export const editorWidgetResizeBorder = registerColor('editorWidget.resizeBorder', null, nls.localize(1787, "Border color of the resize bar of editor widgets. The color is only used if the widget chooses to have a resize border and if the color is not overridden by a widget."));
export const editorErrorBackground = registerColor('editorError.background', null, nls.localize(1788, 'Background color of error text in the editor. The color must not be opaque so as not to hide underlying decorations.'), true);
export const editorErrorForeground = registerColor('editorError.foreground', { dark: '#F14C4C', light: '#E51400', hcDark: '#F48771', hcLight: '#B5200D' }, nls.localize(1789, 'Foreground color of error squigglies in the editor.'));
export const editorErrorBorder = registerColor('editorError.border', { dark: null, light: null, hcDark: Color.fromHex('#E47777').transparent(0.8), hcLight: '#B5200D' }, nls.localize(1790, 'If set, color of double underlines for errors in the editor.'));
export const editorWarningBackground = registerColor('editorWarning.background', null, nls.localize(1791, 'Background color of warning text in the editor. The color must not be opaque so as not to hide underlying decorations.'), true);
export const editorWarningForeground = registerColor('editorWarning.foreground', { dark: '#CCA700', light: '#BF8803', hcDark: '#FFD370', hcLight: '#895503' }, nls.localize(1792, 'Foreground color of warning squigglies in the editor.'));
export const editorWarningBorder = registerColor('editorWarning.border', { dark: null, light: null, hcDark: Color.fromHex('#FFCC00').transparent(0.8), hcLight: Color.fromHex('#FFCC00').transparent(0.8) }, nls.localize(1793, 'If set, color of double underlines for warnings in the editor.'));
export const editorInfoBackground = registerColor('editorInfo.background', null, nls.localize(1794, 'Background color of info text in the editor. The color must not be opaque so as not to hide underlying decorations.'), true);
export const editorInfoForeground = registerColor('editorInfo.foreground', { dark: '#3794FF', light: '#1a85ff', hcDark: '#3794FF', hcLight: '#1a85ff' }, nls.localize(1795, 'Foreground color of info squigglies in the editor.'));
export const editorInfoBorder = registerColor('editorInfo.border', { dark: null, light: null, hcDark: Color.fromHex('#3794FF').transparent(0.8), hcLight: '#292929' }, nls.localize(1796, 'If set, color of double underlines for infos in the editor.'));
export const editorHintForeground = registerColor('editorHint.foreground', { dark: Color.fromHex('#eeeeee').transparent(0.7), light: '#6c6c6c', hcDark: null, hcLight: null }, nls.localize(1797, 'Foreground color of hint squigglies in the editor.'));
export const editorHintBorder = registerColor('editorHint.border', { dark: null, light: null, hcDark: Color.fromHex('#eeeeee').transparent(0.8), hcLight: '#292929' }, nls.localize(1798, 'If set, color of double underlines for hints in the editor.'));
export const editorActiveLinkForeground = registerColor('editorLink.activeForeground', { dark: '#4E94CE', light: Color.blue, hcDark: Color.cyan, hcLight: '#292929' }, nls.localize(1799, 'Color of active links.'));
// ----- editor selection
export const editorSelectionBackground = registerColor('editor.selectionBackground', { light: '#ADD6FF', dark: '#264F78', hcDark: '#f3f518', hcLight: '#0F4A85' }, nls.localize(1800, "Color of the editor selection."));
export const editorSelectionForeground = registerColor('editor.selectionForeground', { light: null, dark: null, hcDark: '#000000', hcLight: Color.white }, nls.localize(1801, "Color of the selected text for high contrast."));
export const editorInactiveSelection = registerColor('editor.inactiveSelectionBackground', { light: transparent(editorSelectionBackground, 0.5), dark: transparent(editorSelectionBackground, 0.5), hcDark: transparent(editorSelectionBackground, 0.7), hcLight: transparent(editorSelectionBackground, 0.5) }, nls.localize(1802, "Color of the selection in an inactive editor. The color must not be opaque so as not to hide underlying decorations."), true);
export const editorSelectionHighlight = registerColor('editor.selectionHighlightBackground', { light: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), dark: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), hcDark: null, hcLight: null }, nls.localize(1803, 'Color for regions with the same content as the selection. The color must not be opaque so as not to hide underlying decorations.'), true);
export const editorSelectionHighlightBorder = registerColor('editor.selectionHighlightBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(1804, "Border color for regions with the same content as the selection."));
export const editorCompositionBorder = registerColor('editor.compositionBorder', { light: '#000000', dark: '#ffffff', hcLight: '#000000', hcDark: '#ffffff' }, nls.localize(1805, "The border color for an IME composition."));
// ----- editor find
export const editorFindMatch = registerColor('editor.findMatchBackground', { light: '#A8AC94', dark: '#515C6A', hcDark: null, hcLight: null }, nls.localize(1806, "Color of the current search match."));
export const editorFindMatchForeground = registerColor('editor.findMatchForeground', null, nls.localize(1807, "Text color of the current search match."));
export const editorFindMatchHighlight = registerColor('editor.findMatchHighlightBackground', { light: '#EA5C0055', dark: '#EA5C0055', hcDark: null, hcLight: null }, nls.localize(1808, "Color of the other search matches. The color must not be opaque so as not to hide underlying decorations."), true);
export const editorFindMatchHighlightForeground = registerColor('editor.findMatchHighlightForeground', null, nls.localize(1809, "Foreground color of the other search matches."), true);
export const editorFindRangeHighlight = registerColor('editor.findRangeHighlightBackground', { dark: '#3a3d4166', light: '#b4b4b44d', hcDark: null, hcLight: null }, nls.localize(1810, "Color of the range limiting the search. The color must not be opaque so as not to hide underlying decorations."), true);
export const editorFindMatchBorder = registerColor('editor.findMatchBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(1811, "Border color of the current search match."));
export const editorFindMatchHighlightBorder = registerColor('editor.findMatchHighlightBorder', { light: null, dark: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(1812, "Border color of the other search matches."));
export const editorFindRangeHighlightBorder = registerColor('editor.findRangeHighlightBorder', { dark: null, light: null, hcDark: transparent(activeContrastBorder, 0.4), hcLight: transparent(activeContrastBorder, 0.4) }, nls.localize(1813, "Border color of the range limiting the search. The color must not be opaque so as not to hide underlying decorations."), true);
// ----- editor hover
export const editorHoverHighlight = registerColor('editor.hoverHighlightBackground', { light: '#ADD6FF26', dark: '#264f7840', hcDark: '#ADD6FF26', hcLight: null }, nls.localize(1814, 'Highlight below the word for which a hover is shown. The color must not be opaque so as not to hide underlying decorations.'), true);
export const editorHoverBackground = registerColor('editorHoverWidget.background', editorWidgetBackground, nls.localize(1815, 'Background color of the editor hover.'));
export const editorHoverForeground = registerColor('editorHoverWidget.foreground', editorWidgetForeground, nls.localize(1816, 'Foreground color of the editor hover.'));
export const editorHoverBorder = registerColor('editorHoverWidget.border', editorWidgetBorder, nls.localize(1817, 'Border color of the editor hover.'));
export const editorHoverStatusBarBackground = registerColor('editorHoverWidget.statusBarBackground', { dark: lighten(editorHoverBackground, 0.2), light: darken(editorHoverBackground, 0.05), hcDark: editorWidgetBackground, hcLight: editorWidgetBackground }, nls.localize(1818, "Background color of the editor hover status bar."));
// ----- editor inlay hint
export const editorInlayHintForeground = registerColor('editorInlayHint.foreground', { dark: '#969696', light: '#969696', hcDark: Color.white, hcLight: Color.black }, nls.localize(1819, 'Foreground color of inline hints'));
export const editorInlayHintBackground = registerColor('editorInlayHint.background', { dark: transparent(badgeBackground, .10), light: transparent(badgeBackground, .10), hcDark: transparent(Color.white, .10), hcLight: transparent(badgeBackground, .10) }, nls.localize(1820, 'Background color of inline hints'));
export const editorInlayHintTypeForeground = registerColor('editorInlayHint.typeForeground', editorInlayHintForeground, nls.localize(1821, 'Foreground color of inline hints for types'));
export const editorInlayHintTypeBackground = registerColor('editorInlayHint.typeBackground', editorInlayHintBackground, nls.localize(1822, 'Background color of inline hints for types'));
export const editorInlayHintParameterForeground = registerColor('editorInlayHint.parameterForeground', editorInlayHintForeground, nls.localize(1823, 'Foreground color of inline hints for parameters'));
export const editorInlayHintParameterBackground = registerColor('editorInlayHint.parameterBackground', editorInlayHintBackground, nls.localize(1824, 'Background color of inline hints for parameters'));
// ----- editor lightbulb
export const editorLightBulbForeground = registerColor('editorLightBulb.foreground', { dark: '#FFCC00', light: '#DDB100', hcDark: '#FFCC00', hcLight: '#007ACC' }, nls.localize(1825, "The color used for the lightbulb actions icon."));
export const editorLightBulbAutoFixForeground = registerColor('editorLightBulbAutoFix.foreground', { dark: '#75BEFF', light: '#007ACC', hcDark: '#75BEFF', hcLight: '#007ACC' }, nls.localize(1826, "The color used for the lightbulb auto fix actions icon."));
export const editorLightBulbAiForeground = registerColor('editorLightBulbAi.foreground', editorLightBulbForeground, nls.localize(1827, "The color used for the lightbulb AI icon."));
// ----- editor snippet
export const snippetTabstopHighlightBackground = registerColor('editor.snippetTabstopHighlightBackground', { dark: new Color(new RGBA(124, 124, 124, 0.3)), light: new Color(new RGBA(10, 50, 100, 0.2)), hcDark: new Color(new RGBA(124, 124, 124, 0.3)), hcLight: new Color(new RGBA(10, 50, 100, 0.2)) }, nls.localize(1828, "Highlight background color of a snippet tabstop."));
export const snippetTabstopHighlightBorder = registerColor('editor.snippetTabstopHighlightBorder', null, nls.localize(1829, "Highlight border color of a snippet tabstop."));
export const snippetFinalTabstopHighlightBackground = registerColor('editor.snippetFinalTabstopHighlightBackground', null, nls.localize(1830, "Highlight background color of the final tabstop of a snippet."));
export const snippetFinalTabstopHighlightBorder = registerColor('editor.snippetFinalTabstopHighlightBorder', { dark: '#525252', light: new Color(new RGBA(10, 50, 100, 0.5)), hcDark: '#525252', hcLight: '#292929' }, nls.localize(1831, "Highlight border color of the final tabstop of a snippet."));
// ----- diff editor
export const defaultInsertColor = new Color(new RGBA(155, 185, 85, .2));
export const defaultRemoveColor = new Color(new RGBA(255, 0, 0, .2));
export const diffInserted = registerColor('diffEditor.insertedTextBackground', { dark: '#9ccc2c33', light: '#9ccc2c40', hcDark: null, hcLight: null }, nls.localize(1832, 'Background color for text that got inserted. The color must not be opaque so as not to hide underlying decorations.'), true);
export const diffRemoved = registerColor('diffEditor.removedTextBackground', { dark: '#ff000033', light: '#ff000033', hcDark: null, hcLight: null }, nls.localize(1833, 'Background color for text that got removed. The color must not be opaque so as not to hide underlying decorations.'), true);
export const diffInsertedLine = registerColor('diffEditor.insertedLineBackground', { dark: defaultInsertColor, light: defaultInsertColor, hcDark: null, hcLight: null }, nls.localize(1834, 'Background color for lines that got inserted. The color must not be opaque so as not to hide underlying decorations.'), true);
export const diffRemovedLine = registerColor('diffEditor.removedLineBackground', { dark: defaultRemoveColor, light: defaultRemoveColor, hcDark: null, hcLight: null }, nls.localize(1835, 'Background color for lines that got removed. The color must not be opaque so as not to hide underlying decorations.'), true);
export const diffInsertedLineGutter = registerColor('diffEditorGutter.insertedLineBackground', null, nls.localize(1836, 'Background color for the margin where lines got inserted.'));
export const diffRemovedLineGutter = registerColor('diffEditorGutter.removedLineBackground', null, nls.localize(1837, 'Background color for the margin where lines got removed.'));
export const diffOverviewRulerInserted = registerColor('diffEditorOverview.insertedForeground', null, nls.localize(1838, 'Diff overview ruler foreground for inserted content.'));
export const diffOverviewRulerRemoved = registerColor('diffEditorOverview.removedForeground', null, nls.localize(1839, 'Diff overview ruler foreground for removed content.'));
export const diffInsertedOutline = registerColor('diffEditor.insertedTextBorder', { dark: null, light: null, hcDark: '#33ff2eff', hcLight: '#374E06' }, nls.localize(1840, 'Outline color for the text that got inserted.'));
export const diffRemovedOutline = registerColor('diffEditor.removedTextBorder', { dark: null, light: null, hcDark: '#FF008F', hcLight: '#AD0707' }, nls.localize(1841, 'Outline color for text that got removed.'));
export const diffBorder = registerColor('diffEditor.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1842, 'Border color between the two text editors.'));
export const diffDiagonalFill = registerColor('diffEditor.diagonalFill', { dark: '#cccccc33', light: '#22222233', hcDark: null, hcLight: null }, nls.localize(1843, "Color of the diff editor's diagonal fill. The diagonal fill is used in side-by-side diff views."));
export const diffUnchangedRegionBackground = registerColor('diffEditor.unchangedRegionBackground', 'sideBar.background', nls.localize(1844, "The background color of unchanged blocks in the diff editor."));
export const diffUnchangedRegionForeground = registerColor('diffEditor.unchangedRegionForeground', 'foreground', nls.localize(1845, "The foreground color of unchanged blocks in the diff editor."));
export const diffUnchangedTextBackground = registerColor('diffEditor.unchangedCodeBackground', { dark: '#74747429', light: '#b8b8b829', hcDark: null, hcLight: null }, nls.localize(1846, "The background color of unchanged code in the diff editor."));
// ----- widget
export const widgetShadow = registerColor('widget.shadow', { dark: transparent(Color.black, .36), light: transparent(Color.black, .16), hcDark: null, hcLight: null }, nls.localize(1847, 'Shadow color of widgets such as find/replace inside the editor.'));
export const widgetBorder = registerColor('widget.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1848, 'Border color of widgets such as find/replace inside the editor.'));
// ----- toolbar
export const toolbarHoverBackground = registerColor('toolbar.hoverBackground', { dark: '#5a5d5e50', light: '#b8b8b850', hcDark: null, hcLight: null }, nls.localize(1849, "Toolbar background when hovering over actions using the mouse"));
export const toolbarHoverOutline = registerColor('toolbar.hoverOutline', { dark: null, light: null, hcDark: activeContrastBorder, hcLight: activeContrastBorder }, nls.localize(1850, "Toolbar outline when hovering over actions using the mouse"));
export const toolbarActiveBackground = registerColor('toolbar.activeBackground', { dark: lighten(toolbarHoverBackground, 0.1), light: darken(toolbarHoverBackground, 0.1), hcDark: null, hcLight: null }, nls.localize(1851, "Toolbar background when holding the mouse over actions"));
// ----- breadcumbs
export const breadcrumbsForeground = registerColor('breadcrumb.foreground', transparent(foreground, 0.8), nls.localize(1852, "Color of focused breadcrumb items."));
export const breadcrumbsBackground = registerColor('breadcrumb.background', editorBackground, nls.localize(1853, "Background color of breadcrumb items."));
export const breadcrumbsFocusForeground = registerColor('breadcrumb.focusForeground', { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hcDark: lighten(foreground, 0.1), hcLight: lighten(foreground, 0.1) }, nls.localize(1854, "Color of focused breadcrumb items."));
export const breadcrumbsActiveSelectionForeground = registerColor('breadcrumb.activeSelectionForeground', { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hcDark: lighten(foreground, 0.1), hcLight: lighten(foreground, 0.1) }, nls.localize(1855, "Color of selected breadcrumb items."));
export const breadcrumbsPickerBackground = registerColor('breadcrumbPicker.background', editorWidgetBackground, nls.localize(1856, "Background color of breadcrumb item picker."));
// ----- merge
const headerTransparency = 0.5;
const currentBaseColor = Color.fromHex('#40C8AE').transparent(headerTransparency);
const incomingBaseColor = Color.fromHex('#40A6FF').transparent(headerTransparency);
const commonBaseColor = Color.fromHex('#606060').transparent(0.4);
const contentTransparency = 0.4;
const rulerTransparency = 1;
export const mergeCurrentHeaderBackground = registerColor('merge.currentHeaderBackground', { dark: currentBaseColor, light: currentBaseColor, hcDark: null, hcLight: null }, nls.localize(1857, 'Current header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
export const mergeCurrentContentBackground = registerColor('merge.currentContentBackground', transparent(mergeCurrentHeaderBackground, contentTransparency), nls.localize(1858, 'Current content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
export const mergeIncomingHeaderBackground = registerColor('merge.incomingHeaderBackground', { dark: incomingBaseColor, light: incomingBaseColor, hcDark: null, hcLight: null }, nls.localize(1859, 'Incoming header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
export const mergeIncomingContentBackground = registerColor('merge.incomingContentBackground', transparent(mergeIncomingHeaderBackground, contentTransparency), nls.localize(1860, 'Incoming content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
export const mergeCommonHeaderBackground = registerColor('merge.commonHeaderBackground', { dark: commonBaseColor, light: commonBaseColor, hcDark: null, hcLight: null }, nls.localize(1861, 'Common ancestor header background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
export const mergeCommonContentBackground = registerColor('merge.commonContentBackground', transparent(mergeCommonHeaderBackground, contentTransparency), nls.localize(1862, 'Common ancestor content background in inline merge-conflicts. The color must not be opaque so as not to hide underlying decorations.'), true);
export const mergeBorder = registerColor('merge.border', { dark: null, light: null, hcDark: '#C3DF6F', hcLight: '#007ACC' }, nls.localize(1863, 'Border color on headers and the splitter in inline merge-conflicts.'));
export const overviewRulerCurrentContentForeground = registerColor('editorOverviewRuler.currentContentForeground', { dark: transparent(mergeCurrentHeaderBackground, rulerTransparency), light: transparent(mergeCurrentHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, nls.localize(1864, 'Current overview ruler foreground for inline merge-conflicts.'));
export const overviewRulerIncomingContentForeground = registerColor('editorOverviewRuler.incomingContentForeground', { dark: transparent(mergeIncomingHeaderBackground, rulerTransparency), light: transparent(mergeIncomingHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, nls.localize(1865, 'Incoming overview ruler foreground for inline merge-conflicts.'));
export const overviewRulerCommonContentForeground = registerColor('editorOverviewRuler.commonContentForeground', { dark: transparent(mergeCommonHeaderBackground, rulerTransparency), light: transparent(mergeCommonHeaderBackground, rulerTransparency), hcDark: mergeBorder, hcLight: mergeBorder }, nls.localize(1866, 'Common ancestor overview ruler foreground for inline merge-conflicts.'));
export const overviewRulerFindMatchForeground = registerColor('editorOverviewRuler.findMatchForeground', { dark: '#d186167e', light: '#d186167e', hcDark: '#AB5A00', hcLight: '#AB5A00' }, nls.localize(1867, 'Overview ruler marker color for find matches. The color must not be opaque so as not to hide underlying decorations.'), true);
export const overviewRulerSelectionHighlightForeground = registerColor('editorOverviewRuler.selectionHighlightForeground', '#A0A0A0CC', nls.localize(1868, 'Overview ruler marker color for selection highlights. The color must not be opaque so as not to hide underlying decorations.'), true);
// ----- problems
export const problemsErrorIconForeground = registerColor('problemsErrorIcon.foreground', editorErrorForeground, nls.localize(1869, "The color used for the problems error icon."));
export const problemsWarningIconForeground = registerColor('problemsWarningIcon.foreground', editorWarningForeground, nls.localize(1870, "The color used for the problems warning icon."));
export const problemsInfoIconForeground = registerColor('problemsInfoIcon.foreground', editorInfoForeground, nls.localize(1871, "The color used for the problems info icon."));
//# sourceMappingURL=editorColors.js.map