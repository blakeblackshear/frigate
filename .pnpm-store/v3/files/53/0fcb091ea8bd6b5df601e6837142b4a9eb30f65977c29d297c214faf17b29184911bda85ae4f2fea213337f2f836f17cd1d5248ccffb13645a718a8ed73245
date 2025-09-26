"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPersistanceMiddleware = createPersistanceMiddleware;
const slice_1 = require("@theme/ApiExplorer/Authorization/slice");
const storage_utils_1 = require("./storage-utils");
function createPersistanceMiddleware(options) {
  const persistanceMiddleware = (storeAPI) => (next) => (action) => {
    const result = next(action);
    const state = storeAPI.getState();
    const storage = (0, storage_utils_1.createStorage)("sessionStorage");
    if (action.type === slice_1.setAuthData.type) {
      for (const [key, value] of Object.entries(state.auth.data)) {
        if (Object.values(value).filter(Boolean).length > 0) {
          storage.setItem(key, JSON.stringify(value));
        } else {
          storage.removeItem(key);
        }
      }
    }
    if (action.type === slice_1.setSelectedAuth.type) {
      if (state.auth.selected) {
        storage.setItem(
          (0, storage_utils_1.hashArray)(Object.keys(state.auth.options)),
          state.auth.selected
        );
      }
    }
    // TODO: determine way to rehydrate without flashing
    if (action.type === "contentType/setContentType") {
      storage.setItem("contentType", action.payload);
    }
    if (action.type === "accept/setAccept") {
      storage.setItem("accept", action.payload);
    }
    if (action.type === "server/setServer") {
      storage.setItem("server", action.payload);
    }
    if (action.type === "server/setServerVariable") {
      const server = storage.getItem("server") ?? "{}";
      const variables = JSON.parse(action.payload);
      let serverObject = JSON.parse(server);
      serverObject.variables[variables.key].default = variables.value;
      storage.setItem("server", JSON.stringify(serverObject));
    }
    return result;
  };
  return persistanceMiddleware;
}
