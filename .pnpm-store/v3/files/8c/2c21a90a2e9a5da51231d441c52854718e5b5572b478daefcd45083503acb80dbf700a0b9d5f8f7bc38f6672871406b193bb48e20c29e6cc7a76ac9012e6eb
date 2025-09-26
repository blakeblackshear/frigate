import { useEffect, useRef, useDebugValue } from 'react';
import { affectedToPathList } from 'proxy-compare';
export const useAffectedDebugValue = (state, affected) => {
    const pathList = useRef();
    useEffect(() => {
        pathList.current = affectedToPathList(state, affected);
    });
    useDebugValue(state);
};
