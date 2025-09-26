import { Validator } from 'fluentvalidation-ts';
import { Field, InternalFieldName } from 'react-hook-form';

const beNumeric = (value: string | number | undefined) => !isNaN(Number(value));

export type Schema = {
  username: string;
  password: string;
  repeatPassword: string;
  accessToken?: string;
  birthYear?: number;
  email?: string;
  tags?: string[];
  enabled?: boolean;
  like?: {
    id: number;
    name: string;
  }[];
};

export type SchemaWithWhen = {
  name: string;
  value: string;
};

export class SchemaValidator extends Validator<Schema> {
  constructor() {
    super();

    this.ruleFor('username')
      .notEmpty()
      .matches(/^\w+$/)
      .minLength(3)
      .maxLength(30);

    this.ruleFor('password')
      .notEmpty()
      .matches(/.*[A-Z].*/)
      .withMessage('One uppercase character')
      .matches(/.*[a-z].*/)
      .withMessage('One lowercase character')
      .matches(/.*\d.*/)
      .withMessage('One number')
      .matches(new RegExp('.*[`~<>?,./!@#$%^&*()\\-_+="\'|{}\\[\\];:\\\\].*'))
      .withMessage('One special character')
      .minLength(8)
      .withMessage('Must be at least 8 characters in length');

    this.ruleFor('repeatPassword')
      .notEmpty()
      .must((repeatPassword, data) => repeatPassword === data.password);

    this.ruleFor('accessToken');
    this.ruleFor('birthYear')
      .must(beNumeric)
      .inclusiveBetween(1900, 2013)
      .when((birthYear) => birthYear != undefined);

    this.ruleFor('email').emailAddress();
    this.ruleFor('tags');
    this.ruleFor('enabled');

    this.ruleForEach('like').setValidator(() => new LikeValidator());
  }
}

export class LikeValidator extends Validator<{
  id: number;
  name: string;
}> {
  constructor() {
    super();

    this.ruleFor('id').notNull();
    this.ruleFor('name').notEmpty().length(4, 4);
  }
}

export const validData = {
  username: 'Doe',
  password: 'Password123_',
  repeatPassword: 'Password123_',
  birthYear: 2000,
  email: 'john@doe.com',
  tags: ['tag1', 'tag2'],
  enabled: true,
  accesstoken: 'accesstoken',
  like: [
    {
      id: 1,
      name: 'name',
    },
  ],
} as Schema;

export const invalidData = {
  password: '___',
  email: '',
  birthYear: 'birthYear',
  like: [{ id: 'z' }],
  // Must be set to "unknown", otherwise typescript knows that it is invalid
} as unknown as Required<Schema>;

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
