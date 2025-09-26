/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { Color, RGBA } from '../../../../base/common/color.js';
import { registerColor, transparent, lighten, darken } from '../colorUtils.js';
// Import the colors we need
import { foreground, contrastBorder, focusBorder, iconForeground } from './baseColors.js';
import { editorWidgetBackground } from './editorColors.js';
// ----- input
export const inputBackground = registerColor('input.background', { dark: '#3C3C3C', light: Color.white, hcDark: Color.black, hcLight: Color.white }, nls.localize(1872, "Input box background."));
export const inputForeground = registerColor('input.foreground', foreground, nls.localize(1873, "Input box foreground."));
export const inputBorder = registerColor('input.border', { dark: null, light: null, hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1874, "Input box border."));
export const inputActiveOptionBorder = registerColor('inputOption.activeBorder', { dark: '#007ACC', light: '#007ACC', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1875, "Border color of activated options in input fields."));
export const inputActiveOptionHoverBackground = registerColor('inputOption.hoverBackground', { dark: '#5a5d5e80', light: '#b8b8b850', hcDark: null, hcLight: null }, nls.localize(1876, "Background color of activated options in input fields."));
export const inputActiveOptionBackground = registerColor('inputOption.activeBackground', { dark: transparent(focusBorder, 0.4), light: transparent(focusBorder, 0.2), hcDark: Color.transparent, hcLight: Color.transparent }, nls.localize(1877, "Background hover color of options in input fields."));
export const inputActiveOptionForeground = registerColor('inputOption.activeForeground', { dark: Color.white, light: Color.black, hcDark: foreground, hcLight: foreground }, nls.localize(1878, "Foreground color of activated options in input fields."));
export const inputPlaceholderForeground = registerColor('input.placeholderForeground', { light: transparent(foreground, 0.5), dark: transparent(foreground, 0.5), hcDark: transparent(foreground, 0.7), hcLight: transparent(foreground, 0.7) }, nls.localize(1879, "Input box foreground color for placeholder text."));
// ----- input validation
export const inputValidationInfoBackground = registerColor('inputValidation.infoBackground', { dark: '#063B49', light: '#D6ECF2', hcDark: Color.black, hcLight: Color.white }, nls.localize(1880, "Input validation background color for information severity."));
export const inputValidationInfoForeground = registerColor('inputValidation.infoForeground', { dark: null, light: null, hcDark: null, hcLight: foreground }, nls.localize(1881, "Input validation foreground color for information severity."));
export const inputValidationInfoBorder = registerColor('inputValidation.infoBorder', { dark: '#007acc', light: '#007acc', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1882, "Input validation border color for information severity."));
export const inputValidationWarningBackground = registerColor('inputValidation.warningBackground', { dark: '#352A05', light: '#F6F5D2', hcDark: Color.black, hcLight: Color.white }, nls.localize(1883, "Input validation background color for warning severity."));
export const inputValidationWarningForeground = registerColor('inputValidation.warningForeground', { dark: null, light: null, hcDark: null, hcLight: foreground }, nls.localize(1884, "Input validation foreground color for warning severity."));
export const inputValidationWarningBorder = registerColor('inputValidation.warningBorder', { dark: '#B89500', light: '#B89500', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1885, "Input validation border color for warning severity."));
export const inputValidationErrorBackground = registerColor('inputValidation.errorBackground', { dark: '#5A1D1D', light: '#F2DEDE', hcDark: Color.black, hcLight: Color.white }, nls.localize(1886, "Input validation background color for error severity."));
export const inputValidationErrorForeground = registerColor('inputValidation.errorForeground', { dark: null, light: null, hcDark: null, hcLight: foreground }, nls.localize(1887, "Input validation foreground color for error severity."));
export const inputValidationErrorBorder = registerColor('inputValidation.errorBorder', { dark: '#BE1100', light: '#BE1100', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1888, "Input validation border color for error severity."));
// ----- select
export const selectBackground = registerColor('dropdown.background', { dark: '#3C3C3C', light: Color.white, hcDark: Color.black, hcLight: Color.white }, nls.localize(1889, "Dropdown background."));
export const selectListBackground = registerColor('dropdown.listBackground', { dark: null, light: null, hcDark: Color.black, hcLight: Color.white }, nls.localize(1890, "Dropdown list background."));
export const selectForeground = registerColor('dropdown.foreground', { dark: '#F0F0F0', light: foreground, hcDark: Color.white, hcLight: foreground }, nls.localize(1891, "Dropdown foreground."));
export const selectBorder = registerColor('dropdown.border', { dark: selectBackground, light: '#CECECE', hcDark: contrastBorder, hcLight: contrastBorder }, nls.localize(1892, "Dropdown border."));
// ------ button
export const buttonForeground = registerColor('button.foreground', Color.white, nls.localize(1893, "Button foreground color."));
export const buttonSeparator = registerColor('button.separator', transparent(buttonForeground, .4), nls.localize(1894, "Button separator color."));
export const buttonBackground = registerColor('button.background', { dark: '#0E639C', light: '#007ACC', hcDark: null, hcLight: '#0F4A85' }, nls.localize(1895, "Button background color."));
export const buttonHoverBackground = registerColor('button.hoverBackground', { dark: lighten(buttonBackground, 0.2), light: darken(buttonBackground, 0.2), hcDark: buttonBackground, hcLight: buttonBackground }, nls.localize(1896, "Button background color when hovering."));
export const buttonBorder = registerColor('button.border', contrastBorder, nls.localize(1897, "Button border color."));
export const buttonSecondaryForeground = registerColor('button.secondaryForeground', { dark: Color.white, light: Color.white, hcDark: Color.white, hcLight: foreground }, nls.localize(1898, "Secondary button foreground color."));
export const buttonSecondaryBackground = registerColor('button.secondaryBackground', { dark: '#3A3D41', light: '#5F6A79', hcDark: null, hcLight: Color.white }, nls.localize(1899, "Secondary button background color."));
export const buttonSecondaryHoverBackground = registerColor('button.secondaryHoverBackground', { dark: lighten(buttonSecondaryBackground, 0.2), light: darken(buttonSecondaryBackground, 0.2), hcDark: null, hcLight: null }, nls.localize(1900, "Secondary button background color when hovering."));
// ------ radio
export const radioActiveForeground = registerColor('radio.activeForeground', inputActiveOptionForeground, nls.localize(1901, "Foreground color of active radio option."));
export const radioActiveBackground = registerColor('radio.activeBackground', inputActiveOptionBackground, nls.localize(1902, "Background color of active radio option."));
export const radioActiveBorder = registerColor('radio.activeBorder', inputActiveOptionBorder, nls.localize(1903, "Border color of the active radio option."));
export const radioInactiveForeground = registerColor('radio.inactiveForeground', null, nls.localize(1904, "Foreground color of inactive radio option."));
export const radioInactiveBackground = registerColor('radio.inactiveBackground', null, nls.localize(1905, "Background color of inactive radio option."));
export const radioInactiveBorder = registerColor('radio.inactiveBorder', { light: transparent(radioActiveForeground, .2), dark: transparent(radioActiveForeground, .2), hcDark: transparent(radioActiveForeground, .4), hcLight: transparent(radioActiveForeground, .2) }, nls.localize(1906, "Border color of the inactive radio option."));
export const radioInactiveHoverBackground = registerColor('radio.inactiveHoverBackground', inputActiveOptionHoverBackground, nls.localize(1907, "Background color of inactive active radio option when hovering."));
// ------ checkbox
export const checkboxBackground = registerColor('checkbox.background', selectBackground, nls.localize(1908, "Background color of checkbox widget."));
export const checkboxSelectBackground = registerColor('checkbox.selectBackground', editorWidgetBackground, nls.localize(1909, "Background color of checkbox widget when the element it's in is selected."));
export const checkboxForeground = registerColor('checkbox.foreground', selectForeground, nls.localize(1910, "Foreground color of checkbox widget."));
export const checkboxBorder = registerColor('checkbox.border', selectBorder, nls.localize(1911, "Border color of checkbox widget."));
export const checkboxSelectBorder = registerColor('checkbox.selectBorder', iconForeground, nls.localize(1912, "Border color of checkbox widget when the element it's in is selected."));
export const checkboxDisabledBackground = registerColor('checkbox.disabled.background', { op: 7 /* ColorTransformType.Mix */, color: checkboxBackground, with: checkboxForeground, ratio: 0.33 }, nls.localize(1913, "Background of a disabled checkbox."));
export const checkboxDisabledForeground = registerColor('checkbox.disabled.foreground', { op: 7 /* ColorTransformType.Mix */, color: checkboxForeground, with: checkboxBackground, ratio: 0.33 }, nls.localize(1914, "Foreground of a disabled checkbox."));
// ------ keybinding label
export const keybindingLabelBackground = registerColor('keybindingLabel.background', { dark: new Color(new RGBA(128, 128, 128, 0.17)), light: new Color(new RGBA(221, 221, 221, 0.4)), hcDark: Color.transparent, hcLight: Color.transparent }, nls.localize(1915, "Keybinding label background color. The keybinding label is used to represent a keyboard shortcut."));
export const keybindingLabelForeground = registerColor('keybindingLabel.foreground', { dark: Color.fromHex('#CCCCCC'), light: Color.fromHex('#555555'), hcDark: Color.white, hcLight: foreground }, nls.localize(1916, "Keybinding label foreground color. The keybinding label is used to represent a keyboard shortcut."));
export const keybindingLabelBorder = registerColor('keybindingLabel.border', { dark: new Color(new RGBA(51, 51, 51, 0.6)), light: new Color(new RGBA(204, 204, 204, 0.4)), hcDark: new Color(new RGBA(111, 195, 223)), hcLight: contrastBorder }, nls.localize(1917, "Keybinding label border color. The keybinding label is used to represent a keyboard shortcut."));
export const keybindingLabelBottomBorder = registerColor('keybindingLabel.bottomBorder', { dark: new Color(new RGBA(68, 68, 68, 0.6)), light: new Color(new RGBA(187, 187, 187, 0.4)), hcDark: new Color(new RGBA(111, 195, 223)), hcLight: foreground }, nls.localize(1918, "Keybinding label border bottom color. The keybinding label is used to represent a keyboard shortcut."));
//# sourceMappingURL=inputColors.js.map