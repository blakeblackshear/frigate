import { MonthCaption, } from "../components/MonthCaption.js";
import { Week } from "../components/Week.js";
import { useDayPicker } from "../useDayPicker.js";
/**
 * @ignore
 * @deprecated This component has been renamed. Use `MonthCaption` instead.
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export const Caption = MonthCaption;
/**
 * @ignore
 * @deprecated This component has been renamed. Use `Week` instead.
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export const Row = Week;
/**
 * @ignore
 * @deprecated This type has been moved to `useDayPicker`.
 * @group Hooks
 */
export const useNavigation = useDayPicker;
