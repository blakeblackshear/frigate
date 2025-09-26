# React Long Press Hook

[![codecov](https://codecov.io/gh/minwork/react/branch/main/graph/badge.svg?token=2KPMMSLDOM)](https://codecov.io/gh/minwork/react)
![npm type definitions](https://img.shields.io/npm/types/use-long-press)
![NPM Downloads](https://img.shields.io/npm/dm/use-long-press)
[![npm](https://img.shields.io/npm/v/use-long-press)](https://www.npmjs.com/package/use-long-press)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/use-long-press)

![React Long Press Hook](https://raw.githubusercontent.com/minwork/react/main/packages/use-long-press/images/react-long-press-hook.webp)

> React hook for detecting _click_ / _tap_ / _point_ and _hold_ event

# Main features
- Mouse, Touch and Pointer events support
- Pass custom context and access it in callback
- Cancel long press if moved too far from the target
- Flexible callbacks: `onStart`, `onMove`, `onFinish`, `onCancel`
- Disable hook when necessary
- Filter undesired events (like mouse right clicks)

# Installation
```shell
yarn add use-long-press
```
or
```shell
npm install --save use-long-press
```

# Basic usage
Basic hook usage example to get started immediately
```tsx
import React from 'react'; // No longer necessary in newer React versions
import { useLongPress } from 'use-long-press';

const Example = () => {
  const handlers = useLongPress(() => {
    // Your action here
    console.log('Long pressed!');
  });
  return <button {...handlers()}>Press me</button>;
};
```

# Documentation

- [Interactive documentation](https://react-libraries-storybook.vercel.app/) (Storybook)
- [Static documentation](https://minwork.gitbook.io/long-press-hook/) (Gitbook)

# Support

If you like my work, consider making a [donation](https://github.com/sponsors/minwork) through Github Sponsors.

# License

MIT © [minwork](https://github.com/minwork)
