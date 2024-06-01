---
id: tls
title: TLS
---

# TLS

Frigate's integrated NGINX server supports TLS certificates. By default Frigate will generate a self signed certificate that will be used for port 443. Frigate is designed to make it easy to use whatever tool you prefer to manage certificates.

Frigate is often running behind a reverse proxy that manages TLS certificates for multiple services. However, if you are running on a device that's separate from your proxy or if you expose Frigate directly to the internet, you may want to configure TLS.

## Certificates

TLS certificates can be mounted at `/etc/letsencrypt/live/frigate` using a bind mount or docker volume.

```yaml
frigate:
  ...
  volumes:
    - /path/to/your/certificate_folder:/etc/letsencrypt/live/frigate
  ...
```

Within the folder, the private key is expected to be named `privkey.pem` and the certificate is expected to be named `fullchain.pem`.

Frigate automatically compares the fingerprint of the certificate at `/etc/letsencrypt/live/frigate/fullchain.pem` against the fingerprint of the TLS cert in NGINX every minute. If these differ, the NGINX config is reloaded to pick up the updated certificate.

## ACME Challenge

Frigate also supports hosting the acme challenge files for the HTTP challenge method if needed. The challenge files should be mounted at `/etc/letsencrypt/www`.

## Advanced customization

If you would like to customize the TLS configuration, you can do so by using a bind mount to override `/usr/local/nginx/conf/tls.conf`. Check the source code for the default configuration and modify from there.
