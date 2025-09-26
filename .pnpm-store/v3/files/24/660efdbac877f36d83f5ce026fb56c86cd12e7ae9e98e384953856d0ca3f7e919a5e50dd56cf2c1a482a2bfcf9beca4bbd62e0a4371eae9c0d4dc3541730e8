import { Expose, Type } from 'class-transformer';
import * as classValidator from 'class-validator';
import { IsDefined, IsNumber, Max, Min } from 'class-validator';
/* eslint-disable no-console, @typescript-eslint/ban-ts-comment */
import { classValidatorResolver } from '..';
import { Schema, fields, invalidData, validData } from './__fixtures__/data';

const shouldUseNativeValidation = false;

describe('classValidatorResolver', () => {
  it('should return values from classValidatorResolver when validation pass', async () => {
    const schemaSpy = vi.spyOn(classValidator, 'validate');
    const schemaSyncSpy = vi.spyOn(classValidator, 'validateSync');

    const result = await classValidatorResolver(Schema)(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(schemaSpy).toHaveBeenCalledTimes(1);
    expect(schemaSyncSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ errors: {}, values: validData });
    expect(result.values).toBeInstanceOf(Schema);
  });

  it('should return values as a raw object from classValidatorResolver when `rawValues` set to true', async () => {
    const result = await classValidatorResolver(Schema, undefined, {
      rawValues: true,
    })(validData, undefined, {
      fields,
      shouldUseNativeValidation,
    });

    expect(result).toEqual({ errors: {}, values: validData });
    expect(result.values).not.toBeInstanceOf(Schema);
  });

  it('should return values from classValidatorResolver with `mode: sync` when validation pass', async () => {
    const validateSyncSpy = vi.spyOn(classValidator, 'validateSync');
    const validateSpy = vi.spyOn(classValidator, 'validate');

    const result = await classValidatorResolver(Schema, undefined, {
      mode: 'sync',
    })(validData, undefined, { fields, shouldUseNativeValidation });

    expect(validateSyncSpy).toHaveBeenCalledTimes(1);
    expect(validateSpy).not.toHaveBeenCalled();
    expect(result).toEqual({ errors: {}, values: validData });
    expect(result.values).toBeInstanceOf(Schema);
  });

  it('should return a single error from classValidatorResolver when validation fails', async () => {
    const result = await classValidatorResolver(Schema)(
      invalidData,
      undefined,
      {
        fields,
        shouldUseNativeValidation,
      },
    );

    expect(result).toMatchSnapshot();
  });

  it('should return a single error from classValidatorResolver with `mode: sync` when validation fails', async () => {
    const validateSyncSpy = vi.spyOn(classValidator, 'validateSync');
    const validateSpy = vi.spyOn(classValidator, 'validate');

    const result = await classValidatorResolver(Schema, undefined, {
      mode: 'sync',
    })(invalidData, undefined, { fields, shouldUseNativeValidation });

    expect(validateSyncSpy).toHaveBeenCalledTimes(1);
    expect(validateSpy).not.toHaveBeenCalled();
    expect(result).toMatchSnapshot();
  });

  it('should return all the errors from classValidatorResolver when validation fails with `validateAllFieldCriteria` set to true', async () => {
    const result = await classValidatorResolver(Schema)(
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

  it('should return all the errors from classValidatorResolver when validation fails with `validateAllFieldCriteria` set to true and `mode: sync`', async () => {
    const result = await classValidatorResolver(Schema, undefined, {
      mode: 'sync',
    })(invalidData, undefined, {
      fields,
      criteriaMode: 'all',
      shouldUseNativeValidation,
    });

    expect(result).toMatchSnapshot();
  });
});

it('validate data with transformer option', async () => {
  class SchemaTest {
    @Expose({ groups: ['find', 'create', 'update'] })
    @Type(() => Number)
    @IsDefined({
      message: `All fields must be defined.`,
      groups: ['publish'],
    })
    @IsNumber({}, { message: `Must be a number`, always: true })
    @Min(0, { message: `Cannot be lower than 0`, always: true })
    @Max(255, { message: `Cannot be greater than 255`, always: true })
    random: number;
  }

  const result = await classValidatorResolver(
    SchemaTest,
    { transformer: { groups: ['update'] } },
    {
      mode: 'sync',
    },
  )(invalidData, undefined, {
    fields,
    criteriaMode: 'all',
    shouldUseNativeValidation,
  });

  expect(result).toMatchSnapshot();
});

it('validate data with validator option', async () => {
  class SchemaTest {
    @Expose({ groups: ['find', 'create', 'update'] })
    @Type(() => Number)
    @IsDefined({
      message: `All fields must be defined.`,
      groups: ['publish'],
    })
    @IsNumber({}, { message: `Must be a number`, always: true })
    @Min(0, { message: `Cannot be lower than 0`, always: true })
    @Max(255, { message: `Cannot be greater than 255`, always: true })
    random: number;
  }

  const result = await classValidatorResolver(
    SchemaTest,
    { validator: { stopAtFirstError: true } },
    {
      mode: 'sync',
    },
  )(invalidData, undefined, {
    fields,
    criteriaMode: 'all',
    shouldUseNativeValidation,
  });

  expect(result).toMatchSnapshot();
});

it('should return from classValidatorResolver with `excludeExtraneousValues` set to true', async () => {
  class SchemaTest {
    @Expose()
    @IsNumber({}, { message: `Must be a number`, always: true })
    random: number;
  }

  const result = await classValidatorResolver(SchemaTest, {
    transformer: {
      excludeExtraneousValues: true,
    },
  })(
    {
      random: 10,
      extraneousField: true,
    },
    undefined,
    {
      fields,
      shouldUseNativeValidation,
    },
  );

  expect(result).toEqual({ errors: {}, values: { random: 10 } });
  expect(result.values).toBeInstanceOf(SchemaTest);
});
