/**
 * @vitest-environment jsdom
 */
import { coercePath, matchRequestUrl } from './matchRequestUrl'

describe('matchRequestUrl', () => {
  test('returns true when matches against an exact URL', () => {
    const match = matchRequestUrl(
      new URL('https://test.mswjs.io'),
      'https://test.mswjs.io',
    )
    expect(match).toHaveProperty('matches', true)
    expect(match).toHaveProperty('params', {})
  })

  test('returns true when matched against a wildcard', () => {
    const match = matchRequestUrl(new URL('https://test.mswjs.io'), '*')
    expect(match).toHaveProperty('matches', true)
    expect(match).toHaveProperty('params', {
      '0': 'https://test.mswjs.io/',
    })
  })

  test('returns true when matched against a RegExp', () => {
    const match = matchRequestUrl(
      new URL('https://test.mswjs.io'),
      /test\.mswjs\.io/,
    )
    expect(match).toHaveProperty('matches', true)
    expect(match).toHaveProperty('params', {})
  })

  test('returns path parameters when matched', () => {
    const match = matchRequestUrl(
      new URL('https://test.mswjs.io/user/abc-123'),
      'https://test.mswjs.io/user/:userId',
    )
    expect(match).toHaveProperty('matches', true)
    expect(match).toHaveProperty('params', {
      userId: 'abc-123',
    })
  })

  test('decodes path parameters', () => {
    const url = 'http://example.com:5001/example'
    const match = matchRequestUrl(
      new URL(`https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`),
      'https://test.mswjs.io/reflect-url/:url',
    )
    expect(match).toHaveProperty('matches', true)
    expect(match).toHaveProperty('params', {
      url,
    })
  })

  test('returns false when does not match against the request URL', () => {
    const match = matchRequestUrl(
      new URL('https://test.mswjs.io'),
      'https://google.com',
    )
    expect(match).toHaveProperty('matches', false)
    expect(match).toHaveProperty('params', {})
  })

  test('returns true when matching optional path parameters', () => {
    const match = matchRequestUrl(
      new URL('https://test.mswjs.io/user'),
      'https://test.mswjs.io/user/:userId?',
    )
    expect(match).toHaveProperty('matches', true)
    expect(match).toHaveProperty('params', {
      userId: undefined,
    })
  })

  test('returns true for matching WebSocket URL', () => {
    expect(
      matchRequestUrl(new URL('ws://test.mswjs.io'), 'ws://test.mswjs.io'),
    ).toEqual({
      matches: true,
      params: {},
    })
    expect(
      matchRequestUrl(new URL('wss://test.mswjs.io'), 'wss://test.mswjs.io'),
    ).toEqual({
      matches: true,
      params: {},
    })
  })

  test('returns false for non-matching WebSocket URL', () => {
    expect(
      matchRequestUrl(new URL('ws://test.mswjs.io'), 'ws://foo.mswjs.io'),
    ).toEqual({
      matches: false,
      params: {},
    })
    expect(
      matchRequestUrl(new URL('wss://test.mswjs.io'), 'wss://completely.diff'),
    ).toEqual({
      matches: false,
      params: {},
    })
  })

  test('returns path parameters when matched a WebSocket URL', () => {
    expect(
      matchRequestUrl(
        new URL('wss://test.mswjs.io'),
        'wss://:service.mswjs.io',
      ),
    ).toEqual({
      matches: true,
      params: {
        service: 'test',
      },
    })
  })
})

describe('coercePath', () => {
  test('escapes the colon in protocol', () => {
    expect(coercePath('https://example.com')).toEqual('https\\://example.com')
    expect(coercePath('https://example.com/:userId')).toEqual(
      'https\\://example.com/:userId',
    )
    expect(coercePath('http://localhost:3000')).toEqual(
      'http\\://localhost\\:3000',
    )
  })

  test('escapes the colon before the port number', () => {
    expect(coercePath('localhost:8080')).toEqual('localhost\\:8080')
    expect(coercePath('http://127.0.0.1:8080')).toEqual(
      'http\\://127.0.0.1\\:8080',
    )
    expect(coercePath('https://example.com:1234')).toEqual(
      'https\\://example.com\\:1234',
    )

    expect(coercePath('localhost:8080/:5678')).toEqual('localhost\\:8080/:5678')
    expect(coercePath('https://example.com:8080/:5678')).toEqual(
      'https\\://example.com\\:8080/:5678',
    )
  })

  test('replaces wildcard with an unnnamed capturing group', () => {
    expect(coercePath('*')).toEqual('(.*)')
    expect(coercePath('**')).toEqual('(.*)')
    expect(coercePath('/us*')).toEqual('/us(.*)')
    expect(coercePath('/user/*')).toEqual('/user/(.*)')
    expect(coercePath('https://example.com/user/*')).toEqual(
      'https\\://example.com/user/(.*)',
    )
    expect(coercePath('https://example.com/us*')).toEqual(
      'https\\://example.com/us(.*)',
    )
  })

  test('preserves path parameter modifiers', () => {
    expect(coercePath(':name*')).toEqual(':name*')
    expect(coercePath('/foo/:name*')).toEqual('/foo/:name*')
    expect(coercePath('/foo/**:name*')).toEqual('/foo/(.*):name*')
    expect(coercePath('**/foo/*/:name*')).toEqual('(.*)/foo/(.*)/:name*')
    expect(coercePath('/foo/:first/bar/:second*/*')).toEqual(
      '/foo/:first/bar/:second*/(.*)',
    )
  })
})
