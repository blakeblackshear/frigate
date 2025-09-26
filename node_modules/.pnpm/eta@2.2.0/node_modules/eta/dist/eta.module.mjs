import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

function setPrototypeOf(obj, proto) {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(obj, proto);
  } else {
    obj.__proto__ = proto;
  }
}
// This is pretty much the only way to get nice, extended Errors
// without using ES6
/**
 * This returns a new Error with a custom prototype. Note that it's _not_ a constructor
 *
 * @param message Error message
 *
 * **Example**
 *
 * ```js
 * throw EtaErr("template not found")
 * ```
 */
function EtaErr(message) {
  const err = new Error(message);
  setPrototypeOf(err, EtaErr.prototype);
  return err;
}
EtaErr.prototype = Object.create(Error.prototype, {
  name: {
    value: "Eta Error",
    enumerable: false
  }
});
/**
 * Throws an EtaErr with a nicely formatted error and message showing where in the template the error occurred.
 */
function ParseErr(message, str, indx) {
  const whitespace = str.slice(0, indx).split(/\n/);
  const lineNo = whitespace.length;
  const colNo = whitespace[lineNo - 1].length + 1;
  message += " at line " + lineNo + " col " + colNo + ":\n\n" + "  " + str.split(/\n/)[lineNo - 1] + "\n" + "  " + Array(colNo).join(" ") + "^";
  throw EtaErr(message);
}

/**
 * @returns The global Promise function
 */
const promiseImpl = new Function("return this")().Promise;
/**
 * @returns A new AsyncFunction constuctor
 */
function getAsyncFunctionConstructor() {
  try {
    return new Function("return (async function(){}).constructor")();
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw EtaErr("This environment doesn't support async/await");
    } else {
      throw e;
    }
  }
}
/**
 * str.trimLeft polyfill
 *
 * @param str - Input string
 * @returns The string with left whitespace removed
 *
 */
function trimLeft(str) {
  // eslint-disable-next-line no-extra-boolean-cast
  if (!!String.prototype.trimLeft) {
    return str.trimLeft();
  } else {
    return str.replace(/^\s+/, "");
  }
}
/**
 * str.trimRight polyfill
 *
 * @param str - Input string
 * @returns The string with right whitespace removed
 *
 */
function trimRight(str) {
  // eslint-disable-next-line no-extra-boolean-cast
  if (!!String.prototype.trimRight) {
    return str.trimRight();
  } else {
    return str.replace(/\s+$/, ""); // TODO: do we really need to replace BOM's?
  }
}

