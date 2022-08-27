import { h, Fragment } from 'preact';
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
import { useTranslation } from 'react-i18next';

export default function AppBar() {
  const { t } = useTranslation();
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
      <BaseAppBar title={LinkedLogo} overflowRef={moreRef} onOverflowClick={handleShowMenu} />
      {showMoreMenu ? (
        <Menu onDismiss={handleDismissMoreMenu} relativeTo={moreRef}>
          <MenuItem icon={AutoAwesomeIcon} label={t('auto_dark_mode')} value="media" onSelect={handleSelectDarkMode} />
          <MenuSeparator />
          <MenuItem icon={LightModeIcon} label={t('light')} value="light" onSelect={handleSelectDarkMode} />
          <MenuItem icon={DarkModeIcon} label={t('dark')} value="dark" onSelect={handleSelectDarkMode} />
          <MenuSeparator />
          <MenuItem icon={FrigateRestartIcon} label={t('restart_frigate')} onSelect={handleRestart} />
        </Menu>
      ) : null}
      {showDialog ? (
        <Prompt
          onDismiss={handleDismissRestartDialog}
          title={t('restart_frigate')}
          text={t('are_you_sure')}
          actions={[
            { text: `${t('yes')}`, color: 'red', onClick: handleClickRestartDialog },
            { text: `${t('cancel')}`, onClick: handleDismissRestartDialog },
          ]}
        />
      ) : null}
      {showDialogWait ? (
        <Prompt
          title={t('restart_in_progress')}
          text={t('wait_for_restart')}
        />
      ) : null}
    </Fragment>
  );
}
