import { h, Fragment } from 'preact';
import Button from './Button';
import Heading from './Heading';
import { createPortal } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';

export default function Dialog({ actions = [], portalRootID = 'dialogs', title, text }) {
  const portalRoot = portalRootID && document.getElementById(portalRootID);
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      setShow(true);
    });
  }, []);

  const dialog = (
    <Fragment>
      <div
        data-testid="scrim"
        key="scrim"
        className="fixed bg-fixed inset-0 z-10 flex justify-center items-center bg-black bg-opacity-40"
      >
        <div
          role="modal"
          className={`absolute rounded shadow-2xl bg-white dark:bg-gray-700 max-w-sm text-gray-900 dark:text-white transition-transform transition-opacity duration-75 transform scale-90 opacity-0 ${
            show ? 'scale-100 opacity-100' : ''
          }`}
        >
          <div className="p-4">
            <Heading size="lg">{title}</Heading>
            <p>{text}</p>
          </div>
          <div className="p-2 flex justify-start flex-row-reverse space-x-2">
            {actions.map(({ color, text, onClick, ...props }, i) => (
              <Button className="ml-2" color={color} key={i} onClick={onClick} type="text" {...props}>
                {text}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Fragment>
  );

  return portalRoot ? createPortal(dialog, portalRoot) : dialog;
}
