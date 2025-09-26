import { ReactNode } from "react";
/** @deprecated use ReactNode from React instead */
export type Children = ReactNode;
export type Props = Record<string, any> & {
    children?: ReactNode;
};
export declare function create(tag: string, props: Props): string;
export declare function guard<T>(value: T | undefined | string, cb: (value: T) => ReactNode): string | number | bigint | boolean | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined>;
export declare function render(children: ReactNode): string | number | bigint | boolean | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined>;
export declare function toString(value: any): string | undefined;
