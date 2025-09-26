"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XdrSchemaValidator = void 0;
class XdrSchemaValidator {
    validateSchema(schema) {
        try {
            return this.validateSchemaInternal(schema);
        }
        catch {
            return false;
        }
    }
    validateValue(value, schema) {
        try {
            return this.validateValueInternal(value, schema);
        }
        catch {
            return false;
        }
    }
    validateSchemaInternal(schema) {
        if (!schema || typeof schema !== 'object' || !schema.type) {
            return false;
        }
        switch (schema.type) {
            case 'void':
            case 'int':
            case 'unsigned_int':
            case 'boolean':
            case 'hyper':
            case 'unsigned_hyper':
            case 'float':
            case 'double':
            case 'quadruple':
                return true;
            case 'enum':
                return this.validateEnumSchema(schema);
            case 'opaque':
                return this.validateOpaqueSchema(schema);
            case 'vopaque':
                return this.validateVarlenOpaqueSchema(schema);
            case 'string':
                return this.validateStringSchema(schema);
            case 'array':
                return this.validateArraySchema(schema);
            case 'varray':
                return this.validateVarlenArraySchema(schema);
            case 'struct':
                return this.validateStructSchema(schema);
            case 'union':
                return this.validateUnionSchema(schema);
            default:
                return false;
        }
    }
    validateEnumSchema(schema) {
        if (!schema.values || typeof schema.values !== 'object') {
            return false;
        }
        const values = Object.values(schema.values);
        const uniqueValues = new Set(values);
        if (values.length !== uniqueValues.size) {
            return false;
        }
        return values.every((value) => Number.isInteger(value));
    }
    validateOpaqueSchema(schema) {
        return typeof schema.size === 'number' && Number.isInteger(schema.size) && schema.size >= 0;
    }
    validateVarlenOpaqueSchema(schema) {
        return !schema.size || (typeof schema.size === 'number' && Number.isInteger(schema.size) && schema.size >= 0);
    }
    validateStringSchema(schema) {
        return !schema.size || (typeof schema.size === 'number' && Number.isInteger(schema.size) && schema.size >= 0);
    }
    validateArraySchema(schema) {
        if (!schema.elements || typeof schema.size !== 'number' || !Number.isInteger(schema.size) || schema.size < 0) {
            return false;
        }
        return this.validateSchemaInternal(schema.elements);
    }
    validateVarlenArraySchema(schema) {
        if (!schema.elements) {
            return false;
        }
        if (schema.size !== undefined) {
            if (typeof schema.size !== 'number' || !Number.isInteger(schema.size) || schema.size < 0) {
                return false;
            }
        }
        return this.validateSchemaInternal(schema.elements);
    }
    validateStructSchema(schema) {
        if (!Array.isArray(schema.fields)) {
            return false;
        }
        const fieldNames = new Set();
        for (const field of schema.fields) {
            if (!Array.isArray(field) || field.length !== 2) {
                return false;
            }
            const [fieldSchema, fieldName] = field;
            if (typeof fieldName !== 'string' || fieldName === '') {
                return false;
            }
            if (fieldNames.has(fieldName)) {
                return false;
            }
            fieldNames.add(fieldName);
            if (!this.validateSchemaInternal(fieldSchema)) {
                return false;
            }
        }
        return true;
    }
    validateUnionSchema(schema) {
        if (!Array.isArray(schema.arms) || schema.arms.length === 0) {
            return false;
        }
        const discriminants = new Set();
        for (const arm of schema.arms) {
            if (!Array.isArray(arm) || arm.length !== 2) {
                return false;
            }
            const [discriminant, armSchema] = arm;
            if (discriminants.has(discriminant)) {
                return false;
            }
            discriminants.add(discriminant);
            if (typeof discriminant !== 'number' && typeof discriminant !== 'string' && typeof discriminant !== 'boolean') {
                return false;
            }
            if (!this.validateSchemaInternal(armSchema)) {
                return false;
            }
        }
        if (schema.default && !this.validateSchemaInternal(schema.default)) {
            return false;
        }
        return true;
    }
    validateValueInternal(value, schema) {
        switch (schema.type) {
            case 'void':
                return value === null || value === undefined;
            case 'int':
                return typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
            case 'unsigned_int':
                return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 4294967295;
            case 'boolean':
                return typeof value === 'boolean';
            case 'hyper':
                return (typeof value === 'number' && Number.isInteger(value)) || typeof value === 'bigint';
            case 'unsigned_hyper':
                return ((typeof value === 'number' && Number.isInteger(value) && value >= 0) ||
                    (typeof value === 'bigint' && value >= BigInt(0)));
            case 'float':
            case 'double':
            case 'quadruple':
                return typeof value === 'number';
            case 'enum':
                const enumSchema = schema;
                return typeof value === 'string' && value in enumSchema.values;
            case 'opaque':
                const opaqueSchema = schema;
                return value instanceof Uint8Array && value.length === opaqueSchema.size;
            case 'vopaque':
                const vopaqueSchema = schema;
                return value instanceof Uint8Array && (!vopaqueSchema.size || value.length <= vopaqueSchema.size);
            case 'string':
                const stringSchema = schema;
                return typeof value === 'string' && (!stringSchema.size || value.length <= stringSchema.size);
            case 'array':
                const arraySchema = schema;
                return (Array.isArray(value) &&
                    value.length === arraySchema.size &&
                    value.every((item) => this.validateValueInternal(item, arraySchema.elements)));
            case 'varray':
                const varraySchema = schema;
                return (Array.isArray(value) &&
                    (!varraySchema.size || value.length <= varraySchema.size) &&
                    value.every((item) => this.validateValueInternal(item, varraySchema.elements)));
            case 'struct':
                const structSchema = schema;
                if (!value || typeof value !== 'object' || Array.isArray(value)) {
                    return false;
                }
                const valueObj = value;
                return structSchema.fields.every(([fieldSchema, fieldName]) => fieldName in valueObj && this.validateValueInternal(valueObj[fieldName], fieldSchema));
            case 'union':
                const unionSchema = schema;
                const matchesArm = unionSchema.arms.some(([, armSchema]) => this.validateValueInternal(value, armSchema));
                const matchesDefault = unionSchema.default ? this.validateValueInternal(value, unionSchema.default) : false;
                return matchesArm || matchesDefault;
            default:
                return false;
        }
    }
}
exports.XdrSchemaValidator = XdrSchemaValidator;
//# sourceMappingURL=XdrSchemaValidator.js.map