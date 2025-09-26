import { Field, InternalFieldName } from 'react-hook-form';
import * as vest from 'vest';

export const validationSuite = vest.create('form', (data: any = {}) => {
  vest.test('username', 'Username is required', () => {
    vest.enforce(data.username).isNotEmpty();
  });

  vest.test('username', 'Must be longer than 3 chars', () => {
    vest.enforce(data.username).longerThan(3);
  });

  vest.test('deepObject.data', 'deepObject.data is required', () => {
    vest.enforce(data.deepObject.data).isNotEmpty();
  });

  vest.test('password', 'Password is required', () => {
    vest.enforce(data.password).isNotEmpty();
  });

  vest.test('password', 'Password must be at least 5 chars', () => {
    vest.enforce(data.password).longerThanOrEquals(5);
  });

  vest.test('password', 'Password must contain a digit', () => {
    vest.enforce(data.password).matches(/[0-9]/);
  });

  vest.test('password', 'Password must contain a symbol', () => {
    vest.enforce(data.password).matches(/[^A-Za-z0-9]/);
  });
});

export const validData = {
  username: 'asdda',
  password: 'asddfg123!',
  deepObject: {
    data: 'test',
  },
};

export const invalidData = {
  username: '',
  password: 'a',
  deepObject: {
    data: '',
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
