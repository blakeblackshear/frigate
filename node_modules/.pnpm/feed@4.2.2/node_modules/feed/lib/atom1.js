"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var convert = require("xml-js");
var config_1 = require("./config");
var utils_1 = require("./utils");
exports.default = (function (ins) {
    var options = ins.options;
    var base = {
        _declaration: { _attributes: { version: "1.0", encoding: "utf-8" } },
        feed: {
            _attributes: { xmlns: "http://www.w3.org/2005/Atom" },
            id: options.id,
            title: options.title,
            updated: options.updated ? options.updated.toISOString() : new Date().toISOString(),
            generator: utils_1.sanitize(options.generator || config_1.generator)
        }
    };
    if (options.author) {
        base.feed.author = formatAuthor(options.author);
    }
    base.feed.link = [];
    if (options.link) {
        base.feed.link.push({ _attributes: { rel: "alternate", href: utils_1.sanitize(options.link) } });
    }
    var atomLink = utils_1.sanitize(options.feed || (options.feedLinks && options.feedLinks.atom));
    if (atomLink) {
        base.feed.link.push({ _attributes: { rel: "self", href: utils_1.sanitize(atomLink) } });
    }
    if (options.hub) {
        base.feed.link.push({ _attributes: { rel: "hub", href: utils_1.sanitize(options.hub) } });
    }
    if (options.description) {
        base.feed.subtitle = options.description;
    }
    if (options.image) {
        base.feed.logo = options.image;
    }
    if (options.favicon) {
        base.feed.icon = options.favicon;
    }
    if (options.copyright) {
        base.feed.rights = options.copyright;
    }
    base.feed.category = [];
    ins.categories.map(function (category) {
        base.feed.category.push({ _attributes: { term: category } });
    });
    base.feed.contributor = [];
    ins.contributors.map(function (contributor) {
        base.feed.contributor.push(formatAuthor(contributor));
    });
    base.feed.entry = [];
    ins.items.map(function (item) {
        var entry = {
            title: { _attributes: { type: "html" }, _cdata: item.title },
            id: utils_1.sanitize(item.id || item.link),
            link: [{ _attributes: { href: utils_1.sanitize(item.link) } }],
            updated: item.date.toISOString()
        };
        if (item.description) {
            entry.summary = {
                _attributes: { type: "html" },
                _cdata: item.description,
            };
        }
        if (item.content) {
            entry.content = {
                _attributes: { type: "html" },
                _cdata: item.content,
            };
        }
        if (Array.isArray(item.author)) {
            entry.author = [];
            item.author.map(function (author) {
                entry.author.push(formatAuthor(author));
            });
        }
        if (Array.isArray(item.category)) {
            entry.category = [];
            item.category.map(function (category) {
                entry.category.push(formatCategory(category));
            });
        }
        if (item.contributor && Array.isArray(item.contributor)) {
            entry.contributor = [];
            item.contributor.map(function (contributor) {
                entry.contributor.push(formatAuthor(contributor));
            });
        }
        if (item.published) {
            entry.published = item.published.toISOString();
        }
        if (item.copyright) {
            entry.rights = item.copyright;
        }
        base.feed.entry.push(entry);
    });
    return convert.js2xml(base, { compact: true, ignoreComment: true, spaces: 4 });
});
var formatAuthor = function (author) {
    var name = author.name, email = author.email, link = author.link;
    var out = { name: name };
    if (email) {
        out.email = email;
    }
    if (link) {
        out.uri = utils_1.sanitize(link);
    }
    return out;
};
var formatCategory = function (category) {
    var name = category.name, scheme = category.scheme, term = category.term;
    return {
        _attributes: {
            label: name,
            scheme: scheme,
            term: term,
        },
    };
};
//# sourceMappingURL=atom1.js.map