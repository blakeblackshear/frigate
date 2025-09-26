"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XdrSchemaDecoder = void 0;
const Reader_1 = require("@jsonjoy.com/buffers/lib/Reader");
const XdrDecoder_1 = require("./XdrDecoder");
const XdrUnion_1 = require("./XdrUnion");
class XdrSchemaDecoder {
    constructor(reader = new Reader_1.Reader()) {
        this.reader = reader;
        this.decoder = new XdrDecoder_1.XdrDecoder(reader);
    }
    decode(data, schema) {
        this.reader.reset(data);
        return this.readValue(schema);
    }
    readValue(schema) {
        switch (schema.type) {
            case 'void':
                return this.decoder.readVoid();
            case 'int':
                return this.decoder.readInt();
            case 'unsigned_int':
                return this.decoder.readUnsignedInt();
            case 'boolean':
                return this.decoder.readBoolean();
            case 'hyper':
                return this.decoder.readHyper();
            case 'unsigned_hyper':
                return this.decoder.readUnsignedHyper();
            case 'float':
                return this.decoder.readFloat();
            case 'double':
                return this.decoder.readDouble();
            case 'quadruple':
                return this.decoder.readQuadruple();
            case 'enum':
                return this.readEnum(schema);
            case 'opaque':
                return this.readOpaque(schema);
            case 'vopaque':
                return this.readVarlenOpaque(schema);
            case 'string':
                return this.readString(schema);
            case 'array':
                return this.readArray(schema);
            case 'varray':
                return this.readVarlenArray(schema);
            case 'struct':
                return this.readStruct(schema);
            case 'union':
                return this.readUnion(schema);
            default:
                throw new Error(`Unknown schema type: ${schema.type}`);
        }
    }
    readEnum(schema) {
        const value = this.decoder.readEnum();
        for (const [name, enumValue] of Object.entries(schema.values)) {
            if (enumValue === value) {
                return name;
            }
        }
        return value;
    }
    readOpaque(schema) {
        return this.decoder.readOpaque(schema.size);
    }
    readVarlenOpaque(schema) {
        const data = this.decoder.readVarlenOpaque();
        if (schema.size !== undefined && data.length > schema.size) {
            throw new Error(`Variable-length opaque data size ${data.length} exceeds maximum ${schema.size}`);
        }
        return data;
    }
    readString(schema) {
        const str = this.decoder.readString();
        if (schema.size !== undefined && str.length > schema.size) {
            throw new Error(`String length ${str.length} exceeds maximum ${schema.size}`);
        }
        return str;
    }
    readArray(schema) {
        return this.decoder.readArray(schema.size, () => this.readValue(schema.elements));
    }
    readVarlenArray(schema) {
        const array = this.decoder.readVarlenArray(() => this.readValue(schema.elements));
        if (schema.size !== undefined && array.length > schema.size) {
            throw new Error(`Variable-length array size ${array.length} exceeds maximum ${schema.size}`);
        }
        return array;
    }
    readStruct(schema) {
        const struct = {};
        for (const [fieldSchema, fieldName] of schema.fields) {
            struct[fieldName] = this.readValue(fieldSchema);
        }
        return struct;
    }
    readUnion(schema) {
        const discriminant = this.decoder.readInt();
        for (const [armDiscriminant, armSchema] of schema.arms) {
            if (armDiscriminant === discriminant) {
                const value = this.readValue(armSchema);
                return new XdrUnion_1.XdrUnion(discriminant, value);
            }
        }
        if (schema.default) {
            const value = this.readValue(schema.default);
            return new XdrUnion_1.XdrUnion(discriminant, value);
        }
        throw new Error(`No matching union arm for discriminant: ${discriminant}`);
    }
}
exports.XdrSchemaDecoder = XdrSchemaDecoder;
//# sourceMappingURL=XdrSchemaDecoder.js.map