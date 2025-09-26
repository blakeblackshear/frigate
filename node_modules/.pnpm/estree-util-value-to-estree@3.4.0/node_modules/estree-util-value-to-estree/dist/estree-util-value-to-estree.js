/**
 * Create an ESTree identifier node for a given name.
 *
 * @param name
 *   The name of the identifier.
 * @returns
 *   The identifier node.
 */
function identifier(name) {
    return { type: 'Identifier', name };
}
/**
 * Create an ESTree literal node for a given value.
 *
 * @param value
 *   The value for which to create a literal.
 * @returns
 *   The literal node.
 */
function literal(value) {
    return { type: 'Literal', value };
}
/**
 * Create an ESTree call expression on an object member.
 *
 * @param object
 *   The object to call the method on.
 * @param name
 *   The name of the method to call.
 * @param args
 *   Arguments to pass to the function call
 * @returns
 *   The call expression node.
 */
function methodCall(object, name, args) {
    return {
        type: 'CallExpression',
        optional: false,
        callee: {
            type: 'MemberExpression',
            computed: false,
            optional: false,
            object,
            property: identifier(name)
        },
        arguments: args
    };
}
/**
 * Turn a number or bigint into an ESTree expression. This handles positive and negative numbers and
 * bigints as well as special numbers.
 *
 * @param number
 *   The value to turn into an ESTree expression.
 * @returns
 *   An expression that represents the given value.
 */
function processNumber(number) {
    if (number < 0 || Object.is(number, -0)) {
        return {
            type: 'UnaryExpression',
            operator: '-',
            prefix: true,
            argument: processNumber(-number)
        };
    }
    if (typeof number === 'bigint') {
        return { type: 'Literal', bigint: String(number) };
    }
    if (number === Number.POSITIVE_INFINITY || Number.isNaN(number)) {
        return identifier(String(number));
    }
    return literal(number);
}
/**
 * Process an array of numbers. This is a shortcut for iterables whose constructor takes an array of
 * numbers as input.
 *
 * @param numbers
 *   The numbers to add to the array expression.
 * @returns
 *   An ESTree array expression whose elements match the input numbers.
 */
function processNumberArray(numbers) {
    const elements = [];
    for (const value of numbers) {
        elements.push(processNumber(value));
    }
    return { type: 'ArrayExpression', elements };
}
/**
 * Check whether a value can be constructed from its string representation.
 *
 * @param value
 *   The value to check
 * @returns
 *   Whether or not the value can be constructed from its string representation.
 */
function isStringReconstructable(value) {
    return value instanceof URL || value instanceof URLSearchParams;
}
/**
 * Check whether a value can be constructed from its `valueOf()` result.
 *
 * @param value
 *   The value to check
 * @returns
 *   Whether or not the value can be constructed from its `valueOf()` result.
 */
function isValueReconstructable(value) {
    return (value instanceof Boolean ||
        value instanceof Date ||
        value instanceof Number ||
        value instanceof String);
}
const wellKnownSymbols = new Map();
for (const name of Reflect.ownKeys(Symbol)) {
    const value = Symbol[name];
    if (typeof value === 'symbol') {
        wellKnownSymbols.set(value, name);
    }
}
/**
 * Check whether a value is a typed array.
 *
 * @param value
 *   The value to check
 * @returns
 *   Whether or not the value is a typed array.
 */
function isTypedArray(value) {
    return (value instanceof BigInt64Array ||
        value instanceof BigUint64Array ||
        (typeof Float16Array !== 'undefined' && value instanceof Float16Array) ||
        value instanceof Float32Array ||
        value instanceof Float64Array ||
        value instanceof Int8Array ||
        value instanceof Int16Array ||
        value instanceof Int32Array ||
        value instanceof Uint8Array ||
        value instanceof Uint8ClampedArray ||
        value instanceof Uint16Array ||
        value instanceof Uint32Array);
}
/**
 * Compare two value contexts for sorting them based on reference count.
 *
 * @param a
 *   The first context to compare.
 * @param b
 *   The second context to compare.
 * @returns
 *   The count of context a minus the count of context b.
 */
