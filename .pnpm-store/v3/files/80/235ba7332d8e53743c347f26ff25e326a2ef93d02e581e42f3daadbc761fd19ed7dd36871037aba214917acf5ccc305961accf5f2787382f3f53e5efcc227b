import { render, screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import { Validator } from 'fluentvalidation-ts';
import React from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { fluentValidationResolver } from '../fluentvalidation-ts';

type FormData = {
  username: string;
  password: string;
};

class FormDataValidator extends Validator<FormData> {
  constructor() {
    super();

    this.ruleFor('username')
      .notEmpty()
      .withMessage('username is a required field');
    this.ruleFor('password')
      .notEmpty()
      .withMessage('password is a required field');
  }
}

interface Props {
  onSubmit: SubmitHandler<FormData>;
}

function TestComponent({ onSubmit }: Props) {
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: fluentValidationResolver(new FormDataValidator()), // Useful to check TypeScript regressions
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

  expect(screen.getByText(/username is a required field/i)).toBeInTheDocument();
  expect(screen.getByText(/password is a required field/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();
});
