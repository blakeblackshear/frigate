import { Field, InternalFieldName } from 'react-hook-form';
import * as yup from 'yup';

export const schema = yup.object({
  username: yup.string().matches(/^\w+$/).min(3).max(30).required(),
  password: yup
    .string()
    .matches(new RegExp('.*[A-Z].*'), 'One uppercase character')
    .matches(new RegExp('.*[a-z].*'), 'One lowercase character')
    .matches(new RegExp('.*\\d.*'), 'One number')
    .matches(
      new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'),
      'One special character',
    )
    .min(8, 'Must be at least 8 characters in length')
    .required('New Password is required'),
  repeatPassword: yup.ref('password'),
  accessToken: yup.string(),
  birthYear: yup.number().min(1900).max(2013),
  email: yup.string().email(),
  tags: yup.array(yup.string()),
  enabled: yup.boolean(),
  like: yup.array().of(
    yup.object({
      id: yup.number().required(),
      name: yup.string().length(4).required(),
    }),
  ),
});

export const schemaWithWhen = yup.object({
  name: yup.string().required(),
  value: yup.string().when('name', ([name], schema) => {
    return name === 'test' ? yup.number().required() : schema;
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
  like: [
    {
      id: 1,
      name: 'name',
    },
  ],
} satisfies yup.InferType<typeof schema>;

export const invalidData = {
  password: '___',
  email: '',
  birthYear: 'birthYear',
  like: [{ id: 'z' }],
  // Must be set to "unknown", otherwise typescript knows that it is invalid
} as unknown as Required<yup.InferType<typeof schema>>;

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
