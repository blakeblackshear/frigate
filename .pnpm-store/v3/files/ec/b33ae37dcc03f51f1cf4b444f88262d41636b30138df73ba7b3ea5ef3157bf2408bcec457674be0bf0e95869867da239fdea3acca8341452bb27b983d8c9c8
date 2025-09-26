var _ = require('../util').lodash,
    PropertyList = require('./property-list').PropertyList,
    Url = require('./url').Url,
    Certificate = require('./certificate').Certificate,

    CertificateList;

_.inherit((

    /**
     * @constructor
     * @extends {PropertyList}
     *
     * @param {Object} parent -
     * @param {Array} list - The list of certificate representations
     *
     * @example <caption>Create a new CertificateList</caption>
     * var CertificateList = require('postman-collection').CertificateList,
     *    certificateList = new CertificateList({}, [
     *        {
     *            name: 'my certificate for example.com',
     *            matches: ['https://example.com/*'],
     *            key: { src: '/path/to/key/file' },
     *            cert: { src: '/path/to/certificate/file' }
     *        },
     *        {
     *            name: 'my certificate for example2.com',
     *            matches: ['https://example2.com/*'],
     *            key: { src: '/path/to/key/file' },
     *            cert: { src: '/path/to/key/file' }
     *        }
     * ]);
     */
    CertificateList = function (parent, list) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        CertificateList.super_.call(this, Certificate, parent, list);
    }), PropertyList);

_.assign(CertificateList.prototype, /** @lends CertificateList.prototype */ {
    /**
     * Matches the given url against the member certificates' allowed matches
     * and returns the certificate that can be used for the url.
     *
     * @param {String} url The url to find the certificate for
     * @returns {Certificate.definition=} The matched certificate
     */
    resolveOne (url) {
        // url must be either string or an instance of url.
        if (!_.isString(url) && !Url.isUrl(url)) {
            return;
        }

        // find a certificate that can be applied to the url
        return this.find(function (certificate) {
            return certificate.canApplyTo(url);
        });
    }
});

_.assign(CertificateList, /** @lends CertificateList */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'CertificateList',

    /**
     * Checks if the given object is a CertificateList
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isCertificateList: function (obj) {
        return Boolean(obj) && ((obj instanceof CertificateList) ||
          _.inSuperChain(obj.constructor, '_postman_propertyName', CertificateList._postman_propertyName));
    }
});

module.exports = {
    CertificateList
};
