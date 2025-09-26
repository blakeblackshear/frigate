import { JavaScriptLinked } from '.';
import { JavaScript } from './types';
export declare const compile: <T>(js: JavaScript<T>) => T;
export declare const compileClosure: <T>(fn: JavaScriptLinked<T, any>) => T;
