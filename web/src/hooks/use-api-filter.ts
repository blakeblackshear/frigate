import { FilterType } from "@/types/filter";
import { useMemo, useState } from "react";

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
