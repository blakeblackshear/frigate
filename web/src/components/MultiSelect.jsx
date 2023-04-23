import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';
import Menu from './Menu';
import { ArrowDropdown } from '../icons/ArrowDropdown';
import Heading from './Heading';
import Button from './Button';
import CameraIcon from '../icons/Camera';

export default function MultiSelect({ className, title, options, selection, onToggle, onShowAll, onSelectSingle }) {

  const popupRef = useRef(null);

  const [state, setState] = useState({
    showMenu: false,
  });

  const isOptionSelected = (item) => { return selection == "all" || selection.split(',').indexOf(item) > -1; }

  const menuHeight = Math.round(window.innerHeight * 0.55);

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
        <Menu className={`max-h-[${menuHeight}px] overflow-scroll`} relativeTo={popupRef} onDismiss={() => setState({ showMenu: false })}>
          <div className="flex flex-wrap justify-between items-center">
            <Heading className="p-4 justify-center" size="md">{title}</Heading>
            <Button tabindex="false" className="mx-4" onClick={() => onShowAll() }>
              Show All
            </Button>
          </div>
          {options.map((item) => (
            <div className="flex flex-grow" key={item}>
              <label
                className={`flex flex-shrink space-x-2 p-1 my-1 min-w-[176px] hover:bg-gray-200 dark:hover:bg-gray-800 dark:hover:text-white cursor-pointer capitalize text-sm`}>
                <input
                  className="mx-4 m-0 align-middle"
                  type="checkbox"
                  checked={isOptionSelected(item)}
                  onChange={() => onToggle(item)} />
                {item.replaceAll("_", " ")}
              </label>
              <div className="justify-right">
                <Button color={isOptionSelected(item) ? "blue" : "black"} type="text" className="max-h-[35px] mx-2" onClick={() => onSelectSingle(item)}>
                  <CameraIcon />
                </Button>
              </div>
            </div>
          ))}
        </Menu>
      ): null}
    </div>
  );
}
