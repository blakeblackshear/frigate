import { ioTsResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('ioTsResolver', () => {
  it('should return values from ioTsResolver when validation pass', async () => {
    const validateSpy = vi.spyOn(schema, 'decode');

    const result = ioTsResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(validateSpy).toHaveBeenCalled();
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from ioTsResolver when validation fails', () => {
    const result = ioTsResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from ioTsResolver when validation fails with `validateAllFieldCriteria` set to true', () => {
    const result = ioTsResolver(schema)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });
});
