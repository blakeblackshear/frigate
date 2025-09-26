"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundlerCPUProfilerPlugin = void 0;
const tslib_1 = require("tslib");
const node_inspector_1 = tslib_1.__importDefault(require("node:inspector"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
// Bundle CPU profiling plugin, contributed by the Rspack team
// Can be opened in https://www.speedscope.app/
// See also https://github.com/jerrykingxyz/docusaurus/pull/1
// See also https://github.com/facebook/docusaurus/pull/10985
class BundlerCPUProfilerPlugin {
    constructor(output) {
        this.output = output ?? './bundler-cpu-profile.json';
    }
    apply(compiler) {
        const session = new node_inspector_1.default.Session();
        session.connect();
        session.post('Profiler.enable');
        session.post('Profiler.start');
        // In dev/watch mode, we restart the profiler before each compilation
        compiler.hooks.watchRun.tapPromise(BundlerCPUProfilerPlugin.name, async () => {
            session.post('Profiler.start');
        });
        compiler.hooks.done.tapPromise(BundlerCPUProfilerPlugin.name, async () => {
            session.post('Profiler.stop', (error, param) => {
                if (error) {
                    console.error('Failed to generate JS CPU profile:', error);
                    return;
                }
                fs_extra_1.default.writeFile(this.output, JSON.stringify(param.profile)).catch(console.error);
            });
        });
    }
}
exports.BundlerCPUProfilerPlugin = BundlerCPUProfilerPlugin;
