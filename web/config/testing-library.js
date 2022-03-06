import { h } from 'preact';
import { render } from '@testing-library/preact';
import { ApiProvider } from '../src/api';

const Wrapper = ({ children }) => {
  return (
    <ApiProvider
      options={{
        dedupingInterval: 0,
        provider: () => new Map(),
      }}
    >
      {children}
    </ApiProvider>
  );
};

const customRender = (ui, options) => render(ui, { wrapper: Wrapper, ...options });

// re-export everything
export * from '@testing-library/preact';

// override render method
export { customRender as render };
