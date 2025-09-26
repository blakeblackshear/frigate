import { TypeCompiler } from '@sinclair/typebox/compiler';
import { typeboxResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('typeboxResolver (with compiler)', () => {
  const typecheck = TypeCompiler.Compile(schema);

  it('should return a single error from typeboxResolver when validation fails', async () => {
    const result = await typeboxResolver(typecheck)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from typeboxResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await typeboxResolver(typecheck)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should validate with success', async () => {
    const result = await typeboxResolver(typecheck)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({ errors: {}, values: validData });
  });
});
