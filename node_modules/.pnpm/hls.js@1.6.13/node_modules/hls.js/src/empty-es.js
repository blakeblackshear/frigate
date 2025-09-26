// This file is inserted as a shim for modules which we do not want to include into the distro.
// This replacement is done in the "alias" plugin of the rollup config.
// Use a ES dedicated file as Rollup assigns an object in the output
// For example: "var KeySystemFormats = emptyEs.KeySystemFormats;"
module.exports = {};
