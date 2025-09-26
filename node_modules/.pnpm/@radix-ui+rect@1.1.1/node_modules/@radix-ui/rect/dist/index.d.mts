type Measurable = {
    getBoundingClientRect(): DOMRect;
};
/**
 * Observes an element's rectangle on screen (getBoundingClientRect)
 * This is useful to track elements on the screen and attach other elements
 * that might be in different layers, etc.
 */
declare function observeElementRect(
/** The element whose rect to observe */
elementToObserve: Measurable, 
/** The callback which will be called when the rect changes */
callback: CallbackFn): () => void;
type CallbackFn = (rect: DOMRect) => void;

export { type Measurable, observeElementRect };
