/**
 * @vitest-environment jsdom
 */
import { deferNetworkRequestsUntil } from './deferNetworkRequestsUntil'

beforeAll(() => {
  // Stubs native `fetch` function to remove any external
  // asynchronicity from this test suite.
  window.fetch = vi.fn().mockImplementation(() => {
    return Promise.resolve({
      json: () => ({
        response: 'body',
      }),
    })
  })
})

afterAll(() => {
  vi.restoreAllMocks()
})

test('defers any requests that happen while a given promise is pending', async () => {
  const events: string[] = []

  // Emulate a Service Worker registration Promise.
  const workerPromise = new Promise<null>((resolve) => {
    setTimeout(resolve, 1000)
  })

  workerPromise.then(() => {
    events.push('promise resolved')
  })

  // Calling this functions intercepts all requests that happen while
  // the given promise is pending, and defers their execution
  // until the promise is resolved.
  deferNetworkRequestsUntil(workerPromise)

  // Perform a request.
  const requestPromise = fetch('/user').then(() => {
    events.push('response received')
  })

  await Promise.all([workerPromise, requestPromise])

  // Assert the order of resolved events.
  expect(events).toEqual(['promise resolved', 'response received'])
})
