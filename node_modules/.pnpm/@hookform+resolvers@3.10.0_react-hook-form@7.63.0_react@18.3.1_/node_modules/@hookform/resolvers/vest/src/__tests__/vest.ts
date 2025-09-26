import { vestResolver } from '..';
import {
  fields,
  invalidData,
  validData,
  validationSuite,
} from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('vestResolver', () => {
  it('should return values from vestResolver when validation pass', async () => {
    expect(
      await vestResolver(validationSuite)(validData, undefined, {
        fields,
        shouldUseNativeValidation,
      }),
    ).toEqual({
      values: validData,
      errors: {},
    });
  });

  it('should return values from vestResolver with `mode: sync` when validation pass', async () => {
    expect(
      await vestResolver(validationSuite, undefined, {
        mode: 'sync',
      })(validData, undefined, { fields, shouldUseNativeValidation }),
    ).toEqual({
      values: validData,
      errors: {},
    });
  });

  it('should return single error message from vestResolver when validation fails and validateAllFieldCriteria set to false', async () => {
    expect(
      await vestResolver(validationSuite)(invalidData, undefined, {
        fields,
        shouldUseNativeValidation,
      }),
    ).toMatchSnapshot();
  });

  it('should return single error message from vestResolver when validation fails and validateAllFieldCriteria set to false and `mode: sync`', async () => {
    expect(
      await vestResolver(validationSuite, undefined, {
        mode: 'sync',
      })(invalidData, undefined, { fields, shouldUseNativeValidation }),
    ).toMatchSnapshot();
  });

  it('should return all the error messages from vestResolver when validation fails and validateAllFieldCriteria set to true', async () => {
    expect(
      await vestResolver(validationSuite)(
        invalidData,
        {},
        { fields, criteriaMode: 'all', shouldUseNativeValidation },
      ),
    ).toMatchSnapshot();
  });

  it('should return all the error messages from vestResolver when validation fails and validateAllFieldCriteria set to true and `mode: sync`', async () => {
    expect(
      await vestResolver(validationSuite, undefined, { mode: 'sync' })(
        invalidData,
        {},
        { fields, criteriaMode: 'all', shouldUseNativeValidation },
      ),
    ).toMatchSnapshot();
  });

  it('should call a suite with values, validated field names and a context as arguments', async () => {
    const suite = vi.fn(validationSuite) as any as typeof validationSuite;

    await vestResolver(suite)(
      validData,
      { some: 'context' },
      {
        fields: { username: fields.username },
        names: ['username'],
        shouldUseNativeValidation,
      },
    );

    expect(suite).toHaveBeenCalledTimes(1);
    expect(suite).toHaveBeenCalledWith(validData, ['username'], {
      some: 'context',
    });
  });
});
