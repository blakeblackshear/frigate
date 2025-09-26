"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = docusaurusThemeOpenAPI;
const path_1 = __importDefault(require("path"));
function docusaurusThemeOpenAPI() {
    return {
        name: "docusaurus-theme-openapi",
        getClientModules() {
            const modules = [
                require.resolve(path_1.default.join(__dirname, "..", "lib", "theme", "styles.scss")),
            ];
            return modules;
        },
        getThemePath() {
            return path_1.default.join(__dirname, "..", "lib", "theme");
        },
        getTypeScriptThemePath() {
            return path_1.default.resolve(__dirname, "..", "src", "theme");
        },
        configureWebpack(_, isServer, utils) {
            const rules = _.module?.rules ?? [];
            const sassLoaderRule = rules.filter((r) => {
                return String(r.test) === String(/\.s[ca]ss$/);
            });
            const { getStyleLoaders } = utils;
            // Avoid conflicts with docusaurus-plugin-sass
            if (sassLoaderRule.length === 0) {
                return {
                    resolve: {
                        fallback: {
                            buffer: require.resolve("buffer/"),
                        },
                    },
                    plugins: [
                        new utils.currentBundler.instance.ProvidePlugin({
                            process: require.resolve("process/browser"),
                            Buffer: ["buffer", "Buffer"],
                        }),
                    ],
                    module: {
                        rules: [
                            {
                                test: /\.s[ac]ss$/,
                                include: path_1.default.resolve(__dirname, "..", "lib", "theme"),
                                use: [
                                    ...getStyleLoaders(isServer, {}),
                                    {
                                        loader: require.resolve("sass-loader"),
                                        options: {},
                                    },
                                ],
                            },
                        ],
                    },
                };
            }
            return {
                resolve: {
                    fallback: {
                        buffer: require.resolve("buffer/"),
                    },
                },
                plugins: [
                    new utils.currentBundler.instance.ProvidePlugin({
                        process: require.resolve("process/browser"),
                        Buffer: ["buffer", "Buffer"],
                    }),
                ],
            };
        },
    };
}
