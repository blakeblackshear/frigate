import { FilterType } from "@/types/filter";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

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

export function useApiFilterArgs<F extends FilterType>(
  arrayKeys: string[],
  ignoredKeys?: string[],
): useApiFilterReturn<F> {
  const [rawParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const setFilter = useCallback(
    (newFilter: F) => {
      const stringifiedFilter = getStringifiedArgs(newFilter);

      // If ignoredKeys is provided, ignore params that aren't managed by this hook
      let updated: URLSearchParams;
      if (ignoredKeys) {
        updated = new URLSearchParams();

        // Keep params that aren't ignored by this hook
        rawParams.forEach((value, key) => {
          if (!ignoredKeys.includes(key)) {
            updated.set(key, value);
          }
        });

        // Add/update managed params from the new filter
        Object.entries(stringifiedFilter).forEach(([key, value]) => {
          updated.set(key, value);
        });
      } else {
        // Original behavior: replace all params
        updated = new URLSearchParams(stringifiedFilter);
      }

      // Use navigate to preserve the hash
      const search = updated.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
          hash: location.hash,
        },
        { replace: true },
      );
    },
    [rawParams, ignoredKeys, navigate, location.pathname, location.hash],
  );

  const filter = useMemo<F>(() => {
    if (rawParams.size == 0) {
      return {} as F;
    }

    const filter: { [key: string]: unknown } = {};

    // always treat these keys as string[], not as a number or event id
    const arrayKeySet = new Set(arrayKeys);

    rawParams.forEach((value, key) => {
      if (arrayKeySet.has(key)) {
        filter[key] = value.includes(",") ? value.split(",") : [value];
      } else {
        const isValidNumber = /^-?\d+(\.\d+)?(?!.)/.test(value);
        const isValidEventID = /^\d+\.\d+-[a-zA-Z0-9]+$/.test(value);

        if (
          value != "true" &&
          value != "false" &&
          !isValidNumber &&
          !isValidEventID
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
      }
    });

    return filter as F;
  }, [rawParams, arrayKeys]);

  const searchParams = useMemo(() => {
    if (filter == undefined || Object.keys(filter).length == 0) {
      return {};
    }

    return getStringifiedArgs(filter);
  }, [filter]);

  return [filter, setFilter, searchParams];
}
