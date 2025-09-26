import React from "react";
interface ResponseHeadersProps {
    description?: string;
    example?: string;
    schema?: {
        type?: string;
        format?: string;
    };
}
export declare const ResponseHeaders: React.FC<{
    responseHeaders?: Record<string, ResponseHeadersProps>;
}>;
export default ResponseHeaders;
