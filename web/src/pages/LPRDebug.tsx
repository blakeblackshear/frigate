import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import LPRDetailDialog from "@/components/overlay/dialog/LPRDetailDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FrigateConfig } from "@/types/frigateConfig";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import useSWR from "swr";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { LuArrowDownUp, LuTrash2, LuArrowLeft, LuArrowRight } from "react-icons/lu";
import axios, { AxiosResponse, AxiosError } from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function LPRDebug() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [sortBy, setSortBy] = useState<string>("time_desc");
  const [activeTab, setActiveTab] = useState<string>("other");
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 100;

  // Set document title
  useEffect(() => {
    document.title = "LPR - Frigate";
  }, []);

  // Fetch LPR data
  const { data: lprData, mutate: refreshLPR } = useSWR("lpr/debug");

  const { categorizedAttempts, plateCounts, eventScores } = useMemo(() => {
    const attempts = Object.keys(lprData || {}).filter(attempt => attempt !== "train");
    const plateMap = new Map<string, string[]>();
    const categorized: Record<string, string[]> = {
      car_frame: [],
      license_plate_frame: [],
      license_plate_classified: [],
      license_plate_rotated: [],
      license_plate_resized: [],
      lpr_post: [],
      other: []
    };

    const scores = new Map<string, number>();

    // First pass: Categorize plates and count occurrences
    attempts.forEach(attempt => {
      const parts = attempt.split('_');
      
      // Handle plate files specially
      if (attempt.startsWith("plate_") && parts.length >= 6) {
        const plate = parts[2];
        if (!plateMap.has(plate)) {
          plateMap.set(plate, []);
        }
        plateMap.get(plate)?.push(attempt);
        scores.set(attempt, parseFloat(parts[3]) || 0);
        return;
      }

      // Regular categorization based on prefixes
      let categorized_type = 'other';
      if (attempt.startsWith('car_frame')) {
        categorized_type = 'car_frame';
      } else if (attempt.startsWith('license_plate_frame')) {
        categorized_type = 'license_plate_frame';
      } else if (attempt.startsWith('license_plate_classified')) {
        categorized_type = 'license_plate_classified';
      } else if (attempt.startsWith('license_plate_rotated')) {
        categorized_type = 'license_plate_rotated';
      } else if (attempt.startsWith('license_plate_resized')) {
        categorized_type = 'license_plate_resized';
      } else if (attempt.startsWith('lpr_post')) {
        categorized_type = 'lpr_post';
      }
      
      categorized[categorized_type].push(attempt);
    });

    // Second pass: Move plates to categorized buckets
    plateMap.forEach((attempts, plate) => {
      categorized[plate] = attempts; // Create tab for multi-occurrence plates
    });

    return {
      categorizedAttempts: categorized,
      plateCounts: Object.fromEntries(plateMap),
      eventScores: scores
    };
  }, [lprData]);

  // Function to extract timestamp from filename
  const getTimestamp = (attempt: string) => {
    const parts = attempt.split("_");
    const timePart = parts[parts.length - 1].split(".")[0];
    return parseInt(timePart, 10) || 0;
  };

  const sortedAttempts = useMemo(() => {
    const attemptsToSort = categorizedAttempts[activeTab] || [];
    return attemptsToSort.sort((a, b) => {
      const scoreA = eventScores.get(a) || 0;
      const scoreB = eventScores.get(b) || 0;
      const aTime = getTimestamp(a);
      const bTime = getTimestamp(b);

      switch (sortBy) {
        case "score_desc":
          return scoreB - scoreA;
        case "score_asc":
          return scoreA - scoreB;
        case "time_desc":
          return bTime - aTime;
        case "time_asc":
          return aTime - bTime;
        default:
          return 0;
      }
    });
  }, [categorizedAttempts, activeTab, sortBy, eventScores]);

  // Calculate the current items to display based on pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedAttempts.slice(indexOfFirstItem, indexOfLastItem);

  // Calculate total pages
  const totalPages = Math.ceil(sortedAttempts.length / itemsPerPage);

  // Move handleDeleteAll below the currentItems declaration
  const handleDeleteAll = useCallback(() => {
    const attemptsToDelete = currentItems; // Only delete current page items
    axios
      .post(`/lpr/debug/delete`, { ids: attemptsToDelete })
      .then((resp: AxiosResponse) => {
        if (resp.status === 200) {
          toast.success(`Successfully deleted all images on this page.`, {
            position: "top-center",
          });
          refreshLPR();
          // Check if the current tab is empty and reset to default tab if necessary
          if (categorizedAttempts[activeTab].length === 0) {
            setActiveTab("other"); // Reset to default tab
          }
        }
      })
      .catch((error: AxiosError) => {
        if (error.response?.data?.message) {
          toast.error(`Failed to delete: ${error.response.data.message}`, {
            position: "top-center",
          });
        } else {
          toast.error(`Failed to delete: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [activeTab, refreshLPR, categorizedAttempts, currentItems]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />
      <div className="relative mb-2 flex h-11 w-full items-center justify-between">
        <ScrollArea className="w-full whitespace-nowrap">
          <div ref={tabsRef} className="flex flex-row">
            <ToggleGroup
              className="*:rounded-md *:px-3 *:py-4"
              type="single"
              size="sm"
              value={activeTab}
              onValueChange={(value: string) => {
                if (value) {
                  setActiveTab(value);
                }
              }}
            >
              {Object.keys(categorizedAttempts)
                .filter(k => categorizedAttempts[k].length > 0)
                .map((key) => (
                  <ToggleGroupItem
                    key={key}
                    value={key}
                    className={`flex scroll-mx-10 items-center justify-between gap-2 ${activeTab === key ? "" : "*:text-muted-foreground"}`}
                    data-nav-item={key}
                    aria-label={`Select ${key}`}
                  >
                    <div className="capitalize">
                      {key.replace(/_/g, ' ')}
                      {plateCounts[key]?.length > 1 && ` (${plateCounts[key].length})`}
                    </div>
                  </ToggleGroupItem>
                ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        <div className="flex items-center justify-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex gap-2" variant={sortBy !== "time_desc" ? "select" : "default"}>
                <LuArrowDownUp className="size-5" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSortBy("score_desc")} className={sortBy === "score_desc" ? "bg-accent" : ""}>
                Ascending Score
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("score_asc")} className={sortBy === "score_asc" ? "bg-accent" : ""}>
                Descending Score
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("time_desc")} className={sortBy === "time_desc" ? "bg-accent" : ""}>
                Most Recent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("time_asc")} className={sortBy === "time_asc" ? "bg-accent" : ""}>
                Oldest First
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Move Delete All Button below the tabs */}
      <div className="mb-2">
        <Button onClick={handleDeleteAll} variant="destructive">
          Delete All
        </Button>
      </div>

      {/* Grid Display */}
      <div className="scrollbar-container grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 overflow-y-auto">
        {currentItems.map((attempt: string) => (
          <LPRAttempt 
            key={attempt} 
            attempt={attempt} 
            config={config} 
            onRefresh={refreshLPR}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
            disabled={currentPage === 1}
            className="p-2"
          >
            <LuArrowLeft className="text-gray-600" />
          </button>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
            disabled={currentPage === totalPages}
            className="p-2"
          >
            <LuArrowRight className="text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

type LPRAttemptProps = {
  attempt: string;
  config: FrigateConfig;
  onRefresh: () => void;
};

function LPRAttempt({ attempt, config, onRefresh }: LPRAttemptProps) {
  const [showDialog, setShowDialog] = useState(false);
  const data = useMemo(() => {
    const parts = attempt.split("_");
    let plate = "Text not extracted";
    let score = "0";
    let filenameTimestamp = 0;

    // Handle different filename patterns
    if (attempt.startsWith("plate_") && parts.length >= 6) {
      // plate_{original_idx}_{plate}_{average_confidence}_{area}_{current_time}.jpg
      plate = parts[2] || "Text not extracted";
      score = parts[3] || "0";
    }

    const timePart = parts[parts.length - 1].split(".")[0];
    filenameTimestamp = parseInt(timePart, 10) || 0;

    return {
      plate,
      score,
      timestamp: filenameTimestamp,
    };
  }, [attempt]);

  const formattedTimestamp = useFormattedTimestamp(
    data.timestamp,
    "%Y-%m-%d %H:%M:%S", // Format to include HH:MM:SS
    config?.ui.timezone,
  );

  const onDelete = useCallback(() => {
    axios
      .post(`/lpr/debug/delete`, { ids: [attempt] })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(`Successfully deleted LPR debug image.`, {
            position: "top-center",
          });
          onRefresh();
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(`Failed to delete: ${error.response.data.message}`, {
            position: "top-center",
          });
        } else {
          toast.error(`Failed to delete: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [attempt, onRefresh]);

  return (
    <>
      <LPRDetailDialog
        open={showDialog}
        setOpen={setShowDialog}
        config={config}
        lprImage={attempt}
        rawImage={`raw_${attempt.split("_").slice(2).join("_").replace(".jpg", "")}.jpg`}
      />

      <div className="relative flex flex-col rounded-lg">
        <div 
          className="w-full overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground cursor-pointer"
          onClick={() => setShowDialog(true)}
        >
          <div className="aspect-[2/1] flex items-center justify-center bg-black">
            <img 
              className="h-40 max-w-none" 
              src={`${baseUrl}clips/lpr/${attempt}`} 
            />
          </div>
        </div>
        <div className="flex w-full grow items-center justify-between rounded-b-lg border border-t-0 bg-card p-3 text-card-foreground">
          <div className="flex flex-col items-start text-xs text-primary-variant">
            <div className="capitalize">{data.plate}</div>
            <div className={cn(
              "font-semibold",
              Number(data.score) >= (config?.lpr?.threshold || 0.8) * 100
                ? "text-success"
                : "text-danger"
            )}>
              {data.score === "0" || !data.score ? "No score" : `${data.score}%`}
            </div>
            <div className="text-xs text-muted-foreground">
              {formattedTimestamp}
            </div>
          </div>
          <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
            <Tooltip>
              <TooltipTrigger>
                <LuTrash2
                  className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                  onClick={onDelete}
                />
              </TooltipTrigger>
              <TooltipContent>Delete Image</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  );
} 