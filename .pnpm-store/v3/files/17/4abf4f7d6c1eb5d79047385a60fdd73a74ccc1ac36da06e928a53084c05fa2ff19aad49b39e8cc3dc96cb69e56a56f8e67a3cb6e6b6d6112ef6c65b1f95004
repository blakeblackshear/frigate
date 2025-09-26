import { computedTypesResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('computedTypesResolver', () => {
  it('should return values from computedTypesResolver when validation pass', async () => {
    const result = await computedTypesResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from computedTypesResolver when validation fails', async () => {
    const result = await computedTypesResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should throw any error unrelated to computed-types', async () => {
    const schemaWithCustomError = schema.transform(() => {
      throw Error('custom error');
    });
    const promise = computedTypesResolver(schemaWithCustomError)(
      validData,
      undefined,
      {
        fields,
        shouldUseNativeValidation,
      },
    );

    await expect(promise).rejects.toThrow('custom error');
  });
});
