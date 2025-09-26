"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomJson = void 0;
const string_1 = require("./string");
const defaultOpts = {
    rootNode: 'object',
    nodeCount: 32,
    odds: {
        null: 1,
        boolean: 2,
        number: 10,
        string: 8,
        binary: 0,
        array: 2,
        object: 2,
    },
};
const ascii = () => {
    return String.fromCharCode(Math.floor(32 + Math.random() * (126 - 32)));
};
const alphabet = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    'g',
    'h',
    'i',
    'j',
    'k',
    'l',
    'm',
    'n',
    'o',
    'p',
    'q',
    'r',
    's',
    't',
    'u',
    'v',
    'w',
    'x',
    'y',
    'z',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
    'G',
    'H',
    'I',
    'J',
    'K',
    'L',
    'M',
    'N',
    'O',
    'P',
    'Q',
    'R',
    'S',
    'T',
    'U',
    'V',
    'W',
    'X',
    'Y',
    'Z',
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '-',
    '_',
    '.',
    ',',
    ';',
    '!',
    '@',
    '#',
    '$',
    '%',
    '^',
    '&',
    '*',
    '\\',
    '/',
    '(',
    ')',
    '+',
    '=',
    '\n',
    '👍',
    '🏻',
    '😛',
    'ä',
    'ö',
    'ü',
    'ß',
    'а',
    'б',
    'в',
    'г',
    '诶',
    '必',
    '西',
];
const utf16 = () => {
    return alphabet[Math.floor(Math.random() * alphabet.length)];
};
class RandomJson {
    static generate(opts) {
        const rnd = new RandomJson(opts);
        return rnd.create();
    }
    static genBoolean() {
        return Math.random() > 0.5;
    }
    static genNumber() {
        const num = Math.random() > 0.2
            ? Math.random() * 1e9
            : Math.random() < 0.2
                ? Math.round(0xff * (2 * Math.random() - 1))
                : Math.random() < 0.2
                    ? Math.round(0xffff * (2 * Math.random() - 1))
                    : Math.round(Number.MAX_SAFE_INTEGER * (2 * Math.random() - 1));
        if (num === -0)
            return 0;
        return num;
    }
    static genString(length = Math.ceil(Math.random() * 16)) {
        let str = '';
        if (Math.random() < 0.1)
            for (let i = 0; i < length; i++)
                str += utf16();
        else
            for (let i = 0; i < length; i++)
                str += ascii();
        if (str.length !== length)
            return ascii().repeat(length);
        return str;
    }
    static genBinary(length = Math.ceil(Math.random() * 16)) {
        const buf = new Uint8Array(length);
        for (let i = 0; i < length; i++)
            buf[i] = Math.floor(Math.random() * 256);
        return buf;
    }
    static genArray(options = { odds: defaultOpts.odds }) {
        return RandomJson.generate({
            nodeCount: 6,
            ...options,
            rootNode: 'array',
        });
    }
    static genObject(options = { odds: defaultOpts.odds }) {
        return RandomJson.generate({
            nodeCount: 6,
            ...options,
            rootNode: 'object',
        });
    }
    constructor(opts = {}) {
        this.containers = [];
        this.opts = { ...defaultOpts, ...opts };
        this.oddTotals = {};
        this.oddTotals.null = this.opts.odds.null;
        this.oddTotals.boolean = this.oddTotals.null + this.opts.odds.boolean;
        this.oddTotals.number = this.oddTotals.boolean + this.opts.odds.number;
        this.oddTotals.string = this.oddTotals.number + this.opts.odds.string;
        this.oddTotals.binary = this.oddTotals.string + this.opts.odds.binary;
        this.oddTotals.array = this.oddTotals.string + this.opts.odds.array;
        this.oddTotals.object = this.oddTotals.array + this.opts.odds.object;
        this.totalOdds =
            this.opts.odds.null +
                this.opts.odds.boolean +
                this.opts.odds.number +
                this.opts.odds.string +
                this.opts.odds.binary +
                this.opts.odds.array +
                this.opts.odds.object;
        if (this.opts.rootNode === 'string') {
            this.root = this.generateString();
            this.opts.nodeCount = 0;
        }
        else {
            this.root =
                this.opts.rootNode === 'object'
                    ? {}
                    : this.opts.rootNode === 'array'
                        ? []
                        : this.pickContainerType() === 'object'
                            ? {}
                            : [];
            this.containers.push(this.root);
        }
    }
    create() {
        for (let i = 0; i < this.opts.nodeCount; i++)
            this.addNode();
        return this.root;
    }
    addNode() {
        const container = this.pickContainer();
        const newNodeType = this.pickNodeType();
        const node = this.generate(newNodeType);
        if (node && typeof node === 'object')
            this.containers.push(node);
        if (Array.isArray(container)) {
            const index = Math.floor(Math.random() * (container.length + 1));
            container.splice(index, 0, node);
        }
        else {
            const key = RandomJson.genString();
            container[key] = node;
        }
    }
    generate(type) {
        switch (type) {
            case 'null':
                return null;
            case 'boolean':
                return RandomJson.genBoolean();
            case 'number':
                return RandomJson.genNumber();
            case 'string':
                return this.generateString();
            case 'binary':
                return RandomJson.genBinary();
            case 'array':
                return [];
            case 'object':
                return {};
        }
    }
    generateString() {
        const strings = this.opts.strings;
        return strings ? (0, string_1.randomString)(strings) : RandomJson.genString();
    }
    pickNodeType() {
        const odd = Math.random() * this.totalOdds;
        if (odd <= this.oddTotals.null)
            return 'null';
        if (odd <= this.oddTotals.boolean)
            return 'boolean';
        if (odd <= this.oddTotals.number)
            return 'number';
        if (odd <= this.oddTotals.string)
            return 'string';
        if (odd <= this.oddTotals.binary)
            return 'binary';
        if (odd <= this.oddTotals.array)
            return 'array';
        return 'object';
    }
    pickContainerType() {
        const sum = this.opts.odds.array + this.opts.odds.object;
        if (Math.random() < this.opts.odds.array / sum)
            return 'array';
        return 'object';
    }
    pickContainer() {
        return this.containers[Math.floor(Math.random() * this.containers.length)];
    }
}
exports.RandomJson = RandomJson;
//# sourceMappingURL=RandomJson.js.map