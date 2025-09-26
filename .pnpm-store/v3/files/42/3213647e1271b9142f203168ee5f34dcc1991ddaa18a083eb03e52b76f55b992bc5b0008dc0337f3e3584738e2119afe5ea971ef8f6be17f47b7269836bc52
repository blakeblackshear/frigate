// Type definitions for postman-collection 4.3.0
// Project: https://github.com/postmanlabs/postman-collection
// Definitions by: PostmanLabs
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.4
/// <reference types="node" />

declare module "postman-collection" {

    /**
     * @example
     * Create a new CertificateList
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
     * @param parent - -
     * @param list - The list of certificate representations
     */
    export class CertificateList extends PropertyList {
        constructor(parent: any, list: any[]);
        /**
         * Matches the given url against the member certificates' allowed matches
         * and returns the certificate that can be used for the url.
         * @param url - The url to find the certificate for
         * @returns The matched certificate
         */
        resolveOne(url: string): Certificate.definition;
        /**
         * Checks if the given object is a CertificateList
         * @param obj - -
         */
        static isCertificateList(obj: any): boolean;
    }

    export namespace Certificate {
        /**
         * The following is the object representation accepted as param for the Certificate constructor.
         * Also the type of the object returned when Property.toJSON or Property.toObjectResolved is called on a
         * Certificate instance.
         * @example
         * JSON definition of an example certificate object
         * {
         *     "name": "My certificate for example.com",
         *     "matches": ["https://example.com/*"],
         *     "key": { "src": "/path/to/key" },
         *     "cert": { "src": "/User/path/to/certificate" },
         *     "passphrase": "iampassphrase"
         * }
         * @property [name] - A name for the certificate
         * @property [matches] - A list of match patterns
         * @property [key] - Object with path on the file system for private key file, as src
         * @property [cert] - Object with path on the file system for certificate file, as src
         * @property [passphrase] - The passphrase for the certificate key
         */
        type definition = {
            name?: string;
            matches?: any[];
            key?: any;
            cert?: any;
            passphrase?: string;
        };
    }

    /**
     * A Certificate definition that represents the ssl certificate
     * to be used for an url.
     * Properties can then use the `.toObjectResolved` function to procure an object representation of the property with
     * all the variable references replaced by corresponding values.
     * @example
     *  Create a new Certificate
     *
     * var Certificate = require('postman-collection').Certificate,
     *    certificate = new Certificate({
     *     name: 'Certificate for example.com',
     *     matches: ['example.com'],
     *     key: { src: '/User/path/to/certificate/key' },
     *     cert: { src: '/User/path/to/certificate' },
     *     passphrase: 'iampassphrase'
     * });
     * @param [options] - Object with matches, key, cert and passphrase
     */
    export class Certificate extends Property {
        constructor(options?: Certificate.definition);
        /**
         * Updates the certificate with the given properties.
         * @param [options] - Object with matches, key, cert and passphrase
         */
        update(options?: Certificate.definition): void;
        /**
         * Unique identifier
         */
        id: string;
        /**
         * Name for user reference
         */
        name: string;
        /**
         * List of match pattern
         */
        matches: UrlMatchPatternList;
        /**
         * Private Key
         */
        key: any;
        /**
         * Certificate
         */
        cert: any;
        /**
         * PFX or PKCS12 Certificate
         */
        pfx: any;
        /**
         * passphrase
         */
        passphrase: any;
        /**
         * Checks if the certificate can be applied to a given url
         * @param url - The url string for which the certificate is checked for match.
         */
        canApplyTo(url: string | Url): void;
        /**
         * Allows the serialization of a Certificate
         *
         * This is overridden, in order to ensure that certificate contents are not accidentally serialized,
         * which can be a security risk.
         */
        toJSON(): void;
        /**
         * Checks if the given object is a Certificate
         * @param obj - -
         */
        static isCertificate(obj: any): boolean;
    }

    export namespace Collection {
        /**
         * The following is the object structure accepted as constructor parameter while calling `new Collection(...)`. It is
         * also the structure exported when Property.toJSON or Property.toObjectResolved is called on a
         * collection instance.
         * @example
         * JSON definition of an example collection
         * {
         *     "info": {
         *         "name": "My Postman Collection",
         *         "version": "1.0.0"
         *     }
         *     "item": [{
         *         "request": "{{base-url}}/get"
         *     }],
         *     "variables": [{
         *         "id": "base-url",
         *         "value": "https://postman-echo.com"
         *     }]
         * }
         * @property [info] - The meta information regarding the collection is provided as the `info` object.
         * @property [info.id] - Every collection is identified by the unique value of this property. It is recommended
         * that you maintain the same id since changing the id usually implies that is a different collection than it was
         * originally.
         * @property [info.name] - A collection's friendly name is defined by this property. You would want to set this
         * field to a value that would allow you to easily identify this collection among a bunch of other collections.
         * @property [info.version] - Postman allows you to version your collections as they grow, and this field holds
         * the version number. While optional, it is recommended that you use this field to its fullest extent.
         * @property [item] - Items are the basic unit for a Postman collection.
         * You can think of them as corresponding to a single API endpoint. Each Item has one request and may have multiple API
         * responses associated with it.
         * @property [variable] - Collection variables allow you to define a set of variables,
         * that are a *part of the collection*, as opposed to environments, which are separate entities.
         * @property [auth] - Collection auth allows you to define an authentication,
         * that *applies to all items* in the collection.
         * @property [event] - Postman allows you to configure scripts to run when specific events
         * occur.
         * @property [version] - Version of the collection expressed in [semver](http://semver.org/)
         * format.
         */
        type definition = {
            info?: {
                id?: string;
                name?: string;
                version?: string;
            };
            item?: (Item.definition | ItemGroup.definition)[];
            variable?: Variable.definition;
            auth?: RequestAuth.definition;
            event?: Event.definition[];
            version?: string | Version.definition;
        };
    }

    /**
     * Create or load an instance of [Postman Collection](https://www.getpostman.com/docs/collections) as a JavaScript
     * object that can be manipulated easily.
     *
     * A collection lets you group individual requests together. These requests can be further organized into folders to
     * accurately mirror your API. Requests can also store sample responses when saved in a collection. You can add
     * metadata like name and description too so that all the information that a developer needs to use your API is
     * available easily.
     * @example
     * Load a Collection JSON file from disk
     * var fs = require('fs'), // needed to read JSON file from disk
     *     pretty = function (obj) { // function to neatly log the collection object to console
     *         return require('util').inspect(obj, {colors: true});
     *     },
     *     Collection = require('postman-collection').Collection,
     *     myCollection;
     *
     * // Load a collection to memory from a JSON file on disk (say, sample-collection.json)
     * myCollection = new Collection(JSON.stringify(fs.readFileSync('sample-collection.json').toString()));
     *
     * // log items at root level of the collection
     * console.log(pretty(myCollection));
     * @example
     * Create a blank collection and write to file
     * var fs = require('fs'),
     *     Collection = require('postman-collection').Collection,
     *     mycollection;
     *
     * myCollection = new Collection({
     *     info: {
     *         name: "my Collection"
     *     }
     * });
     *
     * // log the collection to console to see its contents
     * fs.writeFileSync('myCollection.postman_collection', JSON.stringify(myCollection, null, 2));
     * @param [definition] - Pass the initial definition of the collection (name, id, etc) as
     * the `definition` parameter. The definition object is structured exactly as the collection format as defined in
     * [https://www.schema.getpostman.com/](https://www.schema.getpostman.com/). This parameter is optional. That
     * implies that you can create an empty instance of collection and add requests and other properties in order to
     * build a new collection.
     * @param [environments] - The collection instance constructor accepts the second parameter as an
     * array of environment objects. Environments objects store variable definitions that are inherited by
     * Collection.variables. These environment variables are usually the ones that are exported from the Postman
     * App to use them with different collections. Refer to Postman
     * [documentation on environment variables](https://www.getpostman.com/docs/environments).
     */
    export class Collection extends ItemGroup {
        constructor(definition?: Collection.definition, environments?: object[]);
        /**
         * The `variables` property holds a list of variables that are associated with a Collection. These variables
         * are stored within a collection so that they can be re-used and replaced in rest of the collection. For
         * example, if one has a variable named `port` with value `8080`, then one can write a request Url
         * as `http://localhost:{{port}}/my/endpoint` and that will be replaced to form
         * `http://localhost:8080/my/endpoint`. **Collection Variables** are like
         * [environment variables](https://www.getpostman.com/docs/environments), but stored locally within a
         * collection.
         * @example
         * Creating a collection with variables
         * var fs = require('fs'),
         *     Collection = require('postman-collection').Collection,
         *     mycollection;
         *
         * // Create a new empty collection.
         * myCollection = new Collection();
         *
         * // Add a variable to the collection
         * myCollection.variables.add({
         *     id: 'apiBaseUrl',
         *     value: 'http://timeapi.org',
         *     type: 'string'
         * });
         *
         * //Add a request that uses the variable that we just added.
         * myCollection.items.add({
         *     id: 'utc-time-now',
         *     name: 'Get the current time in UTC',
         *     request: '{{apiBaseUrl}}/utc/now'
         * });
         */
        variables: VariableList;
        /**
         * The `version` key in collection is used to express the version of the collection. It is useful in either
         * tracking development iteration of an API server or the version of an API itself. It can also be used to
         * represent the number of iterations of the collection as it is updated through its lifetime.
         *
         * Version is expressed in [semver](http://semver.org/) format.
         */
        version: Version;
        /**
         * Using this function, one can sync the values of collection variables from a reference object.
         * @param obj - -
         * @param [track] - -
         */
        syncVariablesFrom(obj: any, track?: boolean): any;
        /**
         * Transfer the variables in this scope to an object
         * @param [obj] - -
         */
        syncVariablesTo(obj?: any): any;
        /**
         * Convert the collection to JSON compatible plain object
         */
        toJSON(): any;
        /**
         * Check whether an object is an instance of ItemGroup.
         * @param obj - -
         */
        static isCollection(obj: any): boolean;
        /**
         * In this list, one can define the Scripts to be executed when an event is triggered. Events are
         * triggered before certain actions are taken on a Collection, Request, etc. For example, executing a
         * request causes the `prerequest` and the `test` events to be triggered.
         * @example
         * Executing a common test script for all requests in a collection
         * var fs = require('fs'), // needed to read JSON file from disk
         *     Collection = require('postman-collection').Collection,
         *     myCollection;
         *
         * // Load a collection to memory from a JSON file on disk (say, sample-collection.json)
         * myCollection = new Collection(JSON.stringify(fs.readFileSync('sample-collection.json').toString()));
         *
         * // Add an event listener to the collection that listens to the `test` event.
         * myCollection.events.add({
         *     listen: 'test',
         *     script: {
         *         exec: 'tests["Status code is 200"] = (responseCode.code === 200)'
         *     }
         * });
         */
        events: EventList;
    }

