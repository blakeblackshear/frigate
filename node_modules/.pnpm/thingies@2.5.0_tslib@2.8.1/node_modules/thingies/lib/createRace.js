"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRace = void 0;
/**
 * Constructs a function that will only invoke the first function passed to it
 * concurrently. Once the function has been executed, the racer will be reset
 * and the next invocation will be allowed to execute.
 *
 * Example:
 *
 * ```ts
 * import {createRace} from 'thingies/es2020/createRace';
 *
 * const race = createRace();
 *
 * race(() => {
 *   race(() => {
 *    console.log('This will not be executed');
 *   });
 *   console.log('This will be executed');
 * });
 *
 * race(() => {
 *  console.log('This will be executed');
 * });
 * ```
 *
 * @returns A "race" function that will only invoke the first function passed to it.
 */
const createRace = () => {
    let invoked = false;
    return (fn) => {
        if (invoked)
            return;
        invoked = true;
        try {
            return fn();
        }
        finally {
            invoked = false;
        }
    };
};
exports.createRace = createRace;
