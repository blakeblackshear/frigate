import React from "react";
import { ApiItem } from "docusaurus-plugin-openapi-docs/lib/types";
interface Props {
    id?: string;
    label?: string;
    responses: ApiItem["responses"];
}
declare const StatusCodes: React.FC<Props>;
export default StatusCodes;
