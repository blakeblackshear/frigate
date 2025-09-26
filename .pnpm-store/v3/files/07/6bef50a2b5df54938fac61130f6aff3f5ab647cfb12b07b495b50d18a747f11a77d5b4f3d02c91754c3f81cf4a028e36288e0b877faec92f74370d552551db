import { SetupWorkerInternalContext, StartOptions } from '../../glossary'
import {
  DEFAULT_START_OPTIONS,
  resolveStartOptions,
  prepareStartHandler,
} from './prepareStartHandler'

describe('resolveStartOptions', () => {
  test('returns default options given no custom start options', () => {
    expect(resolveStartOptions()).toEqual(DEFAULT_START_OPTIONS)
    expect(resolveStartOptions(undefined)).toEqual(DEFAULT_START_OPTIONS)
    expect(resolveStartOptions({})).toEqual(DEFAULT_START_OPTIONS)
  })

  test('deeply merges the default and custom start options', () => {
    expect(
      resolveStartOptions({
        quiet: true,
        serviceWorker: {
          url: './custom.js',
        },
      }),
    ).toEqual({
      ...DEFAULT_START_OPTIONS,
      quiet: true,
      serviceWorker: {
        url: './custom.js',
        options: null,
      },
    })
  })
})

describe('prepareStartHandler', () => {
  test('exposes resolved start options to the generated star handler', () => {
    const createStartHandler = vi.fn()
    const context: SetupWorkerInternalContext = {} as any
    const startHandler = prepareStartHandler(createStartHandler, context)
    expect(startHandler).toBeInstanceOf(Function)

    const initialOptions: StartOptions = {
      quiet: true,
      serviceWorker: {
        url: './custom.js',
      },
    }
    const resolvedOptions = resolveStartOptions(initialOptions)
    startHandler(initialOptions)

    // Calls the handler creator with both resolved and initial options.
    expect(createStartHandler).toHaveBeenCalledWith(
      resolvedOptions,
      initialOptions,
    )

    // Sets the resolved options on the internal context.
    expect(context).toHaveProperty('startOptions', resolvedOptions)
  })
})
