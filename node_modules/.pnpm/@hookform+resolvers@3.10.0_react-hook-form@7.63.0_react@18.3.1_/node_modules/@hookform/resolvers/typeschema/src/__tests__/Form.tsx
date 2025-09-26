import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import type { Infer } from '@typeschema/main';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { typeschemaResolver } from '..';

const schema = z.object({
  username: z.string().min(1, { message: 'username field is required' }),
  password: z.string().min(1, { message: 'password field is required' }),
});

type FormData = Infer<typeof schema> & { unusedProperty: string };

interface Props {
  onSubmit: (data: FormData) => void;
}

function TestComponent({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: typeschemaResolver(schema), // Useful to check TypeScript regressions
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

test("form's validation with TypeSchema and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(screen.getByText(/username field is required/i)).toBeInTheDocument();
  expect(screen.getByText(/password field is required/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});
