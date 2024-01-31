import { h } from 'preact';
import ActivityIndicator from '../ActivityIndicator';
import { render, screen } from 'testing-library';

describe('ActivityIndicator', () => {
  test('renders an ActivityIndicator with default size md', async () => {
    render(<ActivityIndicator />);
    expect(screen.getByLabelText('Loading…')).toMatchInlineSnapshot(`
      <div
        aria-label="Loading…"
        class="w-full flex items-center justify-center"
      >
        <div
          class="activityindicator ease-in rounded-full border-gray-200 text-blue-500 h-8 w-8 border-4 border-t-4"
        />
      </div>
    `);
  });

  test('renders an ActivityIndicator with size sm', async () => {
    render(<ActivityIndicator size="sm" />);
    expect(screen.getByLabelText('Loading…')).toMatchInlineSnapshot(`
      <div
        aria-label="Loading…"
        class="w-full flex items-center justify-center"
      >
        <div
          class="activityindicator ease-in rounded-full border-gray-200 text-blue-500 h-4 w-4 border-2 border-t-2"
        />
      </div>
    `);
  });

  test('renders an ActivityIndicator with size lg', async () => {
    render(<ActivityIndicator size="lg" />);
    expect(screen.getByLabelText('Loading…')).toMatchInlineSnapshot(`
      <div
        aria-label="Loading…"
        class="w-full flex items-center justify-center"
      >
        <div
          class="activityindicator ease-in rounded-full border-gray-200 text-blue-500 h-16 w-16 border-8 border-t-8"
        />
      </div>
    `);
  });
});
