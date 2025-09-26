/* IMPORT */
import _ from '../utils/index.js';
import Type from './type.js';
import { TYPE } from '../constants.js';
/* MAIN */
class Channels {
    /* CONSTRUCTOR */
    constructor(data, color) {
        this.color = color;
        this.changed = false;
        this.data = data; //TSC
        this.type = new Type();
    }
    /* API */
    set(data, color) {
        this.color = color;
        this.changed = false;
        this.data = data; //TSC
        this.type.type = TYPE.ALL;
        return this;
    }
    /* HELPERS */
    _ensureHSL() {
        const data = this.data;
        const { h, s, l } = data;
        if (h === undefined)
            data.h = _.channel.rgb2hsl(data, 'h');
        if (s === undefined)
            data.s = _.channel.rgb2hsl(data, 's');
        if (l === undefined)
            data.l = _.channel.rgb2hsl(data, 'l');
    }
    _ensureRGB() {
        const data = this.data;
        const { r, g, b } = data;
        if (r === undefined)
            data.r = _.channel.hsl2rgb(data, 'r');
        if (g === undefined)
            data.g = _.channel.hsl2rgb(data, 'g');
        if (b === undefined)
            data.b = _.channel.hsl2rgb(data, 'b');
    }
    /* GETTERS */
    get r() {
        const data = this.data;
        const r = data.r;
        if (!this.type.is(TYPE.HSL) && r !== undefined)
            return r;
        this._ensureHSL();
        return _.channel.hsl2rgb(data, 'r');
    }
    get g() {
        const data = this.data;
        const g = data.g;
        if (!this.type.is(TYPE.HSL) && g !== undefined)
            return g;
        this._ensureHSL();
        return _.channel.hsl2rgb(data, 'g');
    }
    get b() {
        const data = this.data;
        const b = data.b;
        if (!this.type.is(TYPE.HSL) && b !== undefined)
            return b;
        this._ensureHSL();
        return _.channel.hsl2rgb(data, 'b');
    }
    get h() {
        const data = this.data;
        const h = data.h;
        if (!this.type.is(TYPE.RGB) && h !== undefined)
            return h;
        this._ensureRGB();
        return _.channel.rgb2hsl(data, 'h');
    }
    get s() {
        const data = this.data;
        const s = data.s;
        if (!this.type.is(TYPE.RGB) && s !== undefined)
            return s;
        this._ensureRGB();
        return _.channel.rgb2hsl(data, 's');
    }
    get l() {
        const data = this.data;
        const l = data.l;
        if (!this.type.is(TYPE.RGB) && l !== undefined)
            return l;
        this._ensureRGB();
        return _.channel.rgb2hsl(data, 'l');
    }
    get a() {
        return this.data.a;
    }
    /* SETTERS */
    set r(r) {
        this.type.set(TYPE.RGB);
        this.changed = true;
        this.data.r = r;
    }
    set g(g) {
        this.type.set(TYPE.RGB);
        this.changed = true;
        this.data.g = g;
    }
    set b(b) {
        this.type.set(TYPE.RGB);
        this.changed = true;
        this.data.b = b;
    }
    set h(h) {
        this.type.set(TYPE.HSL);
        this.changed = true;
        this.data.h = h;
    }
    set s(s) {
        this.type.set(TYPE.HSL);
        this.changed = true;
        this.data.s = s;
    }
    set l(l) {
        this.type.set(TYPE.HSL);
        this.changed = true;
        this.data.l = l;
    }
    set a(a) {
        this.changed = true;
        this.data.a = a;
    }
}
/* EXPORT */
export default Channels;
