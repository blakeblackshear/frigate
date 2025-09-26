/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type { ReportingSeverity } from '@docusaurus/types';
type InterpolatableValue = string | number | (string | number)[];
declare function interpolate(msgs: TemplateStringsArray, ...values: InterpolatableValue[]): string;
declare function info(msg: unknown): void;
declare function info(msg: TemplateStringsArray, ...values: [InterpolatableValue, ...InterpolatableValue[]]): void;
declare function warn(msg: unknown): void;
declare function warn(msg: TemplateStringsArray, ...values: [InterpolatableValue, ...InterpolatableValue[]]): void;
declare function error(msg: unknown): void;
declare function error(msg: TemplateStringsArray, ...values: [InterpolatableValue, ...InterpolatableValue[]]): void;
declare function success(msg: unknown): void;
declare function success(msg: TemplateStringsArray, ...values: [InterpolatableValue, ...InterpolatableValue[]]): void;
declare function newLine(): void;
/**
 * Takes a message and reports it according to the severity that the user wants.
 *
 * - `ignore`: completely no-op
 * - `log`: uses the `INFO` log level
 * - `warn`: uses the `WARN` log level
 * - `throw`: aborts the process, throws the error.
 *
 * Since the logger doesn't have logging level filters yet, these severities
 * mostly just differ by their colors.
 *
 * @throws In addition to throwing when `reportingSeverity === "throw"`, this
 * function also throws if `reportingSeverity` is not one of the above.
 */
declare function report(reportingSeverity: ReportingSeverity): typeof success;
declare const logger: {
    red: (msg: string | number) => string;
    yellow: (msg: string | number) => string;
    green: (msg: string | number) => string;
    cyan: (msg: string | number) => string;
    bold: (msg: string | number) => string;
    dim: (msg: string | number) => string;
    path: (msg: unknown) => string;
    url: (msg: unknown) => string;
    name: (msg: unknown) => string;
    code: (msg: unknown) => string;
    subdue: (msg: unknown) => string;
    num: (msg: unknown) => string;
    interpolate: typeof interpolate;
    info: typeof info;
    warn: typeof warn;
    error: typeof error;
    success: typeof success;
    report: typeof report;
    newLine: typeof newLine;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map