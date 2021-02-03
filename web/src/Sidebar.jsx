import { h, Fragment } from 'preact';
import Link from './components/Link';
import LinkedLogo from './components/LinkedLogo';
import { Link as RouterLink } from 'preact-router/match';
import { useCallback, useState } from 'preact/hooks';
import { useSidebar } from './context';

function NavLink({ className = '', href, text, ...other }) {
  const external = href.startsWith('http');
  const El = external ? Link : RouterLink;
  const props = external ? { rel: 'noopener nofollow', target: '_blank' } : {};
  return (
    <El
      activeClassName="bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:bg-gray-600 dark:focus:text-white dark:hover:text-white dark:text-gray-200"
      className={`block px-4 py-2 mt-2 text-sm font-semibold text-gray-900 bg-transparent rounded-lg dark:bg-transparent dark:hover:bg-gray-600 dark:focus:bg-gray-600 dark:focus:text-white dark:hover:text-white dark:text-gray-200 hover:text-gray-900 focus:text-gray-900 hover:bg-gray-200 focus:bg-gray-200 focus:outline-none focus:shadow-outline self-end ${className}`}
      href={href}
      {...other}
      {...props}
    >
      {text}
    </El>
  );
}

export default function Sidebar() {
  const { showSidebar, setShowSidebar } = useSidebar();

  const handleDismiss = useCallback(() => {
    setShowSidebar(false);
  }, [setShowSidebar]);

  return (
    <Fragment>
      {showSidebar ? <div className="fixed inset-0 z-20" onClick={handleDismiss} /> : ''}
      <div
        className={`fixed left-0 top-0 bottom-0 lg:sticky max-h-screen flex flex-col w-64 text-gray-700 bg-white dark:text-gray-200 dark:bg-gray-900 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 shadow lg:shadow-none z-20 lg:z-0 transform translate-x-0 ${
          !showSidebar ? '-translate-x-full' : ''
        } lg:translate-x-0 transition-transform duration-300`}
      >
        <div className="flex-shrink-0 p-4 flex flex-row items-center justify-between">
          <div class="text-gray-500">
            <LinkedLogo />
          </div>
        </div>
        <nav className="flex-col flex-grow md:block overflow-hidden px-4 pb-4 md:pb-0 md:overflow-y-auto">
          <NavLink onClick={handleDismiss} href="/" text="Cameras" />
          <NavLink onClick={handleDismiss} href="/events" text="Events" />
          <NavLink onClick={handleDismiss} href="/debug" text="Debug" />
          <hr className="border-solid border-gray-500 mt-2" />
          <NavLink className="self-end" href="https://blakeblackshear.github.io/frigate" text="Documentation" />
          <NavLink className="self-end" href="https://github.com/blakeblackshear/frigate" text="GitHub" />
        </nav>
      </div>
    </Fragment>
  );
}
