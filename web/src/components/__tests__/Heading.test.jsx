import { h } from 'preact';
import Heading from '../Heading';
import { render, screen } from '@testing-library/preact';

describe('Heading', () => {
  test('renders content with default size', async () => {
    render(<Heading>Hello</Heading>);
    expect(screen.queryByText('Hello')).toBeInTheDocument();
    expect(screen.queryByText('Hello').classList.contains('text-2xl')).toBe(true);
  });

  test('renders with custom size', async () => {
    render(<Heading size="lg">Hello</Heading>);
    expect(screen.queryByText('Hello')).toBeInTheDocument();
    expect(screen.queryByText('Hello').classList.contains('text-2xl')).toBe(false);
    expect(screen.queryByText('Hello').classList.contains('text-lg')).toBe(true);
  });

  test('renders with custom className', async () => {
    render(<Heading className="tacos">Hello</Heading>);
    expect(screen.queryByText('Hello')).toBeInTheDocument();
    expect(screen.queryByText('Hello').classList.contains('text-2xl')).toBe(true);
    expect(screen.queryByText('Hello').classList.contains('tacos')).toBe(true);
  });
});
