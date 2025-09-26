<div align="center">
    <p align="center">
        <a href="https://react-hook-form.com" title="React Hook Form - Simple React forms validation">
            <img src="https://raw.githubusercontent.com/bluebill1049/react-hook-form/master/docs/logo.png" alt="React Hook Form Logo - React hook custom hook for form validation" />
        </a>
    </p>
</div>

<p align="center">Performant, flexible and extensible forms with easy to use validation.</p>

<div align="center">

[![npm downloads](https://img.shields.io/npm/dm/@hookform/error-message.svg?style=for-the-badge)](https://www.npmjs.com/package/@hookform/error-message)
[![npm](https://img.shields.io/npm/dt/@hookform/error-message.svg?style=for-the-badge)](https://www.npmjs.com/package/@hookform/error-message)
[![npm](https://img.shields.io/bundlephobia/minzip/@hookform/error-message?style=for-the-badge)](https://bundlephobia.com/result?p=@hookform/error-message)

</div>

## Goal

A simple component to render associated input's error message.

## Install

```
$ npm install @hookform/error-message
```

## Quickstart

- Single Error Message

```jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';

export default function App() {
  const { register, formState: { errors }, handleSubmit } = useForm();
  const onSubmit = (data) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        name="singleErrorInput"
        ref={register({ required: 'This is required.' })}
      />
      <ErrorMessage errors={errors} name="singleErrorInput" />

      <ErrorMessage
        errors={errors}
        name="singleErrorInput"
        render={({ message }) => <p>{message}</p>}
      />

      <input name="name" ref={register({ required: true })} />
      <ErrorMessage errors={errors} name="name" message="This is required" />

      <input type="submit" />
    </form>
  );
}
```

---

- Multiple Error Messages

```jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';

export default function App() {
  const { register, formState: { errors }, handleSubmit } = useForm({
    criteriaMode: 'all',
  });
  const onSubmit = (data) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        name="multipleErrorInput"
        ref={register({
          required: 'This is required.',
          pattern: {
            value: /d+/,
            message: 'This input is number only.',
          },
          maxLength: {
            value: 10,
            message: 'This input exceed maxLength.',
          },
        })}
      />
      <ErrorMessage
        errors={errors}
        name="multipleErrorInput"
        render={({ messages }) =>
          messages &&
          Object.entries(messages).map(([type, message]) => (
            <p key={type}>{message}</p>
          ))
        }
      />

      <input type="submit" />
    </form>
  );
}
```

## API

| Prop      | Type                                                  | Required | Description                                                                                                                                                                               |
| :-------- | :---------------------------------------------------- | :------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`    | `string`                                              |    ✓     | Associated field name.                                                                                                                                                                    |
| `errors`  | `object`                                              |          | `errors` object from React Hook Form. It's optional if you are using `FormProvider`.                                                                                                      |
| `message` | `string \| React.ReactElement`                        |          | inline error message.                                                                                                                                                                     |
| `as`      | `string \| React.ReactElement \| React.ComponentType` |          | Wrapper component or HTML tag. eg: `as="p"`, `as={<p />}` or `as={CustomComponent}`. This prop is incompatible with prop `render` and will take precedence over it.                    |
| `render`  | `Function`                                            |          | This is a [render prop](https://reactjs.org/docs/render-props.html) for rendering error message or messages. <br><b>Note:</b> you need to set `criteriaMode` to `all` for using messages. |

## Backers

Thank goes to all our backers! [[Become a backer](https://opencollective.com/react-hook-form#backer)].

<a href="https://opencollective.com/react-hook-form#backers">
    <img src="https://opencollective.com/react-hook-form/backers.svg?width=950" />
</a>

## Contributors

Thanks goes to these wonderful people. [[Become a contributor](CONTRIBUTING.md)].

<a href="https://github.com/react-hook-form/react-hook-form/graphs/contributors">
    <img src="https://opencollective.com/react-hook-form/contributors.svg?width=950" />
</a>
