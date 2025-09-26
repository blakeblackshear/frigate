var _ = require('../util').lodash,
    PropertyList = require('./property-list').PropertyList,
    Header = require('./header').Header,

    PROP_NAME = '_postman_propertyName',

    HeaderList;

_.inherit((

    /**
    * Contains a list of header elements
    *
    * @constructor
    * @param {Object} parent -
    * @param {Header[]} headers -
    * @extends {PropertyList}
    */
    HeaderList = function (parent, headers) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        HeaderList.super_.call(this, Header, parent, headers);
    }), PropertyList);

_.assign(HeaderList.prototype, /** @lends HeaderList.prototype */ {
    /**
     * Gets size of a list of headers excluding standard header prefix.
     *
     * @returns {Number}
     */
    contentSize () {
        if (!this.count()) { return 0; }

        return Header.unparse(this).length;
    }
});

_.assign(HeaderList, /** @lends HeaderList */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'HeaderList',

    /**
     * Checks if the given object is a HeaderList
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isHeaderList: function (obj) {
        return Boolean(obj) && ((obj instanceof HeaderList) ||
          _.inSuperChain(obj.constructor, PROP_NAME, HeaderList._postman_propertyName));
    }
});

module.exports = {
    HeaderList
};