    /**
     * Contains a list of header elements
     * @param parent - -
     * @param cookies - -
     */
    export class CookieList extends PropertyList {
        constructor(parent: any, cookies: object[]);
        /**
         * Checks if the given object is a CookieList
         * @param obj - -
         */
        static isCookieList(obj: any): boolean;
    }

    export namespace Cookie {
        /**
         * The following is the object structure accepted as constructor parameter while calling `new Cookie(...)`. It is
         * also the structure exported when Property.toJSON or Property.toObjectResolved is called on a
         * Cookie instance.
         * @example
         * JSON definition of an example cookie
         * {
         *     "key": "my-cookie-name",
         *     "expires": "1464769543832",
         *      // UNIX timestamp, in *milliseconds*
         *     "maxAge": "300",
         *      // In seconds. In this case, the Cookie is valid for 5 minutes
         *     "domain": "something.example.com",
         *     "path": "/",
         *     "secure": false,
         *     "httpOnly": true,
         *     "session": false,
         *     "value": "my-cookie-value",
         *     "extensions": [{
         *         "key": "Priority",
         *         "value": "HIGH"
         *     }]
         * }
         * @property [key] - The name of the cookie. Some call it the "name".
         * @property [value] - The value stored in the Cookie
         * @property [expires] - Expires sets an expiry date for when a cookie gets deleted. It should either be a
         * date object or timestamp string of date.
         * @property [maxAge] - Max-age sets the time in seconds for when a cookie will be deleted.
         * @property [domain] - Indicates the domain(s) for which the cookie should be sent.
         * @property [path] - Limits the scope of the cookie to a specified path, e.g: "/accounts"
         * @property [secure] - A secure cookie will only be sent to the server when a request is made using SSL and
         * the HTTPS protocol.
         * The idea that the contents of the cookie are of high value and could be potentially damaging to transmit
         * as clear text.
         * @property [httpOnly] - The idea behind HTTP-only cookies is to instruct a browser that a cookie should never
         * be accessible via JavaScript through the document.cookie property. This feature was designed as a security measure
         * to help prevent cross-site scripting (XSS) attacks perpetrated by stealing cookies via JavaScript.
         * @property [hostOnly] - Indicates that this cookie is only valid for the given domain (and not its parent or
         * child domains.)
         * @property [session] - Indicates whether this is a Session Cookie. (A transient cookie, which is deleted at
         * the end of an HTTP session.)
         * @property [extensions] - Any extra attributes that are extensions to the original Cookie specification can be
         * specified here.
         * @property [extensions[].key] - Name of the extension.
         * @property [extensions[].value] - Value of the extension
         */
        type definition = {
            key?: string;
            value?: string;
            expires?: string;
            maxAge?: number;
            domain?: string;
            path?: string;
            secure?: boolean;
            httpOnly?: boolean;
            hostOnly?: boolean;
            session?: boolean;
            extensions?: {
                key?: string;
                value?: string;
            };
        };
    }

    /**
     * A Postman Cookie definition that comprehensively represents an HTTP Cookie.
     * @example
     * Create a new Cookie
     * var Cookie = require('postman-collection').Cookie,
     *     myCookie = new Cookie({
     *          name: 'my-cookie-name',
     *          expires: '1464769543832', // UNIX timestamp, in *milliseconds*
     *          maxAge: '300',  // In seconds. In this case, the Cookie is valid for 5 minutes
     *          domain: 'something.example.com',
     *          path: '/',
     *          secure: false,
     *          httpOnly: true,
     *          session: false,
     *          value: 'my-cookie-value',
     *          extensions: [{
     *              key: 'Priority',
     *              value: 'HIGH'
     *          }]
     *     });
     * @example
     * Parse a Cookie Header
     * var Cookie = require('postman-collection').Cookie,
     *     rawHeader = 'myCookie=myValue;Path=/;Expires=Sun, 04-Feb-2018 14:18:27 GMT;Secure;HttpOnly;Priority=HIGH'
     *     myCookie = new Cookie(rawHeader);
     *
     * console.log(myCookie.toJSON());
     * @param [options] - Pass the initial definition of the Cookie.
     */
    export class Cookie extends PropertyBase {
        constructor(options?: Cookie.definition);
        /**
         * The name of the cookie.
         */
        name: string;
        /**
         * Expires sets an expiry date for when a cookie gets deleted. It should either be a date object or
         * timestamp string of date.
         */
        expires: Date | string;
        /**
         * Max-age sets the time in seconds for when a cookie will be deleted.
         */
        maxAge: number;
        /**
         * Indicates the domain(s) for which the cookie should be sent.
         */
        domain: string;
        path: string;
        /**
         * A secure cookie will only be sent to the server when a request is made using SSL and the HTTPS protocol.
         * The idea that the contents of the cookie are of high value and could be potentially damaging to transmit
         * as clear text.
         */
        secure: boolean;
        /**
         * The idea behind HTTP-only cookies is to instruct a browser that a cookie should never be accessible via
         * JavaScript through the document.cookie property. This feature was designed as a security measure to help
         * prevent cross-site scripting (XSS) attacks perpetrated by stealing cookies via JavaScript.
         */
        httpOnly: boolean;
        hostOnly: boolean;
        /**
         * Indicates whether this is a Session Cookie.
         */
        session: boolean;
        value: string;
        /**
         * Any extra parameters that are not strictly a part of the Cookie spec go here.
         */
        extensions: any[];
        /**
         * Get the value of this cookie.
         */
        valueOf(): string;
        /**
         * Converts the Cookie to a single Set-Cookie header string.
         */
        toString(): string;
        /**
         * Check whether an object is an instance of PostmanCookie.
         * @param obj - -
         */
        static isCookie(obj: any): boolean;
        /**
         * Stringifies an Array or PropertyList of Cookies into a single string.
         * @param cookies - List of cookie definition object
         */
        static unparse(cookies: Cookie[]): string;
        /**
         * Unparses a single Cookie.
         * @param cookie - Cookie definition object
         */
        static unparseSingle(cookie: Cookie): string;
        /**
         * Cookie header parser
         * @param str - -
         * @returns A plain cookie options object, use it to create a new Cookie
         */
        static parse(str: string): any;
        /**
         * Converts the Cookie to a single Set-Cookie header string.
         * @param cookie - Cookie definition object
         */
        static stringify(cookie: Cookie): string;
    }

    export namespace Description {
        type definition = {
            content: string;
            type: string;
        };
    }

    /**
     * This is one of the properties that are (if provided) processed by all other properties. Any property can have an
     * instance of `Description` property assigned to it with the key name `description` and it should be treated as
     * something that "describes" the property within which it belongs. Usually this property is used to generate
     * documentation and other contextual information for a property in a Collection.
     * @example
     * Add a description to an instance of Collection
     *  var SDK = require('postman-collection'),
     *     Collection = SDK.Collection,
     *     Description = SDK.Description,
     *     mycollection;
     *
     * // create a blank collection
     * myCollection = new Collection();
     * myCollection.description = new Description({
     *     content: '&lt;h1&gt;Hello World&lt;/h1&gt;&lt;p&gt;I am a Collection&lt;/p&gt;',
     *     type: 'text/html'
     * });
     *
     * // alternatively, you could also use the `.describe` method of any property to set or update the description of the
     * // property.
     * myCollection.describe('Hey! This is a cool collection.');
     * @param [definition] - The content of the description can be passed as a string when it
     * is in `text/plain` format or otherwise be sent as part of an object adhering to the Description.definition
     * structure having `content` and `type`.
     */
    export class Description {
        constructor(definition?: Description.definition | string);
        /**
         * Updates the content of this description property.
         * @param content - -
         * @param [type] - -
         */
        update(content: string | Description.definition, type?: string): void;
        /**
         * The raw content of the description
         */
        content: string;
        /**
         * The mime-type of the description.
         */
        type: string;
        /**
         * Returns stringified Description.
         */
        toString(): string;
        /**
         * Creates a JSON representation of the Description (as a plain Javascript object).
         */
        toJSON(): any;
        /**
         * Checks whether a property is an instance of Description object.
         * @param obj - -
         */
        static isDescription(obj: any): boolean;
    }

    /**
     * A type of PropertyList, EventList handles resolving events from parents. If an ItemGroup contains
     * a set of events, each Item in that group will inherit those events from its parent, and so on.
     * @param parent - -
     * @param populate - -
     */
    export class EventList extends PropertyList {
        constructor(parent: any, populate: object[]);
        /**
         * Returns an array of listeners filtered by the listener name
         * @param name - -
         */
        listeners(name: string): Event[];
        /**
         * Returns all events with specific listeners only within this list. Refer to EventList.listeners for
         * procuring all inherited events
         * @param name - -
         */
        listenersOwn(name: string): Event[];
        /**
         * Checks if the given object is an EventList.
         * @param obj - -
         */
        static isEventList(obj: any): boolean;
    }

    export namespace Event {
        /**
         * @example
         * Constructing an event
         * var Event = require('postman-collection').Event,
         *     rawEvent = {
         *         listen: 'test',
         *         script: 'tests["response code is 401"] = responseCode.code === 401'
         *     },
         *     myEvent;
         * myEvent = new Event(rawEvent);
         * @property listen - The event-name that this script will be called for. Usually either "test" or "prerequest"
         * @property script - A Script instance that will be executed on this event. In case of a
         * string, a new Script is created.
         */
        type definition = {
            listen: string;
            script: Script | string;
        };
    }

