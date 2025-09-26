"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var SetupApi_exports = {};
__export(SetupApi_exports, {
  HandlersController: () => HandlersController,
  InMemoryHandlersController: () => InMemoryHandlersController,
  SetupApi: () => SetupApi
});
module.exports = __toCommonJS(SetupApi_exports);
var import_outvariant = require("outvariant");
var import_strict_event_emitter = require("strict-event-emitter");
var import_devUtils = require("./utils/internal/devUtils");
var import_pipeEvents = require("./utils/internal/pipeEvents");
var import_toReadonlyArray = require("./utils/internal/toReadonlyArray");
var import_Disposable = require("./utils/internal/Disposable");
class HandlersController {
}
class InMemoryHandlersController {
  constructor(initialHandlers) {
    this.initialHandlers = initialHandlers;
    this.handlers = [...initialHandlers];
  }
  handlers;
  prepend(runtimeHandles) {
    this.handlers.unshift(...runtimeHandles);
  }
  reset(nextHandlers) {
    this.handlers = nextHandlers.length > 0 ? [...nextHandlers] : [...this.initialHandlers];
  }
  currentHandlers() {
    return this.handlers;
  }
}
class SetupApi extends import_Disposable.Disposable {
  handlersController;
  emitter;
  publicEmitter;
  events;
  constructor(...initialHandlers) {
    super();
    (0, import_outvariant.invariant)(
      this.validateHandlers(initialHandlers),
      import_devUtils.devUtils.formatMessage(
        `Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?`
      )
    );
    this.handlersController = new InMemoryHandlersController(initialHandlers);
    this.emitter = new import_strict_event_emitter.Emitter();
    this.publicEmitter = new import_strict_event_emitter.Emitter();
    (0, import_pipeEvents.pipeEvents)(this.emitter, this.publicEmitter);
    this.events = this.createLifeCycleEvents();
    this.subscriptions.push(() => {
      this.emitter.removeAllListeners();
      this.publicEmitter.removeAllListeners();
    });
  }
  validateHandlers(handlers) {
    return handlers.every((handler) => !Array.isArray(handler));
  }
  use(...runtimeHandlers) {
    (0, import_outvariant.invariant)(
      this.validateHandlers(runtimeHandlers),
      import_devUtils.devUtils.formatMessage(
        `Failed to call "use()" with the given request handlers: invalid input. Did you forget to spread the array of request handlers?`
      )
    );
    this.handlersController.prepend(runtimeHandlers);
  }
  restoreHandlers() {
    this.handlersController.currentHandlers().forEach((handler) => {
      if ("isUsed" in handler) {
        handler.isUsed = false;
      }
    });
  }
  resetHandlers(...nextHandlers) {
    this.handlersController.reset(nextHandlers);
  }
  listHandlers() {
    return (0, import_toReadonlyArray.toReadonlyArray)(this.handlersController.currentHandlers());
  }
  createLifeCycleEvents() {
    return {
      on: (...args) => {
        return this.publicEmitter.on(...args);
      },
      removeListener: (...args) => {
        return this.publicEmitter.removeListener(...args);
      },
      removeAllListeners: (...args) => {
        return this.publicEmitter.removeAllListeners(...args);
      }
    };
  }
}
//# sourceMappingURL=SetupApi.js.map