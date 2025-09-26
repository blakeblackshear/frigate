import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import * as t from 'io-ts';
import * as tt from 'io-ts-types';
import React from 'react';
import { useForm } from 'react-hook-form';
import { ioTsResolver } from '..';

const schema = t.type({
  username: tt.withMessage(
    tt.NonEmptyString,
    () => 'username is a required field',
  ),
  password: tt.withMessage(
    tt.NonEmptyString,
    () => 'password is a required field',
  ),
});

interface FormData {
  username: string;
  password: string;
}

interface Props {
  onSubmit: (data: FormData) => void;
}

function TestComponent({ onSubmit }: Props) {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<FormData>({
    resolver: ioTsResolver(schema),
    criteriaMode: 'all',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username')} />
      {errors.username && <span role="alert">{errors.username.message}</span>}

      <input {...register('password')} />
      {errors.password && <span role="alert">{errors.password.message}</span>}

      <button type="submit">submit</button>
    </form>
  );
}

test("form's validation with io-ts and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(screen.getByText(/username is a required field/i)).toBeInTheDocument();
  expect(screen.getByText(/password is a required field/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});
