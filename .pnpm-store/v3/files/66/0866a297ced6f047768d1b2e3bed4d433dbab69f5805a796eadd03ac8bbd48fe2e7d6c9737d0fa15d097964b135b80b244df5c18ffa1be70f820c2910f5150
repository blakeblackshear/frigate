"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XdrSchemaEncoder = void 0;
const XdrEncoder_1 = require("./XdrEncoder");
const XdrUnion_1 = require("./XdrUnion");
class XdrSchemaEncoder {
    constructor(writer) {
        this.writer = writer;
        this.encoder = new XdrEncoder_1.XdrEncoder(writer);
    }
    encode(value, schema) {
        this.writer.reset();
        this.writeValue(value, schema);
        return this.writer.flush();
    }
    writeVoid(schema) {
        this.validateSchemaType(schema, 'void');
        this.encoder.writeVoid();
    }
    writeInt(value, schema) {
        this.validateSchemaType(schema, 'int');
        if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
            throw new Error('Value is not a valid 32-bit signed integer');
        }
        this.encoder.writeInt(value);
    }
    writeUnsignedInt(value, schema) {
        this.validateSchemaType(schema, 'unsigned_int');
        if (!Number.isInteger(value) || value < 0 || value > 4294967295) {
            throw new Error('Value is not a valid 32-bit unsigned integer');
        }
        this.encoder.writeUnsignedInt(value);
    }
    writeBoolean(value, schema) {
        this.validateSchemaType(schema, 'boolean');
        this.encoder.writeBoolean(value);
    }
    writeHyper(value, schema) {
        this.validateSchemaType(schema, 'hyper');
        this.encoder.writeHyper(value);
    }
    writeUnsignedHyper(value, schema) {
        this.validateSchemaType(schema, 'unsigned_hyper');
        if ((typeof value === 'number' && value < 0) || (typeof value === 'bigint' && value < BigInt(0))) {
            throw new Error('Value is not a valid unsigned integer');
        }
        this.encoder.writeUnsignedHyper(value);
    }
    writeFloat(value, schema) {
        this.validateSchemaType(schema, 'float');
        this.encoder.writeFloat(value);
    }
    writeDouble(value, schema) {
        this.validateSchemaType(schema, 'double');
        this.encoder.writeDouble(value);
    }
    writeQuadruple(value, schema) {
        this.validateSchemaType(schema, 'quadruple');
        this.encoder.writeQuadruple(value);
    }
    writeEnum(value, schema) {
        if (schema.type !== 'enum') {
            throw new Error('Schema is not an enum schema');
        }
        if (!(value in schema.values)) {
            throw new Error(`Invalid enum value: ${value}`);
        }
        this.encoder.writeInt(schema.values[value]);
    }
    writeOpaque(value, schema) {
        if (schema.type !== 'opaque') {
            throw new Error('Schema is not an opaque schema');
        }
        if (value.length !== schema.size) {
            throw new Error(`Opaque data length ${value.length} does not match schema size ${schema.size}`);
        }
        this.encoder.writeOpaque(value);
    }
    writeVarlenOpaque(value, schema) {
        if (schema.type !== 'vopaque') {
            throw new Error('Schema is not a variable-length opaque schema');
        }
        if (schema.size !== undefined && value.length > schema.size) {
            throw new Error(`Opaque data length ${value.length} exceeds maximum size ${schema.size}`);
        }
        this.encoder.writeVarlenOpaque(value);
    }
    writeString(value, schema) {
        if (schema.type !== 'string') {
            throw new Error('Schema is not a string schema');
        }
        if (schema.size !== undefined && value.length > schema.size) {
            throw new Error(`String length ${value.length} exceeds maximum size ${schema.size}`);
        }
        this.encoder.writeStr(value);
    }
    writeArray(value, schema) {
        if (schema.type !== 'array') {
            throw new Error('Schema is not an array schema');
        }
        if (value.length !== schema.size) {
            throw new Error(`Array length ${value.length} does not match schema size ${schema.size}`);
        }
        for (const item of value) {
            this.writeValue(item, schema.elements);
        }
    }
    writeVarlenArray(value, schema) {
        if (schema.type !== 'varray') {
            throw new Error('Schema is not a variable-length array schema');
        }
        if (schema.size !== undefined && value.length > schema.size) {
            throw new Error(`Array length ${value.length} exceeds maximum size ${schema.size}`);
        }
        this.encoder.writeUnsignedInt(value.length);
        for (const item of value) {
            this.writeValue(item, schema.elements);
        }
    }
    writeStruct(value, schema) {
        if (schema.type !== 'struct') {
            throw new Error('Schema is not a struct schema');
        }
        for (const [fieldSchema, fieldName] of schema.fields) {
            if (!(fieldName in value)) {
                throw new Error(`Missing required field: ${fieldName}`);
            }
            this.writeValue(value[fieldName], fieldSchema);
        }
    }
    writeUnion(value, schema, discriminant) {
        if (schema.type !== 'union') {
            throw new Error('Schema is not a union schema');
        }
        const arm = schema.arms.find(([armDiscriminant]) => armDiscriminant === discriminant);
        if (!arm) {
            if (schema.default) {
                this.writeDiscriminant(discriminant);
                this.writeValue(value, schema.default);
            }
            else {
                throw new Error(`No matching arm found for discriminant: ${discriminant}`);
            }
        }
        else {
            this.writeDiscriminant(discriminant);
            this.writeValue(value, arm[1]);
        }
    }
    writeNumber(value, schema) {
        switch (schema.type) {
            case 'int':
                this.writeInt(value, schema);
                break;
            case 'unsigned_int':
                this.writeUnsignedInt(value, schema);
                break;
            case 'hyper':
                this.writeHyper(value, schema);
                break;
            case 'unsigned_hyper':
                this.writeUnsignedHyper(value, schema);
                break;
            case 'float':
                this.writeFloat(value, schema);
                break;
            case 'double':
                this.writeDouble(value, schema);
                break;
            case 'quadruple':
                this.writeQuadruple(value, schema);
                break;
            default:
                throw new Error(`Schema type ${schema.type} is not a numeric type`);
        }
    }
    writeValue(value, schema) {
        switch (schema.type) {
            case 'void':
                this.encoder.writeVoid();
                break;
            case 'int':
                this.encoder.writeInt(value);
                break;
            case 'unsigned_int':
                this.encoder.writeUnsignedInt(value);
                break;
            case 'boolean':
                this.encoder.writeBoolean(value);
                break;
            case 'hyper':
                this.encoder.writeHyper(value);
                break;
            case 'unsigned_hyper':
                this.encoder.writeUnsignedHyper(value);
                break;
            case 'float':
                this.encoder.writeFloat(value);
                break;
            case 'double':
                this.encoder.writeDouble(value);
                break;
            case 'quadruple':
                this.encoder.writeQuadruple(value);
                break;
            case 'enum':
                this.writeEnum(value, schema);
                break;
            case 'opaque':
                this.writeOpaque(value, schema);
                break;
            case 'vopaque':
                this.writeVarlenOpaque(value, schema);
                break;
            case 'string':
                this.writeString(value, schema);
                break;
            case 'array':
                this.writeArray(value, schema);
                break;
            case 'varray':
                this.writeVarlenArray(value, schema);
                break;
            case 'struct':
                this.writeStruct(value, schema);
                break;
            case 'union':
                if (value instanceof XdrUnion_1.XdrUnion) {
                    this.writeUnion(value.value, schema, value.discriminant);
                }
                else {
                    throw new Error('Union values must be wrapped in XdrUnion class');
                }
                break;
            default:
                throw new Error(`Unknown schema type: ${schema.type}`);
        }
    }
    validateSchemaType(schema, expectedType) {
        if (schema.type !== expectedType) {
            throw new Error(`Expected schema type ${expectedType}, got ${schema.type}`);
        }
    }
    writeDiscriminant(discriminant) {
        if (typeof discriminant === 'number') {
            this.encoder.writeInt(discriminant);
        }
        else if (typeof discriminant === 'boolean') {
            this.encoder.writeBoolean(discriminant);
        }
        else {
            throw new Error('String discriminants require enum schema context');
        }
    }
}
exports.XdrSchemaEncoder = XdrSchemaEncoder;
//# sourceMappingURL=XdrSchemaEncoder.js.map