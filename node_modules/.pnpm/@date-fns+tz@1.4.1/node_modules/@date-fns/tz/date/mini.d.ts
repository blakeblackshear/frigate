import type { TZDate } from "./index.js";

/**
 * Time zone date class. It overrides original Date functions making them
 * to perform all the calculations in the given time zone.
 *
 * It also provides new functions useful when working with time zones.
 *
 * Combined with date-fns, it allows using the class the same way as
 * the original date class.
 *
 * This minimal version provides complete functionality required for date-fns
 * and excludes build-size-heavy formatter functions.
 *
 * For the complete version, see `TZDate`.
 */
export const TZDateMini: typeof TZDate;
