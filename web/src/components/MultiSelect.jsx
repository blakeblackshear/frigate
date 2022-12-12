import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';
import Menu from './Menu';
import { ArrowDropdown } from '../icons/ArrowDropdown';
import Heading from './Heading';

export default function MultiSelect({ className, title, options, selection, onToggle }) {

  const popupRef = useRef(null);

  const [state, setState] = useState({
    showMenu: false,
  });

  return (
    <div className={`${className} p-2`} ref={popupRef}>
      <div
        className="flex justify-between min-w-[120px]"
        onClick={() => setState({ showMenu: true })}
      >
        <label>{title}</label>
        <ArrowDropdown className="w-6" />
      </div>
      {state.showMenu ? (
        <Menu relativeTo={popupRef} onDismiss={() => setState({ showMenu: false })}>
          <Heading className="p-4 justify-center" size="md">{title}</Heading>
          {options.map((item) => (
            <label
              className={`flex flex-shrink space-x-2 p-1 my-1 min-w-[176px] hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer capitalize text-sm`}
              key={item}>
              <input
                className="mx-4 m-0 align-middle"
                type="checkbox"
                checked={selection == "all" || selection.indexOf(item) > -1}
                onChange={() => onToggle(item)} />
              {item.replaceAll("_", " ")}
            </label>
          ))}
        </Menu>
      ): null}
    </div>
  );
}