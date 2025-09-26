import 'reflect-metadata';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Field, InternalFieldName } from 'react-hook-form';

class Like {
  @IsNotEmpty()
  id: number;

  @Length(4)
  name: string;
}

export class Schema {
  @Matches(/^\w+$/)
  @Length(3, 30)
  username: string;

  @Matches(/^[a-zA-Z0-9]{3,30}/)
  password: string;

  @Min(1900)
  @Max(2013)
  birthYear: number;

  @IsEmail()
  email: string;

  accessToken: string;

  tags: string[];

  enabled: boolean;

  @ValidateNested({ each: true })
  @Type(() => Like)
  like: Like[];
}

export const validData: Schema = {
  username: 'Doe',
  password: 'Password123',
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
