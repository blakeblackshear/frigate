"use client";
import { createContext } from 'react';

/**
 * @public
 */
const MotionConfigContext = createContext({
    transformPagePoint: (p) => p,
    isStatic: false,
    reducedMotion: "never",
});

export { MotionConfigContext };
