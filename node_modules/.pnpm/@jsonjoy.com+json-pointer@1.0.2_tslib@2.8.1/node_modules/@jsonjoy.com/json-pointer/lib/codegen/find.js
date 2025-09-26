"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$$find = void 0;
const $$find = (path) => {
    if (path.length === 0)
        return '(function(x){return x})';
    let fn = '(function(){var h=Object.prototype.hasOwnProperty;return(function(o){var k,u=void 0;try{';
    for (let i = 0; i < path.length; i++) {
        fn += 'k=' + JSON.stringify(path[i]) + ';';
        fn += 'if(!h.call(o,k))return u;o=o[k];';
    }
    fn += 'return o}catch(e){return u}})})()';
    return fn;
};
exports.$$find = $$find;
