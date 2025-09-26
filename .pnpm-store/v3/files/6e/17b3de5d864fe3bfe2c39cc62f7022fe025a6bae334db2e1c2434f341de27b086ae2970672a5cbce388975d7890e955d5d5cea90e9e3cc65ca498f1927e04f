import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import { type } from 'arktype';
import React from 'react';
import { useForm } from 'react-hook-form';
import { arktypeResolver } from '..';

const schema = type({
  username: 'string>1',
  password: 'string>1',
});

type FormData = typeof schema.infer & { unusedProperty: string };

interface Props {
  onSubmit: (data: FormData) => void;
}

function TestComponent({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: arktypeResolver(schema), // Useful to check TypeScript regressions
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

test("form's validation with arkType and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(
    screen.getByText('username must be more than length 1 (was 0)'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('password must be more than length 1 (was 0)'),
  ).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});
