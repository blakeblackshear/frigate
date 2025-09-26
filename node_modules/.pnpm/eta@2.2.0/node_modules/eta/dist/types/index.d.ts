import { config } from "./config.js";
export { loadFile, renderFile, renderFileAsync, renderFile as __express } from "./file-handlers.js";
export { default as compileToString } from "./compile-string.js";
export { default as compile } from "./compile.js";
export { default as parse } from "./parse.js";
export { default as render, renderAsync } from "./render.js";
export { templates } from "./containers.js";
export { config, config as defaultConfig, getConfig, configure } from "./config.js";
export type EtaConfig = typeof config;
//# sourceMappingURL=index.d.ts.map