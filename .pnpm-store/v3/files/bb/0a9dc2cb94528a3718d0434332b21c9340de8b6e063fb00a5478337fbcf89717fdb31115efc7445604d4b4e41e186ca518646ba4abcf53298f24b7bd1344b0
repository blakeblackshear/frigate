"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvroSchemaValidator = void 0;
class AvroSchemaValidator {
    constructor() {
        this.namedSchemas = new Map();
    }
    validateSchema(schema) {
        this.namedSchemas.clear();
        return this.validateSchemaInternal(schema);
    }
    validateValue(value, schema) {
        this.namedSchemas.clear();
        this.validateSchemaInternal(schema);
        return this.validateValueAgainstSchema(value, schema);
    }
    validateSchemaInternal(schema) {
        if (typeof schema === 'string') {
            return this.validateStringSchema(schema);
        }
        if (Array.isArray(schema)) {
            return this.validateUnionSchema(schema);
        }
        if (typeof schema === 'object' && schema !== null) {
            switch (schema.type) {
                case 'null':
                    return this.validateNullSchema(schema);
                case 'boolean':
                    return this.validateBooleanSchema(schema);
                case 'int':
                    return this.validateIntSchema(schema);
                case 'long':
                    return this.validateLongSchema(schema);
                case 'float':
                    return this.validateFloatSchema(schema);
                case 'double':
                    return this.validateDoubleSchema(schema);
                case 'bytes':
                    return this.validateBytesSchema(schema);
                case 'string':
                    return this.validateStringTypeSchema(schema);
                case 'record':
                    return this.validateRecordSchema(schema);
                case 'enum':
                    return this.validateEnumSchema(schema);
                case 'array':
                    return this.validateArraySchema(schema);
                case 'map':
                    return this.validateMapSchema(schema);
                case 'fixed':
                    return this.validateFixedSchema(schema);
                default:
                    return false;
            }
        }
        return false;
    }
    validateStringSchema(schema) {
        const primitiveTypes = ['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string'];
        return primitiveTypes.includes(schema) || this.namedSchemas.has(schema);
    }
    validateUnionSchema(schema) {
        if (schema.length === 0)
            return false;
        const typeSet = new Set();
        for (const subSchema of schema) {
            if (!this.validateSchemaInternal(subSchema))
                return false;
            const typeName = this.getSchemaTypeName(subSchema);
            if (typeSet.has(typeName))
                return false;
            typeSet.add(typeName);
        }
        return true;
    }
    validateNullSchema(schema) {
        return schema.type === 'null';
    }
    validateBooleanSchema(schema) {
        return schema.type === 'boolean';
    }
    validateIntSchema(schema) {
        return schema.type === 'int';
    }
    validateLongSchema(schema) {
        return schema.type === 'long';
    }
    validateFloatSchema(schema) {
        return schema.type === 'float';
    }
    validateDoubleSchema(schema) {
        return schema.type === 'double';
    }
    validateBytesSchema(schema) {
        return schema.type === 'bytes';
    }
    validateStringTypeSchema(schema) {
        return schema.type === 'string';
    }
    validateRecordSchema(schema) {
        if (schema.type !== 'record' || !schema.name || !Array.isArray(schema.fields))
            return false;
        const fullName = this.getFullName(schema.name, schema.namespace);
        if (this.namedSchemas.has(fullName))
            return false;
        this.namedSchemas.set(fullName, schema);
        const fieldNames = new Set();
        for (const field of schema.fields) {
            if (!this.validateRecordField(field))
                return false;
            if (fieldNames.has(field.name))
                return false;
            fieldNames.add(field.name);
        }
        return true;
    }
    validateRecordField(field) {
        return typeof field.name === 'string' && field.name.length > 0 && this.validateSchemaInternal(field.type);
    }
    validateEnumSchema(schema) {
        if (schema.type !== 'enum' || !schema.name || !Array.isArray(schema.symbols))
            return false;
        const fullName = this.getFullName(schema.name, schema.namespace);
        if (this.namedSchemas.has(fullName))
            return false;
        this.namedSchemas.set(fullName, schema);
        if (schema.symbols.length === 0)
            return false;
        const symbolSet = new Set();
        for (const symbol of schema.symbols) {
            if (typeof symbol !== 'string' || symbolSet.has(symbol))
                return false;
            symbolSet.add(symbol);
        }
        if (schema.default !== undefined && !schema.symbols.includes(schema.default))
            return false;
        return true;
    }
    validateArraySchema(schema) {
        return schema.type === 'array' && this.validateSchemaInternal(schema.items);
    }
    validateMapSchema(schema) {
        return schema.type === 'map' && this.validateSchemaInternal(schema.values);
    }
    validateFixedSchema(schema) {
        if (schema.type !== 'fixed' || !schema.name || typeof schema.size !== 'number')
            return false;
        if (schema.size < 0)
            return false;
        const fullName = this.getFullName(schema.name, schema.namespace);
        if (this.namedSchemas.has(fullName))
            return false;
        this.namedSchemas.set(fullName, schema);
        return true;
    }
    validateValueAgainstSchema(value, schema) {
        if (typeof schema === 'string') {
            return this.validateValueAgainstStringSchema(value, schema);
        }
        if (Array.isArray(schema)) {
            return schema.some((subSchema) => this.validateValueAgainstSchema(value, subSchema));
        }
        if (typeof schema === 'object' && schema !== null) {
            switch (schema.type) {
                case 'null':
                    return value === null;
                case 'boolean':
                    return typeof value === 'boolean';
                case 'int':
                    return typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
                case 'long':
                    return (typeof value === 'number' && Number.isInteger(value)) || typeof value === 'bigint';
                case 'float':
                case 'double':
                    return typeof value === 'number';
                case 'bytes':
                    return value instanceof Uint8Array;
                case 'string':
                    return typeof value === 'string';
                case 'record':
                    return this.validateValueAgainstRecord(value, schema);
                case 'enum':
                    return this.validateValueAgainstEnum(value, schema);
                case 'array':
                    return this.validateValueAgainstArray(value, schema);
                case 'map':
                    return this.validateValueAgainstMap(value, schema);
                case 'fixed':
                    return this.validateValueAgainstFixed(value, schema);
                default:
                    return false;
            }
        }
        return false;
    }
    validateValueAgainstStringSchema(value, schema) {
        switch (schema) {
            case 'null':
                return value === null;
            case 'boolean':
                return typeof value === 'boolean';
            case 'int':
                return typeof value === 'number' && Number.isInteger(value) && value >= -2147483648 && value <= 2147483647;
            case 'long':
                return (typeof value === 'number' && Number.isInteger(value)) || typeof value === 'bigint';
            case 'float':
            case 'double':
                return typeof value === 'number';
            case 'bytes':
                return value instanceof Uint8Array;
            case 'string':
                return typeof value === 'string';
            default:
                const namedSchema = this.namedSchemas.get(schema);
                return namedSchema ? this.validateValueAgainstSchema(value, namedSchema) : false;
        }
    }
    validateValueAgainstRecord(value, schema) {
        if (typeof value !== 'object' || value === null)
            return false;
        const obj = value;
        for (const field of schema.fields) {
            const fieldValue = obj[field.name];
            if (fieldValue === undefined && field.default === undefined)
                return false;
            if (fieldValue !== undefined && !this.validateValueAgainstSchema(fieldValue, field.type))
                return false;
        }
        return true;
    }
    validateValueAgainstEnum(value, schema) {
        return typeof value === 'string' && schema.symbols.includes(value);
    }
    validateValueAgainstArray(value, schema) {
        if (!Array.isArray(value))
            return false;
        return value.every((item) => this.validateValueAgainstSchema(item, schema.items));
    }
    validateValueAgainstMap(value, schema) {
        if (typeof value !== 'object' || value === null)
            return false;
        const obj = value;
        return Object.values(obj).every((val) => this.validateValueAgainstSchema(val, schema.values));
    }
    validateValueAgainstFixed(value, schema) {
        return value instanceof Uint8Array && value.length === schema.size;
    }
    getSchemaTypeName(schema) {
        if (typeof schema === 'string')
            return schema;
        if (Array.isArray(schema))
            return 'union';
        return schema.type;
    }
    getFullName(name, namespace) {
        return namespace ? `${namespace}.${name}` : name;
    }
}
exports.AvroSchemaValidator = AvroSchemaValidator;
//# sourceMappingURL=AvroSchemaValidator.js.map