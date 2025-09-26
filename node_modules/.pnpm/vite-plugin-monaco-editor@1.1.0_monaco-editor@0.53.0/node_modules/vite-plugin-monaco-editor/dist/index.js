"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCDN = exports.getWorks = exports.resolveMonacoPath = void 0;
const path = require("path");
const fs = require("fs");
const lnaguageWork_1 = require("./lnaguageWork");
const workerMiddleware_1 = require("./workerMiddleware");
const esbuild = require('esbuild');
/**
 * Return a resolved path for a given Monaco file.
 */
function resolveMonacoPath(filePath) {
    try {
        return require.resolve(path.join(process.cwd(), 'node_modules', filePath));
    }
    catch (err) {
        return require.resolve(filePath);
    }
}
exports.resolveMonacoPath = resolveMonacoPath;
function getWorks(options) {
    let works = options.languageWorkers.map((work) => lnaguageWork_1.languageWorksByLabel[work]);
    works.push(...options.customWorkers);
    return works;
}
exports.getWorks = getWorks;
function monacoEditorPlugin(options) {
    const languageWorkers = options.languageWorkers || Object.keys(lnaguageWork_1.languageWorksByLabel);
    const publicPath = options.publicPath || 'monacoeditorwork';
    const globalAPI = options.globalAPI || false;
    const customWorkers = options.customWorkers || [];
    const forceBuildCDN = options.forceBuildCDN || false;
    options = Object.assign(Object.assign({}, options), { languageWorkers,
        publicPath,
        globalAPI,
        customWorkers,
        forceBuildCDN });
    let resolvedConfig;
    return {
        name: 'vite-plugin-moncao-editor',
        configResolved(getResolvedConfig) {
            resolvedConfig = getResolvedConfig;
        },
        configureServer(server) {
            if (isCDN(publicPath)) {
                return;
            }
            workerMiddleware_1.workerMiddleware(server.middlewares, resolvedConfig, options);
        },
        transformIndexHtml(html) {
            const works = getWorks(options);
            const workerPaths = workerMiddleware_1.getWorkPath(works, options, resolvedConfig);
            const globals = {
                MonacoEnvironment: `(function (paths) {
          return {
            globalAPI: ${globalAPI},
            getWorkerUrl : function (moduleId, label) {
              var result =  paths[label];
              if (/^((http:)|(https:)|(file:)|(\\/\\/))/.test(result)) {
                var currentUrl = String(window.location);
                var currentOrigin = currentUrl.substr(0, currentUrl.length - window.location.hash.length - window.location.search.length - window.location.pathname.length);
                if (result.substring(0, currentOrigin.length) !== currentOrigin) {
                  var js = '/*' + label + '*/importScripts("' + result + '");';
                  var blob = new Blob([js], { type: 'application/javascript' });
                  return URL.createObjectURL(blob);
                }
              }
              return result;
            }
          };
        })(${JSON.stringify(workerPaths, null, 2)})`,
            };
            const descriptor = [
                {
                    tag: 'script',
                    children: Object.keys(globals)
                        .map((key) => `self[${JSON.stringify(key)}] = ${globals[key]};`)
                        .join('\n'),
                    injectTo: 'head-prepend',
                },
            ];
            return descriptor;
        },
        writeBundle() {
            // 是cdn地址并且没有强制构建worker cdn则返回
            if (isCDN(publicPath) && !forceBuildCDN) {
                return;
            }
            const works = getWorks(options);
            const distPath = options.customDistPath
                ? options.customDistPath(resolvedConfig.root, resolvedConfig.build.outDir, resolvedConfig.base)
                : path.join(resolvedConfig.root, resolvedConfig.build.outDir, resolvedConfig.base, options.publicPath);
            //  console.log("distPath", distPath)
            // write publicPath
            if (!fs.existsSync(distPath)) {
                fs.mkdirSync(distPath, {
                    recursive: true,
                });
            }
            for (const work of works) {
                if (!fs.existsSync(workerMiddleware_1.cacheDir + workerMiddleware_1.getFilenameByEntry(work.entry))) {
                    esbuild.buildSync({
                        entryPoints: [resolveMonacoPath(work.entry)],
                        bundle: true,
                        outfile: workerMiddleware_1.cacheDir + workerMiddleware_1.getFilenameByEntry(work.entry),
                    });
                }
                const contentBuffer = fs.readFileSync(workerMiddleware_1.cacheDir + workerMiddleware_1.getFilenameByEntry(work.entry));
                const workDistPath = path.resolve(distPath, workerMiddleware_1.getFilenameByEntry(work.entry));
                fs.writeFileSync(workDistPath, contentBuffer);
            }
        },
    };
}
exports.default = monacoEditorPlugin;
function isCDN(publicPath) {
    if (/^((http:)|(https:)|(file:)|(\/\/))/.test(publicPath)) {
        return true;
    }
    return false;
}
exports.isCDN = isCDN;
