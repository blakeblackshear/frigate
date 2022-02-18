import { h } from 'preact';

interface BubbleButtonProps {
  variant?: 'primary' | 'secondary';
  children?: preact.JSX.Element;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BubbleButton = ({
  variant = 'primary',
  children,
  onClick,
  disabled = false,
  className = '',
}: BubbleButtonProps) => {
  const BASE_CLASS = 'rounded-full px-4 py-2';
  const PRIMARY_CLASS = 'text-white bg-blue-500 dark:text-black dark:bg-white';
  const SECONDARY_CLASS = 'text-black dark:text-white bg-transparent';
  let computedClass = BASE_CLASS;

  if (disabled) {
    computedClass += ' text-gray-200 dark:text-gray-200';
  } else if (variant === 'primary') {
    computedClass += ` ${PRIMARY_CLASS}`;
  } else if (variant === 'secondary') {
    computedClass += ` ${SECONDARY_CLASS}`;
  }

  const onClickHandler = () => {
    if (disabled) {
      return;
    }

    if (onClick) {
      onClick();
    }
  };
  return (
    <button onClick={onClickHandler} className={`${computedClass} ${className}`}>
      {children}
    </button>
  );
};
