import { FieldValues, Resolver } from 'react-hook-form';
import * as Yup from 'yup';
export declare function yupResolver<TFieldValues extends FieldValues>(schema: Yup.ObjectSchema<TFieldValues> | ReturnType<typeof Yup.lazy<Yup.ObjectSchema<TFieldValues>>>, schemaOptions?: Parameters<(typeof schema)['validate']>[1], resolverOptions?: {
    /**
     * @default async
     */
    mode?: 'async' | 'sync';
    /**
     * Return the raw input values rather than the parsed values.
     * @default false
     */
    raw?: boolean;
}): Resolver<Yup.InferType<typeof schema>>;
