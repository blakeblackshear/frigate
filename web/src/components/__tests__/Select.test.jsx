import { h } from 'preact';
import Select from '../Select';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('Select', () => {
  test('on focus, shows a menu', async () => {
    const handleChange = jest.fn();
    render(<Select label="Tacos" onChange={handleChange} options={['tacos', 'burritos']} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('textbox'));
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'tacos' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'burritos' })).toBeInTheDocument();

    fireEvent.click(screen.queryByRole('option', { name: 'burritos' }));
    expect(handleChange).toHaveBeenCalledWith('burritos', 'burritos');
  });

  test('allows keyboard navigation', async () => {
    const handleChange = jest.fn();
    render(<Select label="Tacos" onChange={handleChange} options={['tacos', 'burritos']} />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.queryByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith('burritos', 'burritos');
  });
});
