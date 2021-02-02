import { h, Fragment } from 'preact';
import ArrowDropdown from '../icons/ArrowDropdown';
import ArrowDropup from '../icons/ArrowDropup';
import Menu, { MenuItem } from './Menu';
import TextField from './TextField';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

export default function Select({ label, onChange, options: inputOptions = [], selected: propSelected }) {
  const options = useMemo(
    () =>
      typeof inputOptions[0] === 'string' ? inputOptions.map((opt) => ({ value: opt, label: opt })) : inputOptions,
    [inputOptions]
  );
  const [showMenu, setShowMenu] = useState(false);
  const [selected, setSelected] = useState(
    Math.max(
      options.findIndex(({ value }) => value === propSelected),
      0
    )
  );
  const [focused, setFocused] = useState(null);

  const ref = useRef(null);

  const handleSelect = useCallback(
    (value, label) => {
      setSelected(options.findIndex((opt) => opt.value === value));
      onChange && onChange(value, label);
      setShowMenu(false);
    },
    [onChange]
  );

  const handleClick = useCallback(() => {
    setShowMenu(true);
  }, [setShowMenu]);

  const handleKeydown = useCallback(
    (event) => {
      switch (event.key) {
        case 'Enter': {
          if (!showMenu) {
            setShowMenu(true);
            setFocused(selected);
          } else {
            setSelected(focused);
            onChange && onChange(options[focused].value, options[focused].label);
            setShowMenu(false);
          }
          break;
        }

        case 'ArrowDown': {
          const newIndex = focused + 1;
          newIndex < options.length && setFocused(newIndex);
          break;
        }

        case 'ArrowUp': {
          const newIndex = focused - 1;
          newIndex > -1 && setFocused(newIndex);
          break;
        }
      }
    },
    [setShowMenu, setFocused, focused, selected]
  );

  const handleDismiss = useCallback(() => {
    setShowMenu(false);
  }, [setShowMenu]);

  // Reset the state if the prop value changes
  useEffect(() => {
    const selectedIndex = Math.max(
      options.findIndex(({ value }) => value === propSelected),
      0
    );
    if (propSelected && selectedIndex !== selected) {
      setSelected(selectedIndex);
      setFocused(selectedIndex);
    }
  }, [propSelected]);

  return (
    <Fragment>
      <TextField
        inputRef={ref}
        label={label}
        onchange={onChange}
        onclick={handleClick}
        onkeydown={handleKeydown}
        readonly
        trailingIcon={showMenu ? ArrowDropup : ArrowDropdown}
        value={options[selected]?.label}
      />
      {showMenu ? (
        <Menu className="rounded-t-none" onDismiss={handleDismiss} relativeTo={ref}>
          {options.map(({ value, label }, i) => (
            <MenuItem key={value} label={label} focus={focused === i} onSelect={handleSelect} value={value} />
          ))}
        </Menu>
      ) : null}
    </Fragment>
  );
}
