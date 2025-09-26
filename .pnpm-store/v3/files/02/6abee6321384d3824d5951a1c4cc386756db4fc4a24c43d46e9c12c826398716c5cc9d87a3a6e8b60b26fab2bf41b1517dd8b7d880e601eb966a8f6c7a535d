import type { Draft } from 'immer';
import type { AnyAction, Action, Reducer } from 'redux';
import type { ActionReducerMapBuilder } from './mapBuilders';
import type { NoInfer } from './tsHelpers';
/**
 * Defines a mapping from action types to corresponding action object shapes.
 *
 * @deprecated This should not be used manually - it is only used for internal
 *             inference purposes and should not have any further value.
 *             It might be removed in the future.
 * @public
 */
export declare type Actions<T extends keyof any = string> = Record<T, Action>;
/**
 * @deprecated use `TypeGuard` instead
 */
export interface ActionMatcher<A extends AnyAction> {
    (action: AnyAction): action is A;
}
export declare type ActionMatcherDescription<S, A extends AnyAction> = {
    matcher: ActionMatcher<A>;
    reducer: CaseReducer<S, NoInfer<A>>;
};
export declare type ReadonlyActionMatcherDescriptionCollection<S> = ReadonlyArray<ActionMatcherDescription<S, any>>;
export declare type ActionMatcherDescriptionCollection<S> = Array<ActionMatcherDescription<S, any>>;
/**
 * A *case reducer* is a reducer function for a specific action type. Case
 * reducers can be composed to full reducers using `createReducer()`.
 *
 * Unlike a normal Redux reducer, a case reducer is never called with an
 * `undefined` state to determine the initial state. Instead, the initial
 * state is explicitly specified as an argument to `createReducer()`.
 *
 * In addition, a case reducer can choose to mutate the passed-in `state`
 * value directly instead of returning a new state. This does not actually
 * cause the store state to be mutated directly; instead, thanks to
 * [immer](https://github.com/mweststrate/immer), the mutations are
 * translated to copy operations that result in a new state.
 *
 * @public
 */
export declare type CaseReducer<S = any, A extends Action = AnyAction> = (state: Draft<S>, action: A) => NoInfer<S> | void | Draft<NoInfer<S>>;
/**
 * A mapping from action types to case reducers for `createReducer()`.
 *
 * @deprecated This should not be used manually - it is only used
 *             for internal inference purposes and using it manually
 *             would lead to type erasure.
 *             It might be removed in the future.
 * @public
 */
export declare type CaseReducers<S, AS extends Actions> = {
    [T in keyof AS]: AS[T] extends Action ? CaseReducer<S, AS[T]> : void;
};
export declare type NotFunction<T> = T extends Function ? never : T;
export declare type ReducerWithInitialState<S extends NotFunction<any>> = Reducer<S> & {
    getInitialState: () => S;
};
/**
 * A utility function that allows defining a reducer as a mapping from action
 * type to *case reducer* functions that handle these action types. The
 * reducer's initial state is passed as the first argument.
 *
 * @remarks
 * The body of every case reducer is implicitly wrapped with a call to
 * `produce()` from the [immer](https://github.com/mweststrate/immer) library.
 * This means that rather than returning a new state object, you can also
 * mutate the passed-in state object directly; these mutations will then be
 * automatically and efficiently translated into copies, giving you both
 * convenience and immutability.
 *
 * @overloadSummary
 * This overload accepts a callback function that receives a `builder` object as its argument.
 * That builder provides `addCase`, `addMatcher` and `addDefaultCase` functions that may be
 * called to define what actions this reducer will handle.
 *
 * @param initialState - `State | (() => State)`: The initial state that should be used when the reducer is called the first time. This may also be a "lazy initializer" function, which should return an initial state value when called. This will be used whenever the reducer is called with `undefined` as its state value, and is primarily useful for cases like reading initial state from `localStorage`.
 * @param builderCallback - `(builder: Builder) => void` A callback that receives a *builder* object to define
 *   case reducers via calls to `builder.addCase(actionCreatorOrType, reducer)`.
 * @example
```ts
import {
  createAction,
  createReducer,
  AnyAction,
  PayloadAction,
} from "@reduxjs/toolkit";

const increment = createAction<number>("increment");
const decrement = createAction<number>("decrement");

function isActionWithNumberPayload(
  action: AnyAction
): action is PayloadAction<number> {
  return typeof action.payload === "number";
}

const reducer = createReducer(
  {
    counter: 0,
    sumOfNumberPayloads: 0,
    unhandledActions: 0,
  },
  (builder) => {
    builder
      .addCase(increment, (state, action) => {
        // action is inferred correctly here
        state.counter += action.payload;
      })
      // You can chain calls, or have separate `builder.addCase()` lines each time
      .addCase(decrement, (state, action) => {
        state.counter -= action.payload;
      })
      // You can apply a "matcher function" to incoming actions
      .addMatcher(isActionWithNumberPayload, (state, action) => {})
      // and provide a default case if no other handlers matched
      .addDefaultCase((state, action) => {});
  }
);
```
 * @public
 */
export declare function createReducer<S extends NotFunction<any>>(initialState: S | (() => S), builderCallback: (builder: ActionReducerMapBuilder<S>) => void): ReducerWithInitialState<S>;
/**
 * A utility function that allows defining a reducer as a mapping from action
 * type to *case reducer* functions that handle these action types. The
 * reducer's initial state is passed as the first argument.
 *
 * The body of every case reducer is implicitly wrapped with a call to
 * `produce()` from the [immer](https://github.com/mweststrate/immer) library.
 * This means that rather than returning a new state object, you can also
 * mutate the passed-in state object directly; these mutations will then be
 * automatically and efficiently translated into copies, giving you both
 * convenience and immutability.
 *
 * @overloadSummary
 * This overload accepts an object where the keys are string action types, and the values
 * are case reducer functions to handle those action types.
 *
 * @param initialState - `State | (() => State)`: The initial state that should be used when the reducer is called the first time. This may also be a "lazy initializer" function, which should return an initial state value when called. This will be used whenever the reducer is called with `undefined` as its state value, and is primarily useful for cases like reading initial state from `localStorage`.
 * @param actionsMap - An object mapping from action types to _case reducers_, each of which handles one specific action type.
 * @param actionMatchers - An array of matcher definitions in the form `{matcher, reducer}`.
 *   All matching reducers will be executed in order, independently if a case reducer matched or not.
 * @param defaultCaseReducer - A "default case" reducer that is executed if no case reducer and no matcher
 *   reducer was executed for this action.
 *
 * @example
```js
const counterReducer = createReducer(0, {
  increment: (state, action) => state + action.payload,
  decrement: (state, action) => state - action.payload
})

// Alternately, use a "lazy initializer" to provide the initial state
// (works with either form of createReducer)
const initialState = () => 0
const counterReducer = createReducer(initialState, {
  increment: (state, action) => state + action.payload,
  decrement: (state, action) => state - action.payload
})
```
 
 * Action creators that were generated using [`createAction`](./createAction) may be used directly as the keys here, using computed property syntax:

```js
const increment = createAction('increment')
const decrement = createAction('decrement')

const counterReducer = createReducer(0, {
  [increment]: (state, action) => state + action.payload,
  [decrement.type]: (state, action) => state - action.payload
})
```
 * @public
 */
export declare function createReducer<S extends NotFunction<any>, CR extends CaseReducers<S, any> = CaseReducers<S, any>>(initialState: S | (() => S), actionsMap: CR, actionMatchers?: ActionMatcherDescriptionCollection<S>, defaultCaseReducer?: CaseReducer<S>): ReducerWithInitialState<S>;
