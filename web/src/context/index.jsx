import { h, createContext } from 'preact';
import { get as getData, set as setData } from 'idb-keyval';
import produce from 'immer';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';

const DarkMode = createContext(null);

export function DarkModeProvider({ children }) {
  const [persistedMode, setPersistedMode] = useState(null);
  const [currentMode, setCurrentMode] = useState(persistedMode !== 'media' ? persistedMode : null);

  const setDarkMode = useCallback(
    (value) => {
      setPersistedMode(value);
      setData('darkmode', value);
      if (value !== 'media') {
        setCurrentMode(value);
      }
    },
    [setPersistedMode]
  );

  useEffect(() => {
    async function load() {
      const darkmode = await getData('darkmode');
      setDarkMode(darkmode || 'media');
    }

    load();
  }, []);

  if (persistedMode === null) {
    return null;
  }

  const handleMediaMatch = useCallback(
    ({ matches }) => {
      if (matches) {
        setCurrentMode('dark');
      } else {
        setCurrentMode('light');
      }
    },
    [setCurrentMode]
  );

  useEffect(() => {
    if (persistedMode !== 'media') {
      return;
    }

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    query.addEventListener('change', handleMediaMatch);
    handleMediaMatch(query);
  }, [persistedMode]);

  return (
    <DarkMode.Provider value={{ currentMode, persistedMode, setDarkMode }}>
      <div className={`${currentMode === 'dark' ? 'dark' : ''}`}>{children}</div>
    </DarkMode.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkMode);
}

const Sidebar = createContext(null);

export function SidebarProvider({ children }) {
  const [showSidebar, setShowSidebar] = useState(false);

  return <Sidebar.Provider value={{ showSidebar, setShowSidebar }}>{children}</Sidebar.Provider>;
}

export function useSidebar() {
  return useContext(Sidebar);
}