// TODO: allow '-' to trim up until newline. Use [^\S\n\r] instead of \s
/* END TYPES */
function hasOwnProp(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
function copyProps(toObj, fromObj) {
  for (const key in fromObj) {
    if (hasOwnProp(fromObj, key)) {
      toObj[key] = fromObj[key];
    }
  }
  return toObj;
}
/**
 * Takes a string within a template and trims it, based on the preceding tag's whitespace control and `config.autoTrim`
 */
function trimWS(str, config, wsLeft, wsRight) {
  let leftTrim;
  let rightTrim;
  if (Array.isArray(config.autoTrim)) {
    // kinda confusing
    // but _}} will trim the left side of the following string
    leftTrim = config.autoTrim[1];
    rightTrim = config.autoTrim[0];
  } else {
    leftTrim = rightTrim = config.autoTrim;
  }
  if (wsLeft || wsLeft === false) {
    leftTrim = wsLeft;
  }
  if (wsRight || wsRight === false) {
    rightTrim = wsRight;
  }
  if (!rightTrim && !leftTrim) {
    return str;
  }
  if (leftTrim === "slurp" && rightTrim === "slurp") {
    return str.trim();
  }
  if (leftTrim === "_" || leftTrim === "slurp") {
    // console.log('trimming left' + leftTrim)
    // full slurp
    str = trimLeft(str);
  } else if (leftTrim === "-" || leftTrim === "nl") {
    // nl trim
    str = str.replace(/^(?:\r\n|\n|\r)/, "");
  }
  if (rightTrim === "_" || rightTrim === "slurp") {
    // full slurp
    str = trimRight(str);
  } else if (rightTrim === "-" || rightTrim === "nl") {
    // nl trim
    str = str.replace(/(?:\r\n|\n|\r)$/, ""); // TODO: make sure this gets \r\n
  }

  return str;
}
/**
 * A map of special HTML characters to their XML-escaped equivalents
 */
const escMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function replaceChar(s) {
  return escMap[s];
}
/**
 * XML-escapes an input value after converting it to a string
 *
 * @param str - Input value (usually a string)
 * @returns XML-escaped string
 */
function XMLEscape(str) {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  // To deal with XSS. Based on Escape implementations of Mustache.JS and Marko, then customized.
  const newStr = String(str);
  if (/[&<>"']/.test(newStr)) {
    return newStr.replace(/[&<>"']/g, replaceChar);
  } else {
    return newStr;
  }
}

/* END TYPES */
const templateLitReg = /`(?:\\[\s\S]|\${(?:[^{}]|{(?:[^{}]|{[^}]*})*})*}|(?!\${)[^\\`])*`/g;
const singleQuoteReg = /'(?:\\[\s\w"'\\`]|[^\n\r'\\])*?'/g;
const doubleQuoteReg = /"(?:\\[\s\w"'\\`]|[^\n\r"\\])*?"/g;
/** Escape special regular expression characters inside a string */
function escapeRegExp(string) {
  // From MDN
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function parse(str, config) {
  let buffer = [];
  let trimLeftOfNextStr = false;
  let lastIndex = 0;
  const parseOptions = config.parse;
  if (config.plugins) {
    for (let i = 0; i < config.plugins.length; i++) {
      const plugin = config.plugins[i];
      if (plugin.processTemplate) {
        str = plugin.processTemplate(str, config);
      }
    }
  }
  /* Adding for EJS compatibility */
  if (config.rmWhitespace) {
    // Code taken directly from EJS
    // Have to use two separate replaces here as `^` and `$` operators don't
    // work well with `\r` and empty lines don't work well with the `m` flag.
    // Essentially, this replaces the whitespace at the beginning and end of
    // each line and removes multiple newlines.
    str = str.replace(/[\r\n]+/g, "\n").replace(/^\s+|\s+$/gm, "");
  }
  /* End rmWhitespace option */
  templateLitReg.lastIndex = 0;
  singleQuoteReg.lastIndex = 0;
  doubleQuoteReg.lastIndex = 0;
  function pushString(strng, shouldTrimRightOfString) {
    if (strng) {
      // if string is truthy it must be of type 'string'
      strng = trimWS(strng, config, trimLeftOfNextStr,
      // this will only be false on the first str, the next ones will be null or undefined
      shouldTrimRightOfString);
      if (strng) {
        // replace \ with \\, ' with \'
        // we're going to convert all CRLF to LF so it doesn't take more than one replace
        strng = strng.replace(/\\|'/g, "\\$&").replace(/\r\n|\n|\r/g, "\\n");
        buffer.push(strng);
      }
    }
  }
  const prefixes = [parseOptions.exec, parseOptions.interpolate, parseOptions.raw].reduce(function (accumulator, prefix) {
    if (accumulator && prefix) {
      return accumulator + "|" + escapeRegExp(prefix);
    } else if (prefix) {
      // accumulator is falsy
      return escapeRegExp(prefix);
    } else {
      // prefix and accumulator are both falsy
      return accumulator;
    }
  }, "");
  const parseOpenReg = new RegExp(escapeRegExp(config.tags[0]) + "(-|_)?\\s*(" + prefixes + ")?\\s*", "g");
  const parseCloseReg = new RegExp("'|\"|`|\\/\\*|(\\s*(-|_)?" + escapeRegExp(config.tags[1]) + ")", "g");
  // TODO: benchmark having the \s* on either side vs using str.trim()
  let m;
  while (m = parseOpenReg.exec(str)) {
    const precedingString = str.slice(lastIndex, m.index);
    lastIndex = m[0].length + m.index;
    const wsLeft = m[1];
    const prefix = m[2] || ""; // by default either ~, =, or empty
    pushString(precedingString, wsLeft);
    parseCloseReg.lastIndex = lastIndex;
    let closeTag;
    let currentObj = false;
    while (closeTag = parseCloseReg.exec(str)) {
      if (closeTag[1]) {
        const content = str.slice(lastIndex, closeTag.index);
        parseOpenReg.lastIndex = lastIndex = parseCloseReg.lastIndex;
        trimLeftOfNextStr = closeTag[2];
        const currentType = prefix === parseOptions.exec ? "e" : prefix === parseOptions.raw ? "r" : prefix === parseOptions.interpolate ? "i" : "";
        currentObj = {
          t: currentType,
          val: content
        };
        break;
      } else {
        const char = closeTag[0];
        if (char === "/*") {
          const commentCloseInd = str.indexOf("*/", parseCloseReg.lastIndex);
          if (commentCloseInd === -1) {
            ParseErr("unclosed comment", str, closeTag.index);
          }
          parseCloseReg.lastIndex = commentCloseInd;
        } else if (char === "'") {
          singleQuoteReg.lastIndex = closeTag.index;
          const singleQuoteMatch = singleQuoteReg.exec(str);
          if (singleQuoteMatch) {
            parseCloseReg.lastIndex = singleQuoteReg.lastIndex;
          } else {
            ParseErr("unclosed string", str, closeTag.index);
          }
        } else if (char === '"') {
          doubleQuoteReg.lastIndex = closeTag.index;
          const doubleQuoteMatch = doubleQuoteReg.exec(str);
          if (doubleQuoteMatch) {
            parseCloseReg.lastIndex = doubleQuoteReg.lastIndex;
          } else {
            ParseErr("unclosed string", str, closeTag.index);
          }
        } else if (char === "`") {
          templateLitReg.lastIndex = closeTag.index;
          const templateLitMatch = templateLitReg.exec(str);
          if (templateLitMatch) {
            parseCloseReg.lastIndex = templateLitReg.lastIndex;
          } else {
            ParseErr("unclosed string", str, closeTag.index);
          }
        }
      }
    }
    if (currentObj) {
      buffer.push(currentObj);
    } else {
      ParseErr("unclosed tag", str, m.index + precedingString.length);
    }
  }
  pushString(str.slice(lastIndex, str.length), false);
  if (config.plugins) {
    for (let i = 0; i < config.plugins.length; i++) {
      const plugin = config.plugins[i];
      if (plugin.processAST) {
        buffer = plugin.processAST(buffer, config);
      }
    }
  }
  return buffer;
}

/* END TYPES */
/**
 * Compiles a template string to a function string. Most often users just use `compile()`, which calls `compileToString` and creates a new function using the result
 *
 * **Example**
 *
 * ```js
 * compileToString("Hi <%= it.user %>", eta.config)
 * // "var tR='',include=E.include.bind(E),includeFile=E.includeFile.bind(E);tR+='Hi ';tR+=E.e(it.user);if(cb){cb(null,tR)} return tR"
 * ```
 */
function compileToString(str, config) {
  const buffer = parse(str, config);
  let res = "var tR='',__l,__lP" + (config.include ? ",include=E.include.bind(E)" : "") + (config.includeFile ? ",includeFile=E.includeFile.bind(E)" : "") + "\nfunction layout(p,d){__l=p;__lP=d}\n" + (config.useWith ? "with(" + config.varName + "||{}){" : "") + compileScope(buffer, config) + (config.includeFile ? "if(__l)tR=" + (config.async ? "await " : "") + `includeFile(__l,Object.assign(${config.varName},{body:tR},__lP))\n` : config.include ? "if(__l)tR=" + (config.async ? "await " : "") + `include(__l,Object.assign(${config.varName},{body:tR},__lP))\n` : "") + "if(cb){cb(null,tR)} return tR" + (config.useWith ? "}" : "");
  if (config.plugins) {
    for (let i = 0; i < config.plugins.length; i++) {
      const plugin = config.plugins[i];
      if (plugin.processFnString) {
        res = plugin.processFnString(res, config);
      }
    }
  }
  return res;
}
/**
 * Loops through the AST generated by `parse` and transform each item into JS calls
 *
 * **Example**
 *
 * ```js
 * // AST version of 'Hi <%= it.user %>'
 * let templateAST = ['Hi ', { val: 'it.user', t: 'i' }]
 * compileScope(templateAST, eta.config)
 * // "tR+='Hi ';tR+=E.e(it.user);"
 * ```
 */
function compileScope(buff, config) {
  let i = 0;
  const buffLength = buff.length;
  let returnStr = "";
  for (i; i < buffLength; i++) {
    const currentBlock = buff[i];
    if (typeof currentBlock === "string") {
      const str = currentBlock;
      // we know string exists
      returnStr += "tR+='" + str + "'\n";
    } else {
      const type = currentBlock.t; // ~, s, !, ?, r
      let content = currentBlock.val || "";
      if (type === "r") {
        // raw
        if (config.filter) {
          content = "E.filter(" + content + ")";
        }
        returnStr += "tR+=" + content + "\n";
      } else if (type === "i") {
        // interpolate
        if (config.filter) {
          content = "E.filter(" + content + ")";
        }
        if (config.autoEscape) {
          content = "E.e(" + content + ")";
        }
        returnStr += "tR+=" + content + "\n";
        // reference
      } else if (type === "e") {
        // execute
        returnStr += content + "\n"; // you need a \n in case you have <% } %>
      }
    }
  }

  return returnStr;
}

/**
 * Handles storage and accessing of values
 *
 * In this case, we use it to store compiled template functions
 * Indexed by their `name` or `filename`
 */
class Cacher {
  constructor(cache) {
    this.cache = void 0;
    this.cache = cache;
  }
  define(key, val) {
    this.cache[key] = val;
  }
  get(key) {
    // string | array.
    // TODO: allow array of keys to look down
    // TODO: create plugin to allow referencing helpers, filters with dot notation
    return this.cache[key];
  }
  remove(key) {
    delete this.cache[key];
  }
  reset() {
    this.cache = {};
  }
  load(cacheObj) {
    copyProps(this.cache, cacheObj);
  }
}

/* END TYPES */
/**
 * Eta's template storage
 *
 * Stores partials and cached templates
 */
const templates = new Cacher({});

/* END TYPES */
/**
 * Include a template based on its name (or filepath, if it's already been cached).
 *
 * Called like `include(templateNameOrPath, data)`
 */
function includeHelper(templateNameOrPath, data) {
  const template = this.templates.get(templateNameOrPath);
  if (!template) {
    throw EtaErr('Could not fetch template "' + templateNameOrPath + '"');
  }
  return template(data, this);
}
/** Eta's base (global) configuration */
const config = {
  async: false,
  autoEscape: true,
  autoTrim: [false, "nl"],
  cache: false,
  e: XMLEscape,
  include: includeHelper,
  parse: {
    exec: "",
    interpolate: "=",
    raw: "~"
  },
  plugins: [],
  rmWhitespace: false,
  tags: ["<%", "%>"],
  templates: templates,
  useWith: false,
  varName: "it"
};
/**
 * Takes one or two partial (not necessarily complete) configuration objects, merges them 1 layer deep into eta.config, and returns the result
 *
 * @param override Partial configuration object
 * @param baseConfig Partial configuration object to merge before `override`
 *
 * **Example**
 *
 * ```js
 * let customConfig = getConfig({tags: ['!#', '#!']})
 * ```
 */
function getConfig(override, baseConfig) {
  // TODO: run more tests on this
  const res = {}; // Linked
  copyProps(res, config); // Creates deep clone of eta.config, 1 layer deep
  if (baseConfig) {
    copyProps(res, baseConfig);
  }
  if (override) {
    copyProps(res, override);
  }
  return res;
}
/** Update Eta's base config */
function configure(options) {
  return copyProps(config, options);
}

/* END TYPES */
/**
 * Takes a template string and returns a template function that can be called with (data, config, [cb])
 *
 * @param str - The template string
 * @param config - A custom configuration object (optional)
 *
 * **Example**
 *
 * ```js
 * let compiledFn = eta.compile("Hi <%= it.user %>")
 * // function anonymous()
 * let compiledFnStr = compiledFn.toString()
 * // "function anonymous(it,E,cb\n) {\nvar tR='',include=E.include.bind(E),includeFile=E.includeFile.bind(E);tR+='Hi ';tR+=E.e(it.user);if(cb){cb(null,tR)} return tR\n}"
 * ```
 */
function compile(str, config) {
  const options = getConfig(config || {});
  /* ASYNC HANDLING */
  // The below code is modified from mde/ejs. All credit should go to them.
  const ctor = options.async ? getAsyncFunctionConstructor() : Function;
  /* END ASYNC HANDLING */
  try {
    return new ctor(options.varName, "E",
    // EtaConfig
    "cb",
    // optional callback
    compileToString(str, options)); // eslint-disable-line no-new-func
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw EtaErr("Bad template syntax\n\n" + e.message + "\n" + Array(e.message.length + 1).join("=") + "\n" + compileToString(str, options) + "\n" // This will put an extra newline before the callstack for extra readability
      );
    } else {
      throw e;
    }
  }
}

const _BOM = /^\uFEFF/;
/* END TYPES */
/**
 * Get the path to the included file from the parent file path and the
 * specified path.
 *
 * If `name` does not have an extension, it will default to `.eta`
 *
 * @param name specified path
 * @param parentfile parent file path
 * @param isDirectory whether parentfile is a directory
 * @return absolute path to template
 */
function getWholeFilePath(name, parentfile, isDirectory) {
  const includePath = path.resolve(isDirectory ? parentfile : path.dirname(parentfile),
  // returns directory the parent file is in
  name // file
  ) + (path.extname(name) ? "" : ".eta");
  return includePath;
}
/**
 * Get the absolute path to an included template
 *
 * If this is called with an absolute path (for example, starting with '/' or 'C:\')
 * then Eta will attempt to resolve the absolute path within options.views. If it cannot,
 * Eta will fallback to options.root or '/'
 *
 * If this is called with a relative path, Eta will:
 * - Look relative to the current template (if the current template has the `filename` property)
 * - Look inside each directory in options.views
 *
 * Note: if Eta is unable to find a template using path and options, it will throw an error.
 *
 * @param path    specified path
 * @param options compilation options
 * @return absolute path to template
 */
function getPath(path, options) {
  let includePath = false;
  const views = options.views;
  const searchedPaths = [];
  // If these four values are the same,
  // getPath() will return the same result every time.
  // We can cache the result to avoid expensive
  // file operations.
  const pathOptions = JSON.stringify({
    filename: options.filename,
    path: path,
    root: options.root,
    views: options.views
  });
  if (options.cache && options.filepathCache && options.filepathCache[pathOptions]) {
    // Use the cached filepath
    return options.filepathCache[pathOptions];
  }
  /** Add a filepath to the list of paths we've checked for a template */
  function addPathToSearched(pathSearched) {
    if (!searchedPaths.includes(pathSearched)) {
      searchedPaths.push(pathSearched);
    }
  }
  /**
   * Take a filepath (like 'partials/mypartial.eta'). Attempt to find the template file inside `views`;
   * return the resulting template file path, or `false` to indicate that the template was not found.
   *
   * @param views the filepath that holds templates, or an array of filepaths that hold templates
   * @param path the path to the template
   */
  function searchViews(views, path) {
    let filePath;
    // If views is an array, then loop through each directory
    // And attempt to find the template
    if (Array.isArray(views) && views.some(function (v) {
      filePath = getWholeFilePath(path, v, true);
      addPathToSearched(filePath);
      return existsSync(filePath);
    })) {
      // If the above returned true, we know that the filePath was just set to a path
      // That exists (Array.some() returns as soon as it finds a valid element)
      return filePath;
    } else if (typeof views === "string") {
      // Search for the file if views is a single directory
      filePath = getWholeFilePath(path, views, true);
      addPathToSearched(filePath);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    // Unable to find a file
    return false;
  }
  // Path starts with '/', 'C:\', etc.
  const match = /^[A-Za-z]+:\\|^\//.exec(path);
  // Absolute path, like /partials/partial.eta
  if (match && match.length) {
    // We have to trim the beginning '/' off the path, or else
    // path.resolve(dir, path) will always resolve to just path
    const formattedPath = path.replace(/^\/*/, "");
    // First, try to resolve the path within options.views
    includePath = searchViews(views, formattedPath);
    if (!includePath) {
      // If that fails, searchViews will return false. Try to find the path
      // inside options.root (by default '/', the base of the filesystem)
      const pathFromRoot = getWholeFilePath(formattedPath, options.root || "/", true);
      addPathToSearched(pathFromRoot);
      includePath = pathFromRoot;
    }
  } else {
    // Relative paths
    // Look relative to a passed filename first
    if (options.filename) {
      const filePath = getWholeFilePath(path, options.filename);
      addPathToSearched(filePath);
      if (existsSync(filePath)) {
        includePath = filePath;
      }
    }
    // Then look for the template in options.views
    if (!includePath) {
      includePath = searchViews(views, path);
    }
    if (!includePath) {
      throw EtaErr('Could not find the template "' + path + '". Paths tried: ' + searchedPaths);
    }
  }
  // If caching and filepathCache are enabled,
  // cache the input & output of this function.
  if (options.cache && options.filepathCache) {
    options.filepathCache[pathOptions] = includePath;
  }
  return includePath;
}
/**
 * Reads a file synchronously
 */
function readFile(filePath) {
  try {
    return readFileSync(filePath).toString().replace(_BOM, ""); // TODO: is replacing BOM's necessary?
  } catch {
    throw EtaErr("Failed to read template at '" + filePath + "'");
  }
}

// express is set like: app.engine('html', require('eta').renderFile)
/* END TYPES */
/**
 * Reads a template, compiles it into a function, caches it if caching isn't disabled, returns the function
 *
 * @param filePath Absolute path to template file
 * @param options Eta configuration overrides
 * @param noCache Optionally, make Eta not cache the template
 */
function loadFile(filePath, options, noCache) {
  const config = getConfig(options);
  const template = readFile(filePath);
  try {
    const compiledTemplate = compile(template, config);
    if (!noCache) {
      config.templates.define(config.filename, compiledTemplate);
    }
    return compiledTemplate;
  } catch (e) {
    throw EtaErr("Loading file: " + filePath + " failed:\n\n" + e.message);
  }
}
/**
 * Get the template from a string or a file, either compiled on-the-fly or
 * read from cache (if enabled), and cache the template if needed.
 *
 * If `options.cache` is true, this function reads the file from
 * `options.filename` so it must be set prior to calling this function.
 *
 * @param options   compilation options
 * @return Eta template function
 */
function handleCache$1(options) {
  const filename = options.filename;
  if (options.cache) {
    const func = options.templates.get(filename);
    if (func) {
      return func;
    }
    return loadFile(filename, options);
  }
  // Caching is disabled, so pass noCache = true
  return loadFile(filename, options, true);
}
/**
 * Try calling handleCache with the given options and data and call the
 * callback with the result. If an error occurs, call the callback with
 * the error. Used by renderFile().
 *
 * @param data template data
 * @param options compilation options
 * @param cb callback
 */
function tryHandleCache(data, options, cb) {
  if (cb) {
    try {
      // Note: if there is an error while rendering the template,
      // It will bubble up and be caught here
      const templateFn = handleCache$1(options);
      templateFn(data, options, cb);
    } catch (err) {
      return cb(err);
    }
  } else {
    // No callback, try returning a promise
    if (typeof promiseImpl === "function") {
      return new promiseImpl(function (resolve, reject) {
        try {
          const templateFn = handleCache$1(options);
          const result = templateFn(data, options);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
    } else {
      throw EtaErr("Please provide a callback function, this env doesn't support Promises");
    }
  }
}
/**
 * Get the template function.
 *
 * If `options.cache` is `true`, then the template is cached.
 *
 * This returns a template function and the config object with which that template function should be called.
 *
 * @remarks
 *
 * It's important that this returns a config object with `filename` set.
 * Otherwise, the included file would not be able to use relative paths
 *
 * @param path path for the specified file (if relative, specify `views` on `options`)
 * @param options compilation options
 * @return [Eta template function, new config object]
 */
function includeFile(path, options) {
  // the below creates a new options object, using the parent filepath of the old options object and the path
  const newFileOptions = getConfig({
    filename: getPath(path, options)
  }, options);
  // TODO: make sure properties are currectly copied over
  return [handleCache$1(newFileOptions), newFileOptions];
}
function renderFile(filename, data, config, cb) {
  /*
  Here we have some function overloading.
  Essentially, the first 2 arguments to renderFile should always be the filename and data
  Express will call renderFile with (filename, data, cb)
  We also want to make (filename, data, options, cb) available
  */
  let renderConfig;
  let callback;
  data = data || {};
  // First, assign our callback function to `callback`
  // We can leave it undefined if neither parameter is a function;
  // Callbacks are optional
  if (typeof cb === "function") {
    // The 4th argument is the callback
    callback = cb;
  } else if (typeof config === "function") {
    // The 3rd arg is the callback
    callback = config;
  }
  // If there is a config object passed in explicitly, use it
  if (typeof config === "object") {
    renderConfig = getConfig(config || {});
  } else {
    // Otherwise, get the default config
    renderConfig = getConfig({});
  }
  // Set the filename option on the template
  // This will first try to resolve the file path (see getPath for details)
  renderConfig.filename = getPath(filename, renderConfig);
  return tryHandleCache(data, renderConfig, callback);
}
function renderFileAsync(filename, data, config, cb) {
  return renderFile(filename, typeof config === "function" ? {
    ...data,
    async: true
  } : data, typeof config === "object" ? {
    ...config,
    async: true
  } : config, cb);
}

/* END TYPES */
/**
 * Called with `includeFile(path, data)`
 */
function includeFileHelper(path, data) {
  const templateAndConfig = includeFile(path, this);
  return templateAndConfig[0](data, templateAndConfig[1]);
}

/* END TYPES */
function handleCache(template, options) {
  if (options.cache && options.name && options.templates.get(options.name)) {
    return options.templates.get(options.name);
  }
  const templateFunc = typeof template === "function" ? template : compile(template, options);
  // Note that we don't have to check if it already exists in the cache;
  // it would have returned earlier if it had
  if (options.cache && options.name) {
    options.templates.define(options.name, templateFunc);
  }
  return templateFunc;
}
function render(template, data, config, cb) {
  const options = getConfig(config || {});
  if (options.async) {
    if (cb) {
      // If user passes callback
      try {
        // Note: if there is an error while rendering the template,
        // It will bubble up and be caught here
        const templateFn = handleCache(template, options);
        templateFn(data, options, cb);
      } catch (err) {
        return cb(err);
      }
    } else {
      // No callback, try returning a promise
      if (typeof promiseImpl === "function") {
        return new promiseImpl(function (resolve, reject) {
          try {
            resolve(handleCache(template, options)(data, options));
          } catch (err) {
            reject(err);
          }
        });
      } else {
        throw EtaErr("Please provide a callback function, this env doesn't support Promises");
      }
    }
  } else {
    return handleCache(template, options)(data, options);
  }
}
function renderAsync(template, data, config, cb) {
  // Using Object.assign to lower bundle size, using spread operator makes it larger because of typescript injected polyfills
  return render(template, data, Object.assign({}, config, {
    async: true
  }), cb);
}

// @denoify-ignore
config.includeFile = includeFileHelper;
config.filepathCache = {};

export { renderFile as __express, compile, compileToString, config, configure, config as defaultConfig, getConfig, loadFile, parse, render, renderAsync, renderFile, renderFileAsync, templates };
//# sourceMappingURL=eta.module.mjs.map
