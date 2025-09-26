/* eslint-disable no-console, @typescript-eslint/ban-ts-comment */
import { nopeResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('nopeResolver', () => {
  it('should return values from nopeResolver when validation pass', async () => {
    const schemaSpy = vi.spyOn(schema, 'validate');

    const result = await nopeResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(schemaSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from nopeResolver when validation fails', async () => {
    const result = await nopeResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });
});
