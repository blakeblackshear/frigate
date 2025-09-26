import type { DocFrontMatter } from '@docusaurus/plugin-content-docs';
export declare const DocFrontMatterSchema: import("joi").ObjectSchema<DocFrontMatter>;
export declare function validateDocFrontMatter(frontMatter: {
    [key: string]: unknown;
}): DocFrontMatter;
