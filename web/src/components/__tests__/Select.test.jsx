import { h } from 'preact';
import Select from '../Select';
import { fireEvent, render, screen } from '@testing-library/preact';

describe('Select', () => {
  test('on focus, shows a menu', async () => {
    const handleChange = vi.fn();
    render(
      <Select
        label="Tacos"
        type="dropdown"
        onChange={handleChange}
        options={['all', 'tacos', 'burritos']}
        paramName={['dinner']}
        selected=""
      />
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('textbox'));
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'all' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'tacos' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'burritos' })).toBeInTheDocument();

    fireEvent.click(screen.queryByRole('option', { name: 'tacos' }));
    expect(handleChange).toHaveBeenCalledWith({ dinner: 'tacos' });
  });

  test('allows keyboard navigation', async () => {
    const handleChange = vi.fn();
    render(
      <Select
        label="Tacos"
        type="dropdown"
        onChange={handleChange}
        options={['tacos', 'burritos']}
        paramName={['dinner']}
        selected=""
      />
    );

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    const input = screen.getByRole('textbox');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.queryByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handleChange).toHaveBeenCalledWith({ dinner: 'burritos' });
  });
});