    /**
     * A Postman event definition that refers to an event to be listened to and a script reference or definition to be
     * executed.
     * @param definition - Pass the initial definition of the event as the options parameter.
     */
    export class Event extends Property {
        constructor(definition: Event.definition);
        /**
         * Update an event.
         * @param definition - -
         */
        update(definition: Event.definition): void;
        /**
         * Name of the event that this instance is intended to listen to.
         */
        listen: string;
        /**
         * The script that is to be executed when this event is triggered.
         */
        script: Script;
    }

    export namespace FormParam {
        /**
         * @property key - The name ("key") of the form data parameter.
         * @property value - The value of the parameter.
         */
        type definition = {
            key: string;
            value: string;
        };
    }

    /**
     * Represents a Form Data parameter, which can exist in request body.
     * @param options - Pass the initial definition of the form data parameter.
     */
    export class FormParam {
        constructor(options: FormParam.definition);
        /**
         * Converts the FormParameter to a single param string.
         */
        toString(): string;
        /**
         * Returns the value of the form parameter (if any).
         */
        valueOf(): any | string;
        /**
         * Convert the form-param to JSON compatible plain object.
         */
        toJSON(): any;
        /**
         * Declare the list index key, so that property lists of form parameters work correctly
         */
        static _postman_propertyIndexKey: string;
        /**
         * Form params can have multiple values, so set this to true.
         */
        static _postman_propertyAllowsMultipleValues: boolean;
        /**
         * Parse a form data string into an array of objects, where each object contains a key and a value.
         */
        static parse: any;
    }

    /**
     * Contains a list of header elements
     * @param parent - -
     * @param headers - -
     */
    export class HeaderList extends PropertyList {
        constructor(parent: any, headers: Header[]);
        /**
         * Gets size of a list of headers excluding standard header prefix.
         */
        contentSize(): number;
        /**
         * Checks if the given object is a HeaderList
         * @param obj - -
         */
        static isHeaderList(obj: any): boolean;
    }

    export namespace Header {
        /**
         * @example
         * Create a header
         * var Header = require('postman-collection').Header,
         *     header = new Header({
         *         key: 'Content-Type',
         *         value: 'application/xml'
         *     });
         *
         * console.log(header.toString()) // prints the string representation of the Header.
         * @property key - The Header name (e.g: 'Content-Type')
         * @property value - The value of the header.
         */
        type definition = {
            key: string;
            value: string;
        };
    }

    /**
     * Represents an HTTP header, for requests or for responses.
     * @example
     * Parse a string of headers into an array of Header objects
     * var Header = require('postman-collection').Header,
     *     headerString = 'Content-Type: application/json\nUser-Agent: MyClientLibrary/2.0\n';
     *
     * var rawHeaders = Header.parse(headerString);
     * console.log(rawHeaders); // [{ 'Content-Type': 'application/json', 'User-Agent': 'MyClientLibrary/2.0' }]
     *
     * var headers = rawHeaders.map(function (h) {
     *     return new Header(h);
     * });
     *
     * function assert(condition, message) {
     *       if (!condition) {
     *           message = message || "Assertion failed";
     *           if (typeof Error !== "undefined") {
     *               throw new Error(message);
     *           }
     *           throw message; //fallback
     *       }
     *       else {
     *           console.log("Assertion passed");
     *       }
     *   }
     *
     * assert(headerString.trim() === Header.unparse(headers).trim());
     * @param options - Pass the header definition as an object or the value of the header.
     * If the value is passed as a string, it should either be in `name:value` format or the second "name" parameter
     * should be used to pass the name as string
     * @param [name] - optional override the header name or use when the first parameter is the header value as
     * string.
     */
    export class Header extends Property {
        constructor(options: Header.definition | string, name?: string);
        /**
         * Converts the header to a single header string.
         */
        toString(): string;
        /**
         * Return the value of this header.
         */
        valueOf(): string;
        /**
         * Assigns the given properties to the Header
         * @param options - -
         */
        update(options: any): void;
        /**
         * The header Key
         */
        key: string;
        /**
         * The header value
         */
        value: string;
        /**
         * Parses a multi line header string into an array of Header.definition.
         * @param headerString - -
         */
        static parse(headerString: string): any[];
        /**
         * Parses a single Header.
         * @param header - -
         */
        static parseSingle(header: string): any;
        /**
         * Stringifies an Array or PropertyList of Headers into a single string.
         * @param headers - -
         * @param [separator = '\r\n'] - Specify a string for separating each header
         */
        static unparse(headers: any[] | PropertyList, separator?: string): string;
        /**
         * Unparses a single Header.
         * @param header - -
         */
        static unparseSingle(header: string): string;
        /**
         * Check whether an object is an instance of PostmanHeader.
         * @param obj - -
         */
        static isHeader(obj: any): boolean;
        /**
         * Create a new header instance
         * @param [value] - Pass the header definition as an object or the value of the header.
         * If the value is passed as a string, it should either be in `name:value` format or the second "name" parameter
         * should be used to pass the name as string
         * @param [name] - optional override the header name or use when the first parameter is the header value as
         * string.
         */
        static create(value?: Header.definition | string, name?: string): Header;
        /**
         * This (optional) flag denotes whether this property is disabled or not. Usually, this is helpful when a
         * property is part of a PropertyList. For example, in a PropertyList of Headers, the ones
         * that are disabled can be filtered out and not processed.
         */
        disabled: boolean;
    }

    export namespace ItemGroup {
        /**
         * The following defines the object (or JSON) structure that one can pass to the ItemGroup while creating a new
         * ItemGroup instance. This is also the object structure returned when `.toJSON()` is called on an ItemGroup instance.
         * @example
         * {
         *     "name": "Echo Get Requests",
         *     "id": "echo-get-requests",
         *     "item": [{
         *         "request": "https://postman-echo.com/get"
         *     }, {
         *         "request": "https://postman-echo.com/headers"
         *     }],
         *     "auth": {
         *         "type": "basic",
         *         "basic": {
         *             "username": "jean",
         *             "password": "{{somethingsecret}}"
         *         }
         *     },
         *     "event": [{
         *         "listen": "prerequest",
         *         "script": {
         *             "type": "text/javascript",
         *             "exec": "console.log(new Date())"
         *         }
         *     }]
         * }
         */
        type definition = {
            item?: (ItemGroup.definition | Item.definition)[];
            auth?: RequestAuth.definition;
            event?: Event.definition[];
        };
    }

    /**
     * An ItemGroup represents a composite list of Item or ItemGroup. In terms of Postman App, ItemGroup
     * represents a "Folder". This allows one to group Items into subsets that can have their own meaning. An
     * ItemGroup also allows one to define a subset of common properties to be applied to each Item within it. For
     * example, a `test` event defined on an ItemGroup is executed while testing any Item that belongs to that group.
     * Similarly, ItemGroups can have a common {@RequestAuth} defined so that every Request, when processed,
     * requires to be authenticated using the `auth` defined in the group.
     *
     * Essentially, Collection too is a special type of ItemGroup ;-).
     * @example
     * Add a new ItemGroup to a collection instance
     * var Collection = require('postman-collection').Collection,
     *     ItemGroup = require('postman-collection').ItemGroup,
     *     myCollection;
     *
     * myCollection = new Collection(); // create an empty collection
     * myCollection.items.add(new ItemGroup({ // add a folder called "blank folder"
     *     "name": "This is a blank folder"
     * }));
     * @param [definition] - While creating a new instance of ItemGroup, one can provide the
     * initial configuration of the item group with the requests it contains, the authentication applied to all
     * requests, events that the requests responds to, etc.
     */
    export class ItemGroup extends Property {
        constructor(definition?: ItemGroup.definition);
        /**
         * This is a PropertyList that holds the list of Items or ItemGroups belonging to a
         * Collection or to an ItemGroup. Operation on an individual item in this list can be
         * performed using various functions available to a PropertyList.
         * @example
         * Fetch empty ItemGroups in a list loaded from a file
         * var fs = require('fs'), // needed to read JSON file from disk
         *     Collection = require('postman-collection').Collection,
         *     myCollection,
         *     emptyGroups;
         * // Load a collection to memory from a JSON file on disk (say, sample-collection.json)
         * myCollection = new Collection(JSON.stringify(fs.readFileSync('sample-collection.json').toString()));
         *
         * // Filter items in Collection root that is an empty ItemGroup
         * emptyGroups = myCollection.items.filter(function (item) {
         *     return item && item.items && (item.items.count() === 0);
         * });
         *
         * // Log the emptyGroups array to check it's contents
         * console.log(emptyGroups);
         */
        items: PropertyList;
        /**
         * One can define the default authentication method required for every item that belongs to this list.
         * Individual Requests can override this in their own definitions. More on how to define an
         * authentication method is outlined in the RequestAuth property.
         * @example
         * Define an entire ItemGroup (folder) or Collection to follow Basic Auth
         * var fs = require('fs'),
         *     Collection = require('postman-collection').Collection,
         *     RequestAuth = require('postman-collection').RequestAuth,
         *     mycollection;
         *
         * // Create a collection having two requests
         * myCollection = new Collection();
         * myCollection.items.add([
         *     { name: 'GET Request', request: 'https://postman-echo.com/get?auth=basic' },
         *     { name: 'PUT Request', request: 'https://postman-echo.com/put?auth=basic' }
         * ]);
         *
         * // Add basic auth to the Collection, to be applied on all requests.
         * myCollection.auth = new RequestAuth({
         *     type: 'basic',
         *     username: 'postman',
         *     password: 'password'
         * });
         */
        auth: RequestAuth;
        /**
         * Set of configurations used to alter the usual behavior of sending the request.
         * @property disableBodyPruning - Disable body pruning for request methods like GET, HEAD etc.
         */
        protocolProfileBehavior: {
            disableBodyPruning: boolean;
        };
        /**
         * Finds the first item with the given name or id in the current ItemGroup.
         * @param idOrName - -
         */
        oneDeep(idOrName: string): void;
        /**
         * Sets authentication method for all the items within this group
         */
        authorizeRequestsUsing: any;
        /**
         * Check whether an object is an instance of ItemGroup.
         * @param obj - -
         */
        static isItemGroup(obj: any): boolean;
    }

