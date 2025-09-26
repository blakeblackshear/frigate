import * as typeschema from '@typeschema/main';
import { typeschemaResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

vi.mock('@typeschema/main', async (importOriginal) => {
  const module: object = await importOriginal();
  return { ...module };
});

describe('typeschemaResolver', () => {
  it('should return values from typeschemaResolver when validation pass & raw=true', async () => {
    const validateSpy = vi.spyOn(typeschema, 'validate');

    const result = await typeschemaResolver(schema, undefined, { raw: true })(
      validData,
      undefined,
      { fields, shouldUseNativeValidation },
    );

    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return parsed values from typeschemaResolver when validation pass', async () => {
    const validateSpy = vi.spyOn(typeschema, 'validate');

    const result = await typeschemaResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(result.errors).toEqual({});
    expect(result).toMatchSnapshot();
  });

  it('should return a single error from typeschemaResolver when validation fails', async () => {
    const result = await typeschemaResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from typeschemaResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await typeschemaResolver(schema)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should throw any error unrelated to TypeSchema', async () => {
    const schemaWithCustomError = schema.refine(() => {
      throw Error('custom error');
    });
    const promise = typeschemaResolver(schemaWithCustomError)(
      validData,
      undefined,
      { fields, shouldUseNativeValidation },
    );

    await expect(promise).rejects.toThrow('custom error');
  });
});
