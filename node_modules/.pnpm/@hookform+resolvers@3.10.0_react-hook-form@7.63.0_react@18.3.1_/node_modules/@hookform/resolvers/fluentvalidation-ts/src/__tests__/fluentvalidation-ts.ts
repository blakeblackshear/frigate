/* eslint-disable no-console, @typescript-eslint/ban-ts-comment */
import { fluentValidationResolver } from '..';
import {
  SchemaValidator,
  fields,
  invalidData,
  validData,
} from './__fixtures__/data';

const shouldUseNativeValidation = false;

const validator = new SchemaValidator();

describe('fluentValidationResolver', () => {
  it('should return values from fluentValidationResolver when validation pass', async () => {
    const validatorSpy = vi.spyOn(validator, 'validate');

    const result = await fluentValidationResolver(validator)(
      validData,
      undefined,
      {
        fields,
        shouldUseNativeValidation,
      },
    );

    expect(validatorSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return values from fluentValidationResolver with `mode: sync` when validation pass', async () => {
    const validatorSpy = vi.spyOn(validator, 'validate');

    const result = await fluentValidationResolver(validator)(
      validData,
      undefined,
      { fields, shouldUseNativeValidation },
    );

    expect(validatorSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from fluentValidationResolver when validation fails', async () => {
    const result = await fluentValidationResolver(validator)(
      invalidData,
      undefined,
      {
        fields,
        shouldUseNativeValidation,
      },
    );

    expect(result).toMatchSnapshot();
  });

  it('should return a single error from fluentValidationResolver with `mode: sync` when validation fails', async () => {
    const validateSpy = vi.spyOn(validator, 'validate');

    const result = await fluentValidationResolver(validator)(
      invalidData,
      undefined,
      { fields, shouldUseNativeValidation },
    );

    expect(validateSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from fluentValidationResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await fluentValidationResolver(validator)(
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

  it('should return all the errors from fluentValidationResolver when validation fails with `validateAllFieldCriteria` set to true and `mode: sync`', async () => {
    const result = await fluentValidationResolver(validator)(
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

  it('should return values from fluentValidationResolver when validation pass & raw=true', async () => {
    const schemaSpy = vi.spyOn(validator, 'validate');

    const result = await fluentValidationResolver(validator)(
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
