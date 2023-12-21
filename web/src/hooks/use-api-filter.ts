import { useMemo, useState } from "react";

type useApiFilterReturn<F extends FilterType> = [
  filter: F | undefined,
  setFilter: (filter: F) => void,
  searchParams:
    | {
        [key: string]: any;
      }
    | undefined,
];

export default function useApiFilter<
  F extends FilterType,
>(): useApiFilterReturn<F> {
  const [filter, setFilter] = useState<F | undefined>(undefined);
  const searchParams = useMemo(() => {
    if (filter == undefined) {
      return undefined;
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
