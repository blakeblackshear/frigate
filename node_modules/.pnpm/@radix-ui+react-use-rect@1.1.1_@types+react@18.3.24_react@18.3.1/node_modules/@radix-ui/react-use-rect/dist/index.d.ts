import { Measurable } from '@radix-ui/rect';

/**
 * Use this custom hook to get access to an element's rect (getBoundingClientRect)
 * and observe it along time.
 */
declare function useRect(measurable: Measurable | null): DOMRect | undefined;

export { useRect };
