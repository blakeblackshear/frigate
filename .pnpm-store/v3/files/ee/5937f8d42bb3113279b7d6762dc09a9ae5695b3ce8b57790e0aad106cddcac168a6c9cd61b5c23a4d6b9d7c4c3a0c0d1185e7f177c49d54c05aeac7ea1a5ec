import { IOType } from 'node:child_process';
import { Stream } from 'node:stream';
import { z } from 'zod/v4';

declare const JSONRPCMessageSchema: z.ZodUnion<readonly [z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$strict>, z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>>;
}, z.core.$strict>, z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    result: z.ZodObject<{
        _meta: z.ZodOptional<z.ZodObject<{}, z.core.$loose>>;
    }, z.core.$loose>;
}, z.core.$strict>, z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    error: z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strict>]>;
type JSONRPCMessage = z.infer<typeof JSONRPCMessageSchema>;

/**
 * Transport interface for MCP (Model Context Protocol) communication.
 * Maps to the `Transport` interface in the MCP spec.
 */
interface MCPTransport {
    /**
     * Initialize and start the transport
     */
    start(): Promise<void>;
    /**
     * Send a JSON-RPC message through the transport
     * @param message The JSON-RPC message to send
     */
    send(message: JSONRPCMessage): Promise<void>;
    /**
     * Clean up and close the transport
     */
    close(): Promise<void>;
    /**
     * Event handler for transport closure
     */
    onclose?: () => void;
    /**
     * Event handler for transport errors
     */
    onerror?: (error: Error) => void;
    /**
     * Event handler for received messages
     */
    onmessage?: (message: JSONRPCMessage) => void;
}

interface StdioConfig {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    stderr?: IOType | Stream | number;
    cwd?: string;
}
declare class StdioMCPTransport implements MCPTransport {
    private process?;
    private abortController;
    private readBuffer;
    private serverParams;
    onclose?: () => void;
    onerror?: (error: unknown) => void;
    onmessage?: (message: JSONRPCMessage) => void;
    constructor(server: StdioConfig);
    start(): Promise<void>;
    private processReadBuffer;
    close(): Promise<void>;
    send(message: JSONRPCMessage): Promise<void>;
}

export { StdioMCPTransport as Experimental_StdioMCPTransport, StdioConfig };
