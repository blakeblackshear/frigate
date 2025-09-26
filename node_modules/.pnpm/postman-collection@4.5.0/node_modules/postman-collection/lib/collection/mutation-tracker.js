var _ = require('../util').lodash,
    PropertyBase = require('./property-base').PropertyBase,

    /**
     * Primitive mutation types.
     *
     * @private
     * @constant
     * @type {Object}
     */
    PRIMITIVE_MUTATIONS = {
        SET: 'set',
        UNSET: 'unset'
    },

    /**
     * Detects if the mutation is a primitive mutation type. A primitive mutation is the simplified mutation structure.
     *
     * @private
     * @param {MutationTracker.mutation} mutation -
     * @returns {Boolean}
     */
    isPrimitiveMutation = function (mutation) {
        return mutation && mutation.length <= 2;
    },

    /**
     * Applies a single mutation on a target.
     *
     * @private
     * @param {*} target -
     * @param {MutationTracker.mutation} mutation -
     */
    applyMutation = function applyMutation (target, mutation) {
        // only `set` and `unset` instructions are supported
        // for non primitive mutations, the instruction would have to be extracted from mutation
        /* istanbul ignore if */
        if (!isPrimitiveMutation(mutation)) {
            return;
        }

        // extract instruction from the mutation
        var operation = mutation.length > 1 ? PRIMITIVE_MUTATIONS.SET : PRIMITIVE_MUTATIONS.UNSET;

        // now hand over applying mutation to the target
        target.applyMutation(operation, ...mutation);
    },

    MutationTracker;

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
 * {@link http://json-delta.readthedocs.io/en/latest/philosophy.html}.
 *
 * The `set` and `unset` are primitive instructions and can be derived from the mutation without explicitly stating the
 * instruction. For more complex mutation the instruction would have to be explicitly stated.
 *
 * @typedef {Array} MutationTracker.mutation
 */

/**
 * A JSON representation of the MutationTracker.
 *
 * @typedef MutationTracker.definition
 *
 * @property {Array} stream contains the stream mutations tracked
 * @property {Object} compacted contains a compacted version of the mutations
 * @property {Boolean} [autoCompact=false] when set to true, all new mutations would be compacted immediately
 */
_.inherit((

    /**
     * A MutationTracker allows to record mutations on any of object and store them. This stored mutations can be
     * transported for reporting or to replay on similar objects.
     *
     * @constructor
     * @extends {PropertyBase}
     *
     * @param {MutationTracker.definition} definition serialized mutation tracker
     */
    MutationTracker = function MutationTracker (definition) {
        // this constructor is intended to inherit and as such the super constructor is required to be executed
        MutationTracker.super_.call(this, definition);

        definition = definition || {};

        // initialize options
        this.autoCompact = Boolean(definition.autoCompact);

        // restore mutations
        this.stream = Array.isArray(definition.stream) ? definition.stream : [];
        this.compacted = _.isPlainObject(definition.compacted) ? definition.compacted : {};
    }), PropertyBase);

_.assign(MutationTracker.prototype, /** @lends MutationTracker.prototype */ {

    /**
     * Records a new mutation.
     *
     * @private
     * @param {MutationTracker.mutation} mutation -
     */
    addMutation (mutation) {
        // bail out for empty or unsupported mutations
        if (!(mutation && isPrimitiveMutation(mutation))) {
            return;
        }

        // if autoCompact is set, we need to compact while adding
        if (this.autoCompact) {
            this.addAndCompact(mutation);

            return;
        }

        // otherwise just push to the stream of mutations
        this.stream.push(mutation);
    },

    /**
     * Records a mutation compacting existing mutations for the same key path.
     *
     * @private
     * @param {MutationTracker.mutation} mutation -
     */
    addAndCompact (mutation) {
        // for `set` and `unset` mutations the key to compact with is the `keyPath`
        var key = mutation[0];

        // convert `keyPath` to a string
        key = Array.isArray(key) ? key.join('.') : key;

        this.compacted[key] = mutation;
    },

    /**
     * Track a mutation.
     *
     * @param {String} instruction the type of mutation
     * @param {...*} payload mutation parameters
     */
    track (instruction, ...payload) {
        // invalid call
        if (!(instruction && payload)) {
            return;
        }

        // unknown instruction
        if (!(instruction === PRIMITIVE_MUTATIONS.SET || instruction === PRIMITIVE_MUTATIONS.UNSET)) {
            return;
        }

        // for primitive mutations the arguments form the mutation object
        // if there is more complex mutation, we have to use a processor to create a mutation for the instruction
        this.addMutation(payload);
    },

    /**
     * Compacts the recorded mutations removing duplicate mutations that apply on the same key path.
     */
    compact () {
        // for each of the mutation, add to compacted list
        this.stream.forEach(this.addAndCompact.bind(this));

        // reset the `stream`, all the mutations are now recorded in the `compacted` storage
        this.stream = [];
    },

    /**
     * Returns the number of mutations tracked so far.
     *
     * @returns {Number}
     */
    count () {
        // the total count of mutations is the sum of
        // mutations in the stream
        var mutationCount = this.stream.length;

        // and the compacted mutations
        mutationCount += Object.keys(this.compacted).length;

        return mutationCount;
    },

    /**
     * Applies all the recorded mutations on a target object.
     *
     * @param {*} target Target to apply mutations. Must implement `applyMutation`.
     */
    applyOn (target) {
        if (!(target && target.applyMutation)) {
            return;
        }

        var applyIndividualMutation = function applyIndividualMutation (mutation) {
            applyMutation(target, mutation);
        };

        // mutations move from `stream` to `compacted`, so we apply the compacted mutations first
        // to ensure FIFO of mutations

        // apply the compacted mutations first
        _.forEach(this.compacted, applyIndividualMutation);

        // apply the mutations in the stream
        _.forEach(this.stream, applyIndividualMutation);
    }
});

_.assign(MutationTracker, /** @lends MutationTracker */ {
    /**
     * Defines the name of this property for internal use.
     *
     * @private
     * @readOnly
     * @type {String}
     */
    _postman_propertyName: 'MutationTracker',

    /**
     * Check whether an object is an instance of {@link MutationTracker}.
     *
     * @param {*} obj -
     * @returns {Boolean}
     */
    isMutationTracker: function (obj) {
        return Boolean(obj) && ((obj instanceof MutationTracker) ||
            _.inSuperChain(obj.constructor, '_postman_propertyName', MutationTracker._postman_propertyName));
    }
});

module.exports = {
    MutationTracker
};
