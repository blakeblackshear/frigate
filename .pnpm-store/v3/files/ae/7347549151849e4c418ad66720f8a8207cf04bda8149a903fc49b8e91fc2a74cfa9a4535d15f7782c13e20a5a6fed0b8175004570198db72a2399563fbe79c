/* eslint-disable no-console, @typescript-eslint/ban-ts-comment */
import * as yup from 'yup';
import { yupResolver } from '..';
import {
  fields,
  invalidData,
  schema,
  schemaWithWhen,
  validData,
} from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('yupResolver', () => {
  it('should return values from yupResolver when validation pass', async () => {
    const schemaSpy = vi.spyOn(schema, 'validate');
    const schemaSyncSpy = vi.spyOn(schema, 'validateSync');

    const result = await yupResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(schemaSpy).toHaveBeenCalledTimes(1);
    expect(schemaSyncSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return values from yupResolver with `mode: sync` when validation pass', async () => {
    const validateSyncSpy = vi.spyOn(schema, 'validateSync');
    const validateSpy = vi.spyOn(schema, 'validate');

    const result = await yupResolver(schema, undefined, {
      mode: 'sync',
    })(validData, undefined, { fields, shouldUseNativeValidation });

    expect(validateSyncSpy).toHaveBeenCalledTimes(1);
    expect(validateSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from yupResolver when validation fails', async () => {
    const result = await yupResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return a single error from yupResolver with `mode: sync` when validation fails', async () => {
    const validateSyncSpy = vi.spyOn(schema, 'validateSync');
    const validateSpy = vi.spyOn(schema, 'validate');

    const result = await yupResolver(schema, undefined, {
      mode: 'sync',
    })(invalidData, undefined, { fields, shouldUseNativeValidation });

    expect(validateSyncSpy).toHaveBeenCalledTimes(1);
    expect(validateSpy).not.toHaveBeenCalled();
    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from yupResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await yupResolver(schema)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from yupResolver when validation fails with `validateAllFieldCriteria` set to true and `mode: sync`', async () => {
    const result = await yupResolver(schema, undefined, { mode: 'sync' })(
      invalidData,
      undefined,
      {
        fields,
        criteriaMode: 'all',
        shouldUseNativeValidation,
      },
    );

    expect(result).toMatchSnapshot();
  });

  it('should return an error from yupResolver when validation fails and pass down the yup context', async () => {
    const data = { name: 'eric' };
    const context = { min: true };
    const schemaWithContext = yup.object({
      name: yup
        .string()
        .required()
        .when('$min', ([min], schema) => {
          return min ? schema.min(6) : schema;
        }),
    });

    const validateSpy = vi.spyOn(schemaWithContext, 'validate');

    const result = await yupResolver(schemaWithContext)(data, context, {
      fields,
      shouldUseNativeValidation,
    });
    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(validateSpy).toHaveBeenCalledWith(
      data,
      expect.objectContaining({
        abortEarly: false,
        context,
      }),
    );
    expect(result).toMatchSnapshot();
  });

  it('should return correct error message with using yup.test', async () => {
    const result = await yupResolver(
      yup
        .object({
          name: yup.string(),
          email: yup.string(),
        })
        .test(
          'name',
          'Email or name are required',
          (value) => !!(value && (value.name || value.email)),
        ),
    )({ name: '', email: '' }, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it("should merge default yup resolver options with yup's options", async () => {
    const validateSpy = vi.spyOn(schema, 'validate');

    await yupResolver(schema, { stripUnknown: true })(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(validateSpy.mock.calls[0][1]).toEqual(
      expect.objectContaining({ stripUnknown: true, abortEarly: false }),
    );
  });

  it('should throw an error without inner property', async () => {
    const result = await yupResolver(schemaWithWhen)(
      { name: 'test', value: '' },
      undefined,
      {
        fields,
        shouldUseNativeValidation,
      },
    );

    expect(result).toMatchSnapshot();
  });

  it('should throw any error unrelated to Yup', async () => {
    const schemaWithCustomError = schema.transform(() => {
      throw Error('custom error');
    });
    const promise = yupResolver(schemaWithCustomError)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    await expect(promise).rejects.toThrow('custom error');
  });

  it('should return values from yupResolver when validation pass & raw=true', async () => {
    const schemaSpy = vi.spyOn(schema, 'validate');
    const schemaSyncSpy = vi.spyOn(schema, 'validateSync');

    const result = await yupResolver(schema, undefined, { raw: true })(
      validData,
      undefined,
      {
        fields,
        shouldUseNativeValidation,
      },
    );

    expect(schemaSpy).toHaveBeenCalledTimes(1);
    expect(schemaSyncSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('shoud validate a lazy schema with success', async () => {
    const lazySchema = yup.lazy(() =>
      yup.object().shape({ firstName: yup.string().optional() }),
    );

    const schemaSpy = vi.spyOn(lazySchema, 'validate');
    const schemaSyncSpy = vi.spyOn(lazySchema, 'validateSync');

    const result = await yupResolver(lazySchema, undefined)(
      { firstName: 'resolver' },
      undefined,
      {
        fields: {
          firstName: {
            ref: { name: 'firstName' },
            name: 'firstName',
          },
        },
        shouldUseNativeValidation,
      },
    );

    expect(schemaSpy).toHaveBeenCalledTimes(1);
    expect(schemaSyncSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ errors: {}, values: { firstName: 'resolver' } });
  });
});
