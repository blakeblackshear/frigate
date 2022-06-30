import { h, Fragment } from 'preact';
import useSWR from 'swr';
import BaseAppBar from './components/AppBar';
import LinkedLogo from './components/LinkedLogo';
import Menu, { MenuItem, MenuSeparator } from './components/Menu';
import AutoAwesomeIcon from './icons/AutoAwesome';
import LightModeIcon from './icons/LightMode';
import DarkModeIcon from './icons/DarkMode';
import FrigateRestartIcon from './icons/FrigateRestart';
import Prompt from './components/Prompt';
import { useDarkMode } from './context';
import { useCallback, useRef, useState } from 'preact/hooks';
import { useRestart } from './api/mqtt';
import NotificationMenu, { NotificationItem } from './components/NotificationMenu';

export default function AppBar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDialogWait, setShowDialogWait] = useState(false);
  const { setDarkMode } = useDarkMode();
  const { send: sendRestart } = useRestart();

  const handleSelectDarkMode = useCallback(
    (value) => {
      setDarkMode(value);
      setShowMoreMenu(false);
    },
    [setDarkMode, setShowMoreMenu]
  );

  const { data: notifications } = useSWR('notifications');

  const notifRef = useRef(null);

  const handleShowNotifications = useCallback(() => {
    setShowNotifications(true);
  }, [setShowNotifications]);

  const handleDismissNotifications = useCallback(() => {
    setShowNotifications(false);
  }, [setShowNotifications]);

  const moreRef = useRef(null);

  const handleShowMenu = useCallback(() => {
    setShowMoreMenu(true);
  }, [setShowMoreMenu]);

  const handleDismissMoreMenu = useCallback(() => {
    setShowMoreMenu(false);
  }, [setShowMoreMenu]);

  const handleClickRestartDialog = useCallback(() => {
    setShowDialog(false);
    setShowDialogWait(true);
    sendRestart();
  }, [setShowDialog]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissRestartDialog = useCallback(() => {
    setShowDialog(false);
  }, [setShowDialog]);

  const handleRestart = useCallback(() => {
    setShowMoreMenu(false);
    setShowDialog(true);
  }, [setShowDialog]);

  return (
    <Fragment>
      <BaseAppBar title={LinkedLogo} notificationRef={(notifications && notifications.length > 0) ? notifRef : null} overflowRef={moreRef} onNotificationClick={handleShowNotifications} onOverflowClick={handleShowMenu} />
      {showNotifications ? (
        <NotificationMenu onDismiss={handleDismissNotifications} relativeTo={notifRef}>
          {notifications.map((item) => (
            <NotificationItem key={item.title} title={item.title} desc={item.desc} type={item.type} href={item.url} />
          ))}
        </NotificationMenu>
      ) : null}
      {showMoreMenu ? (
        <Menu onDismiss={handleDismissMoreMenu} relativeTo={moreRef}>
          <MenuItem icon={AutoAwesomeIcon} label="Auto dark mode" value="media" onSelect={handleSelectDarkMode} />
          <MenuSeparator />
          <MenuItem icon={LightModeIcon} label="Light" value="light" onSelect={handleSelectDarkMode} />
          <MenuItem icon={DarkModeIcon} label="Dark" value="dark" onSelect={handleSelectDarkMode} />
          <MenuSeparator />
          <MenuItem icon={FrigateRestartIcon} label="Restart Frigate" onSelect={handleRestart} />
        </Menu>
      ) : null}
      {showDialog ? (
        <Prompt
          onDismiss={handleDismissRestartDialog}
          title="Restart Frigate"
          text="Are you sure?"
          actions={[
            { text: 'Yes', color: 'red', onClick: handleClickRestartDialog },
            { text: 'Cancel', onClick: handleDismissRestartDialog },
          ]}
        />
      ) : null}
      {showDialogWait ? (
        <Prompt
          title="Restart in progress"
          text="Please wait a few seconds for the restart to complete before reloading the page."
        />
      ) : null}
    </Fragment>
  );
}
