import React from "react";
import { MediaTypeObject } from "docusaurus-plugin-openapi-docs/lib/openapi/types";
interface Props {
    style?: React.CSSProperties;
    title: string;
    body: {
        content?: {
            [key: string]: MediaTypeObject;
        };
        description?: string;
        required?: string[] | boolean;
    };
}
declare const ResponseSchema: React.FC<Props>;
export default ResponseSchema;
