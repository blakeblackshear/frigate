(() => {
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/monaco-graphql/esm/graphql.worker.js
  var require_graphql_worker = __commonJS({
    "node_modules/monaco-graphql/esm/graphql.worker.js"(exports) {
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function() {
          return m[k];
        } });
      } : function(o, m, k, k2) {
        if (k2 === void 0)
          k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || function(mod) {
        if (mod && mod.__esModule)
          return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod)
            if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
              __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      define(["require", "exports", "monaco-editor/esm/vs/editor/editor.worker", "./GraphQLWorker"], function(require2, exports2, worker, GraphQLWorker_1) {
        "use strict";
        Object.defineProperty(exports2, "__esModule", { value: true });
        worker = __importStar(worker);
        self.onmessage = () => {
          try {
            worker.initialize((ctx, createData) => {
              return new GraphQLWorker_1.GraphQLWorker(ctx, createData);
            });
          } catch (err) {
            throw err;
          }
        };
      });
    }
  });
  require_graphql_worker();
})();
