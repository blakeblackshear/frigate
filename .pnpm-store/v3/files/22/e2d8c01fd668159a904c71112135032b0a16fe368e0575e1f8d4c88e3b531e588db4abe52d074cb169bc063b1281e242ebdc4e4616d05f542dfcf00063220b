var fs = require('fs'),
  path = require('path'),
  codegens,
  codegenList = [],
  isDirectory = (source) => {
    return fs.lstatSync(source).isDirectory();
  },
  readFile = (source) => {
    return fs.readFileSync(source);
  };

const PATH_TO_UTIL_FOLDER = path.resolve(__dirname, '../lib/assets');

// Try to get all the codegens directories from the path provided.
// Catch error if any and return
try {
  codegens = fs.readdirSync('./codegens').map((name) => {
    return `./codegens/${name}`;
  }).filter(isDirectory);
}
catch (e) {
  fs.writeFileSync(PATH_TO_UTIL_FOLDER + '/languages.json', JSON.stringify(codegenList), 'utf8');
}

if (codegens.length === 0) {
  fs.writeFileSync(PATH_TO_UTIL_FOLDER + '/languages.json', JSON.stringify(codegenList), 'utf8');
}

codegens.forEach((codegen) => {
  const content = readFile(`${codegen}/package.json`).toString(),
    json = JSON.parse(content);
  json.com_postman_plugin.author = json.author;
  json.com_postman_plugin.homepage = json.homepage;
  json.com_postman_plugin.main = `<<<require('../.${codegen}/${json.main}')>>>`;
  codegenList.push(json.com_postman_plugin);
});

fs.writeFileSync(PATH_TO_UTIL_FOLDER + '/languages.js',
  `var codegenList = ${JSON.stringify(codegenList, null, 2).replace(/"<<</g, '').replace(/>>>"/g, '')
    .replace(/"/g, '\'')};\nmodule.exports = codegenList;\n`, 'utf8');
