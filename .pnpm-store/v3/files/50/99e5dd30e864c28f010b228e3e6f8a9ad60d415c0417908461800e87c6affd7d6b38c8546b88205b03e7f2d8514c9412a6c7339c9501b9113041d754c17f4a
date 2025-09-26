import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import Schema, { Type, string } from 'computed-types';
import React from 'react';
import { useForm } from 'react-hook-form';
import { computedTypesResolver } from '..';

const schema = Schema({
  username: string.min(2).error('username field is required'),
  password: string.min(2).error('password field is required'),
  address: Schema({
    zipCode: string.min(5).max(5).error('zipCode field is required'),
  }),
});

type FormData = Type<typeof schema> & { unusedProperty: string };

interface Props {
  onSubmit: (data: FormData) => void;
}

function TestComponent({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: computedTypesResolver(schema), // Useful to check TypeScript regressions
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('username')} />
      {errors.username && <span role="alert">{errors.username.message}</span>}

      <input {...register('password')} />
      {errors.password && <span role="alert">{errors.password.message}</span>}

      <input {...register('address.zipCode')} />
      {errors.address?.zipCode && (
        <span role="alert">{errors.address.zipCode.message}</span>
      )}

      <button type="submit">submit</button>
    </form>
  );
}

test("form's validation with computed-types and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(screen.getByText(/username field is required/i)).toBeInTheDocument();
  expect(screen.getByText(/password field is required/i)).toBeInTheDocument();
  expect(screen.getByText(/zipCode field is required/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});
