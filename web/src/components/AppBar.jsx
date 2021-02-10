import { h } from 'preact';
import Button from './Button';
import MenuIcon from '../icons/Menu';
import MoreIcon from '../icons/More';
import { useDrawer } from '../context';
import { useLayoutEffect, useCallback, useState } from 'preact/hooks';

// We would typically preserve these in component state
// But need to avoid too many re-renders
let lastScrollY = window.scrollY;

export default function AppBar({ title: Title, overflowRef, onOverflowClick }) {
  const [show, setShow] = useState(true);
  const [atZero, setAtZero] = useState(window.scrollY === 0);
  const { setShowDrawer } = useDrawer();

  const scrollListener = useCallback(() => {
    const scrollY = window.scrollY;

    window.requestAnimationFrame(() => {
      setShow(scrollY <= 0 || lastScrollY > scrollY);
      setAtZero(scrollY === 0);
      lastScrollY = scrollY;
    });
  }, [setShow]);

  useLayoutEffect(() => {
    document.addEventListener('scroll', scrollListener);
    return () => {
      document.removeEventListener('scroll', scrollListener);
    };
  }, [scrollListener]);

  const handleShowDrawer = useCallback(() => {
    setShowDrawer(true);
  }, [setShowDrawer]);

  return (
    <div
      className={`w-full border-b border-gray-200 dark:border-gray-700 flex items-center align-middle p-4 space-x-2 fixed left-0 right-0 z-10 bg-white dark:bg-gray-900 transform transition-all duration-200 ${
        !show ? '-translate-y-full' : 'translate-y-0'
      } ${!atZero ? 'shadow-sm' : ''}`}
      data-testid="appbar"
    >
      <div className="lg:hidden">
        <Button color="black" className="rounded-full w-12 h-12" onClick={handleShowDrawer} type="text">
          <MenuIcon className="w-10 h-10" />
        </Button>
      </div>
      <Title />
      <div className="flex-grow-1 flex justify-end w-full">
        {overflowRef && onOverflowClick ? (
          <div className="w-auto" ref={overflowRef}>
            <Button
              aria-label="More options"
              color="black"
              className="rounded-full w-12 h-12"
              onClick={onOverflowClick}
              type="text"
            >
              <MoreIcon className="w-10 h-10" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
