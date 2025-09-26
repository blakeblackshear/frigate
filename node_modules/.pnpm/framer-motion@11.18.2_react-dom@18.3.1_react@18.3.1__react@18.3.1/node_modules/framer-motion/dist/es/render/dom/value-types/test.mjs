/**
 * Tests a provided value against a ValueType
 */
const testValueType = (v) => (type) => type.test(v);

export { testValueType };
