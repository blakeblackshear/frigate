import { h } from 'preact';
import Button from './Button';
import Heading from './Heading';

export default function Box({
  buttons = [],
  className = '',
  content,
  header,
  href,
  icons,
  media = null,
  subheader,
  supportingText,
  ...props
}) {
  const Element = href ? 'a' : 'div';

  return (
    <div className={`bg-white dark:bg-gray-800 shadow-md hover:shadow-xl rounded-lg overflow-hidden ${className}`}>
      <Element href={href} {...props}>
        {media}
        <div class="p-2 pb-2 lg:p-4 lg:pb-2">{header ? <Heading size="base">{header}</Heading> : null}</div>
      </Element>
      {buttons.length || content ? (
        <div class="pl-4 pb-2">
          {content || null}
          {buttons.length ? (
            <div class="flex space-x-4 -ml-2">
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
