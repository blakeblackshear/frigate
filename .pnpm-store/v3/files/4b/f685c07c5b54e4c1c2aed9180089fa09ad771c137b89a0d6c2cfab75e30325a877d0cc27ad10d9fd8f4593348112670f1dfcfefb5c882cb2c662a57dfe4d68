"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMulti = useMulti;
const useControlledValue_js_1 = require("../helpers/useControlledValue.js");
/**
 * Hook to manage multiple-date selection in the DayPicker component.
 *
 * @template T - The type of DayPicker props.
 * @param props - The DayPicker props.
 * @param dateLib - The date utility library instance.
 * @returns An object containing the selected dates, a function to select dates,
 *   and a function to check if a date is selected.
 */
function useMulti(props, dateLib) {
    const { selected: initiallySelected, required, onSelect, } = props;
    const [internallySelected, setSelected] = (0, useControlledValue_js_1.useControlledValue)(initiallySelected, onSelect ? initiallySelected : undefined);
    const selected = !onSelect ? internallySelected : initiallySelected;
    const { isSameDay } = dateLib;
    const isSelected = (date) => {
        return selected?.some((d) => isSameDay(d, date)) ?? false;
    };
    const { min, max } = props;
    const select = (triggerDate, modifiers, e) => {
        let newDates = [...(selected ?? [])];
        if (isSelected(triggerDate)) {
            if (selected?.length === min) {
                // Min value reached, do nothing
                return;
            }
            if (required && selected?.length === 1) {
                // Required value already selected do nothing
                return;
            }
            newDates = selected?.filter((d) => !isSameDay(d, triggerDate));
        }
        else {
            if (selected?.length === max) {
                // Max value reached, reset the selection to date
                newDates = [triggerDate];
            }
            else {
                // Add the date to the selection
                newDates = [...newDates, triggerDate];
            }
        }
        if (!onSelect) {
            setSelected(newDates);
        }
        onSelect?.(newDates, triggerDate, modifiers, e);
        return newDates;
    };
    return {
        selected,
        select,
        isSelected,
    };
}
