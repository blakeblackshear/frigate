import { makeUseVisualState } from '../../motion/utils/use-visual-state.mjs';
import { scrapeMotionValuesFromProps } from './utils/scrape-motion-values.mjs';
import { createHtmlRenderState } from './utils/create-render-state.mjs';

const htmlMotionConfig = {
    useVisualState: makeUseVisualState({
        scrapeMotionValuesFromProps,
        createRenderState: createHtmlRenderState,
    }),
};

export { htmlMotionConfig };
