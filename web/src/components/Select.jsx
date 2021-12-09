import { h, Fragment } from 'preact';
import ArrowDropdown from '../icons/ArrowDropdown';
import ArrowDropup from '../icons/ArrowDropup';
import Menu, { MenuItem } from './Menu';
import TextField from './TextField';
import DatePicker from './DatePicker';
import Calender from './Calender';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

export default function Select({
  type,
  label,
  onChange,
  paramName,
  options: inputOptions = [],
  selected: propSelected,
}) {
  const options = useMemo(
    () =>
      typeof inputOptions[0] === 'string' ? inputOptions.map((opt) => ({ value: opt, label: opt })) : inputOptions,
    [inputOptions]
  );

  const [showMenu, setShowMenu] = useState(false);
  const [selected, setSelected] = useState();
  const [datePickerValue, setDatePickerValue] = useState();

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
    // DO NOT include `selected`
  }, [options, propSelected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (type === 'datepicker') {
      if ('after' && 'before' in propSelected) {
        if (!propSelected.before || !propSelected.after) return setDatePickerValue('all');

        for (let i = 0; i < inputOptions.length; i++) {
          if (
            inputOptions[i].value &&
            Object.entries(inputOptions[i].value).sort().toString() === Object.entries(propSelected).sort().toString()
          ) {
            setDatePickerValue(inputOptions[i]?.label);
            break;
          } else {
            setDatePickerValue(
              `${new Date(propSelected.after * 1000).toLocaleDateString()} -> ${new Date(
                propSelected.before * 1000 - 1
              ).toLocaleDateString()}`
            );
          }
        }
      }
    }
    if (type === 'dropdown') {
      setSelected(
        Math.max(
          options.findIndex(({ value }) => Object.values(propSelected).includes(value)),
          0
        )
      );
    }
  }, [type, options, inputOptions, propSelected, setSelected]);

  const [focused, setFocused] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const calenderRef = useRef(null);
  const ref = useRef(null);

  const handleSelect = useCallback(
    (value, label) => {
      setSelected(options.findIndex(({ value }) => Object.values(propSelected).includes(value)));
      setShowMenu(false);

      if (!value) return setShowDatePicker(true);
      onChange && onChange(value, label);
    },
    [onChange, options, propSelected, setSelected]
  );

  const handleDateRange = useCallback(
    (range) => {
      onChange && onChange(range, 'range');
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

        // no default
      }
    },
    [onChange, options, showMenu, setShowMenu, setFocused, focused, selected]
  );

  const handleDismiss = useCallback(() => {
    setShowMenu(false);
  }, [setShowMenu]);

  const findDOMNodes = (component) => {
    return (component && (component.base || (component.nodeType === 1 && component))) || null;
  };

  useEffect(() => {
    const addBackDrop = (e) => {
      if (showDatePicker && !findDOMNodes(calenderRef.current).contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    window.addEventListener('click', addBackDrop);
    // setDateToInput(state.selectedDay);
    return function cleanup() {
      window.removeEventListener('click', addBackDrop);
    };
  }, [showDatePicker]);

  switch (type) {
    case 'datepicker':
      return (
        <Fragment>
          <DatePicker
            inputRef={ref}
            label={label}
            onchange={onChange}
            onclick={handleClick}
            onkeydown={handleKeydown}
            trailingIcon={showMenu ? ArrowDropup : ArrowDropdown}
            value={datePickerValue}
          />
          {showDatePicker && (
            <Menu className="rounded-t-none" onDismiss={handleDismiss} relativeTo={ref}>
              <Calender onChange={handleDateRange} calenderRef={calenderRef} />
            </Menu>
          )}
          {showMenu ? (
            <Menu className="rounded-t-none" onDismiss={handleDismiss} relativeTo={ref} widthRelative>
              {options.map(({ value, label }, i) => (
                <MenuItem key={value} label={label} focus={focused === i} onSelect={handleSelect} value={value} />
              ))}
            </Menu>
          ) : null}
        </Fragment>
      );

    // case 'dropdown':
    default:
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
            <Menu className="rounded-t-none" onDismiss={handleDismiss} relativeTo={ref} widthRelative>
              {options.map(({ value, label }, i) => (
                <MenuItem
                  key={value}
                  label={label}
                  focus={focused === i}
                  onSelect={handleSelect}
                  value={{ [paramName]: value }}
                />
              ))}
            </Menu>
          ) : null}
        </Fragment>
      );
  }
}
