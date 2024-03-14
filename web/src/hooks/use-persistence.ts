import { useEffect, useState, useCallback } from "react";
import { get as getData, set as setData } from "idb-keyval";

type usePersistenceReturn<S> = [
  value: S | undefined,
  setValue: (value: S | undefined) => void,
  loaded: boolean,
];

export function usePersistence<S>(
  key: string,
  defaultValue: S | undefined = undefined,
): usePersistenceReturn<S> {
  const [value, setInternalValue] = useState<S | undefined>(defaultValue);
  const [loaded, setLoaded] = useState<boolean>(false);

  const setValue = useCallback(
    (value: S | undefined) => {
      setInternalValue(value);
      async function update() {
        await setData(key, value);
      }

      update();
    },
    [key],
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
