"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Link = void 0;
const constants_1 = require("../constants");
const fanout_1 = require("thingies/lib/fanout");
const { S_IFREG } = constants_1.constants;
/**
 * Represents a hard link that points to an i-node `node`.
 */
class Link {
    get steps() {
        return this._steps;
    }
    // Recursively sync children steps, e.g. in case of dir rename
    set steps(val) {
        this._steps = val;
        for (const [child, link] of this.children.entries()) {
            if (child === '.' || child === '..') {
                continue;
            }
            link?.syncSteps();
        }
    }
    constructor(vol, parent, name) {
        this.changes = new fanout_1.FanOut();
        this.children = new Map();
        // Path to this node as Array: ['usr', 'bin', 'node'].
        this._steps = [];
        // "i-node" number of the node.
        this.ino = 0;
        // Number of children.
        this.length = 0;
        this.vol = vol;
        this.parent = parent;
        this.name = name;
        this.syncSteps();
    }
    setNode(node) {
        this.node = node;
        this.ino = node.ino;
    }
    getNode() {
        return this.node;
    }
    createChild(name, node = this.vol.createNode(S_IFREG | 0o666)) {
        const link = new Link(this.vol, this, name);
        link.setNode(node);
        if (node.isDirectory()) {
            link.children.set('.', link);
            link.getNode().nlink++;
        }
        this.setChild(name, link);
        return link;
    }
    setChild(name, link = new Link(this.vol, this, name)) {
        this.children.set(name, link);
        link.parent = this;
        this.length++;
        const node = link.getNode();
        if (node.isDirectory()) {
            link.children.set('..', this);
            this.getNode().nlink++;
        }
        this.getNode().mtime = new Date();
        this.changes.emit(['child:add', link, this]);
        return link;
    }
    deleteChild(link) {
        const node = link.getNode();
        if (node.isDirectory()) {
            link.children.delete('..');
            this.getNode().nlink--;
        }
        this.children.delete(link.getName());
        this.length--;
        this.getNode().mtime = new Date();
        this.changes.emit(['child:del', link, this]);
    }
    getChild(name) {
        this.getNode().atime = new Date();
        return this.children.get(name);
    }
    getPath() {
        return this.steps.join("/" /* PATH.SEP */);
    }
    getParentPath() {
        return this.steps.slice(0, -1).join("/" /* PATH.SEP */);
    }
    getName() {
        return this.steps[this.steps.length - 1];
    }
    toJSON() {
        return {
            steps: this.steps,
            ino: this.ino,
            children: Array.from(this.children.keys()),
        };
    }
    syncSteps() {
        this.steps = this.parent ? this.parent.steps.concat([this.name]) : [this.name];
    }
}
exports.Link = Link;
//# sourceMappingURL=Link.js.map