import { h } from 'preact';
import { Link as RouterLink } from 'preact-router/match';

export default function Link({
  activeClassName = '',
  className = 'text-blue-500 hover:underline',
  children,
  href,
  ...props
}) {
  return (
    <RouterLink activeClassName={activeClassName} className={className} href={href} {...props}>
      {children}
    </RouterLink>
  );
}
