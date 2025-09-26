import { typanionResolver } from '..';
import { fields, invalidData, isSchema, validData } from './__fixtures__/data';

const tmpObj = {
  validate: isSchema,
};

const shouldUseNativeValidation = false;

describe('typanionResolver', () => {
  it('should return values from typanionResolver when validation pass', async () => {
    const schemaSpy = vi.spyOn(tmpObj, 'validate');

    const result = await typanionResolver(schemaSpy as any)(
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

  it('should return a single error from typanionResolver when validation fails', async () => {
    const result = await typanionResolver(isSchema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });
});
