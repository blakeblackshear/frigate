/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode } from 'react';
export type ColorMode = 'light' | 'dark';
export type ColorModeChoice = ColorMode | null;
type ContextValue = {
    /** The effective color mode. */
    readonly colorMode: ColorMode;
    /** The explicitly chosen color mode */
    readonly colorModeChoice: ColorModeChoice;
    /** Set new color mode. */
    readonly setColorMode: (colorMode: ColorModeChoice) => void;
    readonly isDarkTheme: boolean;
    readonly setLightTheme: () => void;
    readonly setDarkTheme: () => void;
};
export declare function ColorModeProvider({ children, }: {
    children: ReactNode;
}): ReactNode;
export declare function useColorMode(): ContextValue;
export {};
//# sourceMappingURL=colorMode.d.ts.map