    export namespace Item {
        /**
         * The following defines the object (or JSON) structure that one can pass to the Item while creating a new Item
         * instance. This is also the object structure returned when `.toJSON()` is called on an Item instance.
         * @example
         * {
         *     "name": "Get Headers from Echo",
         *     "id": "my-request-1",
         *     "description": "Makes a GET call to echo service and returns the client headers that were sent",
         *
         *     "request": {
         *         "url": "https://postman-echo.com/headers",
         *         "method": "GET"
         *     }
         * }
         * @property [request] - A request represents an HTTP request. If a string, the string is assumed to
         * be the request URL and the method is assumed to be 'GET'.
         * @property [responses] - Sample responses for this request can be stored along with the
         * item definition.
         * @property [events] - Postman allows you to configure scripts to run when specific events
         * occur. These scripts are stored here, and can be referenced in the collection by their id.
         */
        type definition = {
            request?: Request.definition;
            responses?: Response.definition[];
            events?: Event.definition[];
        };
    }

    /**
     * A Postman Collection Item that holds your request definition, responses and other stuff. An Item essentially is
     * a HTTP request definition along with the sample responses and test scripts clubbed together. One or more of these
     * items can be grouped together and placed in an ItemGroup and as such forms a Collection of
     * requests.
     * @example
     * Add a new Item to a folder in a collection instance
     * var Collection = require('postman-collection').Collection,
     *     Item = require('postman-collection').Item,
     *     myCollection;
     *
     * myCollection = new Collection({
     *     "item": [{
     *         "id": "my-folder-1",
     *         "name": "The solo folder in this collection",
     *         "item": [] // blank array indicates this is a folder
     *     }]
     * }); // create a collection with an empty folder
     * // add a request to "my-folder-1" that sends a GET request
     * myCollection.items.one("my-folder-1").items.add(new Item({
     *     "name": "Send a GET request",
     *     "id": "my-get-request",
     *     "request": {
     *         "url": "https://postman-echo.com/get",
     *         "method": "GET"
     *     }
     * }));
     * @param [definition] - While creating a new instance of Item, one can provide the initial
     * configuration of the item with the the request it sends, the expected sample responses, tests, etc
     */
    export class Item extends Property {
        constructor(definition?: Item.definition);
        /**
         * The instance of the Request object inside an Item defines the HTTP request that is supposed to be
         * sent. It further contains the request method, url, request body, etc.
         */
        request: Request;
        /**
         * An Item also contains a list of sample responses that is expected when the request defined in the item is
         * executed. The sample responses are useful in elaborating API usage and is also useful for other
         * integrations that use the sample responses to do something - say a mock service.
         */
        responses: PropertyList;
        /**
         * Events are a set of of Scripts that are executed when certain activities are triggered on an
         * Item. For example, on defining an event that listens to the "test" event, would cause the associated
         * script of the event to be executed when the test runs.
         * @example
         * Add a script to be executed on "prerequest" event
         * var Collection = require('postman-collection').Collection,
         *     Item = require('postman-collection').Item,
         *     myCollection;
         *
         * myCollection = new Collection({
         *     "item": [{
         *         "name": "Send a GET request",
         *         "id": "my-get-request",
         *         "request": {
         *             "url": "https://postman-echo.com/get",
         *             "method": "GET"
         *         }
         *     }]
         * }); // create a collection with one request
         *
         * // add a pre-request script to the event list
         * myCollection.items.one('my-get-request').events.add({
         *     "listen": "prerequest",
         *     "script": {
         *         "type": "text/javascript",
         *         "exec": "console.log(new Date())"
         *     }
         * });
         */
        events: EventList;
        /**
         * Set of configurations used to alter the usual behavior of sending the request.
         */
        protocolProfileBehavior: any;
        /**
         * Fetches applicable AuthType from the current item.
         */
        getAuth(): RequestAuth;
        /**
         * Returns Events corresponding to a particular event name. If no name is given, returns all events. This
         * is useful when you want to trigger all associated scripts for an event.
         * @example
         * Get all events for an item and evaluate their scripts
         * var fs = require('fs'), // needed to read JSON file from disk
         *     Collection = require('postman-collection').Collection,
         *     myCollection;
         *
         * // Load a collection to memory from a JSON file on disk (say, sample-collection.json)
         * myCollection = new Collection(JSON.stringify(fs.readFileSync('sample-collection.json').toString()));
         *
         * // assuming the collection has a request called "my-request-1" in root, we get it's test events
         * myCollection.items.one("my-request-1").getEvents("test").forEach(function (event) {
         *     event.script && eval(event.script.toSource());
         * });
         * @param name - one of the available event types such as `test`, `prerequest`, `postrequest`, etc.
         */
        getEvents(name: string): Event[];
        /**
         * Sets authentication method for the request within this item
         * @param type - -
         * @param [options] - -
         */
        authorizeRequestUsing(type: string | RequestAuth.definition, options?: VariableList): void;
        /**
         * Returns the path of the item
         */
        getPath(): string[];
        /**
         * Check whether an object is an instance of PostmanItem.
         * @param obj - -
         */
        static isItem(obj: any): boolean;
    }

    export namespace MutationTracker {
        /**
         * A JSON representation of a mutation on an object. Here objects mean instances of postman-collection classes.
         * This captures the instruction and the parameters of the instruction so that it can be replayed on a different object.
         * Mutations can be any change on an object. For example setting a key or unsetting a key.
         *
         * For example, the mutation to set `name` on an object to 'Bruce Wayne' would look like ['name', 'Bruce Wayne']. Where
         * the first item is the key path and second item is the value. To add a property `punchLine` to the object it would be
         * the same as updating the property i.e. ['punchLine', 'I\'m Batman']. To remove a property `age` the mutation would
         * look like ['age'].
         *
         * This format of representing changes is derived from
         * http://json-delta.readthedocs.io/en/latest/philosophy.html.
         *
         * The `set` and `unset` are primitive instructions and can be derived from the mutation without explicitly stating the
         * instruction. For more complex mutation the instruction would have to be explicitly stated.
         */
        type mutation = any[];
        /**
         * A JSON representation of the MutationTracker.
         * @property stream - contains the stream mutations tracked
         * @property compacted - contains a compacted version of the mutations
         * @property [autoCompact = false] - when set to true, all new mutations would be compacted immediately
         */
        type definition = {
            stream: any[];
            compacted: any;
            autoCompact?: boolean;
        };
    }

    /**
     * A MutationTracker allows to record mutations on any of object and store them. This stored mutations can be
     * transported for reporting or to replay on similar objects.
     * @param definition - serialized mutation tracker
     */
    export class MutationTracker extends PropertyBase {
        constructor(definition: MutationTracker.definition);
        /**
         * Track a mutation.
         * @param instruction - the type of mutation
         * @param payload - mutation parameters
         */
        track(instruction: string, ...payload: any[]): void;
        /**
         * Compacts the recorded mutations removing duplicate mutations that apply on the same key path.
         */
        compact(): void;
        /**
         * Returns the number of mutations tracked so far.
         */
        count(): number;
        /**
         * Applies all the recorded mutations on a target object.
         * @param target - Target to apply mutations. Must implement `applyMutation`.
         */
        applyOn(target: any): void;
        /**
         * Check whether an object is an instance of MutationTracker.
         * @param obj - -
         */
        static isMutationTracker(obj: any): boolean;
    }

    export namespace PropertyBase {
        type definition = {
            description?: string | Description;
        };
    }

    /**
     * Base of all properties in Postman Collection. It defines the root for all standalone properties for postman
     * collection.
     * @param definition - -
     */
    export class PropertyBase {
        constructor(definition: PropertyBase.definition);
        /**
         * Invokes the given iterator for every parent in the parent chain of the given element.
         * @param options - A set of options for the parent chain traversal.
         * @param [options.withRoot = false] - Set to true to include the collection object as well.
         * @param iterator - The function to call for every parent in the ancestry chain.
         */
        forEachParent(options: {
            withRoot?: boolean;
        }, iterator: (...params: any[]) => any): void;
        /**
         * Tries to find the given property locally, and then proceeds to lookup in each parent,
         * going up the chain as necessary. Lookup will continue until `customizer` returns a truthy value. If used
         * without a customizer, the lookup will stop at the first parent that contains the property.
         * @param property - -
         * @param [customizer] - -
         */
        findInParents(property: string, customizer?: (...params: any[]) => any): any | undefined;
        /**
         * Returns the JSON representation of a property, which conforms to the way it is defined in a collection.
         * You can use this method to get the instantaneous representation of any property, including a Collection.
         */
        toJSON(): void;
        /**
         * Returns the meta keys associated with the property
         */
        meta(): any;
        /**
         * Returns the parent of item
         */
        parent(): any | undefined;
        /**
         * Filter function to check whether a key starts with underscore or not. These usually are the meta properties. It
         * returns `true` if the criteria is matched.
         * @param value - -
         * @param key - -
         */
        static propertyIsMeta(value: any, key: string): boolean;
        /**
         * Map function that removes the underscore prefix from an object key.
         * @param value - -
         * @param key - -
         */
        static propertyUnprefixMeta(value: any, key: string): string;
        /**
         * Static function which allows calling toJSON() on any object.
         * @param obj - -
         */
        static toJSON(obj: any): any;
    }

    export namespace PropertyList {
        /**
         * An item constructed of PropertyList.Type.
         */
        type Type = any;
    }

