import { h } from 'preact';
import Button from './Button';
import LinkedLogo from './LinkedLogo';
import MenuIcon from '../icons/Menu';
import { useLayoutEffect, useCallback, useState } from 'preact/hooks';

// We would typically preserve these in component state
// But need to avoid too many re-renders
let ticking = false;
let lastScrollY = window.scrollY;

export default function AppBar({ title }) {
  const [show, setShow] = useState(true);
  const [atZero, setAtZero] = useState(window.scrollY === 0);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const scrollListener = useCallback(
    (event) => {
      const scrollY = window.scrollY;

      // if (!ticking) {
      window.requestAnimationFrame(() => {
        setShow(scrollY <= 0 || lastScrollY > scrollY);
        setAtZero(scrollY === 0);
        ticking = false;
        lastScrollY = scrollY;
      });
      ticking = true;
      // }
    },
    [setShow]
  );

  useLayoutEffect(() => {
    document.addEventListener('scroll', scrollListener);
    return () => {
      document.removeEventListener('scroll', scrollListener);
    };
  }, []);

  return (
    <div
      className={`w-full border-b border-color-gray-100 flex items-center align-middle p-4 space-x-2 fixed left-0 right-0 z-10 bg-white dark:bg-gray-800 transform transition-all duration-200 translate-y-0 ${
        !show ? '-translate-y-full' : ''
      } ${!atZero ? 'shadow' : ''}`}
    >
      <div className="lg:hidden">
        <Button className="rounded-full w-12 h-12 -ml-4 -mt-4 -mb-4" type="text">
          <MenuIcon />
        </Button>
      </div>
      <LinkedLogo />
    </div>
  );
}
