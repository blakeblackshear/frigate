import * as valibot from 'valibot';
/* eslint-disable no-console, @typescript-eslint/ban-ts-comment */
import { valibotResolver } from '..';
import {
  fields,
  invalidData,
  invalidSchemaErrorData,
  schema,
  schemaError,
  validData,
  validSchemaErrorData,
} from './__fixtures__/data';

const shouldUseNativeValidation = false;
describe('valibotResolver', () => {
  it('should return parsed values from valibotResolver with `mode: sync` when validation pass', async () => {
    vi.mock('valibot', async () => {
      const a = await vi.importActual<any>('valibot');
      return {
        __esModule: true,
        ...a,
      };
    });
    const funcSpy = vi.spyOn(valibot, 'safeParseAsync');

    const result = await valibotResolver(schema, undefined, {
      mode: 'sync',
    })(validData, undefined, { fields, shouldUseNativeValidation });

    expect(funcSpy).toHaveBeenCalledTimes(1);
    expect(result.errors).toEqual({});
    expect(result).toMatchSnapshot();
  });

  it('should return a single error from valibotResolver with `mode: sync` when validation fails', async () => {
    vi.mock('valibot', async () => {
      const a = await vi.importActual<any>('valibot');
      return {
        __esModule: true,
        ...a,
      };
    });
    const funcSpy = vi.spyOn(valibot, 'safeParseAsync');

    const result = await valibotResolver(schema, undefined, {
      mode: 'sync',
    })(invalidData, undefined, { fields, shouldUseNativeValidation });

    expect(funcSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchSnapshot();
  });

  it('should return values from valibotResolver when validation pass', async () => {
    const result = await valibotResolver(schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return a single error from valibotResolver when validation fails', async () => {
    const result = await valibotResolver(schema)(invalidData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return values from valibotResolver when validation pass & raw=true', async () => {
    const result = await valibotResolver(schema, undefined, {
      raw: true,
    })(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({ errors: {}, values: validData });
  });

  it('should return all the errors from valibotResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await valibotResolver(schema)(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from valibotResolver when validation fails with `validateAllFieldCriteria` set to true and `mode: sync`', async () => {
    const result = await valibotResolver(schema, undefined, { mode: 'sync' })(
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

  it('should be able to validate variants without errors', async () => {
    const result = await valibotResolver(schemaError, undefined, {
      mode: 'sync',
    })(validSchemaErrorData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({
      errors: {},
      values: {
        type: 'a',
      },
    });
  });

  it('should be able to validate variants with errors', async () => {
    const result = await valibotResolver(schemaError, undefined, {
      mode: 'sync',
    })(invalidSchemaErrorData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({
      errors: {
        type: {
          message: 'Invalid type: Expected "a" | "b" but received "c"',
          ref: undefined,
          type: 'variant',
        },
      },
      values: {},
    });
  });
});
