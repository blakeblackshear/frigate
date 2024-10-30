import { FilterType } from "@/types/filter";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

function getStringifiedArgs(filter: FilterType) {
  const search: { [key: string]: string } = {};

  Object.entries(filter).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length == 0) {
        // empty array means all so ignore
      } else {
        search[key] = value.join(",");
      }
    } else {
      if (value != undefined) {
        search[key] = `${value}`;
      }
    }
  });

  return search;
}

type useApiFilterReturn<F extends FilterType> = [
  filter: F | undefined,
  setFilter: (filter: F) => void,
  searchParams: {
    // accept any type for a filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  },
];

export default function useApiFilter<
  F extends FilterType,
>(): useApiFilterReturn<F> {
  const [filter, setFilter] = useState<F | undefined>(undefined);
  const searchParams = useMemo(() => {
    if (filter == undefined) {
      return {};
    }

    return getStringifiedArgs(filter);
  }, [filter]);

  return [filter, setFilter, searchParams];
}

export function useApiFilterArgs<
  F extends FilterType,
>(): useApiFilterReturn<F> {
  const [rawParams, setRawParams] = useSearchParams();

  const setFilter = useCallback(
    (newFilter: F) => setRawParams(getStringifiedArgs(newFilter)),
    [setRawParams],
  );

  const filter = useMemo<F>(() => {
    if (rawParams.size == 0) {
      return {} as F;
    }

    const filter: { [key: string]: unknown } = {};

    rawParams.forEach((value, key) => {
      if (
        value != "true" &&
        value != "false" &&
        (/[^0-9,]/.test(value) || isNaN(parseFloat(value)))
      ) {
        filter[key] = value.includes(",") ? value.split(",") : [value];
      } else {
        if (value != undefined) {
          try {
            filter[key] = JSON.parse(value);
          } catch {
            filter[key] = `${value}`;
          }
        }
      }
    });

    return filter as F;
  }, [rawParams]);

  const searchParams = useMemo(() => {
    if (filter == undefined || Object.keys(filter).length == 0) {
      return {};
    }

    return getStringifiedArgs(filter);
  }, [filter]);

  return [filter, setFilter, searchParams];
}
