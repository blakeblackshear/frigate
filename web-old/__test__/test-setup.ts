import '@testing-library/jest-dom';
import 'regenerator-runtime/runtime';
// This creates a fake indexeddb so there is no need to mock idb-keyval
import "fake-indexeddb/auto";
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { vi } from 'vitest';

// This configures a request mocking server with the given request handlers.
export const server = setupServer(...handlers);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

vi.mock('../src/env');

// Establish API mocking before all tests.
beforeAll(() => server.listen());

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => {
  server.resetHandlers();
});

// Clean up after the tests are finished.
afterAll(() => server.close());