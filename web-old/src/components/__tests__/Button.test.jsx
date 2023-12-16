import { h } from 'preact';
import Button from '../Button';
import { render, screen } from '@testing-library/preact';

describe('Button', () => {
  test('renders children', async () => {
    render(
      <Button>
        <div>hello</div>
        <div>hi</div>
      </Button>
    );
    expect(screen.queryByText('hello')).toBeInTheDocument();
    expect(screen.queryByText('hi')).toBeInTheDocument();
  });

  test('includes focus, active, and hover classes when enabled', async () => {
    render(<Button>click me</Button>);

    const classList = screen.queryByRole('button').classList;
    expect(classList.contains('focus:outline-none')).toBe(true);
    expect(classList.contains('focus:ring-2')).toBe(true);
    expect(classList.contains('hover:shadow-md')).toBe(true);
    expect(classList.contains('active:bg-blue-600')).toBe(true);
  });

  test('does not focus, active, and hover classes when enabled', async () => {
    render(<Button disabled>click me</Button>);

    const classList = screen.queryByRole('button').classList;
    expect(classList.contains('focus:outline-none')).toBe(false);
    expect(classList.contains('focus:ring-2')).toBe(false);
    expect(classList.contains('hover:shadow-md')).toBe(false);
    expect(classList.contains('active:bg-blue-600')).toBe(false);
  });
});
