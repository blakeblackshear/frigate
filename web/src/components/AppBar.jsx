import { h } from 'preact';
import Button from './Button';
import LinkedLogo from './LinkedLogo';
import Menu, { MenuItem, MenuSeparator } from './Menu';
import MenuIcon from '../icons/Menu';
import MoreIcon from '../icons/More';
import AutoAwesomeIcon from '../icons/AutoAwesome';
import LightModeIcon from '../icons/LightMode';
import DarkModeIcon from '../icons/DarkMode';
import { useDarkMode, useDrawer } from '../context';
import { useLayoutEffect, useCallback, useRef, useState } from 'preact/hooks';

// We would typically preserve these in component state
// But need to avoid too many re-renders
let lastScrollY = window.scrollY;

export default function AppBar({ title }) {
  const [show, setShow] = useState(true);
  const [atZero, setAtZero] = useState(window.scrollY === 0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { setDarkMode } = useDarkMode();
  const { setShowDrawer } = useDrawer();

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

      window.requestAnimationFrame(() => {
        setShow(scrollY <= 0 || lastScrollY > scrollY);
        setAtZero(scrollY === 0);
        lastScrollY = scrollY;
      });
    },
    [setShow]
  );

  useLayoutEffect(() => {
    document.addEventListener('scroll', scrollListener);
    return () => {
      document.removeEventListener('scroll', scrollListener);
    };
  }, [scrollListener]);

  const handleShowMenu = useCallback(() => {
    setShowMoreMenu(true);
  }, [setShowMoreMenu]);

  const handleDismissMoreMenu = useCallback(() => {
    setShowMoreMenu(false);
  }, [setShowMoreMenu]);

  const handleShowDrawer = useCallback(() => {
    setShowDrawer(true);
  }, [setShowDrawer]);

  return (
    <div
      className={`w-full border-b border-gray-200 dark:border-gray-700 flex items-center align-middle p-4 space-x-2 fixed left-0 right-0 z-10 bg-white dark:bg-gray-900 transform transition-all duration-200 translate-y-0 ${
        !show ? '-translate-y-full' : ''
      } ${!atZero ? 'shadow-sm' : ''}`}
    >
      <div className="lg:hidden">
        <Button color="black" className="rounded-full w-12 h-12" onClick={handleShowDrawer} type="text">
          <MenuIcon className="w-10 h-10" />
        </Button>
      </div>
      <LinkedLogo />
      <div className="flex-grow-1 flex justify-end w-full">
        <div className="w-auto" ref={moreRef}>
          <Button color="black" className="rounded-full w-12 h-12" onClick={handleShowMenu} type="text">
            <MoreIcon className="w-10 h-10" />
          </Button>
        </div>
      </div>
      {showMoreMenu ? (
        <Menu onDismiss={handleDismissMoreMenu} relativeTo={moreRef}>
          <MenuItem icon={AutoAwesomeIcon} label="Auto dark mode" value="media" onSelect={handleSelectDarkMode} />
          <MenuSeparator />
          <MenuItem icon={LightModeIcon} label="Light" value="light" onSelect={handleSelectDarkMode} />
          <MenuItem icon={DarkModeIcon} label="Dark" value="dark" onSelect={handleSelectDarkMode} />
        </Menu>
      ) : null}
    </div>
  );
}
