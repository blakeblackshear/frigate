import { h, Fragment } from 'preact';
import Dialog from './Dialog';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { useRestart } from '../api/mqtt';

export default function DialogRestart({ show, setShow }) {
  const { payload: restartedMessage = null, send: sendRestart } = useRestart();

  useEffect(() => {
    if (show === 2) {
      sendRestart('please_restart');
      setTimeout(async () => {
        const delay = (ms) => new Promise(res => setTimeout(res, ms));

        /* eslint-disable no-constant-condition */
        while (true) {
          try {
            const response = await fetch('/api/config', { method: 'GET' });
            if (await response.status === 200) {
              break;;
            }
          }
          catch (e) {}
          await delay(987);
        }
        window.location.reload();

      }, 3456);
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Fragment>
      {show === 2 ? (
        <Dialog title="Restart in progress" text="This page should refresh as soon as the server is up and running…" />
      ) : show === 1 && (
        <Dialog
          onDismiss={() => setShow(0)}
          title="Restart Frigate"
          text="Are you sure?"
          actions={[
            { text: 'Yes', color: 'red', onClick: () => setShow(2) },
            { text: 'Cancel', onClick: () => setShow(0) } ]}
        />
      )}
    </Fragment>
  );
}