    /**
     * @param type - -
     * @param parent - -
     * @param populate - -
     */
    export class PropertyList {
        constructor(type: (...params: any[]) => any, parent: any, populate: any[]);
        /**
         * Insert an element at the end of this list. When a reference member specified via second parameter is found, the
         * member is inserted at an index before the reference member.
         * @param item - -
         * @param [before] - -
         */
        insert(item: PropertyList.Type, before?: PropertyList.Type | string): void;
        /**
         * Insert an element at the end of this list. When a reference member specified via second parameter is found, the
         * member is inserted at an index after the reference member.
         * @param item - -
         * @param [after] - -
         */
        insertAfter(item: PropertyList.Type, after?: PropertyList.Type | string): void;
        /**
         * Adds or moves an item to the end of this list.
         * @param item - -
         */
        append(item: PropertyList.Type): void;
        /**
         * Adds or moves an item to the beginning of this list.
         * @param item - -
         */
        prepend(item: PropertyList.Type): void;
        /**
         * Add an item or item definition to this list.
         * @param item - -
         */
        add(item: any | PropertyList.Type): void;
        /**
         * Add an item or update an existing item
         * @param item - -
         */
        upsert(item: PropertyList.Type): boolean;
        /**
         * Removes all elements from the PropertyList for which the predicate returns truthy.
         * @param predicate - -
         * @param context - Optional context to bind the predicate to.
         */
        remove(predicate: ((...params: any[]) => any) | string | PropertyList.Type, context: any): void;
        /**
         * Removes all items in the list
         */
        clear(): void;
        /**
         * Load one or more items
         * @param items - -
         */
        populate(items: any | any[]): void;
        /**
         * Clears the list and adds new items.
         * @param items - -
         */
        repopulate(items: any | any[]): void;
        /**
         * Add or update values from a source list.
         * @param source - -
         * @param [prune = false] - Setting this to `true` will cause the extra items from the list to be deleted
         */
        assimilate(source: PropertyList | any[], prune?: boolean): void;
        /**
         * Returns a map of all items.
         */
        all(): any;
        /**
         * Get Item in this list by `ID` reference. If multiple values are allowed, the last value is returned.
         * @param id - -
         */
        one(id: string): PropertyList.Type;
        /**
         * Get the value of an item in this list. This is similar to PropertyList.one barring the fact that it
         * returns the value of the underlying type of the list content instead of the item itself.
         * @param key - -
         */
        get(key: string | ((...params: any[]) => any)): PropertyList.Type | any;
        /**
         * Iterate on each item of this list.
         * @param iterator - -
         * @param context - -
         */
        each(iterator: (...params: any[]) => any, context: any): void;
        /**
         * @param rule - -
         * @param context - -
         */
        filter(rule: (...params: any[]) => any, context: any): void;
        /**
         * Find an item within the item group
         * @param rule - -
         * @param [context] - -
         */
        find(rule: (...params: any[]) => any, context?: any): Item | ItemGroup;
        /**
         * Iterates over the property list.
         * @param iterator - Function to call on each item.
         * @param context - Optional context, defaults to the PropertyList itself.
         */
        map(iterator: (...params: any[]) => any, context: any): void;
        /**
         * Iterates over the property list and accumulates the result.
         * @param iterator - Function to call on each item.
         * @param accumulator - Accumulator initial value
         * @param context - Optional context, defaults to the PropertyList itself.
         */
        reduce(iterator: (...params: any[]) => any, accumulator: any, context: any): void;
        /**
         * Returns the length of the PropertyList
         */
        count(): number;
        /**
         * Get a member of this list by it's index
         * @param index - -
         */
        idx(index: number): PropertyList.Type;
        /**
         * Find the index of an item in this list
         * @param item - -
         */
        indexOf(item: string | any): number;
        /**
         * Check whether an item exists in this list
         * @param item - -
         * @param [value] - -
         */
        has(item: string | PropertyList.Type, value?: any): boolean;
        /**
         * Iterates over all parents of the property list
         * @param iterator - -
         * @param [context] - -
         */
        eachParent(iterator: (...params: any[]) => any, context?: any): void;
        /**
         * Converts a list of Properties into an object where key is `_postman_propertyIndexKey` and value is determined
         * by the `valueOf` function
         * @param [excludeDisabled = false] - When set to true, disabled properties are excluded from the resultant
         * object.
         * @param [caseSensitive] - When set to true, properties are treated strictly as per their original
         * case. The default value for this property also depends on the case insensitivity definition of the current
         * property.
         * @param [multiValue = false] - When set to true, only the first value of a multi valued property is
         * returned.
         * @param [sanitizeKeys = false] - When set to true, properties with falsy keys are removed.
         */
        toObject(excludeDisabled?: boolean, caseSensitive?: boolean, multiValue?: boolean, sanitizeKeys?: boolean): any;
        /**
         * Adds ability to convert a list to a string provided it's underlying format has unparse function defined.
         */
        toString(): string;
        /**
         * Checks whether an object is a PropertyList
         * @param obj - -
         */
        static isPropertyList(obj: any): boolean;
    }

    export namespace Property {
        /**
         * @property [id] - A unique string that identifies the property.
         * @property [name] - A distinctive and human-readable name of the property.
         * @property [disabled] - Denotes whether the property is disabled or not.
         * @property [info] - The meta information regarding the Property is provided as the `info` object.
         * @property [info.id] - If set, this is used instead of the definition root's id.
         * @property [info.name] - If set, this is used instead of the definition root's name.
         */
        type definition = {
            id?: string;
            name?: string;
            disabled?: boolean;
            info?: {
                id?: string;
                name?: string;
            };
        };
    }

    /**
     * The Property class forms the base of all postman collection SDK elements. This is to be used only for SDK
     * development or to extend the SDK with additional functionalities. All SDK classes (constructors) that are
     * supposed to be identifyable (i.e. ones that can have a `name` and `id`) are derived from this class.
     *
     * For more information on what is the structure of the `definition` the function parameter, have a look at
     * Property.definition.
     *
     * > This is intended to be a private class except for those who want to extend the SDK itself and add more
     * > functionalities.
     * @param [definition] - Every constructor inherited from `Property` is required to call the
     * super constructor function. This implies that construction parameters of every inherited member is propagated
     * to be sent up to this point.
     */
    export class Property extends PropertyBase {
        constructor(definition?: Property.definition);
        /**
         * The `id` of the property is a unique string that identifies this property and can be used to refer to
         * this property from relevant other places. It is a good practice to define the id or let the system
         * auto generate a UUID if one is not defined for properties that require an `id`.
         */
        id: string;
        /**
         * A property can have a distinctive and human-readable name. This is to be used to display the name of the
         * property within Postman, Newman or other runtimes that consume collection. In certain cases, the absence
         * of name might cause the runtime to use the `id` as a fallback.
         */
        name: string;
        /**
         * This (optional) flag denotes whether this property is disabled or not. Usually, this is helpful when a
         * property is part of a PropertyList. For example, in a PropertyList of Headers, the ones
         * that are disabled can be filtered out and not processed.
         */
        disabled: boolean;
        /**
         * This function allows to describe the property for the purpose of detailed identification or documentation
         * generation. This function sets or updates the `description` child-property of this property.
         * @example
         * Add a description to an instance of Collection
         *  var Collection = require('postman-collection').Collection,
         *     mycollection;
         *
         * // create a blank collection
         * myCollection = new Collection();
         * myCollection.describe('Hey! This is a cool collection.');
         *
         * console.log(myCollection.description.toString()); // read the description
         * @param content - The content of the description can be provided here as a string. Note that it is expected
         * that if the content is formatted in any other way than simple text, it should be specified in the subsequent
         * `type` parameter.
         * @param [type = "text/plain"] - The type of the content.
         */
        describe(content: string, type?: string): void;
        /**
         * Returns all the substitutions (variables) that are needed (or referenced) in this property (recursively).
         * @example
         * // returns ['host', 'path1']
         * prop.findSubstitutions({request: 'https://{{host}}/{{path1}}-action/'});
         */
        findSubstitutions(): string[];
        /**
         * This function accepts a string followed by a number of variable sources as arguments. One or more variable
         * sources can be provided and it will use the one that has the value in left-to-right order.
         * @param str - -
         * @param variables - -
         */
        static replaceSubstitutions(str: string, variables: VariableList | any | (VariableList | object)[]): string;
        /**
         * This function accepts an object followed by a number of variable sources as arguments. One or more variable
         * sources can be provided and it will use the one that has the value in left-to-right order.
         * @param obj - -
         * @param variables - -
         */
        static replaceSubstitutionsIn(obj: any, variables: (VariableList | object)[]): any;
        /**
         * This function recursively traverses a variable and detects all instances of variable replacements
         * within the string of the object
         * @example
         * // returns ['host', 'path1']
         * Property.findSubstitutions({request: 'https://{{host}}/{{path1}}-action/'});
         * @param obj - Any JS variable within which we are trying to discover {{variables}}
         */
        static findSubstitutions(obj: any): string[];
    }

    /**
     * @example
     * Create a new ProxyConfigList
     * var ProxyConfigList = require('postman-collection').ProxyConfigList,
     *     myProxyConfig = new ProxyConfigList({}, [
     *              {match: 'https://example.com/*', host: 'proxy.com', port: 8080, tunnel: true},
     *              {match: 'http+https://example2.com/*', host: 'proxy2.com'},
     *          ]);
     * @param parent - -
     * @param populate - The list of proxy objects
     */
    export class ProxyConfigList extends PropertyList {
        constructor(parent: any, populate: any[]);
        /**
         * Matches and gets the proxy config for the particular url.
         * @param [url] - The url for which the proxy config needs to be fetched
         * @returns The matched proxyConfig object
         */
        resolve(url?: URL): ProxyConfig.definition;
        /**
         * Checks whether an object is a ProxyConfigList
         * @param obj - -
         */
        static isProxyConfigList(obj: any): boolean;
    }

    export namespace ProxyConfig {
        /**
         * The following is the object structure accepted as constructor parameter while calling `new ProxyConfig(...)`. It is
         * also the structure exported when Property.toJSON or Property.toObjectResolved is called on a
         * Proxy instance.
         * @example
         * JSON definition of an example proxy object
         * {
         *     "match": "http+https://example.com/*",
         *     "host": "proxy.com",
         *     "port": "8080",
         *     "tunnel": true,
         *     "disabled": false,
         *     "authenticate": true,
         *     "username": "proxy_username",
         *     "password": "proxy_password"
         * }
         * @property [match = 'http+https://*\/*'] - The match for which the proxy needs to be configured.
         * @property [host = ''] - The proxy server url.
         * @property [port = 8080] - The proxy server port number.
         * @property [tunnel = false] - The tunneling option for the proxy request.
         * @property [disabled = false] - To override the proxy for the particular url, you need to provide true.
         * @property [authenticate = false] - To enable authentication for the proxy, you need to provide true.
         * @property [username] - The proxy authentication username
         * @property [password] - The proxy authentication password
         */
        type definition = {
            match?: string;
            host?: string;
            port?: number;
            tunnel?: boolean;
            disabled?: boolean;
            authenticate?: boolean;
            username?: string;
            password?: string;
        };
    }

