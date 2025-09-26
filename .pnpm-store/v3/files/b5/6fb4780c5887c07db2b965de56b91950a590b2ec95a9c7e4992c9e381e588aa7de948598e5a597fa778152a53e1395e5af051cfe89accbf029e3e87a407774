import { MessageReader, MessageWriter, ConnectionStrategy, ConnectionOptions, Connection, Features, _Connection, _ } from '../common/api';
export * from 'vscode-languageserver-protocol/browser';
export * from '../common/api';
/**
 * Creates a new connection.
 *
 * @param factories: The factories for proposed features.
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export declare function createConnection<PConsole = _, PTracer = _, PTelemetry = _, PClient = _, PWindow = _, PWorkspace = _, PLanguages = _>(factories: Features<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>, reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions): _Connection<PConsole, PTracer, PTelemetry, PClient, PWindow, PWorkspace, PLanguages>;
/**
 * Creates a new connection.
 *
 * @param reader The message reader to read messages from.
 * @param writer The message writer to write message to.
 * @param options An optional connection strategy or connection options to control additional settings
 */
export declare function createConnection(reader: MessageReader, writer: MessageWriter, options?: ConnectionStrategy | ConnectionOptions): Connection;
