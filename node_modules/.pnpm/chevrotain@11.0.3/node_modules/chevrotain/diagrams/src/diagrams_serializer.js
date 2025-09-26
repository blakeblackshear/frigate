/**
 * @param {string} targetFilePath - The path and file name to serialize to.
 * @param {string} varName - The name of the global variable to expose the serialized contents/
 * @param {chevrotain.Parser} parserInstance - A parser instance whose grammar will be serialized.
 */
function serializeGrammarToFile(targetFilePath, varName, parserInstance) {
  var fs = require("fs");
  var serializedGrammar = parserInstance.getSerializedGastProductions();
  var serializedGrammarText = JSON.stringify(serializedGrammar, null, "\t");

  // generated a JavaScript file which exports the serialized grammar on the global scope (Window)
  fs.writeFileSync(
    targetFilePath,
    "var " + varName + " = " + serializedGrammarText,
  );
}

module.exports = {
  serializeGrammarToFile: serializeGrammarToFile,
};