    /**
     * A ProxyConfig definition that represents the proxy configuration for an url match.
     * Properties can then use the `.toObjectResolved` function to procure an object representation of the property with
     * all the variable references replaced by corresponding values.
     * @example
     * Create a new ProxyConfig
     * var ProxyConfig = require('postman-collection').ProxyConfig,
     *     myProxyConfig = new ProxyConfig({
     *          host: 'proxy.com',
     *          match: 'http+https://example.com/*',
     *          port: 8080,
     *          tunnel: true,
     *          disabled: false,
     *          authenticate: true,
     *          username: 'proxy_username',
     *          password: 'proxy_password'
     *     });
     * @param [options] - Specifies object with props matches, server and tunnel.
     */
    export class ProxyConfig extends Property {
        constructor(options?: ProxyConfig.definition);
        /**
         * The proxy server host or ip
         */
        static host: string;
        /**
         * The url mach for which the proxy has been associated with.
         */
        static match: string;
        /**
         * The proxy server port number
         */
        static port: number;
        /**
         * This represents whether the tunneling needs to done while proxying this request.
         */
        static tunnel: boolean;
        /**
         * Proxy bypass list
         */
        static bypass: UrlMatchPatternList;
        /**
         * Enable proxy authentication
         */
        static authenticate: boolean;
        /**
         * Proxy auth username
         */
        static username: string;
        /**
         * Proxy auth password
         */
        static password: string;
        /**
         * Updates the properties of the proxy object based on the options provided.
         * @param options - The proxy object structure.
         */
        update(options: ProxyConfig.definition): void;
        /**
         * Updates the protocols in the match pattern
         * @param protocols - The array of protocols
         */
        updateProtocols(protocols: string[]): void;
        /**
         * Tests the url string with the match provided.
         * Follows the https://developer.chrome.com/extensions/match_patterns pattern for pattern validation and matching
         * @param [urlStr] - The url string for which the proxy match needs to be done.
         */
        test(urlStr?: string): void;
        /**
         * Returns the proxy server url.
         */
        getProxyUrl(): string;
        /**
         * Returns the protocols supported.
         */
        getProtocols(): string[];
        /**
         * Check whether an object is an instance of PostmanItem.
         * @param obj - -
         */
        static isProxyConfig(obj: any): boolean;
    }

    export namespace QueryParam {
        /**
         * @property key - The name ("key") of the query parameter.
         * @property value - The value of the parameter.
         */
        type definition = {
            key: string;
            value: string;
        };
    }

    /**
     * Represents a URL query parameter, which can exist in request URL or POST data.
     * @param options - Pass the initial definition of the query parameter. In case of
     * string, the query parameter is parsed using QueryParam.parseSingle.
     */
    export class QueryParam extends Property {
        constructor(options: FormParam.definition | string);
        /**
         * Converts the QueryParameter to a single param string.
         */
        toString(): string;
        /**
         * Updates the key and value of the query parameter
         * @param param - -
         * @param param.key - -
         * @param [param.value] - -
         */
        update(param: {
            key: string;
            value?: string;
        }): void;
        /**
         * Declare the list index key, so that property lists of query parameters work correctly
         */
        static _postman_propertyIndexKey: string;
        /**
         * Query params can have multiple values, so set this to true.
         */
        static _postman_propertyAllowsMultipleValues: boolean;
        /**
         * Parse a query string into an array of objects, where each object contains a key and a value.
         * @param query - -
         */
        static parse(query: string): any[];
        /**
         * Parses a single query parameter.
         * @param param - -
         * @param idx - -
         * @param all - array of all params, in case this is being called while parsing multiple params.
         */
        static parseSingle(param: string, idx: number, all: string[]): any;
        /**
         * Create a query string from array of parameters (or object of key-values).
         * @param params - -
         */
        static unparse(params: any[] | any): string;
        /**
         * Takes a query param and converts to string
         * @param obj - -
         */
        static unparseSingle(obj: any): string;
    }

    export namespace RequestAuth {
        /**
         * This defines the definition of the authentication method to be used.
         * @example
         * Sample auth definition for Basic Auth
         * {
         *   "type": "basic",
         *   "basic": [
         *     { "key": "username", "value": "postman" },
         *     { "key": "password", "value": "secrets" }
         *   ]
         * }
         * @property [type] - The Auth type to use. Check the names in AuthTypes
         */
        type definition = {
            type?: string;
        };
    }

    /**
     * A Postman Auth definition that comprehensively represents different types of auth mechanisms available.
     * @example
     * Creating a request with two auth data and one selected
     * var auth = new RequestAuth({
     *   type: 'digest',
     *
     *   basic: [
     *     { key: "username", value: "postman" },
     *     { key: "password", value: "secrets" }
     *   ],
     *   digest: [
     *     { key: "nonce", value: "aef54cde" },
     *     { key: "realm", value: "items.x" }
     *   ]
     * });
     *
     * // change the selected auth
     * auth.use('basic');
     * @param options - Pass the initial definition of the Auth.
     * @param [parent] - optionally pass the parent of this auth. aides variable resolution.
     */
    export class RequestAuth extends Property {
        constructor(options: RequestAuth.definition, parent?: Property | PropertyList);
        /**
         * Update the parameters of a specific authentication type. If none is provided then it uses the one marked as to be
         * used.
         * @param options - -
         * @param [type = this.type] - -
         */
        update(options: VariableList | any[] | any, type?: string): void;
        /**
         * Sets the authentication type to be used by this item.
         * @param type - -
         * @param options - note that options set here would replace all existing
         * options for the particular auth
         */
        use(type: string, options: VariableList | any[] | any): void;
        /**
         * Returns the parameters of the selected auth type
         */
        parameters(): VariableList;
        /**
         * Clears the definition of an auth type.
         * @param type - -
         */
        clear(type: string): void;
        /**
         * Determines whether an authentication type name is valid or not
         * @param type - -
         */
        static isValidType(type: string): boolean;
    }

    export namespace RequestBody {
        type definition = {
            mode: string;
            raw: string;
            file: string;
            graphql: any;
            formdata: object[];
            urlencoded: object[] | string;
        };
        /**
         * MODES
         */
        enum MODES {
            file = "file",
            formdata = "formdata",
            graphql = "graphql",
            raw = "raw",
            urlencoded = "urlencoded"
        }
    }

    /**
     * RequestBody holds data related to the request body. By default, it provides a nice wrapper for url-encoded,
     * form-data, and raw types of request bodies.
     * @param options - -
     */
    export class RequestBody extends PropertyBase {
        constructor(options: any);
        /**
         * Set the content of this request data
         * @param options - -
         */
        update(options: any): void;
        /**
         * Indicates the type of request data to use.
         */
        mode: string;
        /**
         * If the request has raw body data associated with it, the data is held in this field.
         */
        raw: string;
        /**
         * Any URL encoded body params go here.
         */
        urlencoded: PropertyList;
        /**
         * Form data parameters for this request are held in this field.
         */
        formdata: PropertyList;
        /**
         * Holds a reference to a file which should be read as the RequestBody. It can be a file path (when used
         * with Node) or a unique ID (when used with the browser).
         */
        file: any;
        /**
         * If the request has raw graphql data associated with it, the data is held in this field.
         */
        graphql: any;
        /**
         * If the request has body Options associated with it, the data is held in this field.
         */
        options: any;
        /**
         * Indicates whether to include body in request or not.
         */
        disabled: boolean;
        /**
         * Stringifies and returns the request body.
         */
        toString(): any;
        /**
         * If the request body is set to a mode, but does not contain data, then we should not be sending it.
         */
        isEmpty(): boolean;
        /**
         * Convert the request body to JSON compatible plain object
         */
        toJSON(): any;
    }

    export namespace Request {
        /**
         * @property url - The URL of the request. This can be a Url.definition or a string.
         * @property method - The request method, e.g: "GET" or "POST".
         * @property header - The headers that should be sent as a part of this request.
         * @property body - The request body definition.
         * @property auth - The authentication/signing information for this request.
         * @property proxy - The proxy information for this request.
         * @property certificate - The certificate information for this request.
         */
        type definition = {
            url: string | Url;
            method: string;
            header: Header.definition[];
            body: RequestBody.definition;
            auth: RequestAuth.definition;
            proxy: ProxyConfig.definition;
            certificate: Certificate.definition;
        };
    }

    /**
     * A Postman HTTP request object.
     * @param options - -
     */
    export class Request extends Property {
        constructor(options: Request.definition);
        url: Url;
        headers: HeaderList;
        method: string;
        /**
         * Updates the different properties of the request.
         * @param options - -
         */
        update(options: Request.definition): void;
        body: RequestBody | undefined;
        auth: RequestAuth;
        proxy: ProxyConfig;
        certificate: Certificate | undefined;
        /**
         * Sets authentication method for the request
         * @param type - -
         * @param [options] - -
         */
        authorizeUsing(type: string | RequestAuth.definition, options?: VariableList): void;
        /**
         * Returns an object where the key is a header name and value is the header value.
         * @param [options] - -
         * @param options.ignoreCase - When set to "true", will ensure that all the header keys are lower case.
         * @param options.enabled - Only get the enabled headers
         * @param options.multiValue - When set to "true", duplicate header values will be stored in an array
         * @param options.sanitizeKeys - When set to "true", headers with falsy keys are removed
         */
        getHeaders(options?: {
            ignoreCase: boolean;
            enabled: boolean;
            multiValue: boolean;
            sanitizeKeys: boolean;
        }): any;
        /**
         * Calls the given callback on each Header object contained within the request.
         * @param callback - -
         */
        forEachHeader(callback: (...params: any[]) => any): void;
        /**
         * Adds a header to the PropertyList of headers.
         * @param header - Can be a {Header} object, or a raw header object.
         */
        addHeader(header: Header | any): void;
        /**
         * Removes a header from the request.
         * @param toRemove - A header object to remove, or a string containing the header key.
         * @param options - -
         * @param options.ignoreCase - If set to true, ignores case while removing the header.
         */
        removeHeader(toRemove: string | Header, options: {
            ignoreCase: boolean;
        }): void;
        /**
         * Updates or inserts the given header.
         * @param header - -
         */
        upsertHeader(header: any): void;
        /**
         * Add query parameters to the request.
         * @param params - -
         */
        addQueryParams(params: QueryParam[] | string): void;
        /**
         * Removes parameters passed in params.
         * @param params - -
         */
        removeQueryParams(params: string | any[]): void;
        /**
         * Get the request size by computing the headers and body or using the
         * actual content length header once the request is sent.
         */
        size(): any;
        /**
         * Converts the Request to a plain JavaScript object, which is also how the request is
         * represented in a collection file.
         */
        toJSON(): any;
        /**
         * Creates a clone of this request
         */
        clone(): Request;
        /**
         * Check whether an object is an instance of ItemGroup.
         * @param obj - -
         */
        static isRequest(obj: any): boolean;
    }

