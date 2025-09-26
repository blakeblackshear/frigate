"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvroSchemaDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const AvroDecoder_1 = require("./AvroDecoder");
const AvroSchemaValidator_1 = require("./AvroSchemaValidator");
class AvroSchemaDecoder {
    constructor(reader = new Reader_1.Reader()) {
        this.reader = reader;
        this.namedSchemas = new Map();
        this.decoder = new AvroDecoder_1.AvroDecoder();
        this.decoder.reader = reader;
        this.validator = new AvroSchemaValidator_1.AvroSchemaValidator();
    }
    decode(data, schema) {
        this.reader.reset(data);
        this.namedSchemas.clear();
        if (!this.validator.validateSchema(schema)) {
            throw new Error('Invalid Avro schema');
        }
        this.collectNamedSchemas(schema);
        return this.readValue(schema);
    }
    readValue(schema) {
        const resolvedSchema = this.resolveSchema(schema);
        if (typeof resolvedSchema === 'string') {
            switch (resolvedSchema) {
                case 'null':
                    return this.decoder.readNull();
                case 'boolean':
                    return this.decoder.readBoolean();
                case 'int':
                    return this.decoder.readInt();
                case 'long':
                    return this.decoder.readLong();
                case 'float':
                    return this.decoder.readFloat();
                case 'double':
                    return this.decoder.readDouble();
                case 'bytes':
                    return this.decoder.readBytes();
                case 'string':
                    return this.decoder.readString();
                default:
                    throw new Error(`Unknown primitive type: ${resolvedSchema}`);
            }
        }
        if (Array.isArray(resolvedSchema)) {
            return this.readUnion(resolvedSchema);
        }
        switch (resolvedSchema.type) {
            case 'record':
                return this.readRecord(resolvedSchema);
            case 'enum':
                return this.readEnum(resolvedSchema);
            case 'array':
                return this.readArray(resolvedSchema);
            case 'map':
                return this.readMap(resolvedSchema);
            case 'fixed':
                return this.readFixed(resolvedSchema);
            default:
                throw new Error(`Unknown schema type: ${resolvedSchema.type}`);
        }
    }
    readRecord(schema) {
        const result = {};
        for (let i = 0; i < schema.fields.length; i++) {
            const field = schema.fields[i];
            try {
                result[field.name] = this.readValue(field.type);
            }
            catch (error) {
                throw new Error(`Error reading field '${field.name}': ${error.message}`);
            }
        }
        return result;
    }
    readEnum(schema) {
        const index = this.decoder.readEnum();
        if (index < 0 || index >= schema.symbols.length) {
            throw new Error(`Invalid enum index ${index} for enum with ${schema.symbols.length} symbols`);
        }
        return schema.symbols[index];
    }
    readArray(schema) {
        return this.decoder.readArray(() => this.readValue(schema.items));
    }
    readMap(schema) {
        return this.decoder.readMap(() => this.readValue(schema.values));
    }
    readUnion(schema) {
        const schemaReaders = schema.map((subSchema) => () => this.readValue(subSchema));
        const result = this.decoder.readUnion(schemaReaders);
        return result.value;
    }
    readFixed(schema) {
        return this.decoder.readFixed(schema.size);
    }
    readNull(schema) {
        this.validateSchemaType(schema, 'null');
        return this.decoder.readNull();
    }
    readBoolean(schema) {
        this.validateSchemaType(schema, 'boolean');
        return this.decoder.readBoolean();
    }
    readInt(schema) {
        this.validateSchemaType(schema, 'int');
        const value = this.decoder.readInt();
        if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
            throw new Error('Decoded value is not a valid 32-bit integer');
        }
        return value;
    }
    readLong(schema) {
        this.validateSchemaType(schema, 'long');
        return this.decoder.readLong();
    }
    readFloat(schema) {
        this.validateSchemaType(schema, 'float');
        return this.decoder.readFloat();
    }
    readDouble(schema) {
        this.validateSchemaType(schema, 'double');
        return this.decoder.readDouble();
    }
    readBytes(schema) {
        this.validateSchemaType(schema, 'bytes');
        return this.decoder.readBytes();
    }
    readString(schema) {
        this.validateSchemaType(schema, 'string');
        return this.decoder.readString();
    }
    validateSchemaType(schema, expectedType) {
        const resolvedSchema = this.resolveSchema(schema);
        const actualType = typeof resolvedSchema === 'string'
            ? resolvedSchema
            : Array.isArray(resolvedSchema)
                ? 'union'
                : resolvedSchema.type;
        if (actualType !== expectedType) {
            throw new Error(`Expected schema type ${expectedType}, got ${actualType}`);
        }
    }
    resolveSchema(schema) {
        if (typeof schema === 'string') {
            const namedSchema = this.namedSchemas.get(schema);
            return namedSchema || schema;
        }
        return schema;
    }
    collectNamedSchemas(schema) {
        if (typeof schema === 'string' || Array.isArray(schema)) {
            return;
        }
        if (typeof schema === 'object' && schema !== null) {
            switch (schema.type) {
                case 'record':
                    const recordSchema = schema;
                    const recordFullName = this.getFullName(recordSchema.name, recordSchema.namespace);
                    this.namedSchemas.set(recordFullName, recordSchema);
                    recordSchema.fields.forEach((field) => this.collectNamedSchemas(field.type));
                    break;
                case 'enum':
                    const enumSchema = schema;
                    const enumFullName = this.getFullName(enumSchema.name, enumSchema.namespace);
                    this.namedSchemas.set(enumFullName, enumSchema);
                    break;
                case 'fixed':
                    const fixedSchema = schema;
                    const fixedFullName = this.getFullName(fixedSchema.name, fixedSchema.namespace);
                    this.namedSchemas.set(fixedFullName, fixedSchema);
                    break;
                case 'array':
                    this.collectNamedSchemas(schema.items);
                    break;
                case 'map':
                    this.collectNamedSchemas(schema.values);
                    break;
            }
        }
    }
    getFullName(name, namespace) {
        return namespace ? `${namespace}.${name}` : name;
    }
}
exports.AvroSchemaDecoder = AvroSchemaDecoder;
//# sourceMappingURL=AvroSchemaDecoder.js.map