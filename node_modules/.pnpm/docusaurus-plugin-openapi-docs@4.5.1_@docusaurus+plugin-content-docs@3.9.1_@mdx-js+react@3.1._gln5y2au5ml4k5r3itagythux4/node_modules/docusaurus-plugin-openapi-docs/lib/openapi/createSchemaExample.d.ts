import { SchemaObject } from "./types";
type ExampleType = "request" | "response";
interface ExampleContext {
    type: ExampleType;
}
export declare const sampleFromSchema: (schema: SchemaObject | undefined, context: ExampleContext) => any;
export {};
