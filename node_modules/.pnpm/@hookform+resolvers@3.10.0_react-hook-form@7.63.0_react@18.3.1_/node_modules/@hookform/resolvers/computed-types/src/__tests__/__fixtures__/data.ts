import Schema, { Type, string, number, array, boolean } from 'computed-types';
import { Field, InternalFieldName } from 'react-hook-form';

export const schema = Schema({
  username: string.regexp(/^\w+$/).min(3).max(30),
  password: string
    .regexp(new RegExp('.*[A-Z].*'), 'One uppercase character')
    .regexp(new RegExp('.*[a-z].*'), 'One lowercase character')
    .regexp(new RegExp('.*\\d.*'), 'One number')
    .regexp(
      new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
      'One special character',
    )
    .min(8, 'Must be at least 8 characters in length'),
  repeatPassword: string,
  accessToken: Schema.either(string, number).optional(),
  birthYear: number.min(1900).max(2013).optional(),
  email: string
    .regexp(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
    .error('Incorrect email'),
  tags: array.of(string),
  enabled: boolean,
  like: array
    .of({
      id: number,
      name: string.min(4).max(4),
    })
    .optional(),
  address: Schema({
    city: string.min(3, 'Is required'),
    zipCode: string
      .min(5, 'Must be 5 characters long')
      .max(5, 'Must be 5 characters long'),
  }),
});

export const validData: Type<typeof schema> = {
  username: 'Doe',
  password: 'Password123_',
  repeatPassword: 'Password123_',
  accessToken: 'accessToken',
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
  address: {
    city: 'Awesome city',
    zipCode: '12345',
  },
};

export const invalidData = {
  password: '___',
  email: '',
  birthYear: 'birthYear',
  like: [{ id: 'z' }],
  address: {
    city: '',
    zipCode: '123',
  },
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
