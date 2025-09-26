import * as Joi from 'joi';

import { Field, InternalFieldName } from 'react-hook-form';

export const schema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string()
    .pattern(new RegExp('.*[A-Z].*'), 'One uppercase character')
    .pattern(new RegExp('.*[a-z].*'), 'One lowercase character')
    .pattern(new RegExp('.*\\d.*'), 'One number')
    .pattern(
      new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
      'One special character',
    )
    .min(8)
    .required(),
  repeatPassword: Joi.ref('password'),
  accessToken: [Joi.string(), Joi.number()],
  birthYear: Joi.number().integer().min(1900).max(2013),
  email: Joi.string().email({
    minDomainSegments: 2,
    tlds: { allow: ['com', 'net'] },
  }),
  tags: Joi.array().items(Joi.string()).required(),
  enabled: Joi.boolean().required(),
  like: Joi.array()
    .items(
      Joi.object({ id: Joi.number(), name: Joi.string().length(4).regex(/a/) }),
    )
    .optional(),
});

interface Data {
  username: string;
  password: string;
  repeatPassword: string;
  accessToken?: number | string;
  birthYear?: number;
  email?: string;
  tags: string[];
  enabled: boolean;
  like: { id: number; name: string }[];
}

export const validData: Data = {
  username: 'Doe',
  password: 'Password123_',
  repeatPassword: 'Password123_',
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
  like: [{ id: 'z', name: 'r' }],
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
