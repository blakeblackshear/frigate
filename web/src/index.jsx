import App from './App';
import { ApiProvider } from './api';
import { h, render } from 'preact';
import 'preact/devtools';
import './index.css';

render(
  <ApiProvider>
    <App />
  </ApiProvider>,
  document.getElementById('root')
);
