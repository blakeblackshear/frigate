const os = require('os');
const { Writable } = require('stream');
const colors = require('chalk');

const isWin = os.platform() === 'win32';

const NPS_PREFIX = `${colors.hex('#87E752').bold('N')}${colors.blue.bold('PS')}${colors.hex('#87E752').bold('>')}`;
const logger = {
  info: msg => console.log(`${NPS_PREFIX} ${colors.gray(msg)}`),
  debug: msg => console.log(`${NPS_PREFIX} ${colors.gray(msg)}`),
  ok: msg => console.log(`${NPS_PREFIX} ${colors.green(msg)}`),
  warn: msg => console.log(`${NPS_PREFIX} ${colors.yellow(msg)}`),
  error: msg => console.log(`${NPS_PREFIX} ${colors.red(msg)}`),
};

class ShellStreamBuffer extends Writable {
  constructor(EOI = 'EOI', options) {
    super(options);

    this.chunksArray = [];
    this.EOI = Buffer.from(EOI); // END_OF_INVOCATION
  }
  _write(chunk, encoding, cb) {
    // console.log(`${this.chunksArray.length} - ${chunk.toString()}`);
    if(chunk.compare(this.EOI) === 0) {
      cb();
      return this.emit('EOI');
    }
    this.chunksArray.push(chunk);
    return cb();
  }
  isEmpty() {
    return this.chunksArray.length === 0;
  }
  getContents() {
    return Buffer.concat(this.chunksArray);
  }
  getContentsAsString(encoding = 'utf8') {
    return Buffer.concat(this.chunksArray).toString(encoding).replace(/\0/g, '');
  }
}

const shellSafeWrite = (stdin, data) => new Promise(resolve => {
  if (!stdin.write(data)) {
    stdin.once('drain', resolve);
  } else {
    process.nextTick(resolve);
  }
});

const getType = obj => Object.prototype.toString.call(obj).slice(8, -1);
const isIncludesSpaces = val => /\s/.test(val);
const isEnclosedWithQuotes = val => (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
const isXML = val => val.includes('<') && val.includes('>');
const convertToPSParam = val => {
  switch (getType(val)) {
    case 'String':
      return !isEnclosedWithQuotes(val) && (isIncludesSpaces(val) || isXML(val)) ? `"${val}"` : val;
    case 'Number':
      return val;
    case 'Array':
      return val;
    case 'Object':
      return `@${JSON.stringify(val).replace(/:/g, '=').replace(/,/g, ';')}`;
    case 'Boolean':
      return val ? '$True' : '$False';
    case 'Date':
      return val.toLocaleString();
    case 'Undefined' || 'Null':
      return val; // param is switch
    default:
      return `"${val}"`;
  }
};

const capitalizeFirstLetter = string => string.charAt(0).toUpperCase() + string.slice(1);
const convertToPSOption = (key, val) => {
  if(typeof key !== 'string') {
    throw new Error('PS option key must be string');
  }
  if(key.length > 6) {
    key = capitalizeFirstLetter(key);
  }

  switch (getType(val)) {
    case 'String':
      return [`-${key}`, val];
    case 'Boolean':
      return !val ? [] : [`-${key}`];
    default:
      throw new Error('PS option val must be string or boolean');
  }
};

const CRITICAL_ERRORS = [
  'is not recognized as the name of a script file.',
];
const isCriticalPSError = err => CRITICAL_ERRORS.some(cErr => err.includes(cErr));

module.exports = {
  isWin,
  isCriticalPSError,
  logger,
  ShellStreamBuffer,
  shellSafeWrite,
  convertToPSParam,
  convertToPSOption,
};
