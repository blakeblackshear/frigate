/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import path from "path";

import type { Plugin } from "@docusaurus/types";

export default function docusaurusThemeOpenAPI(): Plugin<void> {
  return {
    name: "docusaurus-theme-openapi",

    getClientModules() {
      const modules = [
        require.resolve(
          path.join(__dirname, "..", "lib", "theme", "styles.scss")
        ),
      ];
      return modules;
    },

    getThemePath() {
      return path.join(__dirname, "..", "lib", "theme");
    },

    getTypeScriptThemePath() {
      return path.resolve(__dirname, "..", "src", "theme");
    },

    configureWebpack(_, isServer, utils) {
      const rules: any = _.module?.rules ?? [];
      const sassLoaderRule = rules.filter((r: any) => {
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
                include: path.resolve(__dirname, "..", "lib", "theme"),
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
