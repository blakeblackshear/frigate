import { ApiPageMetadata, InfoPageMetadata, SchemaPageMetadata, TagPageMetadata } from "../types";
export declare function createApiPageMD({ title, api: { deprecated, "x-deprecated-description": deprecatedDescription, description, method, path, extensions, parameters, requestBody, responses, callbacks, }, infoPath, frontMatter, }: ApiPageMetadata): string;
export declare function createInfoPageMD({ info: { title, version, description, contact, license, termsOfService, logo, darkLogo, }, securitySchemes, downloadUrl, }: InfoPageMetadata): string;
export declare function createTagPageMD({ tag: { description } }: TagPageMetadata): string;
export declare function createSchemaPageMD({ schema }: SchemaPageMetadata): string;
