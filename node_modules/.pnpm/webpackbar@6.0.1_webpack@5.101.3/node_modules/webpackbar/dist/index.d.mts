import Webpack, { Stats } from 'webpack';

type ReporterContextFunc<T = any> = (context: WebpackBarPlugin, opts: T) => void;

interface State {
  start: [number, number] | null;
  progress: number;
  done: boolean;
  message: string;
  details: string[];
  request: null | {
    file: null | string;
    loaders: string[];
  };
  hasErrors: boolean;
  color: string;
  name: string;
}

interface Reporter {
  /**
   * Called when (re)compile is started
   */
  start?: ReporterContextFunc;

  /**
   * Called when a file changed on watch mode
   */
  change?: ReporterContextFunc<{ shortPath: string }>;

  /**
   * Called after each progress update
   */
  update?: ReporterContextFunc;

  /**
   * Called when compile finished
   */
  done?: ReporterContextFunc<{ stats: Stats }>;

  /**
   * Called when build progress updated
   */
  progress?: ReporterContextFunc;

  /**
   * Called when _all_ compiles finished
   */
  allDone?: ReporterContextFunc;

  beforeAllDone?: ReporterContextFunc;

  afterAllDone?: ReporterContextFunc;
}

type ReporterOpts = { reporter: Reporter | string; options?: any };
type ReporterInput = string | [Reporter | string, any?] | ReporterOpts;

interface WebpackBarOptions {
  /**
   * Display name
   * @default 'webpack'
   */
  name?: string;

  /**
   * Color output of the progress bar
   * @default 'green'
   */
  color?: string;

  /**
   * Enable profiler
   * @default false
   */
  profile?: boolean;

  /**
   * Enable bars reporter
   * Defaults to 'true' when not in CI or testing mod
   * @default true
   */
  fancy?: boolean;

  /**
   * Enable a simple log reporter (only start and end)
   * Defaults to 'true' when running in minimal environments
   * @default true
   */
  basic?: boolean;

  /**
   * Register a custom reporter
   */
  reporter?: ReporterInput;

  /**
   * Register an Array of your custom reporters.
   * @default ['basic'] | ['fancy']
   */
  reporters?: ReporterInput[];
}

declare class WebpackBarPlugin extends Webpack.ProgressPlugin {
    private options;
    private reporters;
    constructor(options?: WebpackBarOptions);
    callReporters(fn: any, payload?: {}): void;
    get hasRunning(): boolean;
    get hasErrors(): boolean;
    get statesArray(): any[];
    get states(): {
        [key: string]: State;
    };
    get state(): State;
    _ensureState(): void;
    apply(compiler: any): void;
    updateProgress(percent?: number, message?: string, details?: any[]): void;
}

export { type Reporter, type State, WebpackBarPlugin as default };
