"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Feed = void 0;
var atom1_1 = require("./atom1");
var json_1 = require("./json");
var rss2_1 = require("./rss2");
var Feed = (function () {
    function Feed(options) {
        var _this = this;
        this.items = [];
        this.categories = [];
        this.contributors = [];
        this.extensions = [];
        this.addItem = function (item) { return _this.items.push(item); };
        this.addCategory = function (category) { return _this.categories.push(category); };
        this.addContributor = function (contributor) { return _this.contributors.push(contributor); };
        this.addExtension = function (extension) { return _this.extensions.push(extension); };
        this.atom1 = function () { return atom1_1.default(_this); };
        this.rss2 = function () { return rss2_1.default(_this); };
        this.json1 = function () { return json_1.default(_this); };
        this.options = options;
    }
    return Feed;
}());
exports.Feed = Feed;
//# sourceMappingURL=feed.js.map