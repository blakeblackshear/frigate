import { useLayoutEffect, useEffect } from 'react';
import { isBrowser } from './is-browser.mjs';

const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;

export { useIsomorphicLayoutEffect };
