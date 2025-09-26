import { vineResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('vineResolver', () => {
  it('should return values from vineResolver when validation pass', async () => {
    const schemaSpy = vi.spyOn(schema, 'validate');

    const result = await vineResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(schemaSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from vineResolver when validation fails', async () => {
    const result = await vineResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from vineResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await vineResolver(schema)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return values from vineResolver when validation pass & raw=true', async () => {
    const schemaSpy = vi.spyOn(schema, 'validate');

    const result = await vineResolver(schema, undefined, { raw: true })(
      validData,
      undefined,
      {
        fields,
        shouldUseNativeValidation,
      },
    );

    expect(schemaSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });
});
