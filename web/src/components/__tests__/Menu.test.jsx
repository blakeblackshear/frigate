import { h } from 'preact';
import Menu, { MenuItem } from '../Menu';
import { fireEvent, render, screen } from '@testing-library/preact';
import { useRef } from 'preact/hooks';

describe('Menu', () => {
  test('renders a dialog', async () => {
    function Test() {
      const relativeRef = useRef();
      return (
        <div>
          <div ref={relativeRef} />
          <Menu relativeTo={relativeRef} />
        </div>
      );
    }

    render(<Test />);
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
  });
});

describe('MenuItem', () => {
  test('renders a menu item', async () => {
    render(<MenuItem label="Tacos" />);
    expect(screen.queryByRole('option')).toHaveTextContent('Tacos');
  });

  test('calls onSelect when clicked', async () => {
    const handleSelect = vi.fn();
    render(<MenuItem label="Tacos" onSelect={handleSelect} value="tacos-value" />);
    fireEvent.click(screen.queryByRole('option'));
    expect(handleSelect).toHaveBeenCalledWith('tacos-value', 'Tacos');
  });

  test('renders and icon when passed', async () => {
    function Icon() {
      return <div data-testid="icon" />;
    }
    render(<MenuItem icon={Icon} label="Tacos" />);
    expect(screen.queryByTestId('icon')).toBeInTheDocument();
  });

  test('applies different styles when focused', async () => {
    const { rerender } = render(<MenuItem label="Tacos" />);
    const classes = Array.from(screen.queryByRole('option').classList);
    rerender(<MenuItem label="Tacos" focus />);
    const focusClasses = Array.from(screen.queryByRole('option').classList);

    expect(focusClasses.length).toBeGreaterThan(classes.length);
  });
});
