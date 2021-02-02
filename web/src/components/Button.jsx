import { h } from 'preact';

const noop = () => {};

const ButtonColors = {
  blue: {
    contained: 'bg-blue-500 focus:bg-blue-400 active:bg-blue-600 ring-blue-300',
    outlined: '',
    text:
      'text-blue-500 hover:bg-blue-500 hover:bg-opacity-20 focus:bg-blue-500 focus:bg-opacity-40 active:bg-blue-500 active:bg-opacity-40',
  },
  red: {
    contained: 'bg-red-500 focus:bg-red-400 active:bg-red-600 ring-red-300',
    outlined: '',
    text: '',
  },
  green: {
    contained: 'bg-green-500 focus:bg-green-400 active:bg-green-600 ring-green-300',
    outlined: '',
    text: '',
  },
  disabled: {
    contained: 'bg-gray-400',
    outlined: '',
    text: '',
  },
};

const ButtonTypes = {
  contained: 'text-white shadow focus:shadow-xl hover:shadow-md',
  outlined: '',
  text: 'transition-opacity',
};

export default function Button({
  children,
  className = '',
  color = 'blue',
  disabled = false,
  href,
  onClick,
  size,
  type = 'contained',
  ...attrs
}) {
  let classes = `${className} ${
    ButtonColors[disabled ? 'disabled' : color][type]
  } font-sans inline-flex font-bold uppercase text-xs px-2 py-2 rounded outline-none focus:outline-none ring-opacity-50 transition-shadow transition-colors ${
    disabled ? 'cursor-not-allowed' : 'focus:ring-2 cursor-pointer'
  }`;

  if (disabled) {
    classes = classes.replace(/(?:focus|active|hover):[^ ]+/g, '');
  }

  const Element = href ? 'a' : 'div';

  return (
    <Element
      role="button"
      aria-disabled={disabled ? 'true' : 'false'}
      tabindex="0"
      className={classes}
      onClick={onClick || noop}
      href={href}
      {...attrs}
    >
      {children}
    </Element>
  );
}
