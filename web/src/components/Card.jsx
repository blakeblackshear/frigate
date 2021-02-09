import { h } from 'preact';
import Button from './Button';
import Heading from './Heading';

export default function Box({
  buttons = [],
  className = '',
  content,
  elevated = true,
  header,
  href,
  icons,
  media = null,
  subheader,
  supportingText,
  ...props
}) {
  const Element = href ? 'a' : 'div';

  const typeClasses = elevated
    ? 'shadow-md hover:shadow-lg transition-shadow'
    : 'border border-gray-200 dark:border-gray-700';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg overflow-hidden ${typeClasses} ${className}`}>
      {media || header ? (
        <Element href={href} {...props}>
          {media}
          <div className="p-4 pb-2">{header ? <Heading size="base">{header}</Heading> : null}</div>
        </Element>
      ) : null}
      {buttons.length || content ? (
        <div className="pl-4 pb-2">
          {content || null}
          {buttons.length ? (
            <div className="flex space-x-4 -ml-2">
              {buttons.map(({ name, href }) => (
                <Button key={name} href={href} type="text">
                  {name}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
