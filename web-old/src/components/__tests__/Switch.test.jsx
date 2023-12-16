import { h } from 'preact';
import Switch from '../Switch';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('Switch', () => {
  test('renders a hidden checkbox', async () => {
    render(
      <div>
        <Switch id="unchecked-switch" />
        <Switch id="checked-switch" checked={true} />
      </div>
    );

    const unchecked = screen.queryByTestId('unchecked-switch-input');
    expect(unchecked).toHaveAttribute('type', 'checkbox');
    expect(unchecked).not.toBeChecked();

    const checked = screen.queryByTestId('checked-switch-input');
    expect(checked).toHaveAttribute('type', 'checkbox');
    expect(checked).toBeChecked();
  });

  test('calls onChange callback when checked/unchecked', async () => {
    const handleChange = vi.fn();
    const { rerender } = render(<Switch id="check" onChange={handleChange} />);
    fireEvent.change(screen.queryByTestId('check-input'), { checked: true });
    expect(handleChange).toHaveBeenCalledWith('check', true);

    rerender(<Switch id="check" onChange={handleChange} checked />);
    fireEvent.change(screen.queryByTestId('check-input'), { checked: false });
    expect(handleChange).toHaveBeenCalledWith('check', false);
  });

  test('renders a label before', async () => {
    render(<Switch id="check" label="This is the label" />);
    const items = screen.queryAllByTestId(/check-.+/);
    expect(items[0]).toHaveTextContent('This is the label');
    expect(items[1]).toHaveAttribute('data-testid', 'check-input');
  });

  test('renders a label after', async () => {
    render(<Switch id="check" label="This is the label" labelPosition="after" />);
    const items = screen.queryAllByTestId(/check-.+/);
    expect(items[0]).toHaveAttribute('data-testid', 'check-input');
    expect(items[1]).toHaveTextContent('This is the label');
  });
});
