"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getHttpsConfig;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
// Ensure the certificate and key provided are valid and if not
// throw an easy to debug error
function validateKeyAndCerts({ cert, key, keyFile, crtFile, }) {
    let encrypted;
    try {
        // publicEncrypt will throw an error with an invalid cert
        encrypted = crypto_1.default.publicEncrypt(cert, Buffer.from('test'));
    }
    catch (err) {
        logger_1.default.error `The certificate path=${crtFile} is invalid.`;
        throw err;
    }
    try {
        // privateDecrypt will throw an error with an invalid key
        crypto_1.default.privateDecrypt(key, encrypted);
    }
    catch (err) {
        logger_1.default.error `The certificate key path=${keyFile} is invalid.`;
        throw err;
    }
}
// Read file and throw an error if it doesn't exist
async function readEnvFile(file, type) {
    if (!(await fs_extra_1.default.pathExists(file))) {
        throw new Error(`You specified ${type} in your env, but the file "${file}" can't be found.`);
    }
    return fs_extra_1.default.readFile(file);
}
// Get the https config
// Return cert files if provided in env, otherwise just true or false
async function getHttpsConfig() {
    const appDirectory = await fs_extra_1.default.realpath(process.cwd());
    const { SSL_CRT_FILE, SSL_KEY_FILE, HTTPS } = process.env;
    const isHttps = HTTPS === 'true';
    if (isHttps && SSL_CRT_FILE && SSL_KEY_FILE) {
        const crtFile = path_1.default.resolve(appDirectory, SSL_CRT_FILE);
        const keyFile = path_1.default.resolve(appDirectory, SSL_KEY_FILE);
        const config = {
            cert: await readEnvFile(crtFile, 'SSL_CRT_FILE'),
            key: await readEnvFile(keyFile, 'SSL_KEY_FILE'),
        };
        validateKeyAndCerts({ ...config, keyFile, crtFile });
        return config;
    }
    return isHttps;
}
