---
id: reverse_proxy
title: 设置反向代理
---

本指南概述了在 Frigate 实例前设置反向代理所需的基本配置步骤。

如果你想在自定义 URL、子域名上设置 Frigate，或在服务多个站点的主机上设置 Frigate，通常需要反向代理。它还可以用于设置你自己的身份验证提供程序或用于更高级的 HTTP 路由。

在设置反向代理之前，请检查 Frigate 的内置功能是否满足你的需求：
|主题|文档|
|-|-|
|TLS|请参阅 `tls` [配置选项](../configuration/tls.md)|
|身份验证|请参阅[身份验证](../configuration/authentication.md)文档|
|IPv6|[启用 IPv6](../configuration/advanced.md#启用ipv6)|

**关于 TLS 的说明**  
使用反向代理时，TLS 会话通常在代理处终止，通过普通 HTTP 发送内部请求。如果这是所需的行为，必须首先在 Frigate 中禁用 TLS，否则你将遇到 HTTP 400 错误："The plain HTTP request was sent to HTTPS port."（普通 HTTP 请求被发送到 HTTPS 端口）。  
要禁用 TLS，在你的 Frigate 配置中设置以下内容：
```yml
tls:
  enabled: false
```

:::warning
反向代理可用于保护对内部 web 服务器的访问，但用户将完全依赖于他们采取的步骤。你必须确保遵循安全最佳实践。
本页面不试图概述保护内部网站所需的具体步骤。  
请使用你自己的知识来评估和审查反向代理软件，然后再在你的系统上安装任何东西。
:::

## 代理

有许多可用的解决方案来实现反向代理，我们欢迎社区通过对本页面的贡献来帮助记录其他方案。

* [Apache2](#apache2-reverse-proxy)
* [Nginx](#nginx-reverse-proxy)
* [Traefik](#traefik-reverse-proxy)

## Apache2 反向代理

在下面的配置示例中，仅包含与上述反向代理方法相关的指令。
在 Debian Apache2 上，配置文件将命名为类似 `/etc/apache2/sites-available/cctv.conf` 的形式。

### 步骤1：配置 Apache2 反向代理

通过将 Frigate 界面作为 DNS 子域名而不是主域名的子文件夹来呈现，可以让你的生活更轻松。
在这里，我们通过 https://cctv.mydomain.co.uk 访问 Frigate

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

### 步骤2：使用 SSL 加密访问你的 Frigate 实例

虽然这本身不会阻止对你的 Frigate web 服务器的访问，但它会加密所有内容（如登录凭据）。
安装 SSL 超出了本文档的范围，但[Let's Encrypt](https://letsencrypt.org/)是一种广泛使用的方法。
这个 Apache2 配置片段会将未加密的请求重定向到 web 服务器的 SSL 端口

```xml
<VirtualHost *:80>
ServerName cctv.mydomain.co.uk
RewriteEngine on
RewriteCond %{SERVER_NAME} =cctv.mydomain.co.uk
RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
```

### 步骤3：在代理处验证用户

有许多方法可以验证网站，但一种简单的方法是使用 [Apache2 密码文件](https://httpd.apache.org/docs/2.4/howto/auth.html)。

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

## Nginx 反向代理

此方法展示了启用 SSL 的子域名类型反向代理的工作示例。

### 设置要反向代理的服务器和端口

这在 `$server` 和 `$port` 中设置，应该与你暴露给 docker 容器的端口匹配。可选地，你可以监听端口 `443` 并启用 `SSL`

```
# ------------------------------------------------------------
# frigate.domain.com
# ------------------------------------------------------------

server {
  set $forward_scheme http;
  set $server         "192.168.100.2"; # FRIGATE 服务器位置
  set $port           8971;

  listen 80;
  listen 443 ssl http2;

  server_name frigate.domain.com;
}
```

### 设置 SSL（可选）

此部分指向你的 SSL 文件，下面的示例显示了默认 Let's Encrypt SSL 证书的位置。

```
  # Let's Encrypt SSL
  include conf.d/include/letsencrypt-acme-challenge.conf;
  include conf.d/include/ssl-ciphers.conf;
  ssl_certificate /etc/letsencrypt/live/npm-1/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/npm-1/privkey.pem;
```

### 设置反向代理设置

下面的设置启用了连接升级，设置日志记录（可选），并将所有来自 `/` 上下文的内容代理到之前在配置中指定的 docker 主机和端口

```
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $http_connection;
  proxy_http_version 1.1;

  access_log /data/logs/proxy-host-40_access.log proxy;
  error_log /data/logs/proxy-host-40_error.log warn;

  location / {
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_http_version 1.1;
  }

```

## Traefik 反向代理

此示例展示了如何向 Frigate Docker compose 文件添加 `label`，使 Traefik 能够自动发现你的 Frigate 实例。  
在使用下面的示例之前，你必须首先使用 [Docker provider](https://doc.traefik.io/traefik/providers/docker/) 设置 Traefik

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

上述配置将在 Traefik 中创建一个"服务"，自动将你的容器的 IP 和 8971 端口添加为后端。
它还将添加一个路由器，将对 "traefik.example.com" 的请求路由到你的本地容器。

注意，使用这种方法，你不需要为 Frigate 实例暴露任何端口，因为所有流量都将通过内部 Docker 网络路由。