import { useEffect, useState, useCallback } from "react";
import { get as getData, set as setData } from "idb-keyval";

export function usePersistence(
  key: string,
  defaultValue: string | boolean | undefined = undefined
) {
  const [value, setInternalValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);

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
