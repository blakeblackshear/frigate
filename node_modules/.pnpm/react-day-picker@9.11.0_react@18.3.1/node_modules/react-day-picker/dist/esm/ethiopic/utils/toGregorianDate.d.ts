import type { EthiopicDate } from "./EthiopicDate.js";
export declare function getDayNoEthiopian(etDate: EthiopicDate): number;
/**
 * Converts an Ethiopic date to a Gregorian date.
 *
 * @param ethiopicDate - An EthiopicDate object.
 * @returns A JavaScript Date object representing the Gregorian date.
 */
export declare function toGregorianDate(ethiopicDate: EthiopicDate): Date;
