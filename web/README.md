This is the Frigate frontend which connects to and provides a User Interface to the Python backend.

# Web Development

## Installing Web Dependencies Via NPM

Within `/web`, run:

```bash
npm install
```

## Running development frontend

Within `/web`, run:

```bash
npm run dev
```

By default, this will connect to `localhost:5000` using HTTP protocol. You can customize the connection with these environment variables:

```bash
# Basic configuration - point to your Frigate instance
PROXY_HOST=<ip_address:port> npm run dev

# Advanced configurations
# Use HTTPS instead of HTTP (websocket will use WSS instead of WS)
PROXY_PROTOCOL=https PROXY_HOST=<ip_address:port> npm run dev

# Disable certificate validation for self-signed or invalid certs
PROXY_SECURE=false PROXY_PROTOCOL=https PROXY_HOST=<ip_address:port> npm run dev
```

### Proxy Configuration Notes

- **PROXY_HOST**: Sets the host and port for your Frigate instance (default: `localhost:5000`)
- **PROXY_PROTOCOL**: Sets the protocol to use (`http` or `https`, default: `http`)
- **PROXY_SECURE**: Controls certificate validation. Set to `false` when:
  - Using self-signed certificates
  - Working with invalid or expired certificates
  - Connecting to HTTPS services in development environments

These options are particularly useful when working with Frigate instances that use HTTPS but don't have proper certificate validation.

## Extensions
Install these IDE extensions for an improved development experience:
- eslint
