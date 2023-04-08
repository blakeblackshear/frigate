import { h } from 'preact';
import Link from '../Link';
import { render, screen } from 'testing-library';

// eslint-disable-next-line jest/no-disabled-tests
describe.skip('Link', () => {
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
