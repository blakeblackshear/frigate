---
id: tls
title: TLS
---

# TLS

Frigate's integrated NGINX server supports TLS certificates. By default Frigate will generate a self signed certificate that will be used for port 8971. Frigate is designed to make it easy to use whatever tool you prefer to manage certificates.

Frigate is often running behind a reverse proxy that manages TLS certificates for multiple services. You will likely need to set your reverse proxy to allow self signed certificates or you can disable TLS in Frigate's config. However, if you are running on a dedicated device that's separate from your proxy or if you expose Frigate directly to the internet, you may want to configure TLS with valid certificates.

In many deployments, TLS will be unnecessary. It can be disabled in the config with the following yaml:

```yaml
tls:
  enabled: False
```

## Certificates

TLS certificates can be mounted at `/etc/letsencrypt/live/frigate` using a bind mount or docker volume.

```yaml
frigate:
  ...
  volumes:
    - /path/to/your/certificate_folder:/etc/letsencrypt/live/frigate:ro
  ...
```

Within the folder, the private key is expected to be named `privkey.pem` and the certificate is expected to be named `fullchain.pem`.

Note that certbot uses symlinks, and those can't be followed by the container unless it has access to the targets as well, so if using certbot you'll also have to mount the `archive` folder for your domain, e.g.:

```yaml
frigate:
  ...
  volumes:
    - /etc/letsencrypt/live/frigate:/etc/letsencrypt/live/frigate:ro
    - /etc/letsencrypt/archive/frigate:/etc/letsencrypt/archive/frigate:ro
  ...

```

Frigate automatically compares the fingerprint of the certificate at `/etc/letsencrypt/live/frigate/fullchain.pem` against the fingerprint of the TLS cert in NGINX every minute. If these differ, the NGINX config is reloaded to pick up the updated certificate.

If you issue Frigate valid certificates you will likely want to configure it to run on port 443 so you can access it without a port number like `https://your-frigate-domain.com` by mapping 8971 to 443.

```yaml
frigate:
  ...
  ports:
    - "443:8971"
  ...
```

## ACME Challenge

Frigate also supports hosting the acme challenge files for the HTTP challenge method if needed. The challenge files should be mounted at `/etc/letsencrypt/www`.
