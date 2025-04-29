---
id: tls
title: TLS安全传输
---

# TLS安全传输

Frigate内置的NGINX服务器支持TLS证书。默认情况下，Frigate会生成自签名证书用于8971端口。本系统设计上兼容各类证书管理工具，方便用户自由选择。

## 应用场景

多数情况下Frigate运行在反向代理后方，由代理统一管理TLS证书。此时您可能需要：
- 在代理配置中允许自签名证书
- 或直接禁用Frigate的TLS功能

但若Frigate运行在独立设备或直接暴露在公网时，建议配置有效证书。

## 禁用TLS

在配置文件中添加以下内容即可禁用TLS：

```yaml
tls:
  enabled: False
```

## 证书配置

### 基本配置
通过绑定挂载或Docker卷加载证书文件到指定路径：

```yaml
frigate:
  volumes:
    - /证书目录路径:/etc/letsencrypt/live/frigate:ro
```

目录结构要求：
- 私钥文件必须命名为`privkey.pem`
- 证书文件必须命名为`fullchain.pem`

### Certbot用户注意
由于Certbot使用符号链接，需额外挂载archive目录：

```yaml
frigate:
  volumes:
    - /etc/letsencrypt/live/frigate:/etc/letsencrypt/live/frigate:ro
    - /etc/letsencrypt/archive/frigate:/etc/letsencrypt/archive/frigate:ro
```

## 证书自动更新

Frigate会每分钟比对证书指纹，当检测到变更时自动重载NGINX配置。使用有效证书时，建议将8971端口映射到443端口：

:::warning
如果您在中国大陆地区，家用宽带运营商会屏蔽掉`80`和`443`等端口，这种情况建议换为其他端口，例如`1443`
:::

```yaml
frigate:
  ports:
    - "443:8971" # <- 左边为宿主机端口，右边为容器端口。需要注意国内家用宽带无法使用443端口
```

## ACME验证支持

Frigate支持托管ACME验证文件（HTTP验证方式），需将验证文件挂载到：

```
/etc/letsencrypt/www
```
