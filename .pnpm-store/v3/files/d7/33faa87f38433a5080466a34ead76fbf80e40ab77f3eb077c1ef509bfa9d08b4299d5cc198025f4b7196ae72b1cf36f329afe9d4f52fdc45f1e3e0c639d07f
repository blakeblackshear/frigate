import { joiResolver } from '..';
import { fields, invalidData, schema, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('joiResolver', () => {
  it('should return values from joiResolver when validation pass', async () => {
    const validateAsyncSpy = vi.spyOn(schema, 'validateAsync');
    const validateSpy = vi.spyOn(schema, 'validate');

    const result = await joiResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(validateSpy).not.toHaveBeenCalled();
    expect(validateAsyncSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return values from joiResolver with `mode: sync` when validation pass', async () => {
    const validateAsyncSpy = vi.spyOn(schema, 'validateAsync');
    const validateSpy = vi.spyOn(schema, 'validate');

    const result = await joiResolver(schema, undefined, {
      mode: 'sync',
    })(validData, undefined, { fields, shouldUseNativeValidation });

    expect(validateAsyncSpy).not.toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from joiResolver when validation fails', async () => {
    const result = await joiResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return a single error from joiResolver with `mode: sync` when validation fails', async () => {
    const validateAsyncSpy = vi.spyOn(schema, 'validateAsync');
    const validateSpy = vi.spyOn(schema, 'validate');

    const result = await joiResolver(schema, undefined, {
      mode: 'sync',
    })(invalidData, undefined, { fields, shouldUseNativeValidation });

    expect(validateAsyncSpy).not.toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from joiResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await joiResolver(schema)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from joiResolver when validation fails with `validateAllFieldCriteria` set to true and `mode: sync`', async () => {
    const result = await joiResolver(schema, undefined, { mode: 'sync' })(
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

  it('should return values from joiResolver when validation pass and pass down the Joi context', async () => {
    const context = { value: 'context' };
    const validateAsyncSpy = vi.spyOn(schema, 'validateAsync');
    const validateSpy = vi.spyOn(schema, 'validate');

    const result = await joiResolver(schema)(validData, context, {
      fields,
      shouldUseNativeValidation,
    });

    expect(validateSpy).not.toHaveBeenCalled();
    expect(validateAsyncSpy).toHaveBeenCalledTimes(1);
    expect(validateAsyncSpy).toHaveBeenCalledWith(validData, {
      abortEarly: false,
      context,
    });
    expect(result).toEqual({ errors: {}, values: validData });
  });
});
