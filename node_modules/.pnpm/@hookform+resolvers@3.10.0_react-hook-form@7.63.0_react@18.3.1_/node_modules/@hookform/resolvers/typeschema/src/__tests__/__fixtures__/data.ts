import { Field, InternalFieldName } from 'react-hook-form';
import { z } from 'zod';

export const schema = z
  .object({
    username: z.string().regex(/^\w+$/).min(3).max(30),
    password: z
      .string()
      .regex(new RegExp('.*[A-Z].*'), 'One uppercase character')
      .regex(new RegExp('.*[a-z].*'), 'One lowercase character')
      .regex(new RegExp('.*\\d.*'), 'One number')
      .regex(
        new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
        'One special character',
      )
      .min(8, 'Must be at least 8 characters in length'),
    repeatPassword: z.string(),
    accessToken: z.union([z.string(), z.number()]),
    birthYear: z.number().min(1900).max(2013).optional(),
    email: z.string().email().optional(),
    tags: z.array(z.string()),
    enabled: z.boolean(),
    url: z.string().url('Custom error url').or(z.literal('')),
    like: z
      .array(
        z.object({
          id: z.number(),
          name: z.string().length(4),
        }),
      )
      .optional(),
    dateStr: z
      .string()
      .transform((value) => new Date(value))
      .refine((value) => !isNaN(value.getTime()), {
        message: 'Invalid date',
      }),
  })
  .refine((obj) => obj.password === obj.repeatPassword, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export const validData: z.input<typeof schema> = {
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
  dateStr: '2020-01-01',
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
