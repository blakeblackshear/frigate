---
id: authentication
title: Authentication
---

# Authentication

Frigate stores user information in its database. Password hashes are generated using industry standard PBKDF2-SHA256 with 600,000 iterations. Upon successful login, a JWT token is issued with an expiration date and set as a cookie. The cookie is refreshed as needed automatically. This JWT token can also be passed in the Authorization header as a bearer token.

Users are managed in the UI under Settings > Users.

The following ports are available to access the Frigate web UI.

| Port   | Description                                                                                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `8971` | Authenticated UI and API. Reverse proxies should use this port.                                                                                                                                              |
| `5000` | Internal unauthenticated UI and API access. Access to this port should be limited. Intended to be used within the docker network for services that integrate with Frigate and do not support authentication. |

## Onboarding

On startup, an admin user and password are generated and printed in the logs. It is recommended to set a new password for the admin account after logging in for the first time under Settings > Users.

## Resetting admin password

In the event that you are locked out of your instance, you can tell Frigate to reset the admin password and print it in the logs on next startup using the `reset_admin_password` setting in your config file.

```yaml
auth:
  reset_admin_password: true
```

## Login failure rate limiting

In order to limit the risk of brute force attacks, rate limiting is available for login failures. This is implemented with SlowApi, and the string notation for valid values is available in [the documentation](https://limits.readthedocs.io/en/stable/quickstart.html#examples).

For example, `1/second;5/minute;20/hour` will rate limit the login endpoint when failures occur more than:

- 1 time per second
- 5 times per minute
- 20 times per hour

Restarting Frigate will reset the rate limits.

If you are running Frigate behind a proxy, you will want to set `trusted_proxies` or these rate limits will apply to the upstream proxy IP address. This means that a brute force attack will rate limit login attempts from other devices and could temporarily lock you out of your instance. In order to ensure rate limits only apply to the actual IP address where the requests are coming from, you will need to list the upstream networks that you want to trust. These trusted proxies are checked against the `X-Forwarded-For` header when looking for the IP address where the request originated.

If you are running a reverse proxy in the same Docker Compose file as Frigate, here is an example of how your auth config might look:

```yaml
auth:
  failed_login_rate_limit: "1/second;5/minute;20/hour"
  trusted_proxies:
    - 172.18.0.0/16 # <---- this is the subnet for the internal Docker Compose network
```

## Session Length

The default session length for user authentication in Frigate is 24 hours. This setting determines how long a user's authenticated session remains active before a token refresh is required — otherwise, the user will need to log in again.

While the default provides a balance of security and convenience, you can customize this duration to suit your specific security requirements and user experience preferences. The session length is configured in seconds.

The default value of `86400` will expire the authentication session after 24 hours. Some other examples:

- `0`: Setting the session length to 0 will require a user to log in every time they access the application or after a very short, immediate timeout.
- `604800`: Setting the session length to 604800 will require a user to log in if the token is not refreshed for 7 days.

```yaml
auth:
  session_length: 86400
```

## JWT Token Secret

The JWT token secret needs to be kept secure. Anyone with this secret can generate valid JWT tokens to authenticate with Frigate. This should be a cryptographically random string of at least 64 characters.

You can generate a token using the Python secret library with the following command:

```shell
python3 -c 'import secrets; print(secrets.token_hex(64))'
```

Frigate looks for a JWT token secret in the following order:

1. An environment variable named `FRIGATE_JWT_SECRET`
2. A file named `FRIGATE_JWT_SECRET` in the directory specified by the `CREDENTIALS_DIRECTORY` environment variable (defaults to the Docker Secrets directory: `/run/secrets/`)
3. A `jwt_secret` option from the Home Assistant Add-on options
4. A `.jwt_secret` file in the config directory

If no secret is found on startup, Frigate generates one and stores it in a `.jwt_secret` file in the config directory.

Changing the secret will invalidate current tokens.

## Proxy configuration

Frigate can be configured to leverage features of common upstream authentication proxies such as Authelia, Authentik, oauth2_proxy, or traefik-forward-auth.

If you are leveraging the authentication of an upstream proxy, you likely want to disable Frigate's authentication as there is no correspondence between users in Frigate's database and users authenticated via the proxy. Optionally, if communication between the reverse proxy and Frigate is over an untrusted network, you should set an `auth_secret` in the `proxy` config and configure the proxy to send the secret value as a header named `X-Proxy-Secret`. Assuming this is an untrusted network, you will also want to [configure a real TLS certificate](tls.md) to ensure the traffic can't simply be sniffed to steal the secret.

Here is an example of how to disable Frigate's authentication and also ensure the requests come only from your known proxy.

```yaml
auth:
  enabled: False

proxy:
  auth_secret: <some random long string>
```

You can use the following code to generate a random secret.

```shell
python3 -c 'import secrets; print(secrets.token_hex(64))'
```

### Header mapping

If you have disabled Frigate's authentication and your proxy supports passing a header with authenticated usernames and/or roles, you can use the `header_map` config to specify the header name so it is passed to Frigate. For example, the following will map the `X-Forwarded-User` and `X-Forwarded-Groups` values. Header names are not case sensitive. Multiple values can be included in the role header. Frigate expects that the character separating the roles is a comma, but this can be specified using the `separator` config entry.

```yaml
proxy:
  ...
  separator: "|" # This value defaults to a comma, but Authentik uses a pipe, for example.
  header_map:
    user: x-forwarded-user
    role: x-forwarded-groups
```

Frigate supports `admin`, `viewer`, and custom roles (see below). When using port `8971`, Frigate validates these headers and subsequent requests use the headers `remote-user` and `remote-role` for authorization.

A default role can be provided. Any value in the mapped `role` header will override the default.

```yaml
proxy:
  ...
  default_role: viewer
```

## Role mapping

In some environments, upstream identity providers (OIDC, SAML, LDAP, etc.) do not pass a Frigate-compatible role directly, but instead pass one or more group claims. To handle this, Frigate supports a `role_map` that translates upstream group names into Frigate’s internal roles (`admin`, `viewer`, or custom).

```yaml
proxy:
  ...
  header_map:
    user: x-forwarded-user
    role: x-forwarded-groups
    role_map:
      admin:
        - sysadmins
        - access-level-security
      viewer:
        - camera-viewer
      operator:  # Custom role mapping
        - operators
```

In this example:

- If the proxy passes a role header containing `sysadmins` or `access-level-security`, the user is assigned the `admin` role.
- If the proxy passes a role header containing `camera-viewer`, the user is assigned the `viewer` role.
- If the proxy passes a role header containing `operators`, the user is assigned the `operator` custom role.
- If no mapping matches, Frigate falls back to `default_role` if configured.
- If `role_map` is not defined, Frigate assumes the role header directly contains `admin`, `viewer`, or a custom role name.

#### Port Considerations

**Authenticated Port (8971)**

- Header mapping is **fully supported**.
- The `remote-role` header determines the user’s privileges:
  - **admin** → Full access (user management, configuration changes).
  - **viewer** → Read-only access.
  - **Custom roles** → Read-only access limited to the cameras defined in `auth.roles[role]`.
- Ensure your **proxy sends both user and role headers** for proper role enforcement.

**Unauthenticated Port (5000)**

- Headers are **ignored** for role enforcement.
- All requests are treated as **anonymous**.
- The `remote-role` value is **overridden** to **admin-level access**.
- This design ensures **unauthenticated internal use** within a trusted network.

Note that only the following list of headers are permitted by default:

```
Remote-User
Remote-Groups
Remote-Email
Remote-Name
X-Forwarded-User
X-Forwarded-Groups
X-Forwarded-Email
X-Forwarded-Preferred-Username
X-authentik-username
X-authentik-groups
X-authentik-email
X-authentik-name
X-authentik-uid
```

If you would like to add more options, you can overwrite the default file with a docker bind mount at `/usr/local/nginx/conf/proxy_trusted_headers.conf`. Reference the source code for the default file formatting.

### Login page redirection

Frigate gracefully performs login page redirection that should work with most authentication proxies. If your reverse proxy returns a `Location` header on `401`, `302`, or `307` unauthorized responses, Frigate's frontend will automatically detect it and redirect to that URL.

### Custom logout url

If your reverse proxy has a dedicated logout url, you can specify using the `logout_url` config option. This will update the link for the `Logout` link in the UI.

## User Roles

Frigate supports user roles to control access to certain features in the UI and API, such as managing users or modifying configuration settings. Roles are assigned to users in the database or through proxy headers and are enforced when accessing the UI or API through the authenticated port (`8971`).

### Supported Roles

- **admin**: Full access to all features, including user management and configuration.
- **viewer**: Read-only access to the UI and API, including viewing cameras, review items, and historical footage. Configuration editor and settings in the UI are inaccessible.
- **Custom Roles**: Arbitrary role names (alphanumeric, dots/underscores) with specific camera permissions. These extend the system for granular access (e.g., "operator" for select cameras).

### Custom Roles and Camera Access

The viewer role provides read-only access to all cameras in the UI and API. Custom roles allow admins to limit read-only access to specific cameras. Each role specifies an array of allowed camera names. If a user is assigned a custom role, their account is like the **viewer** role - they can only view Live, Review/History, Explore, and Export for the designated cameras. Backend API endpoints enforce this server-side (e.g., returning 403 for unauthorized cameras), and the frontend UI filters content accordingly (e.g., camera dropdowns show only permitted options).

### Role Configuration Example

```yaml
cameras:
  front_door:
    # ... camera config
  side_yard:
    # ... camera config
  garage:
    # ... camera config

auth:
  enabled: true
  roles:
    operator: # Custom role
      - front_door
      - garage # Operator can access front and garage
    neighbor:
      - side_yard
```

If you want to provide access to all cameras to a specific user, just use the **viewer** role.

### Managing User Roles

1. Log in as an **admin** user via port `8971` (preferred), or unauthenticated via port `5000`.
2. Navigate to **Settings**.
3. In the **Users** section, edit a user’s role by selecting from available roles (admin, viewer, or custom).
4. In the **Roles** section, add/edit/delete custom roles (select cameras via switches). Deleting a role auto-reassigns users to "viewer".

### Role Enforcement

When using the authenticated port (`8971`), roles are validated via the JWT token or proxy headers (e.g., `remote-role`).

On the internal **unauthenticated** port (`5000`), roles are **not enforced**. All requests are treated as **anonymous**, granting access equivalent to the **admin** role without restrictions.

To use role-based access control, you must connect to Frigate via the **authenticated port (`8971`)** directly or through a reverse proxy.

### Role Visibility in the UI

- When logged in via port `8971`, your **username and role** are displayed in the **account menu** (bottom corner).
- When using port `5000`, the UI will always display "anonymous" for the username and "admin" for the role.

### Managing User Roles

1. Log in as an **admin** user via port `8971`.
2. Navigate to **Settings > Users**.
3. Edit a user’s role by selecting **admin** or **viewer**.

## API Authentication Guide

### Getting a Bearer Token

To use the Frigate API, you need to authenticate first. Follow these steps to obtain a Bearer token:

#### 1. Login

Make a POST request to `/login` with your credentials:

```bash
curl -i -X POST https://frigate_ip:8971/api/login \
  -H "Content-Type: application/json" \
  -d '{"user": "admin", "password": "your_password"}'
```

:::note

You may need to include `-k` in the argument list in these steps (eg: `curl -k -i -X POST ...`) if your Frigate instance is using a self-signed certificate.

:::

The response will contain a cookie with the JWT token.

#### 2. Using the Bearer Token

Once you have the token, include it in the Authorization header for subsequent requests:

```bash
curl -H "Authorization: Bearer <your_token>" https://frigate_ip:8971/api/profile
```

#### 3. Token Lifecycle

- Tokens are valid for the configured session length
- Tokens are automatically refreshed when you visit the `/auth` endpoint
- Tokens are invalidated when the user's password is changed
- Use `/logout` to clear your session cookie