function compareContexts(a, b) {
    const aReferencedByB = a.referencedBy.has(b.value);
    const bReferencedByA = b.referencedBy.has(a.value);
    if (aReferencedByB) {
        if (bReferencedByA) {
            return a.count - b.count;
        }
        return -1;
    }
    if (bReferencedByA) {
        return 1;
    }
    return a.count - b.count;
}
/**
 * Replace the assigned right hand expression with the new expression.
 *
 * If there is no assignment expression, the original expression is returned. Otherwise the
 * assignment is modified and returned,
 *
 * @param expression
 *   The expression to use for the assignment.
 * @param assignment
 *   The existing assignmentexpression
 * @returns
 *   The new expression.
 */
function replaceAssignment(expression, assignment) {
    if (!assignment || assignment.type !== 'AssignmentExpression') {
        return expression;
    }
    let node = assignment;
    while (node.right.type === 'AssignmentExpression') {
        node = node.right;
    }
    node.right = expression;
    return assignment;
}
/**
 * Create an ESTree epxression to represent a symbol. Global and well-known symbols are supported.
 *
 * @param symbol
 *   THe symbol to represent.
 * @returns
 *   An ESTree expression to represent the symbol.
 */
function symbolToEstree(symbol) {
    const name = wellKnownSymbols.get(symbol);
    if (name) {
        return {
            type: 'MemberExpression',
            computed: false,
            optional: false,
            object: identifier('Symbol'),
            property: identifier(name)
        };
    }
    if (symbol.description && symbol === Symbol.for(symbol.description)) {
        return methodCall(identifier('Symbol'), 'for', [literal(symbol.description)]);
    }
    throw new TypeError(`Only global symbols are supported, got: ${String(symbol)}`, {
        cause: symbol
    });
}
/**
 * Create an ESTree property from a key and a value expression.
 *
 * @param key
 *   The property key value
 * @param value
 *   The property value as an ESTree expression.
 * @returns
 *   The ESTree properry node.
 */
function property(key, value) {
    const isString = typeof key === 'string';
    return {
        type: 'Property',
        method: false,
        shorthand: false,
        computed: key === '__proto__' || !isString,
        kind: 'init',
        key: isString ? literal(key) : symbolToEstree(key),
        value
    };
}
/**
 * Convert a Temporal value to a constructor call.
 *
 * @param name
 *   The name of the constructor.
 * @param values
 *   The numeric values to pass to the constructor.
 * @param calendar
 *   The calendar name to pass to the constructor.
 * @param defaultReferenceValue
 *   The default reference value of the temporal object.
 * @param referenceValue
 *   The reference value of the temporal object.
 * @returns
 *   An ESTree expression which represents the constructor call.
 */
function temporalConstructor(name, values, calendar = 'iso8601', defaultReferenceValue, referenceValue) {
    if (calendar && typeof calendar !== 'string') {
        throw new Error(`Unsupported calendar: ${calendar}`, { cause: calendar });
    }
    const args = [];
    if (referenceValue != null &&
        (calendar !== 'iso8601' || referenceValue !== defaultReferenceValue)) {
        args.push(literal(referenceValue));
    }
    if (calendar !== 'iso8601' || args.length !== 0) {
        args.unshift(literal(calendar));
    }
    for (let index = values.length - 1; index >= 0; index -= 1) {
        const value = values[index];
        if ((value !== 0 && value !== 0n) || args.length !== 0) {
            args.unshift(typeof value === 'string' ? literal(value) : processNumber(value));
        }
    }
    return {
        type: 'NewExpression',
        callee: {
            type: 'MemberExpression',
            computed: false,
            optional: false,
            object: identifier('Temporal'),
            property: identifier(name)
        },
        arguments: args
    };
}
/**
 * Convert a value to an ESTree node.
 *
 * @param value
 *   The value to convert.
 * @param options
 *   Additional options to configure the output.
 * @returns
 *   The ESTree node.
 */
