import { typeboxResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('typeboxResolver', () => {
  it('should return a single error from typeboxResolver when validation fails', async () => {
    const result = await typeboxResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from typeboxResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await typeboxResolver(schema)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should validate with success', async () => {
    const result = await typeboxResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({ errors: {}, values: validData });
  });
});
