import Nope from 'nope-validator';
import { Field, InternalFieldName } from 'react-hook-form';

export const schema = Nope.object().shape({
  username: Nope.string().regex(/^\w+$/).min(2).max(30).required(),
  password: Nope.string()
    .regex(new RegExp('.*[A-Z].*'), 'One uppercase character')
    .regex(new RegExp('.*[a-z].*'), 'One lowercase character')
    .regex(new RegExp('.*\\d.*'), 'One number')
    .regex(
      new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
      'One special character',
    )
    .min(8, 'Must be at least 8 characters in length')
    .required('New Password is required'),
  repeatPassword: Nope.string()
    .oneOf([Nope.ref('password')], "Passwords don't match")
    .required(),
  accessToken: Nope.string(),
  birthYear: Nope.number().min(1900).max(2013),
  email: Nope.string().email(),
  tags: Nope.array().of(Nope.string()).required(),
  enabled: Nope.boolean(),
  like: Nope.object().shape({
    id: Nope.number().required(),
    name: Nope.string().atLeast(4).required(),
  }),
});

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
