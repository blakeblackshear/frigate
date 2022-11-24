---
id: reverse_proxy
title: Setting up a Reverse Proxy
---
This guide outlines the configuration steps needed to expose your Frigate UI to the internet in a secure manner.
A common way of accomplishing this is to use a reverse proxy webserver between your router and your Frigate instance.

A reverse proxy accepts HTTP requests the public internet and redirects them transparently to an internal webserver on your network.
The suggested steps are:
- **Configure** a 'proxy' HTTP webserver (such as [Apache2](https://httpd.apache.org/docs/current/)) and only expose ports 80/443 from this webserver to the internet
- **Secure** the proxy by installing SSL (such as with [Let's Encrypt](https://letsencrypt.org/)). Note that SSL is then not necessary on your Frigate webserver as the proxy wraps all requests for you
- **Restrict** access to your Frigate instance at the proxy using, for example, password authentication
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
Whilst this won't, on its own, stop access to your Frigate webserver it will encrypt all content (such a login credentials).
Installing SSL is beyond the scope of this document but [Let's Encrypt](https://letsencrypt.org/) is a widely used approach.

This Apache2 configuration snippet then results in unencrypted requests being redirected to webserver SSL port
```xml
<VirtualHost *:80>
    ServerName cctv.mydomain.co.uk

    RewriteEngine on
    RewriteCond %{SERVER_NAME} =cctv.mydomain.co.uk
    RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
```
### Step 3: Authenticate users at the proxy
There are many ways to authenticate a website but a simple straightforward approach is to use [Apache2 password files](https://httpd.apache.org/docs/2.4/howto/auth.html).
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