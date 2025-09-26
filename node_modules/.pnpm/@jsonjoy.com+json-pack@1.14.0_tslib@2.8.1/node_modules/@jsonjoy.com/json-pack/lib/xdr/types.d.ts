export type XdrSchema = XdrPrimitiveSchema | XdrWidePrimitiveSchema | XdrCompositeSchema;
export type XdrPrimitiveSchema = XdrVoidSchema | XdrIntSchema | XdrUnsignedIntSchema | XdrEnumSchema | XdrBooleanSchema | XdrHyperSchema | XdrUnsignedHyperSchema | XdrFloatSchema | XdrDoubleSchema | XdrQuadrupleSchema;
export type XdrVoidSchema = XdrBaseSchema<'void'>;
export type XdrIntSchema = XdrBaseSchema<'int'>;
export type XdrUnsignedIntSchema = XdrBaseSchema<'unsigned_int'>;
export interface XdrEnumSchema extends XdrBaseSchema<'enum'> {
    values: Record<string, number>;
}
export type XdrBooleanSchema = XdrBaseSchema<'boolean'>;
export type XdrHyperSchema = XdrBaseSchema<'hyper'>;
export type XdrUnsignedHyperSchema = XdrBaseSchema<'unsigned_hyper'>;
export type XdrFloatSchema = XdrBaseSchema<'float'>;
export type XdrDoubleSchema = XdrBaseSchema<'double'>;
export type XdrQuadrupleSchema = XdrBaseSchema<'quadruple'>;
export type XdrWidePrimitiveSchema = XdrOpaqueSchema | XdrVarlenOpaqueSchema | XdrStringSchema;
export interface XdrOpaqueSchema extends XdrBaseSchema<'opaque'> {
    size: number;
}
export interface XdrVarlenOpaqueSchema extends XdrBaseSchema<'vopaque'> {
    size?: number;
}
export interface XdrStringSchema extends XdrBaseSchema<'string'> {
    size?: number;
}
export type XdrCompositeSchema = XdrArraySchema | XdrVarlenArraySchema | XdrStructSchema | XdrUnionSchema;
export interface XdrArraySchema extends XdrBaseSchema<'array'> {
    elements: XdrSchema;
    size: number;
}
export interface XdrVarlenArraySchema extends XdrBaseSchema<'varray'> {
    elements: XdrSchema;
    size?: number;
}
export interface XdrStructSchema extends XdrBaseSchema<'struct'> {
    fields: [schema: XdrSchema, name: string][];
}
export interface XdrUnionSchema extends XdrBaseSchema<'union'> {
    type: 'union';
    arms: [discriminant: number | string | boolean, schema: XdrSchema][];
    default?: XdrSchema;
}
export interface XdrBaseSchema<Type extends string> {
    type: Type;
}
