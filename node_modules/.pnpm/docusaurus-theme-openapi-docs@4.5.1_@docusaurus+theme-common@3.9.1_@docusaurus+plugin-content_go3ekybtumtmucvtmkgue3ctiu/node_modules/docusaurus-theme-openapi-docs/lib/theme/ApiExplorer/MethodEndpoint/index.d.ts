import React from "react";
export interface Props {
    method: string;
    path: string;
    context?: "endpoint" | "callback";
}
declare function MethodEndpoint({ method, path, context }: Props): React.JSX.Element;
export default MethodEndpoint;
