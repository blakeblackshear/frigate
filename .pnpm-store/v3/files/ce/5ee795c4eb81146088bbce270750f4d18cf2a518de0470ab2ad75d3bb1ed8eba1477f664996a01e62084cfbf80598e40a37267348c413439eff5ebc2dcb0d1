"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dayPickerContext = void 0;
exports.useDayPicker = useDayPicker;
const react_1 = require("react");
/** @ignore */
exports.dayPickerContext = (0, react_1.createContext)(undefined);
/**
 * Provides access to the DayPicker context, which includes properties and
 * methods to interact with the DayPicker component. This hook must be used
 * within a custom component.
 *
 * @template T - Use this type to refine the returned context type with a
 *   specific selection mode.
 * @returns The context to work with DayPicker.
 * @throws {Error} If the hook is used outside of a DayPicker provider.
 * @group Hooks
 * @see https://daypicker.dev/guides/custom-components
 */
function useDayPicker() {
    const context = (0, react_1.useContext)(exports.dayPickerContext);
    if (context === undefined) {
        throw new Error("useDayPicker() must be used within a custom component.");
    }
    return context;
}
