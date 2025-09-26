import * as React from 'react';
import { UseThemeProps, ThemeProviderProps } from './types.mjs';

declare const useTheme: () => UseThemeProps;
declare const ThemeProvider: (props: ThemeProviderProps) => string | number | boolean | Iterable<React.ReactNode> | React.JSX.Element;

export { ThemeProvider, useTheme };
