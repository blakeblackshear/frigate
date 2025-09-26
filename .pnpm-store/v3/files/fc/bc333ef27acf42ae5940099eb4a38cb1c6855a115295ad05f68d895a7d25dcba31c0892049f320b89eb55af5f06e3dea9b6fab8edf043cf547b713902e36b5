"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetSubscribers = exports.removeSubscriber = exports.addSubscriber = exports.hasSubscribers = exports.getSubscribers = void 0;
var subscribers = {};
var EMPTY_LIST = [];
var getSubscribers = function (url) {
    if ((0, exports.hasSubscribers)(url)) {
        return Array.from(subscribers[url]);
    }
    return EMPTY_LIST;
};
exports.getSubscribers = getSubscribers;
var hasSubscribers = function (url) {
    var _a;
    return ((_a = subscribers[url]) === null || _a === void 0 ? void 0 : _a.size) > 0;
};
exports.hasSubscribers = hasSubscribers;
var addSubscriber = function (url, subscriber) {
    subscribers[url] = subscribers[url] || new Set();
    subscribers[url].add(subscriber);
};
exports.addSubscriber = addSubscriber;
var removeSubscriber = function (url, subscriber) {
    subscribers[url].delete(subscriber);
};
exports.removeSubscriber = removeSubscriber;
var resetSubscribers = function (url) {
    if (url && subscribers.hasOwnProperty(url)) {
        delete subscribers[url];
    }
    else {
        for (var url_1 in subscribers) {
            if (subscribers.hasOwnProperty(url_1)) {
                delete subscribers[url_1];
            }
        }
    }
};
exports.resetSubscribers = resetSubscribers;
//# sourceMappingURL=manage-subscribers.js.map