"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAdmonitionOptions = void 0;
exports.normalizeAdmonitionOptions = normalizeAdmonitionOptions;
exports.DefaultAdmonitionOptions = {
    keywords: [
        'secondary',
        'info',
        'success',
        'danger',
        'note',
        'tip',
        'warning',
        'important',
        'caution',
    ],
    extendDefaults: true,
};
function normalizeAdmonitionOptions(providedOptions) {
    if (providedOptions === true) {
        return exports.DefaultAdmonitionOptions;
    }
    const options = { ...exports.DefaultAdmonitionOptions, ...providedOptions };
    // By default it makes more sense to append keywords to the default ones
    // Adding custom keywords is more common than disabling existing ones
    if (options.extendDefaults) {
        options.keywords = [
            ...exports.DefaultAdmonitionOptions.keywords,
            ...options.keywords,
        ];
    }
    return options;
}
function parseDirective(directive) {
    const hasDirectiveLabel = 
    // @ts-expect-error: fine
    directive.children?.[0]?.data?.directiveLabel === true;
    if (hasDirectiveLabel) {
        const [directiveLabel, ...contentNodes] = directive.children;
        return { directiveLabel: directiveLabel, contentNodes };
    }
    return { directiveLabel: undefined, contentNodes: directive.children };
}
function getTextOnlyTitle(directiveLabel) {
    const isTextOnlyTitle = directiveLabel?.children?.length === 1 &&
        directiveLabel?.children?.[0]?.type === 'text';
    return isTextOnlyTitle
        ? // @ts-expect-error: todo type
            directiveLabel?.children?.[0].value
        : undefined;
}
const plugin = function plugin(optionsInput = {}) {
    const { keywords } = normalizeAdmonitionOptions(optionsInput);
    return async (root) => {
        const { visit } = await import('unist-util-visit');
        visit(root, (node) => {
            if (node.type === 'containerDirective') {
                const isAdmonition = keywords.includes(node.name);
                if (!isAdmonition) {
                    return;
                }
                const { directiveLabel, contentNodes } = parseDirective(node);
                const textOnlyTitle = node.attributes?.title ??
                    (directiveLabel ? getTextOnlyTitle(directiveLabel) : undefined);
                // Transform the mdast directive node to a hast admonition node
                // See https://github.com/syntax-tree/mdast-util-to-hast#fields-on-nodes
                // TODO in MDX v2 we should transform the whole directive to
                // mdxJsxFlowElement instead of using hast
                node.data = {
                    hName: 'admonition',
                    hProperties: {
                        ...(textOnlyTitle && { title: textOnlyTitle }),
                        type: node.name,
                    },
                };
                node.children = contentNodes;
                // TODO legacy MDX v1 <mdxAdmonitionTitle> workaround
                // v1: not possible to inject complex JSX elements as props
                // v2: now possible: use a mdxJsxFlowElement element
                if (directiveLabel && !textOnlyTitle) {
                    const complexTitleNode = {
                        type: 'mdxAdmonitionTitle',
                        data: {
                            hName: 'mdxAdmonitionTitle',
                            hProperties: {},
                        },
                        children: directiveLabel.children,
                    };
                    // @ts-expect-error: invented node type
                    node.children.unshift(complexTitleNode);
                }
            }
        });
    };
};
exports.default = plugin;
//# sourceMappingURL=index.js.map