import {
  createElement,
  createContext as createContextOrig,
  useContext as useContextOrig,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type {
  ComponentType,
  Context as ContextOrig,
  MutableRefObject,
  Provider,
  ReactNode,
} from 'react';
import {
  unstable_NormalPriority as NormalPriority,
  unstable_runWithPriority as runWithPriority,
} from 'scheduler';

const CONTEXT_VALUE = Symbol();
const ORIGINAL_PROVIDER = Symbol();

const isSSR =
  typeof window === 'undefined' ||
  /ServerSideRendering/.test(window.navigator && window.navigator.userAgent);

const useIsomorphicLayoutEffect = isSSR ? useEffect : useLayoutEffect;

// for preact that doesn't have runWithPriority
const runWithNormalPriority = runWithPriority
  ? (fn: () => void) => {
      try {
        runWithPriority(NormalPriority, fn);
      } catch (e) {
        if ((e as { message: unknown }).message === 'Not implemented.') {
          fn();
        } else {
          throw e;
        }
      }
    }
  : (fn: () => void) => fn();

type Version = number;
type Listener<Value> = (action: {
  n: Version;
  p?: Promise<Value>;
  v?: Value;
}) => void;

type ContextValue<Value> = {
  [CONTEXT_VALUE]: {
    /* "v"alue     */ v: MutableRefObject<Value>;
    /* versio"n"   */ n: MutableRefObject<Version>;
    /* "l"isteners */ l: Set<Listener<Value>>;
    /* "u"pdate    */ u: (
      fn: () => void,
      options?: { suspense: boolean },
    ) => void;
  };
};

export interface Context<Value> {
  Provider: ComponentType<{ value: Value; children: ReactNode }>;
  displayName?: string;
}

const createProvider = <Value>(ProviderOrig: Provider<ContextValue<Value>>) => {
  const ContextProvider = ({
    value,
    children,
  }: {
    value: Value;
    children: ReactNode;
  }) => {
    const valueRef = useRef(value);
    const versionRef = useRef(0);
    const [resolve, setResolve] = useState<((v: Value) => void) | null>(null);
    if (resolve) {
      resolve(value);
      setResolve(null);
    }
    const contextValue = useRef<ContextValue<Value>>();
    if (!contextValue.current) {
      const listeners = new Set<Listener<Value>>();
      const update = (fn: () => void, options?: { suspense: boolean }) => {
        versionRef.current += 1;
        const action: Parameters<Listener<Value>>[0] = {
          n: versionRef.current,
        };
        if (options?.suspense) {
          action.n *= -1; // this is intentional to make it temporary version
          action.p = new Promise<Value>((r) => {
            setResolve(() => (v: Value) => {
              action.v = v;
              delete action.p;
              r(v);
            });
          });
        }
        listeners.forEach((listener) => listener(action));
        fn();
      };
      contextValue.current = {
        [CONTEXT_VALUE]: {
          /* "v"alue     */ v: valueRef,
          /* versio"n"   */ n: versionRef,
          /* "l"isteners */ l: listeners,
          /* "u"pdate    */ u: update,
        },
      };
    }
    useIsomorphicLayoutEffect(() => {
      valueRef.current = value;
      versionRef.current += 1;
      runWithNormalPriority(() => {
        (contextValue.current as ContextValue<Value>)[CONTEXT_VALUE].l.forEach(
          (listener) => {
            listener({ n: versionRef.current, v: value });
          },
        );
      });
    }, [value]);
    return createElement(
      ProviderOrig,
      { value: contextValue.current },
      children,
    );
  };
  return ContextProvider;
};

const identity = <T>(x: T) => x;

/**
 * This creates a special context for `useContextSelector`.
 *
 * @example
 * import { createContext } from 'use-context-selector';
 *
 * const PersonContext = createContext({ firstName: '', familyName: '' });
 */
export function createContext<Value>(defaultValue: Value) {
  const context = createContextOrig<ContextValue<Value>>({
    [CONTEXT_VALUE]: {
      /* "v"alue     */ v: { current: defaultValue },
      /* versio"n"   */ n: { current: -1 },
      /* "l"isteners */ l: new Set(),
      /* "u"pdate    */ u: (f) => f(),
    },
  });
  (
    context as unknown as {
      [ORIGINAL_PROVIDER]: Provider<ContextValue<Value>>;
    }
  )[ORIGINAL_PROVIDER] = context.Provider;
  (context as unknown as Context<Value>).Provider = createProvider(
    context.Provider,
  );
  delete (context as { Consumer: unknown }).Consumer; // no support for Consumer
  return context as unknown as Context<Value>;
}

/**
 * This hook returns context selected value by selector.
 *
 * It will only accept context created by `createContext`.
 * It will trigger re-render if only the selected value is referentially changed.
 *
 * The selector should return referentially equal result for same input for better performance.
 *
 * @example
 * import { useContextSelector } from 'use-context-selector';
 *
 * const firstName = useContextSelector(PersonContext, (state) => state.firstName);
 */
export function useContextSelector<Value, Selected>(
  context: Context<Value>,
  selector: (value: Value) => Selected,
) {
  const contextValue = useContextOrig(
    context as unknown as ContextOrig<ContextValue<Value>>,
  )[CONTEXT_VALUE];
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    if (!contextValue) {
      throw new Error('useContextSelector requires special context');
    }
  }
  const {
    /* "v"alue     */ v: { current: value },
    /* versio"n"   */ n: { current: version },
    /* "l"isteners */ l: listeners,
  } = contextValue;
  const selected = selector(value);
  const [state, dispatch] = useReducer(
    (
      prev: readonly [Value, Selected],
      action?: Parameters<Listener<Value>>[0],
    ) => {
      if (!action) {
        // case for `dispatch()` below
        return [value, selected] as const;
      }
      if ('p' in action) {
        throw action.p;
      }
      if (action.n === version) {
        if (Object.is(prev[1], selected)) {
          return prev; // bail out
        }
        return [value, selected] as const;
      }
      try {
        if ('v' in action) {
          if (Object.is(prev[0], action.v)) {
            return prev; // do not update
          }
          const nextSelected = selector(action.v);
          if (Object.is(prev[1], nextSelected)) {
            return prev; // do not update
          }
          return [action.v, nextSelected] as const;
        }
      } catch (_e) {
        // ignored (stale props or some other reason)
      }
      return [...prev] as const; // schedule update
    },
    [value, selected] as const,
  );
  if (!Object.is(state[1], selected)) {
    // schedule re-render
    // this is safe because it's self contained
    dispatch();
  }
  useIsomorphicLayoutEffect(() => {
    listeners.add(dispatch);
    return () => {
      listeners.delete(dispatch);
    };
  }, [listeners]);
  return state[1];
}

