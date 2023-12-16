import { h, Fragment } from 'preact';
import { createPortal } from 'preact/compat';
import { useState, useEffect } from 'preact/hooks';

export default function Dialog({ children, portalRootID = 'dialogs' }) {
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
          className={`absolute rounded shadow-2xl bg-white dark:bg-gray-700 sm:max-w-sm md:max-w-md lg:max-w-lg text-gray-900 dark:text-white transition-transform transition-opacity duration-75 transform scale-90 opacity-0 ${
            show ? 'scale-100 opacity-100' : ''
          }`}
        >
          {children}
        </div>
      </div>
    </Fragment>
  );

  return portalRoot ? createPortal(dialog, portalRoot) : dialog;
}