export function valueToEstree(value, options = {}) {
    const stack = [];
    const collectedContexts = new Map();
    const namedContexts = [];
    /**
     * Analyze a value and collect all reference contexts.
     *
     * @param val
     *   The value to analyze.
     */
    function analyze(val) {
        if (typeof val === 'function') {
            throw new TypeError(`Unsupported value: ${val}`, { cause: val });
        }
        if (typeof val !== 'object') {
            return;
        }
        if (val == null) {
            return;
        }
        const context = collectedContexts.get(val);
        if (context) {
            if (options.preserveReferences) {
                context.count += 1;
            }
            for (const ancestor of stack) {
                context.referencedBy.add(ancestor);
            }
            if (stack.includes(val)) {
                if (!options.preserveReferences) {
                    throw new Error(`Found circular reference: ${val}`, { cause: val });
                }
                const parent = stack.at(-1);
                const parentContext = collectedContexts.get(parent);
                parentContext.recursive = true;
                context.recursive = true;
            }
            return;
        }
        collectedContexts.set(val, {
            count: 1,
            recursive: false,
            referencedBy: new Set(stack),
            value: val
        });
        if (isTypedArray(val)) {
            return;
        }
        if (isStringReconstructable(val)) {
            return;
        }
        if (isValueReconstructable(val)) {
            return;
        }
        if (value instanceof RegExp) {
            return;
        }
        if (typeof Temporal !== 'undefined' &&
            (value instanceof Temporal.Duration ||
                value instanceof Temporal.Instant ||
                value instanceof Temporal.PlainDate ||
                value instanceof Temporal.PlainDateTime ||
                value instanceof Temporal.PlainYearMonth ||
                value instanceof Temporal.PlainMonthDay ||
                value instanceof Temporal.PlainTime ||
                value instanceof Temporal.ZonedDateTime)) {
            return;
        }
        stack.push(val);
        if (val instanceof Map) {
            for (const pair of val) {
                analyze(pair[0]);
                analyze(pair[1]);
            }
        }
        else if (Array.isArray(val) || val instanceof Set) {
            for (const entry of val) {
                analyze(entry);
            }
        }
        else {
            const proto = Object.getPrototypeOf(val);
            if (proto != null && proto !== Object.prototype && !options.instanceAsObject) {
                throw new TypeError(`Unsupported value: ${val}`, { cause: val });
            }
            for (const key of Reflect.ownKeys(val)) {
                analyze(val[key]);
            }
        }
        stack.pop();
    }
    /**
     * Recursively generate the ESTree expression needed to reconstruct the value.
     *
     * @param val
     *   The value to process.
     * @param isDeclaration
     *   Whether or not this is for a variable declaration.
     * @returns
     *   The ESTree expression to reconstruct the value.
     */
    function generate(val, isDeclaration) {
        if (val === undefined) {
            return identifier(String(val));
        }
        if (val == null || typeof val === 'string' || typeof val === 'boolean') {
            return literal(val);
        }
        if (typeof val === 'bigint' || typeof val === 'number') {
            return processNumber(val);
        }
        if (typeof val === 'symbol') {
            return symbolToEstree(val);
        }
        const context = collectedContexts.get(val);
        if (!isDeclaration && context?.name) {
            return identifier(context.name);
        }
        if (isValueReconstructable(val)) {
            return {
                type: 'NewExpression',
                callee: identifier(val.constructor.name),
                arguments: [generate(val.valueOf())]
            };
        }
        if (val instanceof RegExp) {
            return {
                type: 'Literal',
                regex: { pattern: val.source, flags: val.flags }
            };
        }
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(val)) {
            return methodCall(identifier('Buffer'), 'from', [processNumberArray(val)]);
        }
        if (isTypedArray(val)) {
            return {
                type: 'NewExpression',
                callee: identifier(val.constructor.name),
                arguments: [processNumberArray(val)]
            };
        }
        if (isStringReconstructable(val)) {
            return {
                type: 'NewExpression',
                callee: identifier(val.constructor.name),
                arguments: [literal(String(val))]
            };
        }
        if (typeof Temporal !== 'undefined') {
            if (val instanceof Temporal.Duration) {
                return temporalConstructor('Duration', [
                    val.years,
                    val.months,
                    val.weeks,
                    val.days,
                    val.hours,
                    val.minutes,
                    val.seconds,
                    val.milliseconds,
                    val.microseconds,
                    val.nanoseconds
                ]);
            }
            if (val instanceof Temporal.Instant) {
                return temporalConstructor('Instant', [val.epochNanoseconds]);
            }
            if (val instanceof Temporal.PlainDate) {
                const iso = val.getISOFields();
                return temporalConstructor('PlainDate', [iso.isoYear, iso.isoMonth, iso.isoDay], iso.calendar);
            }
            if (val instanceof Temporal.PlainDateTime) {
                const iso = val.getISOFields();
                return temporalConstructor('PlainDateTime', [
                    iso.isoYear,
                    iso.isoMonth,
                    iso.isoDay,
                    iso.isoHour,
                    iso.isoMinute,
                    iso.isoSecond,
                    iso.isoMillisecond,
                    iso.isoMicrosecond,
                    iso.isoNanosecond
                ], iso.calendar);
            }
            if (val instanceof Temporal.PlainMonthDay) {
                const iso = val.getISOFields();
                return temporalConstructor('PlainMonthDay', [iso.isoMonth, iso.isoDay], iso.calendar, 1972, iso.isoYear);
            }
            if (val instanceof Temporal.PlainTime) {
                const iso = val.getISOFields();
                return temporalConstructor('PlainTime', [
                    iso.isoHour,
                    iso.isoMinute,
                    iso.isoSecond,
                    iso.isoMillisecond,
                    iso.isoMicrosecond,
                    iso.isoNanosecond
                ]);
            }
            if (val instanceof Temporal.PlainYearMonth) {
                const iso = val.getISOFields();
                return temporalConstructor('PlainYearMonth', [iso.isoYear, iso.isoMonth], iso.calendar, 1, iso.isoDay);
            }
            if (val instanceof Temporal.ZonedDateTime) {
                const iso = val.getISOFields();
                return temporalConstructor('ZonedDateTime', [val.epochNanoseconds, val.timeZoneId], iso.calendar);
            }
        }
        if (Array.isArray(val)) {
            const elements = Array.from({ length: val.length });
            let trimmable;
            for (let index = 0; index < val.length; index += 1) {
                if (!(index in val)) {
                    elements[index] = null;
                    trimmable = undefined;
                    continue;
                }
                const child = val[index];
                const childContext = collectedContexts.get(child);
                if (context &&
                    childContext &&
                    namedContexts.indexOf(childContext) >= namedContexts.indexOf(context)) {
                    elements[index] = null;
                    trimmable ||= index;
                    childContext.assignment = {
                        type: 'AssignmentExpression',
                        operator: '=',
                        left: {
                            type: 'MemberExpression',
                            computed: true,
                            optional: false,
                            object: identifier(context.name),
                            property: literal(index)
                        },
                        right: childContext.assignment || identifier(childContext.name)
                    };
                }
                else {
                    elements[index] = generate(child);
                    trimmable = undefined;
                }
            }
            if (trimmable != null) {
                elements.splice(trimmable);
            }
            return {
                type: 'ArrayExpression',
                elements
            };
        }
        if (val instanceof Set) {
            const elements = [];
            let finalizer;
            for (const child of val) {
                if (finalizer) {
                    finalizer = methodCall(finalizer, 'add', [generate(child)]);
                }
                else {
                    const childContext = collectedContexts.get(child);
                    if (context &&
                        childContext &&
                        namedContexts.indexOf(childContext) >= namedContexts.indexOf(context)) {
                        finalizer = methodCall(identifier(context.name), 'add', [generate(child)]);
                    }
                    else {
                        elements.push(generate(child));
                    }
                }
            }
            if (context && finalizer) {
                context.assignment = replaceAssignment(finalizer, context.assignment);
            }
            return {
                type: 'NewExpression',
                callee: identifier('Set'),
                arguments: elements.length ? [{ type: 'ArrayExpression', elements }] : []
            };
        }
        if (val instanceof Map) {
            const elements = [];
            let finalizer;
            for (const [key, item] of val) {
                if (finalizer) {
                    finalizer = methodCall(finalizer, 'set', [generate(key), generate(item)]);
                }
                else {
                    const keyContext = collectedContexts.get(key);
                    const itemContext = collectedContexts.get(item);
                    if (context &&
                        ((keyContext && namedContexts.indexOf(keyContext) >= namedContexts.indexOf(context)) ||
                            (itemContext && namedContexts.indexOf(itemContext) >= namedContexts.indexOf(context)))) {
                        finalizer = methodCall(identifier(context.name), 'set', [
                            generate(key),
                            generate(item)
                        ]);
                    }
                    else {
                        elements.push({
                            type: 'ArrayExpression',
                            elements: [generate(key), generate(item)]
                        });
                    }
                }
            }
            if (context && finalizer) {
                context.assignment = replaceAssignment(finalizer, context.assignment);
            }
            return {
                type: 'NewExpression',
                callee: identifier('Map'),
                arguments: elements.length ? [{ type: 'ArrayExpression', elements }] : []
            };
        }
        const properties = [];
        if (Object.getPrototypeOf(val) == null) {
            properties.push({
                type: 'Property',
                method: false,
                shorthand: false,
                computed: false,
                kind: 'init',
                key: identifier('__proto__'),
                value: literal(null)
            });
        }
        const object = val;
        const propertyDescriptors = [];
        for (const key of Reflect.ownKeys(val)) {
            // TODO [>=4] Throw an error for getters.
            const child = object[key];
            const { configurable, enumerable, writable } = Object.getOwnPropertyDescriptor(val, key);
            const childContext = collectedContexts.get(child);
            if (!configurable || !enumerable || !writable) {
                const propertyDescriptor = [property('value', generate(child))];
                if (configurable) {
                    propertyDescriptor.push(property('configurable', literal(true)));
                }
                if (enumerable) {
                    propertyDescriptor.push(property('enumerable', literal(true)));
                }
                if (writable) {
                    propertyDescriptor.push(property('writable', literal(true)));
                }
                propertyDescriptors.push([
                    key,
                    { type: 'ObjectExpression', properties: propertyDescriptor }
                ]);
            }
            else if (context &&
                childContext &&
                namedContexts.indexOf(childContext) >= namedContexts.indexOf(context)) {
                if (key === '__proto__') {
                    propertyDescriptors.push([
                        key,
                        {
                            type: 'ObjectExpression',
                            properties: [
                                property('value', generate(child)),
                                property('configurable', literal(true)),
                                property('enumerable', literal(true)),
                                property('writable', literal(true))
                            ]
                        }
                    ]);
                }
                else {
                    childContext.assignment = {
                        type: 'AssignmentExpression',
                        operator: '=',
                        left: {
                            type: 'MemberExpression',
                            computed: true,
                            optional: false,
                            object: identifier(context.name),
                            property: generate(key)
                        },
                        right: childContext.assignment || generate(child)
                    };
                }
            }
            else {
                properties.push(property(key, generate(child)));
            }
        }
        const objectExpression = {
            type: 'ObjectExpression',
            properties
        };
        if (propertyDescriptors.length) {
            let name;
            let args;
            if (propertyDescriptors.length === 1) {
                const [[key, expression]] = propertyDescriptors;
                name = 'defineProperty';
                args = [typeof key === 'string' ? literal(key) : symbolToEstree(key), expression];
            }
            else {
                name = 'defineProperties';
                args = [
                    {
                        type: 'ObjectExpression',
                        properties: propertyDescriptors.map(([key, expression]) => property(key, expression))
                    }
                ];
            }
            if (!context) {
                return methodCall(identifier('Object'), name, [objectExpression, ...args]);
            }
            context.assignment = replaceAssignment(methodCall(identifier('Object'), name, [identifier(context.name), ...args]), context.assignment);
        }
        return objectExpression;
    }
    analyze(value);
    for (const [val, context] of collectedContexts) {
        if (context.recursive || context.count > 1) {
            // Assign reused or recursive references to a variable.
            context.name = `$${namedContexts.length}`;
            namedContexts.push(context);
        }
        else {
            // Otherwise don’t treat it as a reference.
            collectedContexts.delete(val);
        }
    }
    if (!namedContexts.length) {
        return generate(value);
    }
    const params = namedContexts.sort(compareContexts).map((context) => ({
        type: 'AssignmentPattern',
        left: identifier(context.name),
        right: generate(context.value, true)
    }));
    const rootContext = collectedContexts.get(value);
    const finalizers = [];
    for (const context of collectedContexts.values()) {
        if (context !== rootContext && context.assignment) {
            finalizers.push(context.assignment);
        }
    }
    finalizers.push(rootContext ? rootContext.assignment || identifier(rootContext.name) : generate(value));
    return {
        type: 'CallExpression',
        optional: false,
        arguments: [],
        callee: {
            type: 'ArrowFunctionExpression',
            expression: false,
            params,
            body: {
                type: 'SequenceExpression',
                expressions: finalizers
            }
        }
    };
}
//# sourceMappingURL=estree-util-value-to-estree.js.map