import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import { Schema } from 'effect';
import React from 'react';
import { useForm } from 'react-hook-form';
import { effectTsResolver } from '..';

const USERNAME_REQUIRED_MESSAGE = 'username field is required';
const PASSWORD_REQUIRED_MESSAGE = 'password field is required';

const schema = Schema.Struct({
  username: Schema.String.pipe(
    Schema.nonEmptyString({ message: () => USERNAME_REQUIRED_MESSAGE }),
  ),
  password: Schema.String.pipe(
    Schema.nonEmptyString({ message: () => PASSWORD_REQUIRED_MESSAGE }),
  ),
});

type FormData = Schema.Schema.Type<typeof schema>;

interface Props {
  onSubmit: (data: FormData) => void;
}

function TestComponent({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: effectTsResolver(schema),
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

test("form's validation with Zod and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(screen.getByText(/username field is required/i)).toBeInTheDocument();
  expect(screen.getByText(/password field is required/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});
