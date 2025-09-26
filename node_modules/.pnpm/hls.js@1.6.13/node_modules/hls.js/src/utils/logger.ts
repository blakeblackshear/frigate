export interface ILogFunction {
  (message?: any, ...optionalParams: any[]): void;
}

export interface ILogger {
  trace: ILogFunction;
  debug: ILogFunction;
  log: ILogFunction;
  warn: ILogFunction;
  info: ILogFunction;
  error: ILogFunction;
}

export class Logger implements ILogger {
  trace: ILogFunction;
  debug: ILogFunction;
  log: ILogFunction;
  warn: ILogFunction;
  info: ILogFunction;
  error: ILogFunction;

  constructor(label: string, logger: ILogger) {
    const lb = `[${label}]:`;
    this.trace = noop;
    this.debug = logger.debug.bind(null, lb);
    this.log = logger.log.bind(null, lb);
    this.warn = logger.warn.bind(null, lb);
    this.info = logger.info.bind(null, lb);
    this.error = logger.error.bind(null, lb);
  }
}

const noop: ILogFunction = function () {};

const fakeLogger: ILogger = {
  trace: noop,
  debug: noop,
  log: noop,
  warn: noop,
  info: noop,
  error: noop,
};

function createLogger() {
  return Object.assign({}, fakeLogger);
}

// let lastCallTime;
// function formatMsgWithTimeInfo(type, msg) {
//   const now = Date.now();
//   const diff = lastCallTime ? '+' + (now - lastCallTime) : '0';
//   lastCallTime = now;
//   msg = (new Date(now)).toISOString() + ' | [' +  type + '] > ' + msg + ' ( ' + diff + ' ms )';
//   return msg;
// }

function consolePrintFn(type: string, id: string | undefined): ILogFunction {
  const func: ILogFunction = self.console[type];
  return func
    ? func.bind(self.console, `${id ? '[' + id + '] ' : ''}[${type}] >`)
    : noop;
}

function getLoggerFn(
  key: string,
  debugConfig: boolean | Partial<ILogger>,
  id?: string,
): ILogFunction {
  return debugConfig[key]
    ? debugConfig[key].bind(debugConfig)
    : consolePrintFn(key, id);
}

const exportedLogger: ILogger = createLogger();

export function enableLogs(
  debugConfig: boolean | ILogger,
  context: string,
  id?: string | undefined,
): ILogger {
  // check that console is available
  const newLogger = createLogger();
  if (
    (typeof console === 'object' && debugConfig === true) ||
    typeof debugConfig === 'object'
  ) {
    const keys: (keyof ILogger)[] = [
      // Remove out from list here to hard-disable a log-level
      // 'trace',
      'debug',
      'log',
      'info',
      'warn',
      'error',
    ];
    keys.forEach((key) => {
      newLogger[key] = getLoggerFn(key, debugConfig, id);
    });
    // Some browsers don't allow to use bind on console object anyway
    // fallback to default if needed
    try {
      newLogger.log(
        `Debug logs enabled for "${context}" in hls.js version ${__VERSION__}`,
      );
    } catch (e) {
      /* log fn threw an exception. All logger methods are no-ops. */
      return createLogger();
    }
    // global exported logger uses the same functions as new logger without `id`
    keys.forEach((key) => {
      exportedLogger[key] = getLoggerFn(key, debugConfig);
    });
  } else {
    // Reset global exported logger
    Object.assign(exportedLogger, newLogger);
  }
  return newLogger;
}

export const logger: ILogger = exportedLogger;
