import { Field, InternalFieldName } from 'react-hook-form';
import {
  Infer,
  array,
  boolean,
  define,
  max,
  min,
  number,
  object,
  optional,
  pattern,
  size,
  string,
  union,
} from 'superstruct';

const Password = define(
  'Password',
  (value, ctx) => value === ctx.branch[0].password,
);

export const schema = object({
  username: size(pattern(string(), /^\w+$/), 3, 30),
  password: pattern(string(), /^[a-zA-Z0-9]{3,30}/),
  repeatPassword: Password,
  accessToken: optional(union([string(), number()])),
  birthYear: optional(max(min(number(), 1900), 2013)),
  email: optional(pattern(string(), /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)),
  tags: array(string()),
  enabled: boolean(),
  like: optional(array(object({ id: number(), name: size(string(), 4) }))),
});

export const validData: Infer<typeof schema> = {
  username: 'Doe',
  password: 'Password123',
  repeatPassword: 'Password123',
  birthYear: 2000,
  email: 'john@doe.com',
  tags: ['tag1', 'tag2'],
  enabled: true,
  like: [
    {
      id: 1,
      name: 'name',
    },
  ],
};

export const invalidData = {
  password: '___',
  email: '',
  birthYear: 'birthYear',
  like: [{ id: 'z' }],
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
