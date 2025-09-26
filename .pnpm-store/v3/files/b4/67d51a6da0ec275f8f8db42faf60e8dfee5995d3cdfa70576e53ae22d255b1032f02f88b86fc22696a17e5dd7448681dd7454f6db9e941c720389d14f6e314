"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwizzleActions = void 0;
exports.getAction = getAction;
exports.eject = eject;
exports.wrap = wrap;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const utils_1 = require("@docusaurus/utils");
const prompts_1 = require("./prompts");
exports.SwizzleActions = ['wrap', 'eject'];
async function getAction(componentConfig, options) {
    if (options.wrap) {
        return 'wrap';
    }
    if (options.eject) {
        return 'eject';
    }
    return (0, prompts_1.askSwizzleAction)(componentConfig);
}
async function isDir(dirPath) {
    return ((await fs_extra_1.default.pathExists(dirPath)) && (await fs_extra_1.default.stat(dirPath)).isDirectory());
}
async function eject({ siteDir, themePath, componentName, typescript, }) {
    const fromPath = path_1.default.join(themePath, componentName);
    const isDirectory = await isDir(fromPath);
    const globPattern = isDirectory
        ? // Do we really want to copy all components?
            path_1.default.join(fromPath, '**/*')
        : `${fromPath}.*`;
    const globPatternPosix = (0, utils_1.posixPath)(globPattern);
    const filesToCopy = await (0, utils_1.Globby)(globPatternPosix, {
        ignore: lodash_1.default.compact([
            '**/*.{story,stories,test,tests}.{js,jsx,ts,tsx}',
            // When ejecting JS components, we want to avoid emitting TS files
            // In particular the .d.ts files that theme build output contains
            typescript ? null : '**/*.{d.ts,ts,tsx}',
            '**/{__fixtures__,__tests__}/*',
        ]),
    });
    if (filesToCopy.length === 0) {
        // This should never happen
        throw new Error(logger_1.default.interpolate `No files to copy from path=${fromPath} with glob code=${globPatternPosix}`);
    }
    const toPath = path_1.default.join(siteDir, utils_1.THEME_PATH);
    await fs_extra_1.default.ensureDir(toPath);
    const createdFiles = await Promise.all(filesToCopy.map(async (sourceFile) => {
        const targetFile = path_1.default.join(toPath, path_1.default.relative(themePath, sourceFile));
        try {
            const fileContents = await fs_extra_1.default.readFile(sourceFile, 'utf-8');
            await fs_extra_1.default.outputFile(targetFile, fileContents.trimStart().replace(/^\/\*.+?\*\/\s*/ms, ''));
        }
        catch (err) {
            logger_1.default.error `Could not copy file from path=${sourceFile} to path=${targetFile}`;
            throw err;
        }
        return targetFile;
    }));
    return { createdFiles };
}
async function wrap({ siteDir, themePath, componentName: themeComponentName, typescript, importType = 'original', }) {
    const isDirectory = await isDir(path_1.default.join(themePath, themeComponentName));
    // Top/Parent/ComponentName => ComponentName
    const componentName = lodash_1.default.last(themeComponentName.split('/'));
    const wrapperComponentName = `${componentName}Wrapper`;
    const wrapperFileName = `${themeComponentName}${isDirectory ? '/index' : ''}${typescript ? '.tsx' : '.js'}`;
    await fs_extra_1.default.ensureDir(path_1.default.resolve(siteDir, utils_1.THEME_PATH));
    const toPath = path_1.default.resolve(siteDir, utils_1.THEME_PATH, wrapperFileName);
    const content = typescript
        ? `import React, {type ReactNode} from 'react';
import ${componentName} from '@theme-${importType}/${themeComponentName}';
import type ${componentName}Type from '@theme/${themeComponentName}';
import type {WrapperProps} from '@docusaurus/types';

type Props = WrapperProps<typeof ${componentName}Type>;

export default function ${wrapperComponentName}(props: Props): ReactNode {
  return (
    <>
      <${componentName} {...props} />
    </>
  );
}
`
        : `import React from 'react';
import ${componentName} from '@theme-${importType}/${themeComponentName}';

export default function ${wrapperComponentName}(props) {
  return (
    <>
      <${componentName} {...props} />
    </>
  );
}
`;
    await fs_extra_1.default.outputFile(toPath, content);
    return { createdFiles: [toPath] };
}
