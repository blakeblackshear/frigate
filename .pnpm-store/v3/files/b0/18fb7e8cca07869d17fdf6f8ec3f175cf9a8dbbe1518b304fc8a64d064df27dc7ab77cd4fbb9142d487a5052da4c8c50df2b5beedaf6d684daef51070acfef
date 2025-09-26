"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Group = void 0;
const Util_1 = require("./Util");
const Container_1 = require("./Container");
const Global_1 = require("./Global");
class Group extends Container_1.Container {
    _validateAdd(child) {
        const type = child.getType();
        if (type !== 'Group' && type !== 'Shape') {
            Util_1.Util.throw('You may only add groups and shapes to groups.');
        }
    }
}
exports.Group = Group;
Group.prototype.nodeType = 'Group';
(0, Global_1._registerNode)(Group);
