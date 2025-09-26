/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type CommanderStatic } from 'commander';
type CLIProgram = CommanderStatic;
type CLIArgs = [string, string, ...string[]];
export declare function runCLI(cliArgs: CLIArgs): Promise<void>;
export declare function createCLIProgram({ cli, cliArgs, siteDir, config, }: {
    cli: CLIProgram;
    cliArgs: CLIArgs;
    siteDir: string;
    config: string | undefined;
}): Promise<CLIProgram>;
export {};
