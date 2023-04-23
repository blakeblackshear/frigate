---
id: reverse_proxy
title: Setting up a reverse proxy
---

This guide outlines the basic configuration steps needed to expose your Frigate UI to the internet.
A common way of accomplishing this is to use a reverse proxy webserver between your router and your Frigate instance.
A reverse proxy accepts HTTP requests from the public internet and redirects them transparently to internal webserver(s) on your network.

The suggested steps are:

- **Configure** a 'proxy' HTTP webserver (such as [Apache2](https://httpd.apache.org/docs/current/) or [NPM](https://github.com/NginxProxyManager/nginx-proxy-manager)) and only expose ports 80/443 from this webserver to the internet
- **Encrypt** content from the proxy webserver by installing SSL (such as with [Let's Encrypt](https://letsencrypt.org/)). Note that SSL is then not required on your Frigate webserver as the proxy encrypts all requests for you
- **Restrict** access to your Frigate instance at the proxy using, for example, password authentication

:::caution
A reverse proxy can be used to secure access to an internal webserver but the user will be entirely reliant
on the steps they have taken. You must ensure you are following security best practices.
This page does not attempt to outline the specific steps needed to secure your internal website.
Please use your own knowledge to assess and vet the reverse proxy software before you install anything on your system.
:::

There are several technologies available to implement reverse proxies. This document currently suggests one, using Apache2,
and the community is invited to document others through a contribution to this page.

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
    ProxyPass "/"  "http://frigatepi.local:5000/"
    ProxyPassReverse "/"  "http://frigatepi.local:5000/"

    ProxyPass /ws ws://frigatepi.local:5000/ws
    ProxyPassReverse /ws ws://frigatepi.local:5000/ws

    ProxyPass /live/ ws://frigatepi.local:5000/live/
    ProxyPassReverse /live/ ws://frigatepi.local:5000/live/

    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*)  ws://frigatepi.local:5000/$1 [P,L]
    RewriteCond %{HTTP:Upgrade} !=websocket [NC]
    RewriteRule /(.*)  http://frigatepi.local:5000/$1 [P,L]
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
