import { createHtmlRenderState } from '../../html/utils/create-render-state.mjs';

const createSvgRenderState = () => ({
    ...createHtmlRenderState(),
    attrs: {},
});

export { createSvgRenderState };
