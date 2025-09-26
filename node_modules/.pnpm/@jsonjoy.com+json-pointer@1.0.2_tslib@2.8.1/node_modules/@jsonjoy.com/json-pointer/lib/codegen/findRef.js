"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$findRef = exports.$$findRef = void 0;
const codegen_1 = require("@jsonjoy.com/util/lib/codegen");
const hasOwnProperty_1 = require("@jsonjoy.com/util/lib/hasOwnProperty");
const $$findRef = (path) => {
    if (!path.length) {
        return {
            deps: [],
            js: /* js */ `(function(){return function(val){return {val:val}}})`,
        };
    }
    let loop = '';
    for (let i = 0; i < path.length; i++) {
        const key = JSON.stringify(path[i]);
        loop += /* js */ `
      obj = val;
      key = ${key};
      if (obj instanceof Array) {
        var length = obj.length;
        if (key === '-') key = length;
        else {
          var key2 = ${~~path[i]};
          ${String(~~path[i]) !== String(path[i]) ? `if ('' + key2 !== key) throw new Error('INVALID_INDEX');` : ''}
          ${~~path[i] < 0 ? `throw new Error('INVALID_INDEX');` : ''}
          key = key2;
        }
        val = obj[key];
      } else if (typeof obj === 'object' && !!obj) {
        val = has(obj, key) ? obj[key] : undefined;
      } else throw new Error('NOT_FOUND');
    `;
    }
    const js = /* js */ `(function(has, path){
    return function(val) {
      var obj, key;
      ${loop}
      return {val:val, obj:obj, key:key};
    };
  })`;
    return {
        deps: [hasOwnProperty_1.hasOwnProperty, path],
        js,
    };
};
exports.$$findRef = $$findRef;
const $findRef = (path) => (0, codegen_1.compileClosure)((0, exports.$$findRef)(path));
exports.$findRef = $findRef;
