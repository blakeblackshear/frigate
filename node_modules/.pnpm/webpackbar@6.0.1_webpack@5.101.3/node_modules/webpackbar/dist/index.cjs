'use strict';

const Webpack = require('webpack');
const stdEnv = require('std-env');
const prettyTime = require('pretty-time');
const path = require('node:path');
const chalk = require('chalk');
const consola$1 = require('consola');
const markdownTable = require('markdown-table');
const figures = require('figures');
const ansiEscapes = require('ansi-escapes');
const wrapAnsi = require('wrap-ansi');

function _interopDefaultCompat (e) { return e && typeof e === 'object' && 'default' in e ? e.default : e; }

const Webpack__default = /*#__PURE__*/_interopDefaultCompat(Webpack);
const prettyTime__default = /*#__PURE__*/_interopDefaultCompat(prettyTime);
const path__default = /*#__PURE__*/_interopDefaultCompat(path);
const chalk__default = /*#__PURE__*/_interopDefaultCompat(chalk);
const markdownTable__default = /*#__PURE__*/_interopDefaultCompat(markdownTable);
const figures__default = /*#__PURE__*/_interopDefaultCompat(figures);
const ansiEscapes__default = /*#__PURE__*/_interopDefaultCompat(ansiEscapes);
const wrapAnsi__default = /*#__PURE__*/_interopDefaultCompat(wrapAnsi);

function first(arr) {
  return arr[0];
}
function last(arr) {
  return arr.length > 0 ? arr[arr.length - 1] : null;
}
function startCase(str) {
  return str[0].toUpperCase() + str.slice(1);
}
function firstMatch(regex, str) {
  const m = regex.exec(str);
  return m ? m[0] : null;
}
function hasValue(s) {
  return s && s.length > 0;
}
function removeAfter(delimiter, str) {
  return first(str.split(delimiter)) || "";
}
function removeBefore(delimiter, str) {
  return last(str.split(delimiter)) || "";
}
function range(len) {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(i);
  }
  return arr;
}
function shortenPath(path$1 = "") {
  const cwd = process.cwd() + path.sep;
  return String(path$1).replace(cwd, "");
}
function objectValues(obj) {
  return Object.keys(obj).map((key) => obj[key]);
}

const { bullet, tick, cross, pointerSmall, radioOff } = figures__default;
const nodeModules = `${path.delimiter}node_modules${path.delimiter}`;
const BAR_LENGTH = 25;
const BLOCK_CHAR = "\u2588";
const BLOCK_CHAR2 = "\u2588";
const NEXT = " " + chalk__default.blue(pointerSmall) + " ";
const BULLET = bullet;
const TICK = tick;
const CROSS = cross;
const CIRCLE_OPEN = radioOff;

const consola = consola$1.consola.withTag("webpackbar");
const colorize = (color) => {
  if (color[0] === "#") {
    return chalk__default.hex(color);
  }
  return chalk__default[color] || chalk__default.reset;
};
const renderBar = (progress, color) => {
  const w = progress * (BAR_LENGTH / 100);
  const bg = chalk__default.white(BLOCK_CHAR);
  const fg = colorize(color)(BLOCK_CHAR2);
  return range(BAR_LENGTH).map((i) => i < w ? fg : bg).join("");
};
function createTable(data) {
  return markdownTable__default(data);
}
function ellipsisLeft(str, n) {
  if (str.length <= n - 3) {
    return str;
  }
  return `...${str.slice(str.length - n - 1)}`;
}

const parseRequest = (requestStr) => {
  const parts = (requestStr || "").split("!");
  const file = path__default.relative(
    process.cwd(),
    removeAfter("?", removeBefore(nodeModules, parts.pop()))
  );
  const loaders = parts.map((part) => firstMatch(/[\d@a-z-]+-loader/, part)).filter((v) => hasValue(v));
  return {
    file: hasValue(file) ? file : null,
    loaders
  };
};
const formatRequest = (request) => {
  const loaders = request.loaders.join(NEXT);
  if (loaders.length === 0) {
    return request.file || "";
  }
  return `${loaders}${NEXT}${request.file}`;
};
function hook(compiler, hookName, fn) {
  if (compiler.hooks) {
    compiler.hooks[hookName].tap("WebpackBar:" + hookName, fn);
  } else {
    compiler.plugin(hookName, fn);
  }
}

