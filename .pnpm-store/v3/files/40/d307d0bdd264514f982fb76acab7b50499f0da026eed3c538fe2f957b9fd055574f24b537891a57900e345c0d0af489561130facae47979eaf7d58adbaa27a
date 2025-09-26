import vine from '@vinejs/vine';
import { Infer } from '@vinejs/vine/build/src/types';
import { Field, InternalFieldName } from 'react-hook-form';

export const schema = vine.compile(
  vine.object({
    username: vine.string().regex(/^\w+$/).minLength(3).maxLength(30),
    password: vine
      .string()
      .regex(new RegExp('.*[A-Z].*'))
      .regex(new RegExp('.*[a-z].*'))
      .regex(new RegExp('.*\\d.*'))
      .regex(new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'))
      .minLength(8)
      .confirmed({ confirmationField: 'repeatPassword' }),
    repeatPassword: vine.string().sameAs('password'),
    accessToken: vine.unionOfTypes([vine.string(), vine.number()]),
    birthYear: vine.number().min(1900).max(2013),
    email: vine.string().email().optional(),
    tags: vine.array(vine.string()),
    enabled: vine.boolean(),
    like: vine.array(
      vine.object({
        id: vine.number(),
        name: vine.string().fixedLength(4),
      }),
    ),
    dateStr: vine
      .string()
      .transform((value: string) => new Date(value).toISOString()),
  }),
);

export const validData: Infer<typeof schema> = {
  username: 'Doe',
  password: 'Password123_',
  repeatPassword: 'Password123_',
  birthYear: 2000,
  email: 'john@doe.com',
  tags: ['tag1', 'tag2'],
  enabled: true,
  accessToken: 'accessToken',
  like: [
    {
      id: 1,
      name: 'name',
    },
  ],
  dateStr: '2020-01-01T00:00:00.000Z',
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
