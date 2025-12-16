import { ExportFilter, ExportFilters } from "@/types/export";

type ExportFilterGroupProps = {
  className: string;
  filters?: ExportFilters[];
  filter?: ExportFilter;
  onUpdateFilter: (filter: ExportFilter) => void;
};
export default function ExportFilterGroup({
  className,
  filter,
  filters,
  onUpdateFilter,
}: ExportFilterGroupProps) {
  return <div></div>;
}
