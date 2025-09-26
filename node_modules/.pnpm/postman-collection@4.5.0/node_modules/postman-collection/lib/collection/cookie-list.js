var _ = require('../util').lodash,
    PropertyList = require('./property-list').PropertyList,
    Cookie = require('./cookie').Cookie,

    CookieList;

_.inherit((

    /**
     * Contains a list of header elements
     *
     * @constructor
     * @param {Object} parent -
     * @param {Object[]} cookies -
     * @extends {PropertyList}
     */
    CookieList = function (parent, cookies) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        CookieList.super_.call(this, Cookie, parent, cookies);
    }), PropertyList);

// _.assign(CookieList.prototype, /** @lends CookieList.prototype */ {
// });

_.assign(CookieList, /** @lends CookieList */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'CookieList',

    /**
     * Checks if the given object is a CookieList
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isCookieList: function (obj) {
        return Boolean(obj) && ((obj instanceof CookieList) ||
          _.inSuperChain(obj.constructor, '_postman_propertyName', CookieList._postman_propertyName));
    }
});

module.exports = {
    CookieList
};
