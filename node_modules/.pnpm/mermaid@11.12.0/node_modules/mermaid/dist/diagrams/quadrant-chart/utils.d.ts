declare class InvalidStyleError extends Error {
    constructor(style: string, value: string, type: string);
}
declare function validateHexCode(value: string): boolean;
declare function validateNumber(value: string): boolean;
declare function validateSizeInPixels(value: string): boolean;
export { validateHexCode, validateNumber, validateSizeInPixels, InvalidStyleError };
