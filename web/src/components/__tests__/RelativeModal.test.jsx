import { h, createRef } from 'preact';
import RelativeModal from '../RelativeModal';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('RelativeModal', () => {
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('keeps tab focus', async () => {
    const ref = createRef();
    render(
      <div>
        <label for="outside-input">outside</label>
        <input id="outside-input" tabindex="0" />
        <div ref={ref} />
        <RelativeModal relativeTo={ref}>
          <input data-testid="modal-input-0" tabindex="0" />
          <input data-testid="modal-input-1" tabindex="0" />
        </RelativeModal>
      </div>
    );

    const inputs = screen.queryAllByTestId(/modal-input/);
    expect(document.activeElement).toBe(inputs[0]);
    userEvent.tab();
    expect(document.activeElement).toBe(inputs[1]);
    userEvent.tab();
    expect(document.activeElement).toBe(inputs[0]);
  });

  test('pressing ESC dismisses', async () => {
    const handleDismiss = vi.fn();
    const ref = createRef();
    render(
      <div>
        <div ref={ref} />
        <RelativeModal onDismiss={handleDismiss} relativeTo={ref}>
          <input data-testid="modal-input-0" tabindex="0" />
        </RelativeModal>
      </div>
    );

    const dialog = screen.queryByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement, { key: 'Escape', code: 'Escape' });
    expect(handleDismiss).toHaveBeenCalled();
  });

  test('clicking a scrim dismisses', async () => {
    const handleDismiss = vi.fn();
    const ref = createRef();
    render(
      <div>
        <div ref={ref} />
        <RelativeModal onDismiss={handleDismiss} relativeTo={ref}>
          <input data-testid="modal-input-0" tabindex="0" />
        </RelativeModal>
      </div>
    );

    fireEvent.click(screen.queryByTestId('scrim'));
    expect(handleDismiss).toHaveBeenCalled();
  });
});
