# Examples

This folder is here to showcase testing examples of a real application.

To run the tests:

```bash
cd redux-saga  # or `cd hooks`...
npm install
npm install jest-websocket-mock
# Or, to run the tests against a local jest-websocket-mock build:
cd ..; npm run build && npm pack; cd examples; npm install ../jest-websocket-mock-*;
SKIP_PREFLIGHT_CHECK=true npm test -- --coverage
```

The websocket tests are under `src/__tests__/saga.test.js` and ``src/**tests**/App.test.js`.

If you want to see the app running locally:

```bash
node server.js  # start the server
```

and in another terminal:

```bash
npm start  # start the client
```