/**
 * This hook returns the entire context value.
 * Use this instead of React.useContext for consistent behavior.
 *
 * @example
 * import { useContext } from 'use-context-selector';
 *
 * const person = useContext(PersonContext);
 */
export function useContext<Value>(context: Context<Value>) {
  return useContextSelector(context, identity);
}

/**
 * This hook returns an update function to wrap an updating function
 *
 * Use this for a function that will change a value in
 * concurrent rendering in React 18.
 * Otherwise, there's no need to use this hook.
 *
 * @example
 * import { useContextUpdate } from 'use-context-selector';
 *
 * const update = useContextUpdate();
 *
 * // Wrap set state function
 * update(() => setState(...));
 *
 * // Experimental suspense mode
 * update(() => setState(...), { suspense: true });
 */
export function useContextUpdate<Value>(context: Context<Value>) {
  const contextValue = useContextOrig(
    context as unknown as ContextOrig<ContextValue<Value>>,
  )[CONTEXT_VALUE];
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    if (!contextValue) {
      throw new Error('useContextUpdate requires special context');
    }
  }
  const { u: update } = contextValue;
  return update;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * This is a Provider component for bridging multiple react roots
 *
 * @example
 * const valueToBridge = useBridgeValue(PersonContext);
 * return (
 *   <Renderer>
 *     <BridgeProvider context={PersonContext} value={valueToBridge}>
 *       {children}
 *     </BridgeProvider>
 *   </Renderer>
 * );
 */
export const BridgeProvider = ({
  context,
  value,
  children,
}: {
  context: Context<any>;
  value: unknown;
  children: ReactNode;
}) => {
  const { [ORIGINAL_PROVIDER]: ProviderOrig } = context as unknown as {
    [ORIGINAL_PROVIDER]: Provider<unknown>;
  };
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    if (!ProviderOrig) {
      throw new Error('BridgeProvider requires special context');
    }
  }
  return createElement(ProviderOrig, { value }, children);
};

/**
 * This hook return a value for BridgeProvider
 */
export const useBridgeValue = (context: Context<any>) => {
  const bridgeValue = useContextOrig(
    context as unknown as ContextOrig<ContextValue<unknown>>,
  );
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    if (!bridgeValue[CONTEXT_VALUE]) {
      throw new Error('useBridgeValue requires special context');
    }
  }
  return bridgeValue as any;
};
