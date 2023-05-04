import { h, Fragment } from 'preact';
import Tooltip from './Tooltip';
import { useCallback, useRef, useState } from 'preact/hooks';

const ButtonColors = {
  blue: {
    contained: 'bg-blue-500 focus:bg-blue-400 active:bg-blue-600 ring-blue-300',
    outlined:
      'text-blue-500 border-2 border-blue-500 hover:bg-blue-500 hover:bg-opacity-20 focus:bg-blue-500 focus:bg-opacity-40 active:bg-blue-500 active:bg-opacity-40',
    text: 'text-blue-500 hover:bg-blue-500 hover:bg-opacity-20 focus:bg-blue-500 focus:bg-opacity-40 active:bg-blue-500 active:bg-opacity-40',
    iconOnly: 'text-blue-500 hover:text-blue-200',
  },
  red: {
    contained: 'bg-red-500 focus:bg-red-400 active:bg-red-600 ring-red-300',
    outlined:
      'text-red-500 border-2 border-red-500 hover:bg-red-500 hover:bg-opacity-20 focus:bg-red-500 focus:bg-opacity-40 active:bg-red-500 active:bg-opacity-40',
    text: 'text-red-500 hover:bg-red-500 hover:bg-opacity-20 focus:bg-red-500 focus:bg-opacity-40 active:bg-red-500 active:bg-opacity-40',
    iconOnly: 'text-red-500 hover:text-red-200',
  },
  yellow: {
    contained: 'bg-yellow-500 focus:bg-yellow-400 active:bg-yellow-600 ring-yellow-300',
    outlined:
      'text-yellow-500 border-2 border-yellow-500 hover:bg-yellow-500 hover:bg-opacity-20 focus:bg-yellow-500 focus:bg-opacity-40 active:bg-yellow-500 active:bg-opacity-40',
    text: 'text-yellow-500 hover:bg-yellow-500 hover:bg-opacity-20 focus:bg-yellow-500 focus:bg-opacity-40 active:bg-yellow-500 active:bg-opacity-40',
    iconOnly: 'text-yellow-500 hover:text-yellow-200',
  },
  green: {
    contained: 'bg-green-500 focus:bg-green-400 active:bg-green-600 ring-green-300',
    outlined:
      'text-green-500 border-2 border-green-500 hover:bg-green-500 hover:bg-opacity-20 focus:bg-green-500 focus:bg-opacity-40 active:bg-green-500 active:bg-opacity-40',
    text: 'text-green-500 hover:bg-green-500 hover:bg-opacity-20 focus:bg-green-500 focus:bg-opacity-40 active:bg-green-500 active:bg-opacity-40',
    iconOnly: 'text-green-500 hover:text-green-200',
  },
  gray: {
    contained: 'bg-gray-500 focus:bg-gray-400 active:bg-gray-600 ring-gray-300',
    outlined:
      'text-gray-500 border-2 border-gray-500 hover:bg-gray-500 hover:bg-opacity-20 focus:bg-gray-500 focus:bg-opacity-40 active:bg-gray-500 active:bg-opacity-40',
    text: 'text-gray-500 hover:bg-gray-500 hover:bg-opacity-20 focus:bg-gray-500 focus:bg-opacity-40 active:bg-gray-500 active:bg-opacity-40',
    iconOnly: 'text-gray-500 hover:text-gray-200',
  },
  disabled: {
    contained: 'bg-gray-400',
    outlined:
      'text-gray-500 border-2 border-gray-500 hover:bg-gray-500 hover:bg-opacity-20 focus:bg-gray-500 focus:bg-opacity-40 active:bg-gray-500 active:bg-opacity-40',
    text: 'text-gray-500 hover:bg-gray-500 hover:bg-opacity-20 focus:bg-gray-500 focus:bg-opacity-40 active:bg-gray-500 active:bg-opacity-40',
    iconOnly: 'text-gray-500 hover:text-gray-200',
  },
  black: {
    contained: '',
    outlined: '',
    text: 'text-black dark:text-white',
    iconOnly: '',
  },
};

const ButtonTypes = {
  contained: 'text-white shadow focus:shadow-xl hover:shadow-md',
  outlined: '',
  text: 'transition-opacity',
  iconOnly: 'transition-opacity',
};

export default function Button({
  children,
  className = '',
  color = 'blue',
  disabled = false,
  href,
  type = 'contained',
  ...attrs
}) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef();

  let classes = `whitespace-nowrap flex items-center space-x-1 ${className} ${ButtonTypes[type]} ${
    ButtonColors[disabled ? 'disabled' : color][type]
  } font-sans inline-flex font-bold uppercase text-xs px-1.5 md:px-2 py-2 rounded outline-none focus:outline-none ring-opacity-50 transition-shadow transition-colors ${
    disabled ? 'cursor-not-allowed' : `${type == 'iconOnly' ? '' : 'focus:ring-2'} cursor-pointer`
  }`;

  if (disabled) {
    classes = classes.replace(/(?:focus|active|hover):[^ ]+/g, '');
  }

  const handleMousenter = useCallback(() => {
    setHovered(true);
  }, []);

  const handleMouseleave = useCallback(() => {
    setHovered(false);
  }, []);

  const Element = href ? 'a' : 'div';

  return (
    <Fragment>
      <Element
        role="button"
        aria-disabled={disabled ? 'true' : 'false'}
        tabindex="0"
        className={classes}
        href={href}
        ref={ref}
        onmouseenter={handleMousenter}
        onmouseleave={handleMouseleave}
        {...attrs}
      >
        {children}
      </Element>
      {hovered && attrs['aria-label'] ? <Tooltip text={attrs['aria-label']} relativeTo={ref} /> : null}
    </Fragment>
  );
}
