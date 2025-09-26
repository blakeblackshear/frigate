"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xmlLint = void 0;
const path_1 = require("path");
const child_process_1 = require("child_process");
const errors_1 = require("./errors");
/**
 * Verify the passed in xml is valid. Requires xmllib be installed
 * @param xml what you want validated
 * @return {Promise<void>} resolves on valid rejects [error stderr]
 */
function xmlLint(xml) {
    const args = [
        '--schema',
        (0, path_1.resolve)(__dirname, '..', '..', 'schema', 'all.xsd'),
        '--noout',
        '-',
    ];
    if (typeof xml === 'string') {
        args[args.length - 1] = xml;
    }
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)('which', ['xmllint'], (error, stdout, stderr) => {
            if (error) {
                reject([new errors_1.XMLLintUnavailable()]);
                return;
            }
            const xmllint = (0, child_process_1.execFile)('xmllint', args, (error, stdout, stderr) => {
                if (error) {
                    reject([error, stderr]);
                }
                resolve();
            });
            if (xmllint.stdout) {
                xmllint.stdout.unpipe();
                if (typeof xml !== 'string' && xml && xmllint.stdin) {
                    xml.pipe(xmllint.stdin);
                }
            }
        });
    });
}
exports.xmlLint = xmlLint;
