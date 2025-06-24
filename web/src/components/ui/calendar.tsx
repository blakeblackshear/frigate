import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { useDateLocale } from "@/hooks/use-date-locale";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const locale = useDateLocale();

  return (
    <DayPicker
      locale={locale}
      navLayout={"around"}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "relative",
        month_caption: "flex justify-center pt-1 relative items-center",
        month_grid: "w-full border-collapse space-y-1 mt-4",
        caption_label: "text-sm font-medium",
        nav: "flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 absolute top-0 left-1 bg-transparent fill-primary p-0 opacity-50 hover:opacity-100 z-10",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 absolute top-0 right-1 bg-transparent fill-primary p-0 opacity-50 hover:opacity-100 z-10",
        ),
        weeks: "w-full border-collapse",
        weekdays: "flex justify-center",
        weekday:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2 justify-center",
        day: "h-9 w-9 text-center text-sm p-0 relative aria-selected:opacity-100 first:aria-selected:rounded-l-md last:aria-selected:rounded-r-md",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-muted-foreground focus-within:relative focus-within:z-20",
        ),
        range_start:
          "day-range-start !bg-accent rounded-l-md [&>button]:bg-selected [&>button]:text-white [&>button]:hover:bg-selected [&>button]:hover:text-white",
        range_end:
          "day-range-end !bg-accent rounded-r-md [&>button]:bg-selected [&>button]:text-white [&>button]:hover:bg-selected [&>button]:hover:text-white",
        selected: cn(
          props.mode === "range"
            ? " [&>button]:hover:bg-selected [&>button]:hover:text-white focus:bg-selected focus:text-white  [&>button]:aria-selected:text-primary"
            : " [&>button]:bg-selected [&>button]:text-white  [&>button]:hover:bg-selected  [&>button]:hover:text-white focus:bg-selected focus:text-white rounded-md",
        ),
        today: "bg-muted text-muted-foreground !rounded-md",
        outside:
          "day-outside text-muted-foreground opacity-50 !aria-selected:bg-accent/50 !aria-selected:text-muted-foreground !aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) =>
          props.orientation === "left" ? (
            <ChevronLeft {...props} className="h-4 w-4" />
          ) : (
            <ChevronRight {...props} className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
