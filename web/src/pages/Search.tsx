import SearchFilterGroup from "@/components/filter/SearchFilterGroup";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { LuSearchCheck } from "react-icons/lu";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="flex size-full flex-col pt-2 md:py-2">
      <Toaster closeButton={true} />

      <div className="relative mb-2 flex h-11 items-center justify-between pl-2 pr-2 md:pl-3">
        <Input
          className="w-full bg-muted md:w-1/3"
          placeholder="Search for a specific detection..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
              />

              <SearchFilterGroup />
      </div>

      <div className="no-scrollbar flex flex-1 flex-wrap content-start gap-2 overflow-y-auto md:gap-4">
        {searchTerm == "" && (
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
            <LuSearchCheck className="size-16" />
            Search For Detections
          </div>
        )}
      </div>
    </div>
  );
}
