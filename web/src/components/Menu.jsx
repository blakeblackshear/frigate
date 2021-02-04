import { h } from 'preact';
import RelativeModal from './RelativeModal';
import { useCallback, useEffect } from 'preact/hooks';

export default function Menu({ className, children, onDismiss, relativeTo }) {
  return relativeTo ? (
    <RelativeModal
      children={children}
      className={`${className || ''} py-2`}
      role="listbox"
      onDismiss={onDismiss}
      portalRootID="menus"
      relativeTo={relativeTo}
    />
  ) : null;
}

export function MenuItem({ focus, icon: Icon, label, onSelect, value }) {
  const handleClick = useCallback(() => {
    onSelect && onSelect(value, label);
  }, [onSelect, value, label]);

  const handleKeydown = useCallback(
    (event) => {
      if (event.key === 'Enter') {
        onSelect && onSelect(value, label);
      }
    },
    [onSelect, value, label]
  );

  return (
    <div
      className={`flex space-x-2 p-2 px-5 hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer ${
        focus ? 'bg-gray-200 dark:bg-gray-800 dark:text-white' : ''
      }`}
      onclick={handleClick}
      role="option"
    >
      {Icon ? (
        <div className="w-6 h-6 self-center mr-4 text-gray-500">
          <Icon />
        </div>
      ) : null}
      {label}
    </div>
  );
}

export function MenuSeparator() {
  return <div className="border-b border-gray-200 dark:border-gray-800 my-2" />;
}
