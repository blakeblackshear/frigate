import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import Nope from 'nope-validator';
import React from 'react';
import { useForm } from 'react-hook-form';
import { nopeResolver } from '..';

const schema = Nope.object().shape({
  username: Nope.string().required(),
  password: Nope.string().required(),
});

interface FormData {
  unusedProperty: string;
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
    resolver: nopeResolver(schema), // Useful to check TypeScript regressions
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

test("form's validation with Yup and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(screen.getAllByText(/This field is required/i)).toHaveLength(2);
  expect(handleSubmit).not.toHaveBeenCalled();
});
