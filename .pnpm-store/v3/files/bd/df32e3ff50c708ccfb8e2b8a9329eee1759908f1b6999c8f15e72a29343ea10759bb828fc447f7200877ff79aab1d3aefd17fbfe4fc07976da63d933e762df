import * as t from 'io-ts';
import * as tt from 'io-ts-types';

import { Field, InternalFieldName } from 'react-hook-form';

export const schema = t.intersection([
  t.type({
    username: tt.NonEmptyString,
    password: tt.NonEmptyString,
    accessToken: tt.UUID,
    birthYear: t.number,
    email: t.string,
    tags: t.array(
      t.type({
        name: t.string,
      }),
    ),
    luckyNumbers: t.array(t.number),
    enabled: t.boolean,
    animal: t.union([
      t.string,
      t.number,
      t.literal('bird'),
      t.literal('snake'),
    ]),
    vehicles: t.array(
      t.union([
        t.type({
          type: t.literal('car'),
          brand: t.string,
          horsepower: t.number,
        }),
        t.type({
          type: t.literal('bike'),
          speed: t.number,
        }),
      ]),
    ),
  }),
  t.partial({
    like: t.array(
      t.type({
        id: tt.withMessage(
          t.number,
          (i) => `this id is very important but you passed: ${typeof i}(${i})`,
        ),
        name: t.string,
      }),
    ),
  }),
]);

interface Data {
  username: string;
  password: string;
  accessToken: string;
  birthYear?: number;
  luckyNumbers: number[];
  email?: string;
  animal: string | number;
  tags: { name: string }[];
  enabled: boolean;
  like: { id: number; name: string }[];
  vehicles: Array<
    | { type: 'car'; brand: string; horsepower: number }
    | { type: 'bike'; speed: number }
  >;
}

export const validData: Data = {
  username: 'Doe',
  password: 'Password123',
  accessToken: 'c2883927-5178-4ad1-bbee-07ba33a5de19',
  birthYear: 2000,
  email: 'john@doe.com',
  tags: [{ name: 'test' }],
  enabled: true,
  luckyNumbers: [17, 5],
  animal: 'cat',
  like: [
    {
      id: 1,
      name: 'name',
    },
  ],
  vehicles: [{ type: 'car', brand: 'BMW', horsepower: 150 }],
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
