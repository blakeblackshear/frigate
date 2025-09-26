// TODO remove in the next major release
const plugin = require("../index");

module.exports = {
  getHtmlWebpackPluginHooks: (compilation) =>
    plugin.getCompilationHooks(compilation),
};
