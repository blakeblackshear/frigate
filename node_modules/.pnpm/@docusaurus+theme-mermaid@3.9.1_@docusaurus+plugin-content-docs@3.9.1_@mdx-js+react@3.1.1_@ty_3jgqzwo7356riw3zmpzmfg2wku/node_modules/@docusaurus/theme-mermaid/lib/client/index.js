/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { useState, useEffect, useMemo } from 'react';
import { useColorMode, useThemeConfig } from '@docusaurus/theme-common';
import mermaid from 'mermaid';
import { ensureLayoutsRegistered } from './layouts';
// Stable className to allow users to easily target with CSS
export const MermaidContainerClassName = 'docusaurus-mermaid-container';
export function useMermaidThemeConfig() {
    return useThemeConfig().mermaid;
}
export function useMermaidConfig() {
    const { colorMode } = useColorMode();
    const mermaidThemeConfig = useMermaidThemeConfig();
    const theme = mermaidThemeConfig.theme[colorMode];
    const { options } = mermaidThemeConfig;
    return useMemo(() => ({ startOnLoad: false, ...options, theme }), [theme, options]);
}
function useMermaidId() {
    /*
    Random client-only id, we don't care much but mermaid want an id so...
    Note: Mermaid doesn't like values provided by Rect.useId() and throws
    */
    // TODO Docusaurus v4: check if useId() now works
    //  It could work thanks to https://github.com/facebook/react/pull/32001
    // return useId(); // tried that, doesn't work ('#d:re:' is not a valid selector.)
    return useState(`mermaid-svg-${Math.round(Math.random() * 10000000)}`)[0];
}
async function renderMermaid({ id, text, config, }) {
    await ensureLayoutsRegistered();
    /*
    Mermaid API is really weird :s
    It is a big mutable singleton with multiple config levels
    Note: most recent API type definitions are missing
  
    There are 2 kind of configs:
  
    - siteConfig: some kind of global/protected shared config
      you can only set with "initialize"
  
    - config/currentConfig
      the config the renderer will use
      it is reset to siteConfig before each render
      but it can be altered by the mermaid txt content itself through directives
  
    To use a new mermaid config (on colorMode change for example) we should
    update siteConfig, and it can only be done with initialize()
     */
    mermaid.initialize(config);
    try {
        return await mermaid.render(id, text);
    }
    catch (e) {
        // Because Mermaid add a weird SVG/Message to the DOM on error
        // https://github.com/mermaid-js/mermaid/issues/3205#issuecomment-1719620183
        document.querySelector(`#d${id}`)?.remove();
        throw e;
    }
}
export function useMermaidRenderResult({ text, config: providedConfig, }) {
    const [result, setResult] = useState(null);
    const id = useMermaidId();
    /*
    For flexibility, we allow the hook to receive a custom Mermaid config
    The user could inject a modified version of the default config for example
     */
    const defaultMermaidConfig = useMermaidConfig();
    const config = providedConfig ?? defaultMermaidConfig;
    useEffect(() => {
        renderMermaid({ id, text, config })
            // TODO maybe try to use Suspense here and throw the promise?
            // See also https://github.com/pmndrs/suspend-react
            .then(setResult)
            .catch((e) => {
            // Funky way to trigger parent React error boundary
            // See https://x.com/sebastienlorber/status/1628340871899893768
            setResult(() => {
                throw e;
            });
        });
    }, [id, text, config]);
    return result;
}
