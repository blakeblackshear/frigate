import RelativeModal from './RelativeModal';

export default function NotificationMenu({ className, children, onDismiss, relativeTo, widthRelative }) {
  return relativeTo ? (
    <RelativeModal
      className={`${className || ''} py-2 max-w-xs`}
      role="listbox"
      onDismiss={onDismiss}
      portalRootID="menus"
      relativeTo={relativeTo}
      widthRelative={widthRelative}>
      <div className="p-3 font-bold text-lg">Notifications</div>
      <div children={children} />
    </RelativeModal>
  ) : null;
}

export function NotificationItem({ title, desc, type, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div
        className={`cursor-pointer m-2 ${getColor(type)}`}
      >
        <div className="whitespace-nowrap p-2 font-bold">{title}</div>
        <div className="p-2">{desc}</div>
      </div>
    </a>
  );
}

function getColor(type) {
  if (type == "success") {
    return "bg-green-500 hover:bg-green-600"
  } else if (type == "warning") {
    return "bg-yellow-500 hover:bg-yellow-600"
  } else if (type == "error") {
    return "bg-red-500 hover:bg-red-600"
  }

  return "bg-gray-500 hover:bg-gray-600"
}
