
/* IMPORT */

import _ from '~/utils';
import Type from '~/channels/type';
import {TYPE} from '~/constants';
import type {RGBA, HSLA, CHANNELS} from '~/types';

/* MAIN */

class Channels {

  /* VARIABLES */

  color?: string;
  changed: boolean;
  data: CHANNELS; //TSC: It should really be "Partial<CHANNELS>", but TS gets excessively noisy
  type: Type;

  /* CONSTRUCTOR */

  constructor ( data: RGBA | HSLA | CHANNELS, color?: string ) {

    this.color = color;
    this.changed = false;
    this.data = data as CHANNELS; //TSC
    this.type = new Type ();

  }

  /* API */

  set ( data: RGBA | HSLA | CHANNELS, color?: string ): this {

    this.color = color;
    this.changed = false;
    this.data = data as CHANNELS; //TSC
    this.type.type = TYPE.ALL;

    return this;

  }

  /* HELPERS */

  _ensureHSL (): void {

    const data = this.data;
    const {h, s, l} = data;

    if ( h === undefined ) data.h = _.channel.rgb2hsl ( data, 'h' );
    if ( s === undefined ) data.s = _.channel.rgb2hsl ( data, 's' );
    if ( l === undefined ) data.l = _.channel.rgb2hsl ( data, 'l' );

  }

  _ensureRGB (): void {

    const data = this.data;
    const {r, g, b} = data;

    if ( r === undefined ) data.r = _.channel.hsl2rgb ( data, 'r' );
    if ( g === undefined ) data.g = _.channel.hsl2rgb ( data, 'g' );
    if ( b === undefined ) data.b = _.channel.hsl2rgb ( data, 'b' );

  }

  /* GETTERS */

  get r (): number {
    const data = this.data;
    const r = data.r;
    if ( !this.type.is ( TYPE.HSL ) && r !== undefined ) return r;
    this._ensureHSL ();
    return _.channel.hsl2rgb ( data, 'r' );
  }

  get g (): number {
    const data = this.data;
    const g = data.g;
    if ( !this.type.is ( TYPE.HSL ) && g !== undefined ) return g;
    this._ensureHSL ();
    return _.channel.hsl2rgb ( data, 'g' );
  }

  get b (): number {
    const data = this.data;
    const b = data.b;
    if ( !this.type.is ( TYPE.HSL ) && b !== undefined ) return b;
    this._ensureHSL ();
    return _.channel.hsl2rgb ( data, 'b' );
  }

  get h (): number {
    const data = this.data;
    const h = data.h;
    if ( !this.type.is ( TYPE.RGB ) && h !== undefined ) return h;
    this._ensureRGB ();
    return _.channel.rgb2hsl ( data, 'h' );
  }

  get s (): number {
    const data = this.data;
    const s = data.s;
    if ( !this.type.is ( TYPE.RGB ) && s !== undefined ) return s;
    this._ensureRGB ();
    return _.channel.rgb2hsl ( data, 's' );
  }

  get l (): number {
    const data = this.data;
    const l = data.l;
    if ( !this.type.is ( TYPE.RGB ) && l !== undefined ) return l;
    this._ensureRGB ();
    return _.channel.rgb2hsl ( data, 'l' );
  }

  get a (): number {
    return this.data.a;
  }

  /* SETTERS */

  set r ( r: number ) {
    this.type.set ( TYPE.RGB );
    this.changed = true;
    this.data.r = r;
  }

  set g ( g: number ) {
    this.type.set ( TYPE.RGB );
    this.changed = true;
    this.data.g = g;
  }

  set b ( b: number ) {
    this.type.set ( TYPE.RGB );
    this.changed = true;
    this.data.b = b;
  }

  set h ( h: number ) {
    this.type.set ( TYPE.HSL );
    this.changed = true;
    this.data.h = h;
  }

  set s ( s: number ) {
    this.type.set ( TYPE.HSL );
    this.changed = true;
    this.data.s = s;
  }

  set l ( l: number ) {
    this.type.set ( TYPE.HSL );
    this.changed = true;
    this.data.l = l;
  }

  set a ( a: number ) {
    this.changed = true;
    this.data.a = a;
  }

}

/* EXPORT */

export default Channels;
