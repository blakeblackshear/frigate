import { h } from 'preact';
import RelativeModal from './RelativeModal';
import { useCallback } from 'preact/hooks';

export default function Menu({ className, children, onDismiss, relativeTo, widthRelative }) {
  return relativeTo ? (
    <RelativeModal
      children={children}
      className={`${className || ''} py-2`}
      role="listbox"
      onDismiss={onDismiss}
      portalRootID="menus"
      relativeTo={relativeTo}
      widthRelative={widthRelative}
    />
  ) : null;
}

export function MenuItem({ focus, icon: Icon, label, href, onSelect, value, ...attrs }) {
  const handleClick = useCallback(() => {
    onSelect && onSelect(value, label);
  }, [onSelect, value, label]);

  const Element = href ? 'a' : 'div';

  return (
    <Element
      className={`flex space-x-2 p-2 px-5 hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer ${
        focus ? 'bg-gray-200 dark:bg-gray-800 dark:text-white' : ''
      }`}
      href={href}
      onClick={handleClick}
      role="option"
      {...attrs}
    >
      {Icon ? (
        <div className="w-6 h-6 self-center mr-4 text-gray-500 flex-shrink-0">
          <Icon />
        </div>
      ) : null}
      <div className="whitespace-nowrap">{label}</div>
    </Element>
  );
}

export function MenuSeparator() {
  return <div className="border-b border-gray-200 dark:border-gray-800 my-2" />;
}
