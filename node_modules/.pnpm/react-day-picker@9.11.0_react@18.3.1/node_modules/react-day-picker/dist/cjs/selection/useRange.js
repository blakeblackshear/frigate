"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRange = useRange;
const useControlledValue_js_1 = require("../helpers/useControlledValue.js");
const index_js_1 = require("../utils/index.js");
const rangeIncludesDate_js_1 = require("../utils/rangeIncludesDate.js");
/**
 * Hook to manage range selection in the DayPicker component.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param dateLib - The date utility library instance.
 * @returns An object containing the selected range, a function to select a
 *   range, and a function to check if a date is within the range.
 */
function useRange(props, dateLib) {
    const { disabled, excludeDisabled, selected: initiallySelected, required, onSelect, } = props;
    const [internallySelected, setSelected] = (0, useControlledValue_js_1.useControlledValue)(initiallySelected, onSelect ? initiallySelected : undefined);
    const selected = !onSelect ? internallySelected : initiallySelected;
    const isSelected = (date) => selected && (0, rangeIncludesDate_js_1.rangeIncludesDate)(selected, date, false, dateLib);
    const select = (triggerDate, modifiers, e) => {
        const { min, max } = props;
        const newRange = triggerDate
            ? (0, index_js_1.addToRange)(triggerDate, selected, min, max, required, dateLib)
            : undefined;
        if (excludeDisabled && disabled && newRange?.from && newRange.to) {
            if ((0, index_js_1.rangeContainsModifiers)({ from: newRange.from, to: newRange.to }, disabled, dateLib)) {
                // if a disabled days is found, the range is reset
                newRange.from = triggerDate;
                newRange.to = undefined;
            }
        }
        if (!onSelect) {
            setSelected(newRange);
        }
        onSelect?.(newRange, triggerDate, modifiers, e);
        return newRange;
    };
    return {
        selected,
        select,
        isSelected,
    };
}
