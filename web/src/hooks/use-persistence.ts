import { useEffect, useState, useCallback } from "react";
import { get as getData, set as setData } from "idb-keyval";

type usePersistenceReturn<S extends any> = [
  value: S | undefined,
  setValue: (value: string | boolean) => void,
  loaded: boolean,
];

export function usePersistence<S>(
  key: string,
  defaultValue: S | undefined = undefined
): usePersistenceReturn<S> {
  const [value, setInternalValue] = useState<any | undefined>(defaultValue);
  const [loaded, setLoaded] = useState<boolean>(false);

  const setValue = useCallback(
    (value: string | boolean) => {
      setInternalValue(value);
      async function update() {
        await setData(key, value);
      }

      update();
    },
    [key]
  );

  useEffect(() => {
    setLoaded(false);
    setInternalValue(defaultValue);

    async function load() {
      const value = await getData(key);
      if (typeof value !== "undefined") {
        setValue(value);
      }
      setLoaded(true);
    }

    load();
  }, [key, defaultValue, setValue]);

  return [value, setValue, loaded];
}
