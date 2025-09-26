import {
  createContext as createContextOrig,
  createElement,
  useCallback,
  useContext as useContextOrig,
  useDebugValue,
} from 'react';
import type { ComponentType, Context as ContextOrig, ReactNode } from 'react';

import {
  createContext,
  useContextSelector,
  useContextUpdate,
} from 'use-context-selector';
import type { Context } from 'use-context-selector';

import { createTrackedSelector } from './createTrackedSelector.js';

const hasGlobalProcess = typeof process === 'object';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;
type Options<State, Update extends AnyFunction> = {
  defaultState?: State;
  defaultUpdate?: Update;
  stateContextName?: string;
  updateContextName?: string;
  concurrentMode?: boolean;
};
/**
 * [Deprecated] Please use object option
 */
type DeprecatedOption = boolean;

export const createContainer = <State, Update extends AnyFunction, Props>(
  useValue: (props: Props) => readonly [State, Update],
  options?: Options<State, Update> | DeprecatedOption,
) => {
  if (typeof options === 'boolean') {
    // eslint-disable-next-line no-console
    console.warn(
      'boolean option is deprecated, please specify { concurrentMode: true }',
    );
    options = { concurrentMode: options };
  }
  const {
    stateContextName = 'StateContainer',
    updateContextName = 'UpdateContainer',
    concurrentMode,
  } = options || {};
  const StateContext = createContext<State | undefined>(options?.defaultState);
  const UpdateContext = createContextOrig<Update | undefined>(
    options?.defaultUpdate,
  );
  StateContext.displayName = stateContextName;
  UpdateContext.displayName = updateContextName;

  const Provider = (props: Props & { children: ReactNode }) => {
    const [state, update] = useValue(props);
    return createElement(
      UpdateContext.Provider,
      { value: update },
      createElement(
        StateContext.Provider as ComponentType<{
          value: State;
        }>,
        { value: state },
        props.children,
      ),
    );
  };

  const useSelector = <Selected>(selector: (state: State) => Selected) => {
    if (hasGlobalProcess && process.env.NODE_ENV !== 'production') {
      const selectorOrig = selector;
      selector = (state: State) => {
        if (state === undefined) {
          throw new Error('Please use <Provider>');
        }
        return selectorOrig(state);
      };
    }
    const selected = useContextSelector(
      StateContext as Context<State>,
      selector,
    );
    useDebugValue(selected);
    return selected;
  };

  const useTrackedState = createTrackedSelector(useSelector);

  const useUpdate = concurrentMode
    ? () => {
        if (
          hasGlobalProcess &&
          process.env.NODE_ENV !== 'production' &&
          useContextOrig(UpdateContext) === undefined
        ) {
          throw new Error('Please use <Provider>');
        }
        const contextUpdate = useContextUpdate(
          StateContext as Context<unknown>,
        );
        const update = useContextOrig(UpdateContext as ContextOrig<Update>);
        return useCallback(
          (...args: Parameters<Update>) => {
            let result: ReturnType<Update> | undefined;
            contextUpdate(() => {
              result = update(...args);
            });
            return result as ReturnType<Update>;
          },
          [contextUpdate, update],
        );
      }
    : // not concurrentMode
      () => {
        if (
          typeof process === 'object' &&
          process.env.NODE_ENV !== 'production' &&
          useContextOrig(UpdateContext) === undefined
        ) {
          throw new Error('Please use <Provider>');
        }
        return useContextOrig(UpdateContext as ContextOrig<Update>);
      };

  const useTracked = () =>
    [useTrackedState(), useUpdate()] as [
      ReturnType<typeof useTrackedState>,
      ReturnType<typeof useUpdate>,
    ];

  return {
    Provider,
    useTrackedState,
    useTracked,
    useUpdate,
    useSelector,
  } as const;
};