    export namespace Response {
        /**
         * @property code - define the response code
         * @property [reason] - optionally, if the response has a non-standard response code reason, provide it here
         */
        type definition = {
            code: number;
            reason?: string;
            header?: Header.definition[];
            cookie?: Cookie.definition[];
            body?: string;
            stream?: Buffer | ArrayBuffer;
            responseTime: number;
        };
        /**
         * Returns the durations of each request phase in milliseconds
         * @example
         * Output
         * Request.timingPhases(timings);
         * {
         *     prepare: Number,         // duration of request preparation
         *     wait: Number,            // duration of socket initialization
         *     dns: Number,             // duration of DNS lookup
         *     tcp: Number,             // duration of TCP connection
         *     secureHandshake: Number, // duration of secure handshake
         *     firstByte: Number,       // duration of HTTP server response
         *     download: Number,        // duration of HTTP download
         *     process: Number,         // duration of response processing
         *     total: Number            // duration entire HTTP round-trip
         * }
         * @property start - timestamp of the request sent from the client (in Unix Epoch milliseconds)
         * @property offset - event timestamps in millisecond resolution relative to start
         * @property offset.request - timestamp of the start of the request
         * @property offset.socket - timestamp when the socket is assigned to the request
         * @property offset.lookup - timestamp when the DNS has been resolved
         * @property offset.connect - timestamp when the server acknowledges the TCP connection
         * @property offset.secureConnect - timestamp when secure handshaking process is completed
         * @property offset.response - timestamp when the first bytes are received from the server
         * @property offset.end - timestamp when the last bytes of the response are received
         * @property offset.done - timestamp when the response is received at the client
         * @param timings - -
         */
        type timings = {
            start: number;
            offset: {
                request: number;
                socket: number;
                lookup: number;
                connect: number;
                secureConnect: number;
                response: number;
                end: number;
                done: number;
            };
        };
        /**
         * @property mimeType - sanitized mime type
         * @property mimeFormat - format for the identified mime type
         * @property charset - the normalized character set
         * @property fileExtension - extension identified from the mime type
         * @property fileName - file name extracted from disposition header
         * @property contentType - sanitized content-type extracted from header
         */
        type ResponseContentInfo = {
            mimeType: string;
            mimeFormat: string;
            charset: string;
            fileExtension: string;
            fileName: string;
            contentType: string;
        };
    }

    /**
     * Response holds data related to the request body. By default, it provides a nice wrapper for url-encoded,
     * form-data, and raw types of request bodies.
     * @param options - -
     */
    export class Response extends Property {
        constructor(options: Response.definition);
        originalRequest: Request;
        status: string;
        code: number;
        headers: HeaderList;
        body: string;
        cookies: CookieList;
        /**
         * Time taken for the request to complete.
         */
        responseTime: number;
        /**
         * Convert this response into a JSON serializable object. The _details meta property is omitted.
         */
        toJSON(): any;
        /**
         * Get the http response reason phrase based on the current response code.
         */
        reason(): string | undefined;
        /**
         * Get the response body as a string/text.
         */
        text(): string | undefined;
        /**
         * Get the response body as a JavaScript object. Note that it throws an error if the response is not a valid JSON
         * @example
         * // assuming that the response is stored in a collection instance `myCollection`
         * var response = myCollection.items.one('some request').responses.idx(0),
         *     jsonBody;
         * try {
         *     jsonBody = response.json();
         * }
         * catch (e) {
         *     console.log("There was an error parsing JSON ", e);
         * }
         * // log the root-level keys in the response JSON.
         * console.log('All keys in json response: ' + Object.keys(json));
         * @param [reviver] - -
         * @param [strict = false] - Specify whether JSON parsing will be strict. This will fail on comments and BOM
         */
        json(reviver?: (...params: any[]) => any, strict?: boolean): any;
        /**
         * Get the JSON from response body that returns JSONP response.
         * @param [reviver] - -
         * @param [strict = false] - Specify whether JSON parsing will be strict. This will fail on comments and BOM
         */
        jsonp(reviver?: (...params: any[]) => any, strict?: boolean): void;
        /**
         * Extracts mime type, format, charset, extension and filename of the response content
         * A fallback of default filename is given, if filename is not present in content-disposition header
         * @returns - contentInfo for the response
         */
        contentInfo(): Response.ResponseContentInfo;
        /**
         * Converts the response to a dataURI that can be used for storage or serialisation. The data URI is formed using
         * the following syntax `data:;baseg4, `.
         */
        dataURI(): string;
        /**
         * Get the response size by computing the same from content length header or using the actual response body.
         */
        size(): number;
        /**
         * Check whether an object is an instance of ItemGroup.
         * @param obj - -
         */
        static isResponse(obj: any): boolean;
        /**
         * Converts the response object from the request module to the postman responseBody format
         * @param response - The response object, as received from the request module
         * @param cookies - -
         * @returns The transformed responseBody
         */
        static createFromNode(response: any, cookies: any): any;
    }

    /**
     * A map of package names to the IDs of the packages
     */
    export type Packages = {
        [key: string]: { id: string; };
    };

    /**
     * Postman scripts that are executed upon events on a collection  / request such as test and pre request.
     * @param options - -
     */
    export class Script extends Property {
        constructor(options: any);
        /**
         * Converts the script lines array to a single source string.
         */
        toSource(): string;
        /**
         * Updates the properties of a Script.
         * @param [options] - -
         * @param [options.type] - Script type
         * @param [options.src] - Script source url
         * @param [options.exec] - Script to execute
         * @param [options.packages] - Packages required by the script
         */
        update(options?: {
            type?: string;
            src?: string;
            exec?: string[] | string;
            packages?: Packages;
        }): void;
        type: string;
        /**
         * The packages required by the script
         */
        packages: Packages;
        src: Url;
        exec: string[];
        /**
         * Check whether an object is an instance of ItemGroup.
         * @param obj - -
         */
        static isScript(obj: any): boolean;
    }

    /**
     * Defines a URL.
     * @param options - -
     */
    export class Url extends PropertyBase {
        constructor(options: any | string);
        /**
         * Set a URL.
         * @param url - -
         */
        update(url: string | any): void;
        auth: any;
        protocol: string;
        port: string;
        path: string[];
        hash: string;
        host: string[];
        query: PropertyList;
        variables: VariableList;
        /**
         * Add query parameters to the URL.
         * @param params - Key value pairs to add to the URL.
         */
        addQueryParams(params: any | string): void;
        /**
         * Removes query parameters from the URL.
         * @param params - Params should be an array of strings, or an array of
         * actual query parameters, or a string containing the parameter key.
         */
        removeQueryParams(params: QueryParam[] | string[] | string): void;
        /**
         * Unparses a {PostmanUrl} into a string.
         * @param [forceProtocol] - Forces the URL to have a protocol
         */
        toString(forceProtocol?: boolean): string;
        /**
         * Returns the request path, with a leading '/'.
         * @param [unresolved = false] - -
         */
        getPath(unresolved?: boolean): string;
        /**
         * Returns the stringified query string for this URL.
         */
        getQueryString(): string;
        /**
         * Returns the complete path, including the query string.
         * @example
         * /something/postman?hi=notbye
         */
        getPathWithQuery(): any | string;
        /**
         * Returns the host part of the URL
         */
        getHost(): string;
        /**
         * Returns the host *and* port (if any), separated by a ":"
         * @param [forcePort = false] - forces the port to be added even for the protocol default ones (89, 443)
         */
        getRemote(forcePort?: boolean): string;
        /**
         * Parses a string to a PostmanUrl, decomposing the URL into it's constituent parts,
         * such as path, host, port, etc.
         * @param url - -
         */
        static parse(url: string): any;
        /**
         * Checks whether an object is a Url
         * @param obj - -
         */
        static isUrl(obj: any): boolean;
    }

    /**
     * @param parent - -
     * @param populate - -
     */
    export class VariableList extends PropertyList {
        constructor(parent: Property, populate: any | any[]);
        /**
         * Replaces the variable tokens inside a string with its actual values.
         * @param str - -
         * @param [overrides] - additional objects to lookup for variable values
         */
        replace(str: string, overrides?: any): string;
        /**
         * Recursively replace strings in an object with instances of variables. Note that it clones the original object. If
         * the `mutate` param is set to true, then it replaces the same object instead of creating a new one.
         * @param obj - -
         * @param [overrides] - additional objects to lookup for variable values
         * @param [mutate = false] - -
         */
        substitute(obj: any[] | any, overrides?: object[], mutate?: boolean): any[] | any;
        /**
         * Using this function, one can sync the values of this variable list from a reference object.
         * @param obj - -
         * @param [track] - -
         * @param [prune = true] - -
         */
        syncFromObject(obj: any, track?: boolean, prune?: boolean): any;
        /**
         * Transfer all variables from this list to an object
         * @param [obj] - -
         */
        syncToObject(obj?: any): any;
        /**
         * Checks whether an object is a VariableList
         * @param obj - -
         */
        static isVariableList(obj: any): boolean;
    }

    export namespace VariableScope {
        /**
         * Environment and Globals of postman is exported and imported in a specified data structure. This data structure can be
         * passed on to the constructor parameter of VariableScope or VariableList to instantiate an instance of
         * the same with pre-populated values from arguments.
         * @example
         * JSON definition of a VariableScope (environment, globals, etc)
         * {
         *   "name": "globals",
         *   "values": [{
         *     "key": "var-1",
         *     "value": "value-1"
         *   }, {
         *     "key": "var-2",
         *     "value": "value-2"
         *   }]
         * }
         * @property [id] - ID of the scope
         * @property [name] - A name of the scope
         * @property [values] - A list of variables defined in an array in form of `{name:String,
         * value:String}`
         */
        type definition = {
            id?: string;
            name?: string;
            values?: Variable.definition[];
        };
    }

