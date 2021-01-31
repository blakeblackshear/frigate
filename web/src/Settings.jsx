import { h } from 'preact';
import { useDarkMode } from './context';
import { useCallback } from 'preact/hooks';

export default function Settings() {
  const { currentMode, persistedMode, setDarkMode } = useDarkMode();

  const handleSelect = useCallback(
    (event) => {
      const mode = event.target.value;
      setDarkMode(mode);
    },
    [setDarkMode]
  );

  return (
    <div>
      <label>
        <span className="block uppercase text-sm">Dark mode</span>
        <select className="border-solid border border-gray-500 rounded dark:text-gray-900" onChange={handleSelect}>
          <option selected={persistedMode === 'media'} value="media">
            Auto
          </option>
          <option selected={persistedMode === 'light'} value="light">
            Light
          </option>
          <option selected={persistedMode === 'dark'} value="dark">
            Dark
          </option>
        </select>
      </label>
    </div>
  );
}
