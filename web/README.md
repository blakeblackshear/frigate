This is the Frigate frontend which connects to and provides a User Interface to the Python backend.

# Installing
Within `/web`, run:

```bash
npm install
```

# Running
Within `/web`, run:

```bash
PROXY_HOST=<ip_address:port> npm run dev
```

The Proxy Host can point to your existing Frigate instance. Otherwise defaults to `localhost:5000` if running Frigate on the same machine.

# Extensions
Install these IDE extensions for an improved development experience:
- eslint
