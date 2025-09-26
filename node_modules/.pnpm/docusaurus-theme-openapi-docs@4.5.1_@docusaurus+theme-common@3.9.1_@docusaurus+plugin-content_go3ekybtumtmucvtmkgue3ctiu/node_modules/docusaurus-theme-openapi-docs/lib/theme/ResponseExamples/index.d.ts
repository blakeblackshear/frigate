import React from "react";
export declare function json2xml(o: Record<string, any>, tab: string): string;
interface ResponseExamplesProps {
    responseExamples: any;
    mimeType: string;
}
export declare const ResponseExamples: React.FC<ResponseExamplesProps>;
interface ResponseExampleProps {
    responseExample: any;
    mimeType: string;
}
export declare const ResponseExample: React.FC<ResponseExampleProps>;
interface ExampleFromSchemaProps {
    schema: any;
    mimeType: string;
}
export declare const ExampleFromSchema: React.FC<ExampleFromSchemaProps>;
export {};
