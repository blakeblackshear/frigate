import { Schema } from 'effect';
import { Field, InternalFieldName } from 'react-hook-form';

export const schema = Schema.Struct({
  username: Schema.String.pipe(
    Schema.nonEmptyString({ message: () => 'A username is required' }),
  ),
  password: Schema.String.pipe(
    Schema.pattern(new RegExp('.*[A-Z].*'), {
      message: () => 'At least 1 uppercase letter.',
    }),
    Schema.pattern(new RegExp('.*[a-z].*'), {
      message: () => 'At least 1 lowercase letter.',
    }),
    Schema.pattern(new RegExp('.*\\d.*'), {
      message: () => 'At least 1 number.',
    }),
    Schema.pattern(
      new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
      {
        message: () => 'At least 1 special character.',
      },
    ),
    Schema.minLength(8, { message: () => 'Must be at least 8 characters.' }),
  ),
  accessToken: Schema.Union(Schema.String, Schema.Number),
  birthYear: Schema.Number.pipe(
    Schema.greaterThan(1900, {
      message: () => 'Must be greater than the year 1900',
    }),
    Schema.filter((value) => value < new Date().getFullYear(), {
      message: () => 'Must be before the current year.',
    }),
  ),
  email: Schema.String.pipe(
    Schema.pattern(
      new RegExp(
        /^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i,
      ),
      {
        message: () => 'A valid email address is required.',
      },
    ),
  ),
  tags: Schema.Array(
    Schema.Struct({
      name: Schema.String,
    }),
  ),
  luckyNumbers: Schema.Array(Schema.Number),
  enabled: Schema.Boolean,
  animal: Schema.Union(Schema.String, Schema.Literal('bird', 'snake')),
  vehicles: Schema.Array(
    Schema.Union(
      Schema.Struct({
        type: Schema.Literal('car'),
        brand: Schema.String,
        horsepower: Schema.Number,
      }),
      Schema.Struct({
        type: Schema.Literal('bike'),
        speed: Schema.Number,
      }),
    ),
  ),
});

export const validData: Schema.Schema.Type<typeof schema> = {
  accessToken: 'abcd1234',
  animal: 'dog',
  birthYear: 2000,
  email: 'johnDoe@here.there',
  enabled: true,
  luckyNumbers: [1, 2, 3, 4, 5],
  password: 'Super#Secret123',
  tags: [{ name: 'move' }, { name: 'over' }, { name: 'zod' }, { name: ';)' }],
  username: 'johnDoe',
  vehicles: [
    { type: 'bike', speed: 5 },
    { type: 'car', brand: 'BMW', horsepower: 150 },
  ],
};

export const invalidData = {
  username: 'test',
  password: 'Password123',
  repeatPassword: 'Password123',
  birthYear: 2000,
  accessToken: '1015d809-e99d-41ec-b161-981a3c243df8',
  email: 'john@doe.com',
  tags: [{ name: 'test' }],
  enabled: true,
  animal: ['dog'],
  luckyNumbers: [1, 2, '3'],
  like: [
    {
      id: '1',
      name: 'name',
    },
  ],
  vehicles: [
    { type: 'car', brand: 'BMW', horsepower: 150 },
    { type: 'car', brand: 'Mercedes' },
  ],
};

export const fields: Record<InternalFieldName, Field['_f']> = {
  username: {
    ref: { name: 'username' },
    name: 'username',
  },
  password: {
    ref: { name: 'password' },
    name: 'password',
  },
  email: {
    ref: { name: 'email' },
    name: 'email',
  },
  birthday: {
    ref: { name: 'birthday' },
    name: 'birthday',
  },
};
