import { IParserConfig } from "@chevrotain/types";
import { has } from "lodash-es";
import { timer } from "@chevrotain/utils";
import { MixedInParser } from "./parser_traits.js";
import { DEFAULT_PARSER_CONFIG } from "../parser.js";

/**
 * Trait responsible for runtime parsing errors.
 */
export class PerformanceTracer {
  traceInitPerf: boolean | number;
  traceInitMaxIdent: number;
  traceInitIndent: number;

  initPerformanceTracer(config: IParserConfig) {
    if (has(config, "traceInitPerf")) {
      const userTraceInitPerf = config.traceInitPerf;
      const traceIsNumber = typeof userTraceInitPerf === "number";
      this.traceInitMaxIdent = traceIsNumber
        ? <number>userTraceInitPerf
        : Infinity;
      this.traceInitPerf = traceIsNumber
        ? userTraceInitPerf > 0
        : (userTraceInitPerf as boolean); // assumes end user provides the correct config value/type
    } else {
      this.traceInitMaxIdent = 0;
      this.traceInitPerf = DEFAULT_PARSER_CONFIG.traceInitPerf;
    }

    this.traceInitIndent = -1;
  }

  TRACE_INIT<T>(this: MixedInParser, phaseDesc: string, phaseImpl: () => T): T {
    // No need to optimize this using NOOP pattern because
    // It is not called in a hot spot...
    if (this.traceInitPerf === true) {
      this.traceInitIndent++;
      const indent = new Array(this.traceInitIndent + 1).join("\t");
      if (this.traceInitIndent < this.traceInitMaxIdent) {
        console.log(`${indent}--> <${phaseDesc}>`);
      }
      const { time, value } = timer(phaseImpl);
      /* istanbul ignore next - Difficult to reproduce specific performance behavior (>10ms) in tests */
      const traceMethod = time > 10 ? console.warn : console.log;
      if (this.traceInitIndent < this.traceInitMaxIdent) {
        traceMethod(`${indent}<-- <${phaseDesc}> time: ${time}ms`);
      }
      this.traceInitIndent--;
      return value;
    } else {
      return phaseImpl();
    }
  }
}
