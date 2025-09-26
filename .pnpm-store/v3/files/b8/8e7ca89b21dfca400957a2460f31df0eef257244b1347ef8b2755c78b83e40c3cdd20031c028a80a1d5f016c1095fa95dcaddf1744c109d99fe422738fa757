import { type } from 'arktype';
import { Field, InternalFieldName } from 'react-hook-form';

export const schema = type({
  username: 'string>2',
  password: '/.*[A-Za-z].*/>8|/.*\\d.*/',
  repeatPassword: 'string>1',
  accessToken: 'string|number',
  birthYear: '1900<number<2013',
  email: 'email',
  tags: 'string[]',
  enabled: 'boolean',
  url: 'string>1',
  'like?': type({
    id: 'number',
    name: 'string>3',
  }).array(),
  dateStr: 'Date',
});

export const validData: typeof schema.infer = {
  username: 'Doe',
  password: 'Password123_',
  repeatPassword: 'Password123_',
  birthYear: 2000,
  email: 'john@doe.com',
  tags: ['tag1', 'tag2'],
  enabled: true,
  accessToken: 'accessToken',
  url: 'https://react-hook-form.com/',
  like: [
    {
      id: 1,
      name: 'name',
    },
  ],
  dateStr: new Date('2020-01-01'),
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
