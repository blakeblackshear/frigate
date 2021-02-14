import { h } from 'preact';
import TextField from '../TextField';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('TextField', () => {
  test('can render a leading icon', async () => {
    render(<TextField label="Tacos" leadingIcon={FakeLeadingIcon} />);
    expect(screen.getByTestId('icon-leading')).toBeInTheDocument();
  });

  test('can render a trailing icon', async () => {
    render(<TextField label="Tacos" trailingIcon={FakeTrailingIcon} />);
    expect(screen.getByTestId('icon-trailing')).toBeInTheDocument();
  });

  test('can renders icons in correct positions', async () => {
    render(<TextField label="Tacos" leadingIcon={FakeLeadingIcon} trailingIcon={FakeTrailingIcon} />);
    const icons = screen.queryAllByTestId(/icon-.+/);
    expect(icons[0]).toHaveAttribute('data-testid', 'icon-leading');
    expect(icons[1]).toHaveAttribute('data-testid', 'icon-trailing');
  });

  test('focuses and blurs', async () => {
    const handleFocus = jest.fn();
    const handleBlur = jest.fn();
    render(<TextField label="Tacos" onFocus={handleFocus} onBlur={handleBlur} />);

    fireEvent.focus(screen.getByRole('textbox'));
    expect(handleFocus).toHaveBeenCalled();
    expect(screen.getByText('Tacos').classList.contains('-translate-y-2')).toBe(true);

    fireEvent.blur(screen.getByRole('textbox'));
    expect(handleBlur).toHaveBeenCalled();
    expect(screen.getByText('Tacos').classList.contains('-translate-y-2')).toBe(false);
  });

  test('onChange updates the value', async () => {
    const handleChangeText = jest.fn();
    render(<TextField label="Tacos" onChangeText={handleChangeText} />);

    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: 'i like tacos' } });
    expect(handleChangeText).toHaveBeenCalledWith('i like tacos');
    expect(input.value).toEqual('i like tacos');
  });

  test('still updates the value if an original value was given', async () => {
    render(<TextField label="Tacos" value="no, burritos" />);

    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: 'i like tacos' } });
    expect(input.value).toEqual('i like tacos');
  });

  test('changes the value if the prop value changes', async () => {
    const { rerender } = render(<TextField key="test" label="Tacos" value="no, burritos" />);

    const input = screen.getByRole('textbox');
    fireEvent.input(input, { target: { value: 'i like tacos' } });
    expect(input.value).toEqual('i like tacos');

    rerender(<TextField key="test" label="Tacos" value="no, really, burritos" />);
    expect(input.value).toEqual('no, really, burritos');
  });
});

function FakeLeadingIcon() {
  return <div data-testid="icon-leading" />;
}

function FakeTrailingIcon() {
  return <div data-testid="icon-trailing" />;
}
