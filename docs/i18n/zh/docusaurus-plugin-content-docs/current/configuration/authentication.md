---
id: authentication
title: 身份认证
---

# 身份认证

Frigate 将用户信息存储在数据库中，采用 PBKDF2-SHA256 算法（60万次迭代）生成密码哈希值。登录成功后，系统会签发带有过期时间的 JWT 令牌并设置为 Cookie，该 Cookie 会自动刷新。此 JWT 令牌也可通过 Authorization 头部的 Bearer Token 方式传递。

用户管理入口：设置 > 用户

Frigate Web UI 访问端口说明：

| 端口   | 描述                                                                 |
| ------ | ------------------------------------------------------------------- |
| `8971` | 需认证的 UI 和 API 端口，建议反向代理使用此端口                     |
| `5000` | 内部免认证端口，应限制访问范围。专为 Docker 网络内无需认证的集成服务设计 |

## 初始设置

启动时会生成管理员账号密码并打印在日志中。首次登录后建议立即在"设置 > 用户"中修改默认密码。

## 重置管理员密码

若被锁定时，可通过配置文件强制重置密码（下次启动时生效）：

```yaml
auth:
  reset_admin_password: true
```

## 登录失败限流

为防止暴力破解，支持多级速率限制（基于 SlowApi 实现）。例如 `1/second;5/minute;20/hour` 表示：

- 每秒不超过 1 次失败
- 每分钟不超过 5 次失败
- 每小时不超过 20 次失败

重启服务会重置计数器。若使用反向代理，需配置可信代理 IP 段：

```yaml
auth:
  failed_login_rate_limit: "1/second;5/minute;20/hour"
  trusted_proxies:
    - 172.18.0.0/16  # Docker 内部网络段
```

## JWT 密钥管理

安全要求：
1. 至少 64 位加密随机字符串
2. 生成命令：`python3 -c 'import secrets; print(secrets.token_hex(64))'`

密钥加载优先级：
1. 环境变量 `FRIGATE_JWT_SECRET`
2. Docker 密钥文件 `/run/secrets/FRIGATE_JWT_SECRET`
3. Home Assistant 插件配置
4. 配置文件目录下的 `.jwt_secret` 文件

（注：修改密钥会使现有令牌失效）

## 代理集成配置

### 基础配置
```yaml
auth:
  enabled: False  # 禁用内置认证

proxy:
  auth_secret: "<随机密钥>"  # 代理通信密钥
```

### 头映射
支持从代理头中提取用户信息：
```yaml
proxy:
  header_map:
    user: x-forwarded-user  # 用户名头
    role: x-forwarded-role  # 角色头
```

端口差异：
- **8971 端口**：强制角色验证（admin/viewer）
- **5000 端口**：始终视为 admin 权限

### 登录跳转
支持自动识别代理返回的 401/302/307 跳转地址。

### 自定义登出
```yaml
proxy:
  logout_url: "https://example.com/logout"  # 代理登出地址
```

## 用户角色体系

### 角色类型
- **admin**：完全控制权限（含用户管理）
- **viewer**：只读权限

### 权限控制
- 通过 8971 端口访问时强制验证角色
- 通过 5000 端口访问时默认获得 admin 权限

（角色管理入口：设置 > 用户）