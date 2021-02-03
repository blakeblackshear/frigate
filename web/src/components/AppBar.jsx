import { h } from 'preact';
import Button from './Button';
import LinkedLogo from './LinkedLogo';
import Menu, { MenuItem } from './Menu';
import MenuIcon from '../icons/Menu';
import MoreIcon from '../icons/More';
import { useDarkMode, useSidebar } from '../context';
import { useLayoutEffect, useCallback, useRef, useState } from 'preact/hooks';

// We would typically preserve these in component state
// But need to avoid too many re-renders
let ticking = false;
let lastScrollY = window.scrollY;

export default function AppBar({ title }) {
  const [show, setShow] = useState(true);
  const [atZero, setAtZero] = useState(window.scrollY === 0);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { currentMode, persistedMode, setDarkMode } = useDarkMode();
  const { showSidebar, setShowSidebar } = useSidebar();

  const handleSelectDarkMode = useCallback(
    (value, label) => {
      setDarkMode(value);
      setShowMoreMenu(false);
    },
    [setDarkMode, setShowMoreMenu]
  );

  const moreRef = useRef(null);

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

  const handleShowMenu = useCallback(() => {
    setShowMoreMenu(true);
  }, [setShowMoreMenu]);

  const handleDismissMoreMenu = useCallback(() => {
    setShowMoreMenu(false);
  }, [setShowMoreMenu]);

  const handleShowSidebar = useCallback(() => {
    setShowSidebar(true);
  }, [setShowSidebar]);

  return (
    <div
      className={`w-full border-b border-gray-100 dark:border-gray-700 flex items-center align-middle p-4 space-x-2 fixed left-0 right-0 z-10 bg-white dark:bg-gray-900 transform transition-all duration-200 translate-y-0 ${
        !show ? '-translate-y-full' : ''
      } ${!atZero ? 'shadow' : ''}`}
    >
      <div className="lg:hidden">
        <Button className="rounded-full w-12 h-12" onClick={handleShowSidebar} type="text">
          <MenuIcon />
        </Button>
      </div>
      <LinkedLogo />
      <div className="flex-grow-1 flex justify-end w-full">
        <div ref={moreRef}>
          <Button className="rounded-full w-12 h-12" onClick={handleShowMenu} type="text">
            <MoreIcon />
          </Button>
        </div>
      </div>
      {showMoreMenu ? (
        <Menu onDismiss={handleDismissMoreMenu} relativeTo={moreRef}>
          <MenuItem label="Auto" value="media" onSelect={handleSelectDarkMode} />
          <MenuItem label="Light" value="light" onSelect={handleSelectDarkMode} />
          <MenuItem label="Dark" value="dark" onSelect={handleSelectDarkMode} />
        </Menu>
      ) : null}
    </div>
  );
}
