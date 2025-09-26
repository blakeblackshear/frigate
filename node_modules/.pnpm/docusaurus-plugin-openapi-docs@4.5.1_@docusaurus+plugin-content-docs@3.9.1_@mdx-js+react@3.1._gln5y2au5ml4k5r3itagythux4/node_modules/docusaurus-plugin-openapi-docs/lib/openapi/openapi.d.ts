import { OpenApiObject, TagGroupObject, TagObject } from "./types";
import { ApiMetadata, APIOptions, SidebarOptions } from "../types";
interface OpenApiFiles {
    source: string;
    sourceDirName: string;
    data: OpenApiObject;
}
export declare function readOpenapiFiles(openapiPath: string): Promise<OpenApiFiles[]>;
export declare function processOpenapiFiles(files: OpenApiFiles[], options: APIOptions, sidebarOptions: SidebarOptions): Promise<[ApiMetadata[], TagObject[][], TagGroupObject[]]>;
export declare function processOpenapiFile(openapiData: OpenApiObject, options: APIOptions, sidebarOptions: SidebarOptions): Promise<[ApiMetadata[], TagObject[], TagGroupObject[]]>;
export declare function getTagDisplayName(tagName: string, tags: TagObject[]): string;
export {};
