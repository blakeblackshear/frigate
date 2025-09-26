import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as t from 'typanion';
import { typanionResolver } from '..';

const schema = t.isObject({
  username: t.applyCascade(t.isString(), [t.hasMinLength(1)]),
  password: t.applyCascade(t.isString(), [t.hasMinLength(1)]),
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
    resolver: typanionResolver(schema), // Useful to check TypeScript regressions
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

test("form's validation with Typanion and TypeScript's integration", async () => {
  const handleSubmit = vi.fn();
  render(<TestComponent onSubmit={handleSubmit} />);

  expect(screen.queryAllByRole('alert')).toHaveLength(0);

  await user.click(screen.getByText(/submit/i));

  expect(
    screen.getAllByText(
      'Expected to have a length of at least 1 elements (got 0)',
    ),
  ).toHaveLength(2);
  expect(handleSubmit).not.toHaveBeenCalled();
});
