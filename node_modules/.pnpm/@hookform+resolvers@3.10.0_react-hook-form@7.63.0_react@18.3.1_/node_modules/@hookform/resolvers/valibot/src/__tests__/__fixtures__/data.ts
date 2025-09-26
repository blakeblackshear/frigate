import { Field, InternalFieldName } from 'react-hook-form';
import * as v from 'valibot';

export const schema = v.object({
  username: v.pipe(
    v.string(),
    v.minLength(2),
    v.maxLength(30),
    v.regex(/^\w+$/),
  ),
  password: v.pipe(
    v.string('New Password is required'),
    v.regex(new RegExp('.*[A-Z].*'), 'One uppercase character'),
    v.regex(new RegExp('.*[a-z].*'), 'One lowercase character'),
    v.regex(new RegExp('.*\\d.*'), 'One number'),
    v.regex(
      new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
      'One special character',
    ),
    v.minLength(8, 'Must be at least 8 characters in length'),
  ),
  repeatPassword: v.string('Repeat Password is required'),
  accessToken: v.union(
    [
      v.string('Access token should be a string'),
      v.number('Access token  should be a number'),
    ],
    'access token is required',
  ),
  birthYear: v.pipe(
    v.number('Please enter your birth year'),
    v.minValue(1900),
    v.maxValue(2013),
  ),
  email: v.pipe(v.string(), v.email('Invalid email address')),
  tags: v.array(v.string('Tags should be strings')),
  enabled: v.boolean(),
  like: v.object({
    id: v.number('Like id is required'),
    name: v.pipe(
      v.string('Like name is required'),
      v.minLength(4, 'Too short'),
    ),
  }),
});

export const schemaError = v.variant('type', [
  v.object({ type: v.literal('a') }),
  v.object({ type: v.literal('b') }),
]);

export const validSchemaErrorData = { type: 'a' };
export const invalidSchemaErrorData = { type: 'c' };

export const validData = {
  username: 'Doe',
  password: 'Password123_',
  repeatPassword: 'Password123_',
  birthYear: 2000,
  email: 'john@doe.com',
  tags: ['tag1', 'tag2'],
  enabled: true,
  accessToken: 'accessToken',
  like: {
    id: 1,
    name: 'name',
  },
};

export const invalidData = {
  password: '___',
  email: '',
  birthYear: 'birthYear',
  like: { id: 'z' },
  tags: [1, 2, 3],
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
