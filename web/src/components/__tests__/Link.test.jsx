import { h } from 'preact';
import Link from '../Link';
import { render, screen } from 'testing-library';

describe('Link', () => {
  test('renders a link', async () => {
    render(<Link href="/tacos">Hello</Link>);
    expect(screen.queryByText('Hello')).toMatchInlineSnapshot(`
      <a
        class="text-blue-500 hover:underline"
        href="/tacos"
      >
        Hello
      </a>
    `);
  });
});
