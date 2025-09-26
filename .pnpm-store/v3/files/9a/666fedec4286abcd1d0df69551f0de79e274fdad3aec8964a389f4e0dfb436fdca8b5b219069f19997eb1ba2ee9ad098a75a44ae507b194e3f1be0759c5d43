"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (function (ins) {
    var options = ins.options, items = ins.items, extensions = ins.extensions;
    var feed = {
        version: "https://jsonfeed.org/version/1",
        title: options.title,
    };
    if (options.link) {
        feed.home_page_url = options.link;
    }
    if (options.feedLinks && options.feedLinks.json) {
        feed.feed_url = options.feedLinks.json;
    }
    if (options.description) {
        feed.description = options.description;
    }
    if (options.image) {
        feed.icon = options.image;
    }
    if (options.author) {
        feed.author = {};
        if (options.author.name) {
            feed.author.name = options.author.name;
        }
        if (options.author.link) {
            feed.author.url = options.author.link;
        }
    }
    extensions.map(function (e) {
        feed[e.name] = e.objects;
    });
    feed.items = items.map(function (item) {
        var feedItem = {
            id: item.id,
            content_html: item.content,
        };
        if (item.link) {
            feedItem.url = item.link;
        }
        if (item.title) {
            feedItem.title = item.title;
        }
        if (item.description) {
            feedItem.summary = item.description;
        }
        if (item.image) {
            feedItem.image = item.image;
        }
        if (item.date) {
            feedItem.date_modified = item.date.toISOString();
        }
        if (item.published) {
            feedItem.date_published = item.published.toISOString();
        }
        if (item.author) {
            var author = item.author;
            if (author instanceof Array) {
                author = author[0];
            }
            feedItem.author = {};
            if (author.name) {
                feedItem.author.name = author.name;
            }
            if (author.link) {
                feedItem.author.url = author.link;
            }
        }
        if (Array.isArray(item.category)) {
            feedItem.tags = [];
            item.category.map(function (category) {
                if (category.name) {
                    feedItem.tags.push(category.name);
                }
            });
        }
        if (item.extensions) {
            item.extensions.map(function (e) {
                feedItem[e.name] = e.objects;
            });
        }
        return feedItem;
    });
    return JSON.stringify(feed, null, 4);
});
//# sourceMappingURL=json.js.map