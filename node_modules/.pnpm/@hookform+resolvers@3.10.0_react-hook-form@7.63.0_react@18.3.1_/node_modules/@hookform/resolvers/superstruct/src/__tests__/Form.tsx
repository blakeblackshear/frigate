import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import React from 'react';
import { useForm } from 'react-hook-form';
import { Infer, object, size, string } from 'superstruct';
import { superstructResolver } from '..';

const schema = object({
  username: size(string(), 2),
  password: size(string(), 6),
});

type FormData = Infer<typeof schema>;

interface Props {
  onSubmit: (data: FormData) => void;
}

function TestComponent({ onSubmit }: Props) {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<FormData>({
    resolver: superstructResolver(schema), // Useful to check TypeScript regressions
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

test("form's validation with Superstruct and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(
    screen.getByText(
      /Expected a string with a length of `2` but received one with a length of `0`/i,
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      /Expected a string with a length of `6` but received one with a length of `0`/i,
    ),
  ).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});
