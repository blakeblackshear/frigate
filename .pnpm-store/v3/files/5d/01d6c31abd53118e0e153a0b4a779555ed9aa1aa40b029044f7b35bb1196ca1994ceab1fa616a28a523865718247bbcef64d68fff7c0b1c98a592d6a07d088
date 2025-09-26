export type json<T> = json_string<T>;
export type json_string<T extends any = any> = string & {
    __BRAND__: 'JSON_STRING';
    __TYPE__: T;
};
export interface JSON {
    parse<T>(text: json<T>, reviver?: (key: any, value: any) => any): T;
    stringify<T>(value: T, replacer?: (key: string, value: any) => any, space?: string | number): json<T>;
    stringify<T>(value: T, replacer?: (number | string)[] | null, space?: string | number): json<T>;
}
