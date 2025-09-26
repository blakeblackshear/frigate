/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
declare const windowSizes: {
    readonly desktop: "desktop";
    readonly mobile: "mobile";
    readonly ssr: "ssr";
};
type WindowSize = keyof typeof windowSizes;
/**
 * Gets the current window size as an enum value. We don't want it to return the
 * actual width value, so that it only re-renders once a breakpoint is crossed.
 *
 * It may return `"ssr"`, which is very important to handle hydration FOUC or
 * layout shifts. You have to handle it explicitly upfront. On the server, you
 * may need to render BOTH the mobile/desktop elements (and hide one of them
 * with mediaquery). We don't return `undefined` on purpose, to make it more
 * explicit.
 */
export declare function useWindowSize({ desktopBreakpoint, }?: {
    desktopBreakpoint?: number;
}): WindowSize;
export {};
//# sourceMappingURL=useWindowSize.d.ts.map