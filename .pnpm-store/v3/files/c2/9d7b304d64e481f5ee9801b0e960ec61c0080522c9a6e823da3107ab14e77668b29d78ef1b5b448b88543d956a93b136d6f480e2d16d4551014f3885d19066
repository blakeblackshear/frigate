export interface AvroBaseSchema {
    type: string;
    doc?: string;
    [key: string]: any;
}
export interface AvroNullSchema extends AvroBaseSchema {
    type: 'null';
}
export interface AvroBooleanSchema extends AvroBaseSchema {
    type: 'boolean';
}
export interface AvroIntSchema extends AvroBaseSchema {
    type: 'int';
}
export interface AvroLongSchema extends AvroBaseSchema {
    type: 'long';
}
export interface AvroFloatSchema extends AvroBaseSchema {
    type: 'float';
}
export interface AvroDoubleSchema extends AvroBaseSchema {
    type: 'double';
}
export interface AvroBytesSchema extends AvroBaseSchema {
    type: 'bytes';
}
export interface AvroStringSchema extends AvroBaseSchema {
    type: 'string';
}
export interface AvroRecordField {
    name: string;
    type: AvroSchema;
    doc?: string;
    default?: any;
    order?: 'ascending' | 'descending' | 'ignore';
    aliases?: string[];
}
export interface AvroRecordSchema extends AvroBaseSchema {
    type: 'record';
    name: string;
    namespace?: string;
    fields: AvroRecordField[];
    aliases?: string[];
}
export interface AvroEnumSchema extends AvroBaseSchema {
    type: 'enum';
    name: string;
    namespace?: string;
    symbols: string[];
    default?: string;
    aliases?: string[];
}
export interface AvroArraySchema extends AvroBaseSchema {
    type: 'array';
    items: AvroSchema;
}
export interface AvroMapSchema extends AvroBaseSchema {
    type: 'map';
    values: AvroSchema;
}
export interface AvroUnionSchema extends Array<AvroSchema> {
}
export interface AvroFixedSchema extends AvroBaseSchema {
    type: 'fixed';
    name: string;
    namespace?: string;
    size: number;
    aliases?: string[];
}
export type AvroPrimitiveSchema = AvroNullSchema | AvroBooleanSchema | AvroIntSchema | AvroLongSchema | AvroFloatSchema | AvroDoubleSchema | AvroBytesSchema | AvroStringSchema;
export type AvroComplexSchema = AvroRecordSchema | AvroEnumSchema | AvroArraySchema | AvroMapSchema | AvroUnionSchema | AvroFixedSchema;
export type AvroSchema = AvroPrimitiveSchema | AvroComplexSchema | string;
export type AvroNamedSchema = AvroRecordSchema | AvroEnumSchema | AvroFixedSchema;
export interface AvroLogicalTypeSchema extends AvroBaseSchema {
    logicalType: string;
}
export interface AvroDecimalLogicalType extends AvroLogicalTypeSchema {
    logicalType: 'decimal';
    precision: number;
    scale?: number;
}
export interface AvroUuidLogicalType extends AvroStringSchema {
    logicalType: 'uuid';
}
export interface AvroDateLogicalType extends AvroIntSchema {
    logicalType: 'date';
}
export interface AvroTimeMillisLogicalType extends AvroIntSchema {
    logicalType: 'time-millis';
}
export interface AvroTimeMicrosLogicalType extends AvroLongSchema {
    logicalType: 'time-micros';
}
export interface AvroTimestampMillisLogicalType extends AvroLongSchema {
    logicalType: 'timestamp-millis';
}
export interface AvroTimestampMicrosLogicalType extends AvroLongSchema {
    logicalType: 'timestamp-micros';
}
export interface AvroLocalTimestampMillisLogicalType extends AvroLongSchema {
    logicalType: 'local-timestamp-millis';
}
export interface AvroLocalTimestampMicrosLogicalType extends AvroLongSchema {
    logicalType: 'local-timestamp-micros';
}
export interface AvroDurationLogicalType extends AvroFixedSchema {
    logicalType: 'duration';
    size: 12;
}
