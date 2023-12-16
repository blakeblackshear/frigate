import { useEffect, useState, useCallback } from "react";
import { get as getData, set as setData } from "idb-keyval";

type usePersistenceReturn = [
  value: any | undefined,
  setValue: (value: string | boolean) => void,
  loaded: boolean,
];

export function usePersistence(
  key: string,
  defaultValue: any | undefined = undefined
): usePersistenceReturn {
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
