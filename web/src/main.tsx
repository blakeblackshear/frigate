import App from './App';
import { ApiProvider } from './api';
import { render } from 'preact';
import 'preact/devtools';
import './index.css';

render(
  <ApiProvider>
    <App />
  </ApiProvider>,
  document.getElementById('app') as HTMLElement
);
