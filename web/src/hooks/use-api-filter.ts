import { FilterType } from "@/types/filter";
import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  }, [filter]);

  return [filter, setFilter, searchParams];
}

export function useApiFilterArgs<
  F extends FilterType,
>(): useApiFilterReturn<F> {
  const location = useLocation();
  const navigate = useNavigate();

  const setFilter = useCallback(
    (filter: F) => {
      let search = "";

      Object.entries(filter).forEach(([key, value]) => {
        let char = "";
        if (search.length == 0) {
          char = "?";
        } else {
          char = "&";
        }

        if (Array.isArray(value)) {
          if (value.length == 0) {
            // empty array means all so ignore
          } else {
            search += `${char}${key}=${value.join(",")}`;
          }
        } else {
          if (value != undefined) {
            search += `${char}${key}=${value}`;
          }
        }
      });

      navigate(`${location.pathname}${search}`, { ...location.state });
    },
    [location, navigate],
  );

  const filter = useMemo<F>(() => {
    const search = location?.search?.substring(1);

    if (search == undefined || search.length == 0) {
      return {} as F;
    }

    const filter: { [key: string]: unknown } = {};

    search.split("&").forEach((full) => {
      const [key, value] = full.split("=");

      if (isNaN(parseFloat(value))) {
        filter[key] = value.includes(",") ? value.split(",") : [value];
      } else {
        if (value != undefined) {
          filter[key] = `${value}`;
        }
      }
    });

    return filter as F;
  }, [location?.search]);

  const searchParams = useMemo(() => {
    if (filter == undefined || Object.keys(filter).length == 0) {
      return {};
    }

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
  }, [filter]);

  return [filter, setFilter, searchParams];
}
