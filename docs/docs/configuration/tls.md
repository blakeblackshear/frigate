---
id: tls
title: TLS
---

import ConfigTabs from "@site/src/components/ConfigTabs";
import TabItem from "@theme/TabItem";
import NavPath from "@site/src/components/NavPath";

# TLS

Frigate's integrated NGINX server supports TLS certificates. By default Frigate will generate a self signed certificate that will be used for port 8971, stored in `/config/tls` so it survives container recreation. Frigate is designed to make it easy to use whatever tool you prefer to manage certificates.

Frigate is often running behind a reverse proxy that manages TLS certificates for multiple services. You will likely need to set your reverse proxy to allow self signed certificates or you can disable TLS in Frigate's config. However, if you are running on a dedicated device that's separate from your proxy or if you expose Frigate directly to the internet, you may want to configure TLS with valid certificates.

In many deployments, TLS will be unnecessary. Disable it as follows:

<ConfigTabs>
<TabItem value="ui">

Navigate to <NavPath path="Settings > System > TLS" />.

- Set **Enable TLS** to off if running behind a reverse proxy that handles TLS (default: on)

</TabItem>
<TabItem value="yaml">

```yaml
tls:
  enabled: False
```

</TabItem>
</ConfigTabs>

## Certificates

TLS certificates can be mounted at `/etc/letsencrypt/live/frigate` using a bind mount or docker volume.

```yaml {3-4}
frigate:
  ...
  volumes:
    - /path/to/your/certificate_folder:/etc/letsencrypt/live/frigate:ro
  ...
```

Within the folder, the private key is expected to be named `privkey.pem` and the certificate is expected to be named `fullchain.pem`. Mounted certificates take precedence over the self signed pair in `/config/tls`.

`privkey.pem` and `fullchain.pem` must be readable by the runtime user that runs NGINX, and that user must be able to enter the folders above them. Frigate doesn't change ownership of mounted certificates, so give the key to the runtime user's group (gid 1000, your `PGID`, or the group in Docker's `user:`) with group read on the host, for example `chgrp 1000 privkey.pem && chmod g+r privkey.pem`. certbot keeps the key's group and group read on renewal, so this is a one-time step. See [Running as a non-root user](/configuration/non_root).

Note that certbot uses symlinks, and those can't be followed by the container unless it has access to the targets as well, so if using certbot you'll also have to mount the `archive` folder for your domain, e.g.:

```yaml {3-5}
frigate:
  ...
  volumes:
    - /etc/letsencrypt/live/your.fqdn.net:/etc/letsencrypt/live/frigate:ro
    - /etc/letsencrypt/archive/your.fqdn.net:/etc/letsencrypt/archive/your.fqdn.net:ro
  ...

```

Frigate automatically compares the fingerprint of the certificate it loaded, from either location, against the fingerprint of the TLS cert in NGINX every minute. If these differ, the NGINX config is reloaded to pick up the updated certificate.

If you issue Frigate valid certificates you will likely want to configure it to run on port 443 so you can access it without a port number like `https://your-frigate-domain.com` by mapping 8971 to 443.

```yaml {3-4}
frigate:
  ...
  ports:
    - "443:8971"
  ...
```

## ACME Challenge

Frigate also supports hosting the acme challenge files for the HTTP challenge method if needed. The challenge files should be mounted at `/etc/letsencrypt/www`. With a read-only root filesystem this has to be a mounted volume, since Frigate cannot create the directory itself.
