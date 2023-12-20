import { useState } from "react";

type useApiFilterReturn<F extends FilterType> = [
  filter: F | undefined,
  setFilter: (filter: F) => void,
  searchParams: {
    [key: string]: any;
  },
];

export default function useApiFilter<
  F extends FilterType,
>(): useApiFilterReturn<F> {
  const [filter, setFilter] = useState<F>();

  return [filter, setFilter, {}];
}
