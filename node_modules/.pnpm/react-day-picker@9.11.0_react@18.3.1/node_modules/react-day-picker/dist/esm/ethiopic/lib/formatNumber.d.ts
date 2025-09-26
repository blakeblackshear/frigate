/**
 * Formats a number using either Latin or Ethiopic (Geez) numerals
 *
 * @example
 *   ```ts
 *   formatNumber(123) // '123'
 *   formatNumber(123, 'geez') // '፻፳፫'
 *   formatNumber(2023, 'geez') // '፳፻፳፫'
 *   ```;
 *
 * @param value - The number to format
 * @param numerals - The numeral system to use:
 *
 *   - 'latn': Latin numerals (1, 2, 3...)
 *   - 'geez': Ethiopic numerals (፩, ፪, ፫...)
 *
 * @returns The formatted number string
 */
export declare function formatNumber(value: number, numerals?: string): string;
