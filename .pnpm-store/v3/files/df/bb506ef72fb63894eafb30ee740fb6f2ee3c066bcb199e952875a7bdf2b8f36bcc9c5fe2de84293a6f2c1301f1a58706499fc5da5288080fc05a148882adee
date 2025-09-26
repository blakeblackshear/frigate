import React from "react";
export interface ExampleObject {
    summary?: string;
    description?: string;
    value?: any;
    externalValue?: string;
}
export interface Props {
    className: string;
    param: {
        description: string;
        example: any;
        examples: Record<string, ExampleObject>;
        name: string;
        required: boolean;
        deprecated: boolean;
        schema: any;
        enumDescriptions?: [string, string][];
    };
}
declare function ParamsItem({ param, ...rest }: Props): React.JSX.Element;
export default ParamsItem;
