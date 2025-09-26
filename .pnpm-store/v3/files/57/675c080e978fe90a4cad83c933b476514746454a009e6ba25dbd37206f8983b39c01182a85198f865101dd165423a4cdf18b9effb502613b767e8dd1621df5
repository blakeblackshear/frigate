import { Element, ElementCompact } from './index'
import * as convert from './index'

// Declaration
const declarationCompact1: ElementCompact = { _declaration: { _attributes: { version: 2 } }};
const declarationCompact2: ElementCompact = { _declaration: { _attributes: { version: '1.0', encoding: 'utf-8', standalone: 'yes' }}};
const declaration1: Element = { declaration: { }};
const declaration2: Element = { declaration: { attributes: { version: '1.0', encoding: 'utf-8', standalone: 'yes', }}};

// Processing Instruction
const instructionCompact: ElementCompact = { _instruction: { go: 'there' }};
const instruction: Element = { elements:[{ type: 'instruction', name: 'go', instruction: 'there' }]};

// Comment
const commentCompact: ElementCompact = { _comment : 'Hello, World!' };
const comment: Element = { elements: [{ type: 'comment', comment: 'Hello, World!' }]};

// CDATA
const cdataCompact: ElementCompact = { _cdata: '<foo></bar>' };
const cdata: Element = { elements : [{ type: 'cdata', cdata: '<foo></bar>' }]};

// Element
const elementCompact1: ElementCompact = { a: {} };
const element1: Element = { elements:[{ type: 'element', name: 'a' }]};

const elementCompact2: ElementCompact = { a: { _attributes: { x: '1.234', y:'It\'s', z: undefined }}};
const element2: Element = { elements: [{ type: 'element', name: 'a', attributes: { x: '1.234', y: 'It\'s', z: undefined }}]};

const elementCompact3: ElementCompact = { a: { _text: ' Hi ' }};
const element3: Element = { elements:[{ type: 'element', name: 'a', elements: [{ type: 'text', text: ' Hi ' }]}]};

const elementCompact4: ElementCompact = { a: {}, b: {} };
const element4: Element = { elements:[{ type: 'element', name: 'a' }, { type: 'element', name: 'b' }]};

const elementCompact5: ElementCompact = { a: { b: {} }};
const element5: Element = { elements: [{ type: 'element', name: 'a', elements: [{ type: 'element', name: 'b' }]}]};

const xml = `
<?xml version="1.0" encoding="utf-8"?>
<note importance="high" logged="true">
  <title>Happy</title>
  <todo>Work</todo>
  <todo>Play</todo>
</note>`;

// xml2js
let jsResult1: any = convert.xml2js(xml, {compact:true});
let jsResult2: any = convert.xml2js(xml, {compact:false});

// xml2json
let jsonResult1: string = convert.xml2json(xml, {compact:true, spaces:4});
let jsonResult2: string = convert.xml2json(xml, {compact:false});

// js2xml
let xmlResult1: string = convert.js2xml({a:{}}, { compact:true, spaces:4});
let xmlResult2: string = convert.js2xml({elements:[{type:'element', name:'a'}]}, {compact:false});

// json2xml
let xmlResult3: string = convert.json2xml('{"a":{}}', { compact:true, spaces:4});
let xmlResult4: string = convert.json2xml('{"elements":[{"type":"element","name":"a"}]}', {compact:false});
