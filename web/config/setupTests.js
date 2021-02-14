import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom/extend-expect';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

window.fetch = () => Promise.resolve();

beforeEach(() => {
  jest.spyOn(window, 'fetch').mockImplementation(async (url, opts = {}) => {
    throw new Error(`Unexpected fetch to ${url}, ${JSON.stringify(opts)}`);
  });
});

jest.mock('../src/env');
