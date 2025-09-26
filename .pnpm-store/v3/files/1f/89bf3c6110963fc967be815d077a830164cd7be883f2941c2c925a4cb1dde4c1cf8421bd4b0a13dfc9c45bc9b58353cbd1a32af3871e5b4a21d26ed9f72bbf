/// <reference path="../../typings/thenable.d.ts" />
/// <reference types="node" />
import { Connection, _, _Connection, Features } from '../common/server';
import * as fm from './files';
import { ConnectionStrategy, ConnectionOptions, MessageReader, MessageWriter } from 'vscode-languageserver-protocol/node';
export * from 'vscode-languageserver-protocol/node';
export * from '../common/api';
export declare namespace Files {
    let uriToFilePath: typeof fm.uriToFilePath;
    let resolveGlobalNodePath: typeof fm.resolveGlobalNodePath;
    let resolveGlobalYarnPath: typeof fm.resolveGlobalYarnPath;
    let resolve: typeof fm.resolve;
    let resolveModulePath: typeof fm.resolveModulePath;
}
/**
 * Creates a new connection based on the processes command line arguments:
 *
 * @param options An optional connection strategy or connection options to control additional settings
 */
export declare function createConnection(options?: ConnectionStrategy | ConnectionOptions): Connection;
/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param options An optional connection strategy or connection options to control additional settings
 * @return A {@link Connection connection}
 */
export declare function createConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, options?: ConnectionStrategy | ConnectionOptions): Connection;
/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export declare function createConnection(reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions): Connection;
/**
 * Creates a new connection based on the processes command line arguments. The new connection surfaces proposed API
 *
 * @param factories: the factories to use to implement the proposed API
 * @param options An optional connection strategy or connection options to control additional settings
 */
export declare function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _>(factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>, options?: ConnectionStrategy | ConnectionOptions): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>;
/**
 * Creates a new connection using a the given streams.
 *
 * @param inputStream The stream to read messages from.
 * @param outputStream The stream to write messages to.
 * @param options An optional connection strategy or connection options to control additional settings
 * @return A {@link Connection connection}
 */
export declare function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _>(factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>, inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, options?: ConnectionStrategy | ConnectionOptions): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>;
/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export declare function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _, PNotebooks = _>(factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>, reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages, PNotebooks>;