    /**
     * VariableScope is a representation of a list of variables in Postman, such as the environment variables or the
     * globals. Using this object, it is easy to perform operations on this list of variables such as get a variable or
     * set a variable.
     * @example
     * Load a environment from file, modify and save back
     * var fs = require('fs'), // assuming NodeJS
     *     env,
     *     sum;
     *
     * // load env from file assuming it has initial data
     * env = new VariableScope(JSON.parse(fs.readFileSync('./my-postman-environment.postman_environment').toString()));
     *
     * // get two variables and add them
     * sum = env.get('one-var') + env.get('another-var');
     *
     * // save it back in environment and write to file
     * env.set('sum', sum, 'number');
     * fs.writeFileSync('./sum-of-vars.postman_environment', JSON.stringify(env.toJSON()));
     * @param definition - The constructor accepts an initial set of values for initialising
     * the scope
     * @param [layers] - Additional parent scopes to search for and resolve variables
     */
    export class VariableScope extends Property {
        constructor(definition: VariableScope.definition, layers?: VariableList[]);
        /**
         * Converts a list of Variables into an object where key is `_postman_propertyIndexKey` and value is determined
         * by the `valueOf` function
         * @param excludeDisabled - -
         * @param caseSensitive - -
         */
        toObject(excludeDisabled: boolean, caseSensitive: boolean): any;
        /**
         * Determines whether one particular variable is defined in this scope of variables.
         * @param key - The name of the variable to check
         * @returns - Returns true if an enabled variable with given key is present in current or parent scopes,
         *                      false otherwise
         */
        has(key: string): boolean;
        /**
         * Fetches a variable from the current scope or from parent scopes if present.
         * @param key - The name of the variable to get.
         * @returns The value of the specified variable across scopes.
         */
        get(key: string): any;
        /**
         * Creates a new variable, or updates an existing one.
         * @param key - The name of the variable to set.
         * @param value - The value of the variable to be set.
         * @param [type] - Optionally, the value of the variable can be set to a type
         */
        set(key: string, value: any, type?: Variable.types): void;
        /**
         * Removes the variable with the specified name.
         * @param key - -
         */
        unset(key: string): void;
        /**
         * Removes *all* variables from the current scope. This is a destructive action.
         */
        clear(): void;
        /**
         * Replace all variable names with their values in the given template.
         * @param template - A string or an object to replace variables in
         * @returns The string or object with variables (if any) substituted with their values
         */
        replaceIn(template: string | any): string | any;
        /**
         * Enable mutation tracking.
         * @param [options] - Options for Mutation Tracker. See MutationTracker
         */
        enableTracking(options?: MutationTracker.definition): void;
        /**
         * Disable mutation tracking.
         */
        disableTracking(): void;
        /**
         * Convert this variable scope into a JSON serialisable object. Useful to transport or store, environment and
         * globals as a whole.
         */
        toJSON(): any;
        /**
         * Check whether an object is an instance of VariableScope.
         * @param obj - -
         */
        static isVariableScope(obj: any): boolean;
    }

    export namespace Variable {
        /**
         * The object representation of a Variable consists the variable value and type. It also optionally includes the `id`
         * and a friendly `name` of the variable. The `id` and the `name` of a variable is usually managed and used when a
         * variable is made part of a VariableList instance.
         * @example
         * {
         *     "id": "my-var-1",
         *     "name": "MyFirstVariable",
         *     "value": "Hello World",
         *     "type": "string"
         * }
         * @property [value] - The value of the variable that will be stored and will be typecast to the `type`
         * set in the variable or passed along in this parameter.
         * @property [type] - The type of this variable from the list of types defined at Variable.types.
         */
        type definition = {
            value?: any;
            type?: string;
        };
        /**
         * The possible supported types of a variable is defined here. The keys defined here are the possible values of
         * Variable.type.
         *
         * Additional variable types can be supported by adding the type-casting function to this enumeration.
         */
        enum types {
            /**
             * When a variable's `type` is set to "string", it ensures that Variable.get converts the value of the
             * variable to a string before returning the data.
             */
            string = "String",
            /**
             * A boolean type of variable can either be set to `true` or `false`. Any other value set is converted to
             * Boolean when procured from Variable.get.
             */
            boolean = "Boolean",
            /**
             * A "number" type variable ensures that the value is always represented as a number. A non-number type value
             * is returned as `NaN`.
             */
            number = "Number",
            /**
             * A "array" type value stores Array data format
             */
            array = "{\"in\":\"\",\"out\":\"\"}",
            /**
             * A "object" type value stores Object data format
             */
            object = "{\"in\":\"\",\"out\":\"\"}",
            /**
             * Free-form type of a value. This is the default for any variable, unless specified otherwise. It ensures that
             * the variable can store data in any type and no conversion is done while using Variable.get.
             */
            any = "{\"in\":\"\",\"out\":\"\"}"
        }
    }

    /**
     * A variable inside a collection is similar to variables in any programming construct. The variable has an
     * identifier name (provided by its id) and a value. A variable is optionally accompanied by a variable type. One
     * or more variables can be associated with a collection and can be referred from anywhere else in the collection
     * using the double-brace {{variable-id}} format. Properties can then use the `.toObjectResolved` function to
     * procure an object representation of the property with all variable references replaced by corresponding values.
     * @param [definition] - Specify the initial value and type of the variable.
     */
    export class Variable extends Property {
        constructor(definition?: Variable.definition);
        type: Variable.types;
        value: any;
        /**
         * The name of the variable. This is used for referencing this variable from other locations and scripts
         */
        key: string;
        /**
         * Gets the value of the variable.
         */
        get(): Variable.types;
        /**
         * Sets the value of the variable.
         * @param value - -
         */
        set(value: any): void;
        /**
         * An alias of this.get and this.set.
         * @param [value] - -
         */
        valueOf(value?: any): any;
        /**
         * Returns the stringified value of the variable.
         */
        toString(): string;
        /**
         * Typecasts a value to the Variable.types of this Variable. Returns the value of the variable
         * converted to the type specified in Variable.type.
         * @param value - -
         */
        cast(value: any): any;
        /**
         * Sets or gets the type of the value.
         * @param typeName - -
         * @param _noCast - -
         * @returns - returns the current type of the variable from the list of Variable.types
         */
        valueType(typeName: string, _noCast: boolean): string;
        /**
         * Updates the type and value of a variable from an object or JSON definition of the variable.
         * @param options - -
         */
        update(options: Variable.definition): void;
        /**
         * @param obj - -
         */
        static isVariable(obj: any): boolean;
        /**
         * This (optional) flag denotes whether this property is disabled or not. Usually, this is helpful when a
         * property is part of a PropertyList. For example, in a PropertyList of Headers, the ones
         * that are disabled can be filtered out and not processed.
         */
        disabled: boolean;
    }

    export namespace Version {
        type definition = any | string;
    }

    /**
     * Defines a Version.
     * @param definition - -
     */
    export class Version extends PropertyBase {
        constructor(definition: Version.definition);
        /**
         * Set the version value as string or object with separate components of version
         * @param value - -
         */
        set(value: any | string): void;
        /**
         * The raw URL string. If Version.set is called with a string parameter, the string is saved here
         * before parsing various Version components.
         */
        raw: string;
        major: string;
        minor: string;
        patch: string;
        prerelease: string;
        build: string;
        string: string;
    }

    /**
     * UrlMatchPattern is a list of UrlMatchPatterns.
     * This allows you to test for any url over a list of match patterns.
     * @example
     * An example UrlMatchPatternList
     * var matchPatternList = new UrlMatchPatternList(['https://*.google.com/*']);
     * @param parent - -
     * @param list - -
     */
    export class UrlMatchPatternList extends PropertyList {
        constructor(parent: any, list: string[]);
        /**
         * Tests the url string with the match pattern list provided to see if it matches any of it.
         * Follows the https://developer.chrome.com/extensions/match_patterns pattern for pattern validation and matching
         * @param [urlStr] - The url string for which the proxy match needs to be done.
         */
        test(urlStr?: string): boolean;
    }

    export namespace UrlMatchPattern {
        /**
         * @property pattern - The url match pattern string
         */
        type definition = {
            pattern: string;
        };
    }

    /**
     * UrlMatchPattern allows to create rules to define Urls to match for.
     * It is based on Google's Match Pattern - https://developer.chrome.com/extensions/match_patterns
     * @example
     * An example UrlMatchPattern
     * var matchPattern = new UrlMatchPattern('https://*.google.com/*');
     * @param options - -
     */
    export class UrlMatchPattern extends Property {
        constructor(options: UrlMatchPattern.definition);
        /**
         * The url match pattern string
         */
        static pattern: string;
        /**
         * Assigns the given properties to the UrlMatchPattern.
         * @param options - -
         */
        update(options: any): void;
        /**
         * Tests if the given protocol string, is allowed by the pattern.
         * @param [protocol] - The protocol to be checked if the pattern allows.
         */
        testProtocol(protocol?: string): boolean;
        /**
         * Returns the protocols supported
         */
        getProtocols(): string[];
        /**
         * Tests if the given host string, is allowed by the pattern.
         * @param [host] - The host to be checked if the pattern allows.
         */
        testHost(host?: string): boolean;
        /**
         * Tests if the current pattern allows the given port.
         * @param port - The port to be checked if the pattern allows.
         * @param protocol - Protocol to refer default port.
         */
        testPort(port: string, protocol: string): boolean;
        /**
         * Tests if the current pattern allows the given path.
         * @param [path] - The path to be checked if the pattern allows.
         */
        testPath(path?: string): boolean;
        /**
         * Tests the url string with the match pattern provided.
         * Follows the https://developer.chrome.com/extensions/match_patterns pattern for pattern validation and matching
         * @param [urlStr] - The url string for which the proxy match needs to be done.
         */
        test(urlStr?: string): boolean;
        /**
         * Returns a string representation of the match pattern
         * @returns pattern
         */
        toString(): string;
        /**
         * Returns the JSON representation.
         */
        toJSON(): any;
        /**
         * Multiple protocols in the match pattern should be separated by this string
         */
        static readonly PROTOCOL_DELIMITER: string;
        /**
         * String representation for matching all urls - 
         */
        static readonly MATCH_ALL_URLS: string;
    }

}
