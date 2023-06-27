import { h, Fragment } from 'preact';
import BaseAppBar from './components/AppBar';
import LinkedLogo from './components/LinkedLogo';
import Menu, { MenuItem, MenuSeparator } from './components/Menu';
import AutoAwesomeIcon from './icons/AutoAwesome';
import LightModeIcon from './icons/LightMode';
import DarkModeIcon from './icons/DarkMode';
import SettingsIcon from './icons/Settings';
import FrigateRestartIcon from './icons/FrigateRestart';
import Prompt from './components/Prompt';
import { useDarkMode, useViewMode } from './context';
import { useCallback, useRef, useState } from 'preact/hooks';
import { useRestart } from './api/ws';
import { ViewModeTypes } from './components/ViewOptionEnum'

export default function AppBar() {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showDialogWait, setShowDialogWait] = useState(false);
  const { viewMode, setViewMode } = useViewMode();
  const { setDarkMode } = useDarkMode();
  const { send: sendRestart } = useRestart();

  const handleSelectDarkMode = useCallback(
    (value) => {
      setDarkMode(value);
      setShowMoreMenu(false);
    },
    [setDarkMode, setShowMoreMenu]
  );

  const handleSetViewMode = useCallback(
    (value) => {
      setViewMode(value);
      setShowMoreMenu(false);
    },
    [setViewMode, setShowMoreMenu]
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
          <MenuItem icon={AutoAwesomeIcon} label="Auto dark mode" value="media" onSelect={handleSelectDarkMode} />
          <MenuSeparator />
          <MenuItem icon={LightModeIcon} label="Light" value="light" onSelect={handleSelectDarkMode} />
          <MenuItem icon={DarkModeIcon} label="Dark" value="dark" onSelect={handleSelectDarkMode} />
          <MenuSeparator />
          <MenuItem icon={SettingsIcon} label="View:">
            <select
              className="flex flex-grow p-0 py-7 px-8"
              value={viewMode}
              onChange={(e) => handleSetViewMode(e.target.value)}
            >
              { Object.keys(ViewModeTypes).filter((v) => !isNaN(Number(v))).map(key => <option key={key} value={key}>{ViewModeTypes[key]}</option>) }
            </select>
          </MenuItem>
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
          text="This can take up to one minute, please wait before reloading the page."
        />
      ) : null}
    </Fragment>
  );
}
