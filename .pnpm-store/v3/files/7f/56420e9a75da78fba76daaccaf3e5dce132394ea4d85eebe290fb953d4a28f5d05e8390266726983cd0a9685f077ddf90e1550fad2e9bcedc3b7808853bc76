import { AuthState } from "@theme/ApiExplorer/Authorization/slice";
import { Body } from "@theme/ApiExplorer/Body/slice";
import { ParameterObject, ServerObject } from "docusaurus-plugin-openapi-docs/src/openapi/types";
import * as sdk from "postman-collection";
type Param = {
    value?: string | string[];
} & ParameterObject;
interface Options {
    server?: ServerObject;
    queryParams: Param[];
    pathParams: Param[];
    cookieParams: Param[];
    headerParams: Param[];
    contentType: string;
    accept: string;
    body: Body;
    auth: AuthState;
}
declare function buildPostmanRequest(postman: sdk.Request, { queryParams, pathParams, cookieParams, contentType, accept, headerParams, body, server, auth, }: Options): sdk.Request;
export default buildPostmanRequest;
