"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoreWithoutState = exports.createStoreWithState = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const slice_1 = __importDefault(require("@theme/ApiExplorer/Accept/slice"));
const slice_2 = __importDefault(
  require("@theme/ApiExplorer/Authorization/slice")
);
const slice_3 = __importDefault(require("@theme/ApiExplorer/Body/slice"));
const slice_4 = __importDefault(
  require("@theme/ApiExplorer/ContentType/slice")
);
const slice_5 = __importDefault(
  require("@theme/ApiExplorer/ParamOptions/slice")
);
const slice_6 = __importDefault(require("@theme/ApiExplorer/Response/slice"));
const slice_7 = __importDefault(require("@theme/ApiExplorer/Server/slice"));
const rootReducer = (0, toolkit_1.combineReducers)({
  accept: slice_1.default,
  contentType: slice_4.default,
  response: slice_6.default,
  server: slice_7.default,
  body: slice_3.default,
  params: slice_5.default,
  auth: slice_2.default,
});
const createStoreWithState = (preloadedState, middlewares) =>
  (0, toolkit_1.configureStore)({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(...middlewares),
  });
exports.createStoreWithState = createStoreWithState;
const createStoreWithoutState = (preloadedState, middlewares) =>
  (0, toolkit_1.configureStore)({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(...middlewares),
  });
exports.createStoreWithoutState = createStoreWithoutState;
