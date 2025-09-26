#!/usr/bin/env node

var fs = require('fs');
var helper = require('./cli-helper');
var project = require('../package.json');
var xml2json = require('../lib/xml2json');
var json2xml = require('../lib/json2xml');

var output = '';
var stream = '';
var options = {};
var requiredArgs = [
  { arg: 'src', type: 'file', option: 'src', desc: 'Input file that need to be converted.'}
];
var optionalArgs = [
  { arg: 'help', alias: 'h', type: 'flag', option: 'help', desc: 'Display this help content.' },
  { arg: 'version', alias: 'v', type: 'flag', option: 'version', desc: 'Display version number of this module.' },
  { arg: 'out', type: 'file', option: 'out', desc: 'Output file where the converted result should be written.' },
  { arg: 'to-json', type: 'flag', option:'toJason', desc: 'Convert.' },
  { arg: 'compact', type: 'flag', option:'compact', desc: 'Compact JSON form (see explanation in www.npmjs.com/package/xml-js).' },
  { arg: 'spaces', type: 'number', option:'spaces', desc: 'Specifies amount of space indentation in the output.' },
  { arg: 'trim', type: 'flag', option:'trim', desc: 'Any whitespaces surrounding texts will be trimmed.' },
  // { arg: 'sanitize', type: 'flag', option:'sanitize', desc: 'Special xml characters will be replaced with entity codes.' },
  { arg: 'native-type', type: 'flag', option:'nativeType', desc: 'Numbers and boolean will be converted (coerced) to native type instead of text.' },
  { arg: 'always-array', type: 'flag', option:'alwaysArray', desc: 'Every element will always be an array type (applicable if --compact is set). If the passed value is an array, only elements with names in the passed array are always made arrays.' },
  { arg: 'always-children', type: 'flag', option:'alwaysChildren', desc: 'Every element will always contain sub-elements (applicable if --compact is not set).' },
  { arg: 'instruction-attr', type: 'flag', option:'instructionHasAttributes', desc: 'Whether to parse contents of processing instruction as attributes.' },
  { arg: 'full-tag', type: 'flag', option:'fullTagEmptyElement', desc: 'XML elements will always be in <a></a> form.' },
  { arg: 'no-decl', type: 'flag', option:'ignoreDeclaration', desc: 'Declaration instruction <?xml?> will be ignored.' },
  { arg: 'no-decl', type: 'flag', option:'ignoreInstruction', desc: 'Processing instruction <?...?> will be ignored.' },
  { arg: 'no-attr', type: 'flag', option:'ignoreAttributes', desc: 'Attributes of elements will be ignored.' },
  { arg: 'no-text', type: 'flag', option:'ignoreText', desc: 'Texts of elements will be ignored.' },
  { arg: 'no-cdata', type: 'flag', option:'ignoreCdata', desc: 'CData of elements will be ignored.' },
  { arg: 'no-doctype', type: 'flag', option:'ignoreDoctype', desc: 'DOCTYPE of elements will be ignored.' },
  { arg: 'no-comment', type: 'flag', option:'ignoreComment', desc: 'Comments of elements will be ignored.' },
  { arg: 'text-key', type: 'string', option:'textKey', desc: 'To change the default \'text\' key.' },
  { arg: 'cdata-key', type: 'string', option:'cdataKey', desc: 'To change the default \'cdata\' key.' },
  { arg: 'doctype-key', type: 'string', option:'doctypeKey', desc: 'To change the default \'doctype\' key.' },
  { arg: 'comment-key', type: 'string', option:'commentKey', desc: 'To change the default \'comment\' key.' },
  { arg: 'attributes-key', type: 'string', option:'attributesKey', desc: 'To change the default \'attributes\' key.' },
  { arg: 'declaration-key', type: 'string', option:'declarationKey', desc: 'To change the default \'declaration\' key <?xml?>.' },
  { arg: 'instruction-key', type: 'string', option:'instructionKey', desc: 'To change the default \'processing instruction\' key <?...?>.' },
  { arg: 'type-key', type: 'string', option:'typeKey', desc: 'To change the default \'type\' key (applicable if --compact is not set).' },
  { arg: 'name-key', type: 'string', option:'nameKey', desc: 'To change the default \'name\' key (applicable if --compact is not set).' },
  { arg: 'elements-key', type: 'string', option:'elementsKey', desc: 'To change the default \'elements\' key (applicable if --compact is not set).' }
];

process.stdin.setEncoding('utf8');
process.stdin.on('readable', function () {
  var chunk = process.stdin.read();
  if (chunk !== null) {
    stream += chunk;
  }
});
process.stdin.on('end', function () {
  process.stdout.write(xml2json(stream, {}) + '\n');
});

options = helper.mapCommandLineArgs(requiredArgs, optionalArgs);

if (options.version) {
  console.log(project.version);
  process.exit(0);
} else if (options.help || process.argv.length <= 2 + requiredArgs.length - 1) {
  console.log(helper.getCommandLineHelp('xml-js', requiredArgs, optionalArgs));
  process.exit(process.argv.length <= 2 ? 1 : 0);
} else if ('src' in options) {
  if (fs.statSync(options.src).isFile()) {
    if (options.src.split('.').pop() === 'xml') {
      output = xml2json(fs.readFileSync(options.src, 'utf8'), options);
    } else if (options.src.split('.').pop() === 'json') {
      output = json2xml(fs.readFileSync(options.src, 'utf8'), options);
    }
    if (options.out) {
      fs.writeFileSync(options.out, output, 'utf8');
    } else {
      console.log(output);
    }
    process.exit(0);
  }
} else {
  process.exit(1);
}
