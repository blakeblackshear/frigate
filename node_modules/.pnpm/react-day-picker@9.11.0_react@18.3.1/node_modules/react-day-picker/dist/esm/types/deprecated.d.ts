import { MonthCaption, type MonthCaptionProps } from "../components/MonthCaption.js";
import { Week, type WeekProps } from "../components/Week.js";
import type { labelDayButton, labelNext, labelWeekday, labelWeekNumber } from "../labels/index.js";
import type { DayFlag, SelectionState } from "../UI.js";
import { useDayPicker } from "../useDayPicker.js";
import type { PropsMulti, PropsRange, PropsSingle } from "./props.js";
import type { DayEventHandler, Mode } from "./shared.js";
/**
 * @ignore
 * @deprecated This type will be removed.
 */
export type RootProvider = any;
/**
 * @ignore
 * @deprecated This type will be removed.
 */
export type RootProviderProps = any;
/**
 * @ignore
 * @deprecated This component has been renamed. Use `MonthCaption` instead.
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare const Caption: typeof MonthCaption;
/**
 * @ignore
 * @deprecated This type has been renamed. Use `MonthCaptionProps` instead.
 */
export type CaptionProps = MonthCaptionProps;
/**
 * @ignore
 * @deprecated This component has been removed.
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export type HeadRow = any;
/**
 * @ignore
 * @deprecated This component has been renamed. Use `Week` instead.
 * @group Components
 * @see https://daypicker.dev/guides/custom-components
 */
export declare const Row: typeof Week;
/**
 * @ignore
 * @deprecated This type has been removed. Use `WeekProps` instead.
 */
export type RowProps = WeekProps;
/**
 * @ignore
 * @deprecated This type has been renamed. Use `PropsSingle` instead.
 */
export type DayPickerSingleProps = PropsSingle;
/**
 * @ignore
 * @deprecated This type has been renamed. Use `PropsMulti` instead.
 */
export type DayPickerMultipleProps = PropsMulti;
/**
 * @ignore
 * @deprecated This type has been renamed. Use `PropsRange` instead.
 */
export type DayPickerRangeProps = PropsRange;
/**
 * @ignore
 * @deprecated This type will be removed. Use `NonNullable<unknown>` instead.
 */
export type DayPickerDefaultProps = NonNullable<unknown>;
/**
 * @ignore
 * @deprecated This type has been renamed. Use `Mode` instead.
 */
export type DaySelectionMode = Mode;
/**
 * @ignore
 * @deprecated This type will be removed. Use `string` instead.
 */
export type Modifier = string;
/**
 * @ignore
 * @deprecated This type will be removed. Use {@link DayFlag} or
 *   {@link SelectionState} instead.
 */
export type InternalModifier = DayFlag.disabled | DayFlag.hidden | DayFlag.focused | SelectionState.range_end | SelectionState.range_middle | SelectionState.range_start | SelectionState.selected;
/**
 * @ignore
 * @deprecated This type will be removed. Use `SelectHandler<{ mode: "single"
 *   }>` instead.
 */
export type SelectSingleEventHandler = PropsSingle["onSelect"];
/**
 * @ignore
 * @deprecated This type will be removed. Use `SelectHandler<{ mode: "multiple"
 *   }>` instead.
 */
export type SelectMultipleEventHandler = PropsMulti["onSelect"];
/**
 * @ignore
 * @deprecated This type will be removed. Use `SelectHandler<{ mode: "range" }>`
 *   instead.
 */
export type SelectRangeEventHandler = PropsRange["onSelect"];
/**
 * @ignore
 * @deprecated This type is not used anymore.
 */
export type DayPickerProviderProps = any;
/**
 * @ignore
 * @deprecated This type has been moved to `useDayPicker`.
 * @group Hooks
 */
export declare const useNavigation: typeof useDayPicker;
/**
 * @ignore
 * @deprecated This hook has been removed. Use a custom `Day` component instead.
 * @group Hooks
 * @see https://daypicker.dev/guides/custom-components
 */
export type useDayRender = any;
/**
 * @ignore
 * @deprecated This type is not used anymore.
 */
export type ContextProvidersProps = any;
/**
 * @ignore
 * @deprecated Use `typeof labelDayButton` instead.
 */
export type DayLabel = typeof labelDayButton;
/**
 * @ignore
 * @deprecated Use `typeof labelNext` or `typeof labelPrevious` instead.
 */
export type NavButtonLabel = typeof labelNext;
/**
 * @ignore
 * @deprecated Use `typeof labelWeekday` instead.
 */
export type WeekdayLabel = typeof labelWeekday;
/**
 * @ignore
 * @deprecated Use `typeof labelWeekNumber` instead.
 */
export type WeekNumberLabel = typeof labelWeekNumber;
/**
 * @ignore
 * @deprecated Use {@link DayMouseEventHandler} instead.
 */
export type DayClickEventHandler = DayEventHandler<React.MouseEvent>;
/**
 * @ignore
 * @deprecated This type will be removed. Use `DayEventHandler<React.FocusEvent
 *   | React.KeyboardEvent>` instead.
 */
export type DayFocusEventHandler = DayEventHandler<React.FocusEvent | React.KeyboardEvent>;
/**
 * @ignore
 * @deprecated This type will be removed. Use
 *   `DayEventHandler<React.KeyboardEvent>` instead.
 */
export type DayKeyboardEventHandler = DayEventHandler<React.KeyboardEvent>;
/**
 * @ignore
 * @deprecated This type will be removed. Use
 *   `DayEventHandler<React.MouseEvent>` instead.
 */
export type DayMouseEventHandler = DayEventHandler<React.MouseEvent>;
/**
 * @ignore
 * @deprecated This type will be removed. Use
 *   `DayEventHandler<React.PointerEvent>` instead.
 */
export type DayPointerEventHandler = DayEventHandler<React.PointerEvent>;
/**
 * @ignore
 * @deprecated This type will be removed. Use
 *   `DayEventHandler<React.TouchEvent>` instead.
 */
export type DayTouchEventHandler = DayEventHandler<React.TouchEvent>;
