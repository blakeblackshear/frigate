const path = require("node:path");

// Enables importing YAML data files from docs/data as plain JS objects.
// Scoped to the data directory so it never intercepts other .yaml files
// (e.g. the OpenAPI spec under static/).
module.exports = function (context, options) {
  return {
    name: "yaml-data-loader",
    configureWebpack(config, isServer, utils) {
      return {
        module: {
          rules: [
            {
              test: /\.ya?ml$/,
              include: path.resolve(__dirname, "..", "data"),
              use: path.resolve(__dirname, "js-yaml-loader.js"),
            },
          ],
        },
      };
    },
  };
};
