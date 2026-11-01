---
id: reverse_proxy
title: Setting up a reverse proxy
---

This guide outlines the basic configuration steps needed to set up a reverse proxy in front of your Frigate instance.

A reverse proxy is typically needed if you want to set up Frigate on a custom URL, on a subdomain, or on a host serving multiple sites. It could also be used to set up your own authentication provider or for more advanced HTTP routing.

Before setting up a reverse proxy, check if any of the built-in functionality in Frigate suits your needs:
|Topic|Docs|
|-|-|
|TLS|Please see the `tls` [configuration option](../configuration/tls.md)|
|Authentication|Please see the [authentication](../configuration/authentication.md) documentation|
|IPv6|[Enabling IPv6](../configuration/advanced/system.md#enabling-ipv6)

**Note about TLS**
When using a reverse proxy, the TLS session is usually terminated at the proxy, sending the internal request over plain HTTP. If this is the desired behavior, TLS must first be disabled in Frigate, or you will encounter an HTTP 400 error: "The plain HTTP request was sent to HTTPS port."
To disable TLS, set the following in your Frigate configuration:

```yml
tls:
  enabled: false
```

:::warning
A reverse proxy can be used to secure access to an internal web server, but the user will be entirely reliant on the steps they have taken. You must ensure you are following security best practices.
This page does not attempt to outline the specific steps needed to secure your internal website.
Please use your own knowledge to assess and vet the reverse proxy software before you install anything on your system.
:::

## WebSocket support

Frigate relies on WebSockets for real-time communication between the browser and the backend. Features such as camera controls (enabling/disabling a camera, audio, detect, recordings, and other toggles), live stream playback, and other live-updating parts of the UI will not function correctly if WebSocket connections are not proxied.

Your reverse proxy must be configured to forward the `Upgrade` and `Connection` headers so that WebSocket connections can be established. Each proxy example below already includes the directives needed to do this, but if you are adapting your own configuration, ensure these headers are passed through.

Note that some proxies disable WebSocket support by default. For example, Nginx Proxy Manager has a "Websockets Support" toggle that must be enabled.

Frigate rejects WebSocket connections opened from a page on another site. Your proxy must either preserve the original `Host` header or send it in `X-Forwarded-Host`, otherwise Frigate cannot tell the connection came from its own UI.

## Proxies

There are many solutions available to implement reverse proxies and the community is invited to help out documenting others through a contribution to this page.

- [Apache2](#apache2-reverse-proxy)
- [Nginx](#nginx-reverse-proxy)
- [Traefik](#traefik-reverse-proxy)
- [Caddy](#caddy-reverse-proxy)
- [HAProxy](#haproxy)
- [OPNSense HAProxy Add-on](#opnsense-haproxy-add-on)

## Apache2 Reverse Proxy

In the configuration examples below, only the directives relevant to the reverse proxy approach above are included.
On Debian Apache2 the configuration file will be named along the lines of `/etc/apache2/sites-available/cctv.conf`

### Step 1: Configure the Apache2 Reverse Proxy

Make life easier for yourself by presenting your Frigate interface as a DNS sub-domain rather than as a sub-folder of your main domain.
Here we access Frigate via https://cctv.mydomain.co.uk

```xml
<VirtualHost *:443>
    ServerName cctv.mydomain.co.uk

    ProxyPreserveHost On
    ProxyPass "/"  "http://frigatepi.local:8971/"
    ProxyPassReverse "/"  "http://frigatepi.local:8971/"

    ProxyPass /ws ws://frigatepi.local:8971/ws
    ProxyPassReverse /ws ws://frigatepi.local:8971/ws

    ProxyPass /live/ ws://frigatepi.local:8971/live/
    ProxyPassReverse /live/ ws://frigatepi.local:8971/live/

    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)  ws://frigatepi.local:8971/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*)  http://frigatepi.local:8971/$1 [P,L]
</VirtualHost>
```

### Step 2: Use SSL to encrypt access to your Frigate instance

Whilst this won't, on its own, prevent access to your Frigate webserver it will encrypt all content (such as login credentials).
Installing SSL is beyond the scope of this document but [Let's Encrypt](https://letsencrypt.org/) is a widely used approach.
This Apache2 configuration snippet then results in unencrypted requests being redirected to the webserver SSL port

```xml
<VirtualHost *:80>
ServerName cctv.mydomain.co.uk
RewriteEngine on
RewriteCond %{SERVER_NAME} =cctv.mydomain.co.uk
RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
```

### Step 3: Authenticate users at the proxy

There are many ways to authenticate a website but a straightforward approach is to use [Apache2 password files](https://httpd.apache.org/docs/2.4/howto/auth.html).

```xml
<VirtualHost *:443>
    <Location />
        AuthType Basic
        AuthName "Restricted Files"
        AuthUserFile "/var/www/passwords"
        Require user paul
    </Location>
</VirtualHost>
```

## Nginx Reverse Proxy

This method shows a working example for subdomain type reverse proxy with SSL enabled.

### Setup server and port to reverse proxy

This is set in `$server` and `$port` this should match your ports you have exposed to your docker container. Optionally you listen on port `443` and enable `SSL`

```
# ------------------------------------------------------------
# frigate.domain.com
# ------------------------------------------------------------

server {
  set $forward_scheme http;
  set $server         "192.168.100.2"; # FRIGATE SERVER LOCATION
  set $port           8971;

  listen 80;
  listen 443 ssl;
  http2 on;

  server_name frigate.domain.com;
}
```

### Setup SSL (optional)

This section points to your SSL files, the example below shows locations to a default Lets Encrypt SSL certificate.

```
  # Let's Encrypt SSL
  include conf.d/include/letsencrypt-acme-challenge.conf;
  include conf.d/include/ssl-ciphers.conf;
  ssl_certificate /etc/letsencrypt/live/npm-1/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/npm-1/privkey.pem;
```

### Setup reverse proxy settings

The settings below enabled connection upgrade, sets up logging (optional) and proxies everything from the `/` context to the docker host and port specified earlier in the configuration

```
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $http_connection;
  proxy_http_version 1.1;

  access_log /data/logs/proxy-host-40_access.log proxy;
  error_log /data/logs/proxy-host-40_error.log warn;

  location / {
    proxy_set_header Host $host;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_http_version 1.1;
  }

```

## Traefik Reverse Proxy

This example shows how to add a `label` to the Frigate Docker compose file, enabling Traefik to automatically discover your Frigate instance.
Before using the example below, you must first set up Traefik with the [Docker provider](https://doc.traefik.io/traefik/providers/docker/)

```yml
services:
  frigate:
    container_name: frigate
    image: ghcr.io/blakeblackshear/frigate:stable
    ...
    ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.services.frigate.loadbalancer.server.port=8971"
      - "traefik.http.routers.frigate.rule=Host(`traefik.example.com`)"
```

The above configuration will create a "service" in Traefik, automatically adding your container's IP on port 8971 as a backend.
It will also add a router, routing requests to "traefik.example.com" to your local container.

Note that with this approach, you don't need to expose any ports for the Frigate instance since all traffic will be routed over the internal Docker network.

## Caddy Reverse Proxy

This example shows Frigate running under a subdomain with logging and a tls cert (in this case a wildcard domain cert obtained independently of caddy) handled via imports

```caddy
(logging) {
        log {
                output file /var/log/caddy/{args[0]}.log {
                        roll_size 10MiB
                        roll_keep 5
                        roll_keep_for 10d
                }
                format json
                level INFO
        }
}


(tls) {
        tls /var/lib/caddy/wildcard.YOUR_DOMAIN.TLD.fullchain.pem /var/lib/caddy/wildcard.YOUR_DOMAIN.TLD.privkey.pem
}

frigate.YOUR_DOMAIN.TLD {
        reverse_proxy http://localhost:8971
        import tls
        import logging frigate.YOUR_DOMAIN.TLD
}

```

## HAProxy

This example is for a pure haproxy installation on a dedicated host. It assumes you have already combined the certificate parts in de cert file.

The frontend config:
```# Public Service: SSLSecured (Frigate)
frontend SSLSecured
    bind XXX.XXX.XXX.XXX:443 ssl crt /etc/haproxy/certs/frigate.cert
    mode http
    option http-keep-alive
    default_backend NVR

    # CONDITION: NVR
    acl acl_frigate hdr(host) -i nvr.example.video

    # RULE: NVR
    use_backend NVR if acl_frigate
```

The backend config:
```# Backend Pool: NVR (Frigate)
backend NVR
    mode http
    balance source
    # stickiness
    stick-table type ipv4 size 50k expire 30m  
    stick on src
    http-reuse safe
    server Frigate XXX.XXX.XXX.XXX:8971
```
The above config is created for a Layer 7 proxy (application layer, in this case http), if streaming the camera feeds are a little spotty or somewhat unstable, you can try to change the *mode* from http to tcp in both the frontend and backend config, which sets up a Layer 4 proxy (proxy by protocol). Make sure you change hdr(host) to req.ssl_sni in the frontend Condition to make the host based condition work on tcp traffic. 

## OPNSense HAProxy add-on

This guide is for the OPNSense firewall add-on *os-haproxy* and is configured and tested on version 5.1 of the add-on on OPNSense 26.7.
The guide starts where you are already done setting up the system, *have a certificate added to the certificate store* and *installed the plugin/add-on*.

Step by step plan:
1. Go to Services -> HAProxy, click on Settings;
2. Add a Real Server under *Real Servers*;
3. Fill in the fields *Name or Prefix* and *Description*;
4. set *Type* to **static**;
5. fill in the frigate IP in the *FQDN or IP* field;
6. under *Common Options* fill *Port* with the port number for your Frigate (e.g. 8971) and
7. Click **Save** to store this configuration.
8. Under *Virtual Services* open *Backend Pools*;
9. Add a *Backend Pool*;
10. Fill in the fields *Name or Prefix* and *Description* but use something else then what you used under *Real Servers* otherwise if and when rules and conditions are needed it gets really confusing really fast, the use of them is out of the scope of this guide for a basic functioning haproxy add-on;
11. set *Mode* to **HTTP (Layer 7)**;
12. set *Balancing Algorithm* to **Source-IP Hash**;
13. set *Servers* by choosing the *Real Servers* instance you added in step 2->6;
14. Click **Save** to store this configuration.
15. Under *Virtual Services* open *Public Services*;
16. Add a *Public Service*;
17. Fill in the fields *Name or Prefix* and *Description* but use something else then what you used under *Real Servers* otherwise if and when rules and conditions are needed it gets really confusing really fast, the use of them is out of the scope of this guide for a basic functioning haproxy add-on;
18. Fill in the external address the haproxy instance will be listening on in *Listen Addresses*;
19. set *Type* to **HTTP/HTTPS (SSL offloading)**
20. set *Default Backend Pool* to the option carrying *the name you used in step 9*;
21. check *Enable SSL Offloading*;
22. Under *SSL Offloading* you set *Default certificate* to the certificate you added before you started following this guide;
23. Click **Save** to store this configuration.
24. Click **Apply** to reload the haproxy config on the service running.

**NOTE: This will forward _ALL_ requests on port 443 to your frigate instance.** If that is not what you want or have more then one website alive behind the haproxy you will need to create a *Condition* to trigger when the right URL is used and a *Rules* rule to use the right backend under *Rules & Checks* when the condition is met. This is a useful hint for those who need it, though it is out of the scope of this guide.
