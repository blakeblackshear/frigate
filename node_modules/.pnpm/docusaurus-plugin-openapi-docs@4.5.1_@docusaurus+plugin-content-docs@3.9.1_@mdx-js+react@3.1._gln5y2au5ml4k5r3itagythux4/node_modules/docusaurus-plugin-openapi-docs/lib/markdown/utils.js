"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeBlock = exports.curlyBrackets = exports.codeFence = exports.greaterThan = exports.lessThan = void 0;
exports.create = create;
exports.guard = guard;
exports.render = render;
exports.clean = clean;
function create(tag, props, options = {}) {
    const { children, ...rest } = props;
    let propString = "";
    for (const [key, value] of Object.entries(rest)) {
        propString += `\n  ${key}={${JSON.stringify(value)}}`;
    }
    let indentedChildren = render(children).replace(/^/gm, "  ");
    if (options.inline) {
        propString += `\n  children={${JSON.stringify(children)}}`;
        indentedChildren = "";
    }
    propString += propString ? "\n" : "";
    indentedChildren += indentedChildren ? "\n" : "";
    return `<${tag}${propString}>\n${indentedChildren}</${tag}>`;
}
function guard(value, cb) {
    if (!!value || value === 0) {
        const children = cb(value);
        return render(children);
    }
    return "";
}
function render(children) {
    if (Array.isArray(children)) {
        const filteredChildren = children.filter((c) => c !== undefined);
        return filteredChildren
            .map((i) => (Array.isArray(i) ? i.join("") : i))
            .join("");
    }
    return children !== null && children !== void 0 ? children : "";
}
// Regex to selectively URL-encode '>' and '<' chars
exports.lessThan = /<=?(?!(=|button|\s?\/button|code|\s?\/code|details|\s?\/details|summary|\s?\/summary|hr|\s?\/hr|br|\s?\/br|span|\s?\/span|strong|\s?\/strong|small|\s?\/small|table|\s?\/table|thead|\s?\/thead|tbody|\s?\/tbody|td|\s?\/td|tr|\s?\/tr|th|\s?\/th|h1|\s?\/h1|h2|\s?\/h2|h3|\s?\/h3|h4|\s?\/h4|h5|\s?\/h5|h6|\s?\/h6|title|\s?\/title|p|\s?\/p|em|\s?\/em|b|\s?\/b|i|\s?\/i|u|\s?\/u|strike|\s?\/strike|bold|\s?\/bold|a|\s?\/a|table|\s?\/table|li|\s?\/li|ol|\s?\/ol|ul|\s?\/ul|img|\s?\/img|svg|\s?\/svg|div|\s?\/div|center|\s?\/center))/gu;
exports.greaterThan = /(?<!(button|code|details|summary|hr|br|span|strong|small|table|thead|tbody|td|tr|th|h1|h2|h3|h4|h5|h6|title|p|em|b|i|u|strike|bold|a|li|ol|ul|img|svg|div|center|\/|\s|"|'))>/gu;
exports.codeFence = /`{1,3}[\s\S]*?`{1,3}/g;
exports.curlyBrackets = /([{}])/g;
exports.codeBlock = /(^```.*[\s\S]*?```$|`[^`].+?`)/gm;
function clean(value) {
    if (!value) {
        return "";
    }
    let sections = value.split(exports.codeBlock);
    for (let sectionIndex in sections) {
        if (!sections[sectionIndex].startsWith("`")) {
            sections[sectionIndex] = sections[sectionIndex]
                .replace(exports.lessThan, "&lt;")
                .replace(exports.greaterThan, "&gt;")
                .replace(exports.codeFence, function (match) {
                return match.replace(/\\>/g, ">");
            })
                .replace(exports.curlyBrackets, "\\$1");
        }
    }
    return sections.join("");
}
