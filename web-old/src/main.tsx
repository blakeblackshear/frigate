import { render } from 'preact'
import App from './app'
import { ApiProvider } from './api';
import './index.css'

render(<ApiProvider>
    <App />
  </ApiProvider>, document.getElementById('app') as HTMLElement)
