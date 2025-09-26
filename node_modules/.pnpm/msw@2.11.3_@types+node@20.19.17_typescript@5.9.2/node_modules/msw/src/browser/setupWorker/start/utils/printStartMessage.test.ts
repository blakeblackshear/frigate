import { printStartMessage } from './printStartMessage'

beforeEach(() => {
  vi.spyOn(console, 'groupCollapsed').mockImplementation(() => void 0)
  vi.spyOn(console, 'log').mockImplementation(() => void 0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('prints out a default start message into console', () => {
  printStartMessage({
    workerScope: 'http://localhost:3000/',
    workerUrl: 'http://localhost:3000/worker.js',
  })

  expect(console.groupCollapsed).toHaveBeenCalledWith(
    '%c[MSW] Mocking enabled.',
    expect.anything(),
  )

  // Includes a link to the documentation.
  expect(console.log).toHaveBeenCalledWith(
    '%cDocumentation: %chttps://mswjs.io/docs',
    expect.anything(),
    expect.anything(),
  )

  // Includes a link to the GitHub issues page.
  expect(console.log).toHaveBeenCalledWith(
    'Found an issue? https://github.com/mswjs/msw/issues',
  )

  // Includes service worker scope.
  expect(console.log).toHaveBeenCalledWith(
    'Worker scope:',
    'http://localhost:3000/',
  )

  // Includes service worker script location.
  expect(console.log).toHaveBeenCalledWith(
    'Worker script URL:',
    'http://localhost:3000/worker.js',
  )
})

test('supports printing a custom start message', () => {
  printStartMessage({ message: 'Custom start message' })

  expect(console.groupCollapsed).toHaveBeenCalledWith(
    '%c[MSW] Custom start message',
    expect.anything(),
  )
})

test('does not print any messages when log level is quiet', () => {
  printStartMessage({ quiet: true })

  expect(console.groupCollapsed).not.toHaveBeenCalled()
  expect(console.log).not.toHaveBeenCalled()
})

test('prints a worker scope in the start message', () => {
  printStartMessage({
    workerScope: 'http://localhost:3000/user',
  })

  expect(console.log).toHaveBeenCalledWith(
    'Worker scope:',
    'http://localhost:3000/user',
  )
})

test('prints a worker script url in the start message', () => {
  printStartMessage({
    workerUrl: 'http://localhost:3000/mockServiceWorker.js',
  })

  expect(console.log).toHaveBeenCalledWith(
    'Worker script URL:',
    'http://localhost:3000/mockServiceWorker.js',
  )
})
