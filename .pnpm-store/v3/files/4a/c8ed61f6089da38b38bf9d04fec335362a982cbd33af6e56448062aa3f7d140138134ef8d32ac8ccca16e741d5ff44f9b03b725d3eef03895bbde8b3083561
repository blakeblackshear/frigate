import { GraphQLHandler } from '../../handlers/GraphQLHandler'
import { HttpHandler } from '../../handlers/HttpHandler'
import { RequestHandler } from '../../handlers/RequestHandler'
import { WebSocketHandler } from '../../handlers/WebSocketHandler'
import { isHandlerKind } from './isHandlerKind'

it('returns true if expected a request handler and given a request handler', () => {
  expect(
    isHandlerKind('RequestHandler')(new HttpHandler('*', '*', () => {})),
  ).toBe(true)

  expect(
    isHandlerKind('RequestHandler')(
      new GraphQLHandler('all', '*', '*', () => {}),
    ),
  ).toBe(true)
})

it('returns true if expected a request handler and given a custom request handler', () => {
  class MyHandler extends RequestHandler {
    constructor() {
      super({ info: { header: '*' }, resolver: () => {} })
    }
    predicate = () => false
    log() {}
  }

  expect(isHandlerKind('RequestHandler')(new MyHandler())).toBe(true)
})

it('returns false if expected a request handler but given event handler', () => {
  expect(isHandlerKind('RequestHandler')(new WebSocketHandler('*'))).toBe(false)
})

it('returns false if expected a request handler but given arbitrary object', () => {
  expect(isHandlerKind('RequestHandler')(undefined)).toBe(false)
  expect(isHandlerKind('RequestHandler')(null)).toBe(false)
  expect(isHandlerKind('RequestHandler')({})).toBe(false)
  expect(isHandlerKind('RequestHandler')([])).toBe(false)
  expect(isHandlerKind('RequestHandler')(123)).toBe(false)
  expect(isHandlerKind('RequestHandler')('hello')).toBe(false)
})

it('returns true if expected an event handler and given an event handler', () => {
  expect(isHandlerKind('EventHandler')(new WebSocketHandler('*'))).toBe(true)
})

it('returns true if expected an event handler and given a custom event handler', () => {
  class MyEventHandler extends WebSocketHandler {
    constructor() {
      super('*')
    }
  }
  expect(isHandlerKind('EventHandler')(new MyEventHandler())).toBe(true)
})

it('returns false if expected an event handler but given arbitrary object', () => {
  expect(isHandlerKind('EventHandler')(undefined)).toBe(false)
  expect(isHandlerKind('EventHandler')(null)).toBe(false)
  expect(isHandlerKind('EventHandler')({})).toBe(false)
  expect(isHandlerKind('EventHandler')([])).toBe(false)
  expect(isHandlerKind('EventHandler')(123)).toBe(false)
  expect(isHandlerKind('EventHandler')('hello')).toBe(false)
})