var __defProp$3 = Object.defineProperty;
var __defNormalProp$3 = (obj, key, value) => key in obj ? __defProp$3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$3 = (obj, key, value) => {
  __defNormalProp$3(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const originalWrite = Symbol("webpackbarWrite");
class LogUpdate {
  constructor() {
    __publicField$3(this, "prevLineCount");
    __publicField$3(this, "listening");
    __publicField$3(this, "extraLines");
    __publicField$3(this, "_streams");
    this.prevLineCount = 0;
    this.listening = false;
    this.extraLines = "";
    this._onData = this._onData.bind(this);
    this._streams = [process.stdout, process.stderr];
  }
  render(lines) {
    this.listen();
    const wrappedLines = wrapAnsi__default(lines, this.columns, {
      trim: false,
      hard: true,
      wordWrap: false
    });
    const data = ansiEscapes__default.eraseLines(this.prevLineCount) + wrappedLines + "\n" + this.extraLines;
    this.write(data);
    const _lines = data.split("\n");
    this.prevLineCount = _lines.length;
  }
  get columns() {
    return (process.stderr.columns || 80) - 2;
  }
  write(data) {
    const stream = process.stderr;
    if (stream.write[originalWrite]) {
      stream.write[originalWrite].call(stream, data, "utf8");
    } else {
      stream.write(data, "utf8");
    }
  }
  clear() {
    this.done();
    this.write(ansiEscapes__default.eraseLines(this.prevLineCount));
  }
  done() {
    this.stopListen();
    this.prevLineCount = 0;
    this.extraLines = "";
  }
  _onData(data) {
    const str = String(data);
    const lines = str.split("\n").length - 1;
    if (lines > 0) {
      this.prevLineCount += lines;
      this.extraLines += data;
    }
  }
  listen() {
    if (this.listening) {
      return;
    }
    for (const stream of this._streams) {
      if (stream.write[originalWrite]) {
        continue;
      }
      const write = (data, ...args) => {
        if (!stream.write[originalWrite]) {
          return stream.write(data, ...args);
        }
        this._onData(data);
        return stream.write[originalWrite].call(stream, data, ...args);
      };
      write[originalWrite] = stream.write;
      stream.write = write;
    }
    this.listening = true;
  }
  stopListen() {
    for (const stream of this._streams) {
      if (stream.write[originalWrite]) {
        stream.write = stream.write[originalWrite];
      }
    }
    this.listening = false;
  }
}

const logUpdate = new LogUpdate();
let lastRender = Date.now();
class FancyReporter {
  allDone() {
    logUpdate.done();
  }
  done(context) {
    this._renderStates(context.statesArray);
    if (context.hasErrors) {
      logUpdate.done();
    }
  }
  progress(context) {
    if (Date.now() - lastRender > 50) {
      this._renderStates(context.statesArray);
    }
  }
  _renderStates(statesArray) {
    lastRender = Date.now();
    const renderedStates = statesArray.map((c) => this._renderState(c)).join("\n\n");
    logUpdate.render("\n" + renderedStates + "\n");
  }
  _renderState(state) {
    const color = colorize(state.color);
    let line1;
    let line2;
    if (state.progress >= 0 && state.progress < 100) {
      line1 = [
        color(BULLET),
        color(state.name),
        renderBar(state.progress, state.color),
        state.message,
        `(${state.progress || 0}%)`,
        chalk__default.grey(state.details[0] || ""),
        chalk__default.grey(state.details[1] || "")
      ].join(" ");
      line2 = state.request ? " " + chalk__default.grey(
        ellipsisLeft(formatRequest(state.request), logUpdate.columns)
      ) : "";
    } else {
      let icon = " ";
      if (state.hasErrors) {
        icon = CROSS;
      } else if (state.progress === 100) {
        icon = TICK;
      } else if (state.progress === -1) {
        icon = CIRCLE_OPEN;
      }
      line1 = color(`${icon} ${state.name}`);
      line2 = chalk__default.grey("  " + state.message);
    }
    return line1 + "\n" + line2;
  }
}

class SimpleReporter {
  start(context) {
    consola.info(`Compiling ${context.state.name}`);
  }
  change(context, { shortPath }) {
    consola.debug(`${shortPath} changed.`, `Rebuilding ${context.state.name}`);
  }
  done(context) {
    const { hasError, message, name } = context.state;
    consola[hasError ? "error" : "success"](`${name}: ${message}`);
  }
}

const DB = {
  loader: {
    get: (loader) => startCase(loader)
  },
  ext: {
    get: (ext) => `${ext} files`,
    vue: "Vue Single File components",
    js: "JavaScript files",
    sass: "SASS files",
    scss: "SASS files",
    unknown: "Unknown files"
  }
};
function getDescription(category, keyword) {
  if (!DB[category]) {
    return startCase(keyword);
  }
  if (DB[category][keyword]) {
    return DB[category][keyword];
  }
  if (DB[category].get) {
    return DB[category].get(keyword);
  }
  return "-";
}

function formatStats(allStats) {
  const lines = [];
  for (const category of Object.keys(allStats)) {
    const stats = allStats[category];
    lines.push(`> Stats by ${chalk__default.bold(startCase(category))}`);
    let totalRequests = 0;
    const totalTime = [0, 0];
    const data = [
      [startCase(category), "Requests", "Time", "Time/Request", "Description"]
    ];
    for (const item of Object.keys(stats)) {
      const stat = stats[item];
      totalRequests += stat.count || 0;
      const description = getDescription(category, item);
      totalTime[0] += stat.time[0];
      totalTime[1] += stat.time[1];
      const avgTime = [stat.time[0] / stat.count, stat.time[1] / stat.count];
      data.push([
        item,
        stat.count || "-",
        prettyTime__default(stat.time),
        prettyTime__default(avgTime),
        description
      ]);
    }
    data.push(["Total", totalRequests, prettyTime__default(totalTime), "", ""]);
    lines.push(createTable(data));
  }
  return `${lines.join("\n\n")}
`;
}

var __defProp$2 = Object.defineProperty;
var __defNormalProp$2 = (obj, key, value) => key in obj ? __defProp$2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$2 = (obj, key, value) => {
  __defNormalProp$2(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class Profiler {
  constructor() {
    __publicField$2(this, "requests");
    this.requests = [];
  }
  onRequest(request) {
    if (!request) {
      return;
    }
    if (this.requests.length > 0) {
      const lastReq = this.requests.at(-1);
      if (lastReq.start) {
        lastReq.time = process.hrtime(lastReq.start);
        delete lastReq.start;
      }
    }
    if (!request.file || request.loaders.length === 0) {
      return;
    }
    this.requests.push({
      request,
      start: process.hrtime()
    });
  }
  getStats() {
    const loaderStats = {};
    const extStats = {};
    const getStat = (stats, name) => {
      if (!stats[name]) {
        stats[name] = {
          count: 0,
          time: [0, 0]
        };
      }
      return stats[name];
    };
    const addToStat = (stats, name, count, time) => {
      const stat = getStat(stats, name);
      stat.count += count;
      stat.time[0] += time[0];
      stat.time[1] += time[1];
    };
    for (const { request, time = [0, 0] } of this.requests) {
      for (const loader of request.loaders) {
        addToStat(loaderStats, loader, 1, time);
      }
      const ext = request.file && path__default.extname(request.file).slice(1);
      addToStat(extStats, ext && ext.length > 0 ? ext : "unknown", 1, time);
    }
    return {
      ext: extStats,
      loader: loaderStats
    };
  }
  getFormattedStats() {
    return formatStats(this.getStats());
  }
}

class ProfileReporter {
  progress(context) {
    if (!context.state.profiler) {
      context.state.profiler = new Profiler();
    }
    context.state.profiler.onRequest(context.state.request);
  }
  done(context) {
    if (context.state.profiler) {
      context.state.profile = context.state.profiler.getFormattedStats();
      delete context.state.profiler;
    }
  }
  allDone(context) {
    let str = "";
    for (const state of context.statesArray) {
      const color = colorize(state.color);
      if (state.profile) {
        str += color(`
Profile results for ${chalk__default.bold(state.name)}
`) + `
${state.profile}
`;
        delete state.profile;
      }
    }
    process.stderr.write(str);
  }
}

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class StatsReporter {
  constructor(options) {
    __publicField$1(this, "options");
    this.options = Object.assign(
      {
        chunks: false,
        children: false,
        modules: false,
        colors: true,
        warnings: true,
        errors: true
      },
      options
    );
  }
  done(context, { stats }) {
    const str = stats.toString(this.options);
    if (context.hasErrors) {
      process.stderr.write("\n" + str + "\n");
    } else {
      context.state.statsString = str;
    }
  }
  allDone(context) {
    let str = "";
    for (const state of context.statesArray) {
      if (state.statsString) {
        str += "\n" + state.statsString + "\n";
        delete state.statsString;
      }
    }
    process.stderr.write(str);
  }
}

const reporters = {
  __proto__: null,
  basic: SimpleReporter,
  fancy: FancyReporter,
  profile: ProfileReporter,
  stats: StatsReporter
};

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const DEFAULTS = {
  name: "webpack",
  color: "green",
  reporters: stdEnv.isMinimal ? ["basic"] : ["fancy"],
  reporter: null
};
const DEFAULT_STATE = {
  start: null,
  progress: -1,
  done: false,
  message: "",
  details: [],
  request: null,
  hasErrors: false
};
const globalStates = {};
class WebpackBarPlugin extends Webpack__default.ProgressPlugin {
  constructor(options) {
    super({ activeModules: true });
    __publicField(this, "options");
    __publicField(this, "reporters");
    this.options = Object.assign({}, DEFAULTS, options);
    this.handler = (percent, message, ...details) => {
      this.updateProgress(percent, message, details);
    };
    const _reporters = [
      ...this.options.reporters || [],
      this.options.reporter
    ].filter(Boolean).map((reporter) => {
      if (Array.isArray(reporter)) {
        return { reporter: reporter[0], options: reporter[1] };
      }
      if (typeof reporter === "string") {
        return { reporter };
      }
      return { reporter };
    });
    if (this.options.profile && !_reporters.some(({ reporter }) => reporter === "profile")) {
      _reporters.push({ reporter: "profile" });
    }
    this.reporters = _reporters.map(({ reporter, options: options2 = {} }) => {
      if (typeof reporter === "string") {
        if (this.options[reporter] === false) {
          return void 0;
        }
        options2 = { ...this.options[reporter], ...options2 };
        reporter = reporters[reporter] || require(reporter);
      }
      if (typeof reporter === "function") {
        try {
          reporter = new reporter(options2);
        } catch {
          reporter = reporter(options2);
        }
      }
      return reporter;
    }).filter(Boolean);
  }
  callReporters(fn, payload = {}) {
    for (const reporter of this.reporters) {
      if (typeof reporter[fn] === "function") {
        try {
          reporter[fn](this, payload);
        } catch (error) {
          process.stdout.write(error.stack + "\n");
        }
      }
    }
  }
  get hasRunning() {
    return objectValues(this.states).some((state) => !state.done);
  }
  get hasErrors() {
    return objectValues(this.states).some((state) => state.hasErrors);
  }
  get statesArray() {
    return objectValues(this.states).sort(
      (s1, s2) => s1.name.localeCompare(s2.name)
    );
  }
  get states() {
    return globalStates;
  }
  get state() {
    return globalStates[this.options.name];
  }
  _ensureState() {
    if (!this.states[this.options.name]) {
      this.states[this.options.name] = {
        ...DEFAULT_STATE,
        color: this.options.color,
        name: startCase(this.options.name)
      };
    }
  }
  apply(compiler) {
    if (compiler.webpackbar) {
      return;
    }
    compiler.webpackbar = this;
    super.apply(compiler);
    hook(compiler, "afterPlugins", () => {
      this._ensureState();
    });
    hook(compiler, "compile", () => {
      this._ensureState();
      Object.assign(this.state, {
        ...DEFAULT_STATE,
        start: process.hrtime()
      });
      this.callReporters("start");
    });
    hook(compiler, "invalid", (fileName, changeTime) => {
      this._ensureState();
      this.callReporters("change", {
        path: fileName,
        shortPath: shortenPath(fileName),
        time: changeTime
      });
    });
    hook(compiler, "done", (stats) => {
      this._ensureState();
      if (this.state.done) {
        return;
      }
      const hasErrors = stats.hasErrors();
      const status = hasErrors ? "with some errors" : "successfully";
      const time = this.state.start ? " in " + prettyTime__default(process.hrtime(this.state.start), 2) : "";
      Object.assign(this.state, {
        ...DEFAULT_STATE,
        progress: 100,
        done: true,
        message: `Compiled ${status}${time}`,
        hasErrors
      });
      this.callReporters("progress");
      this.callReporters("done", { stats });
      if (!this.hasRunning) {
        this.callReporters("beforeAllDone");
        this.callReporters("allDone");
        this.callReporters("afterAllDone");
      }
    });
  }
  updateProgress(percent = 0, message = "", details = []) {
    const progress = Math.floor(percent * 100);
    const activeModule = details.pop();
    Object.assign(this.state, {
      progress,
      message: message || "",
      details,
      request: parseRequest(activeModule)
    });
    this.callReporters("progress");
  }
}

module.exports = WebpackBarPlugin;
