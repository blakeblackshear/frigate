/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useState, useCallback, useEffect, useContext, useMemo, } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import { ReactContextError } from '../utils/reactUtils';
import { createStorageSlot } from '../utils/storageUtils';
import { useThemeConfig } from '../utils/useThemeConfig';
function getSystemColorMode() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}
function subscribeToMedia(query, listener) {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
}
function subscribeToSystemColorModeChange(onChange) {
    return subscribeToMedia('(prefers-color-scheme: dark)', () => onChange(getSystemColorMode()));
}
const Context = React.createContext(undefined);
const ColorModeStorageKey = 'theme';
const ColorModeStorage = createStorageSlot(ColorModeStorageKey);
// We use data-theme-choice="system", not an absent attribute
// This is easier to handle for users with CSS
const SystemAttribute = 'system';
// Ensure to always return a valid colorMode even if input is invalid
const coerceToColorMode = (colorMode) => colorMode === 'dark' ? 'dark' : 'light';
const coerceToColorModeChoice = (colorMode) => colorMode === null || colorMode === SystemAttribute
    ? null
    : coerceToColorMode(colorMode);
const ColorModeAttribute = {
    get: () => {
        return coerceToColorMode(document.documentElement.getAttribute('data-theme'));
    },
    set: (colorMode) => {
        document.documentElement.setAttribute('data-theme', coerceToColorMode(colorMode));
    },
};
const ColorModeChoiceAttribute = {
    get: () => {
        return coerceToColorModeChoice(document.documentElement.getAttribute('data-theme-choice'));
    },
    set: (colorMode) => {
        document.documentElement.setAttribute('data-theme-choice', coerceToColorModeChoice(colorMode) ?? SystemAttribute);
    },
};
const persistColorModeChoice = (newColorMode) => {
    if (newColorMode === null) {
        ColorModeStorage.del();
    }
    else {
        ColorModeStorage.set(coerceToColorMode(newColorMode));
    }
};
// The color mode state is initialized in useEffect on purpose
// to avoid a React hydration mismatch errors
// The useColorMode() hook value lags behind on purpose
// This helps users avoid hydration mismatch errors in their code
// See also https://github.com/facebook/docusaurus/issues/7986
function useColorModeState() {
    const { colorMode: { defaultMode }, } = useThemeConfig();
    const isBrowser = useIsBrowser();
    // Since the provider may unmount/remount on client navigation, we need to
    // reinitialize the state with the correct values to avoid visual glitches.
    // See also https://github.com/facebook/docusaurus/issues/11399#issuecomment-3279181314
    const [colorMode, setColorModeState] = useState(isBrowser ? ColorModeAttribute.get() : defaultMode);
    const [colorModeChoice, setColorModeChoiceState] = useState(isBrowser ? ColorModeChoiceAttribute.get() : null);
    useEffect(() => {
        setColorModeState(ColorModeAttribute.get());
        setColorModeChoiceState(ColorModeChoiceAttribute.get());
    }, []);
    return {
        colorMode,
        setColorModeState,
        colorModeChoice,
        setColorModeChoiceState,
    };
}
function useContextValue() {
    const { colorMode: { defaultMode, disableSwitch, respectPrefersColorScheme }, } = useThemeConfig();
    const { colorMode, setColorModeState, colorModeChoice, setColorModeChoiceState, } = useColorModeState();
    useEffect(() => {
        // A site is deployed without disableSwitch
        // => User visits the site and has a persisted value
        // => Site later enabled disableSwitch
        // => Clear the previously stored value to apply the site's setting
        if (disableSwitch) {
            ColorModeStorage.del();
        }
    }, [disableSwitch]);
    const setColorMode = useCallback((newColorModeChoice, options = {}) => {
        const { persist = true } = options;
        // Reset to system/default color mode
        if (newColorModeChoice === null) {
            // Set the effective color
            const newColorMode = respectPrefersColorScheme
                ? getSystemColorMode()
                : defaultMode;
            ColorModeAttribute.set(newColorMode);
            setColorModeState(newColorMode);
            // Set the chosen color
            ColorModeChoiceAttribute.set(null);
            setColorModeChoiceState(null);
        }
        // Happy case, when an explicit color is provided
        else {
            ColorModeAttribute.set(newColorModeChoice);
            ColorModeChoiceAttribute.set(newColorModeChoice);
            setColorModeState(newColorModeChoice);
            setColorModeChoiceState(newColorModeChoice);
        }
        if (persist) {
            persistColorModeChoice(newColorModeChoice);
        }
    }, [
        setColorModeState,
        setColorModeChoiceState,
        respectPrefersColorScheme,
        defaultMode,
    ]);
    // Synchronize theme color/choice mode with browser storage
    useEffect(() => {
        return ColorModeStorage.listen((e) => {
            setColorMode(coerceToColorModeChoice(e.newValue));
        });
    }, [setColorMode]);
    // Synchronize theme color with system color
    useEffect(() => {
        if (colorModeChoice !== null || !respectPrefersColorScheme) {
            return undefined;
        }
        return subscribeToSystemColorModeChange((newSystemColorMode) => {
            // Note: we don't use "setColorMode" on purpose
            // The system changes should never be considered an explicit theme choice
            // They only affect the "effective" color, and should never be persisted
            // Note: this listener also fire when printing, see https://github.com/facebook/docusaurus/pull/6490
            setColorModeState(newSystemColorMode);
            ColorModeAttribute.set(newSystemColorMode);
        });
    }, [respectPrefersColorScheme, colorModeChoice, setColorModeState]);
    return useMemo(() => ({
        colorMode,
        colorModeChoice,
        setColorMode,
        get isDarkTheme() {
            if (process.env.NODE_ENV === 'development') {
                console.error('`useColorMode().isDarkTheme` is deprecated. Please use `useColorMode().colorMode === "dark"` instead.');
            }
            return colorMode === 'dark';
        },
        setLightTheme() {
            if (process.env.NODE_ENV === 'development') {
                console.error('`useColorMode().setLightTheme` is deprecated. Please use `useColorMode().setColorMode("light")` instead.');
            }
            setColorMode('light');
        },
        setDarkTheme() {
            if (process.env.NODE_ENV === 'development') {
                console.error('`useColorMode().setDarkTheme` is deprecated. Please use `useColorMode().setColorMode("dark")` instead.');
            }
            setColorMode('dark');
        },
    }), [colorMode, colorModeChoice, setColorMode]);
}
export function ColorModeProvider({ children, }) {
    const value = useContextValue();
    return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useColorMode() {
    const context = useContext(Context);
    if (context == null) {
        throw new ReactContextError('ColorModeProvider', 'Please see https://docusaurus.io/docs/api/themes/configuration#use-color-mode.');
    }
    return context;
}
//# sourceMappingURL=colorMode.js.map