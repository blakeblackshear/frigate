import { h, Fragment } from 'preact';
import { Link } from 'preact-router/match';
import { useCallback } from 'preact/hooks';
import { useDrawer } from '../context';

export default function NavigationDrawer({ children, header }) {
  const { showDrawer, setShowDrawer } = useDrawer();

  const handleDismiss = useCallback(() => {
    setShowDrawer(false);
  }, [setShowDrawer]);

  return (
    <Fragment>
      {showDrawer ? <div data-testid="scrim" key="scrim" className="fixed inset-0 z-20" onClick={handleDismiss} /> : ''}
      <div
        key="drawer"
        data-testid="drawer"
        className={`fixed left-0 top-0 bottom-0 lg:sticky max-h-screen flex flex-col w-64 text-gray-700 bg-white dark:text-gray-200 dark:bg-gray-900 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 shadow lg:shadow-none z-20 lg:z-0 transform ${
          !showDrawer ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        } transition-transform duration-300`}
        onClick={handleDismiss}
      >
        {header ? (
          <div className="flex-shrink-0 p-2 flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700">
            {header}
          </div>
        ) : null}

        <nav className="flex flex-col flex-grow overflow-hidden overflow-y-auto p-2 space-y-2">{children}</nav>
      </div>
    </Fragment>
  );
}

export function Destination({ className = '', href, text, ...other }) {
  const external = href.startsWith('http');
  const props = external ? { rel: 'noopener nofollow', target: '_blank' } : {};

  const { setShowDrawer } = useDrawer();

  const handleDismiss = useCallback(() => {
    setTimeout(() => {
      setShowDrawer(false);
    }, 250);
  }, [setShowDrawer]);

  const styleProps = {
    [external
      ? 'className'
      : 'class']: 'block p-2 text-sm font-semibold text-gray-900 rounded hover:bg-blue-500 dark:text-gray-200 hover:text-white dark:hover:text-white focus:outline-none ring-opacity-50 focus:ring-2 ring-blue-300',
  };

  const El = external ? 'a' : Link;

  return (
    <El activeClassName="bg-blue-500 bg-opacity-50 text-white" {...styleProps} href={href} {...props} {...other}>
      <div onClick={handleDismiss}>{text}</div>
    </El>
  );
}

export function Separator() {
  return <div className="border-b border-gray-200 dark:border-gray-700 -mx-2" />;
}
