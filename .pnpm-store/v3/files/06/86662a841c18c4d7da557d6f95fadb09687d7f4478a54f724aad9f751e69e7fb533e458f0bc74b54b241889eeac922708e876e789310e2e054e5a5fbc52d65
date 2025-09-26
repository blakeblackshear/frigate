import { Static, Type } from '@sinclair/typebox';
import { Field, InternalFieldName } from 'react-hook-form';

export const schema = Type.Object({
  username: Type.String({
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9]+$',
  }),
  password: Type.String({
    minLength: 8,
    pattern: '^(.*[A-Za-z\\d].*)$',
  }),
  repeatPassword: Type.String(),
  accessToken: Type.Union([Type.String(), Type.Number()]),
  birthYear: Type.Optional(
    Type.Number({
      minimum: 1900,
      maximum: 2013,
    }),
  ),
  email: Type.Optional(
    Type.RegExp(
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    ),
  ),
  tags: Type.Array(Type.String()),
  enabled: Type.Boolean(),
  like: Type.Optional(
    Type.Array(
      Type.Object({
        id: Type.Number(),
        name: Type.String({ minLength: 4, maxLength: 4 }),
      }),
    ),
  ),
  dateStr: Type.Date(),
});

export const validData: Static<typeof schema> = {
  username: 'Doe',
  password: 'Password123_',
  repeatPassword: 'Password123_',
  birthYear: 2000,
  email: 'google@gmail.com',
  tags: ['tag1', 'tag2'],
  enabled: true,
  accessToken: 'accessToken',
  like: [
    {
      id: 1,
      name: 'name',
    },
  ],
  dateStr: new Date(),
};

export const invalidData = {
  password: '___',
  email: '',
  birthYear: 'birthYear',
  like: [{ id: 'z' }],
  url: 'abc',
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
