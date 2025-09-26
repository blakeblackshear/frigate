import { useEffect, useRef, useDebugValue } from 'react';
import { affectedToPathList } from 'proxy-compare';

type Obj = Record<string, unknown>;

export const useAffectedDebugValue = <State>(
  state: State,
  affected: WeakMap<Obj, unknown>,
) => {
  const pathList = useRef<(string | number | symbol)[][]>();
  useEffect(() => {
    pathList.current = affectedToPathList(state, affected);
  });
  useDebugValue(state);
};
