const yaml = require("js-yaml");

// Webpack loader that compiles a YAML file into a default-exported JS object,
// so docs data can be authored in YAML (block scalars, no quote/newline
// escaping) but imported exactly like the JSON it replaces.
module.exports = function (source) {
  const data = yaml.load(source);
  return `export default ${JSON.stringify(data)};`;
};
