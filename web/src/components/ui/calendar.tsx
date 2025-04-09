import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { Locale, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import i18n from "@/utils/i18n";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

// Map of locale codes to dynamic import functions
const localeMap: Record<string, () => Promise<Locale>> = {
  "zh-CN": () => import("date-fns/locale/zh-CN").then((module) => module.zhCN),
  es: () => import("date-fns/locale/es").then((module) => module.es),
  hi: () => import("date-fns/locale/hi").then((module) => module.hi),
  fr: () => import("date-fns/locale/fr").then((module) => module.fr),
  ar: () => import("date-fns/locale/ar").then((module) => module.ar),
  pt: () => import("date-fns/locale/pt").then((module) => module.pt),
  ru: () => import("date-fns/locale/ru").then((module) => module.ru),
  de: () => import("date-fns/locale/de").then((module) => module.de),
  ja: () => import("date-fns/locale/ja").then((module) => module.ja),
  tr: () => import("date-fns/locale/tr").then((module) => module.tr),
  it: () => import("date-fns/locale/it").then((module) => module.it),
  nl: () => import("date-fns/locale/nl").then((module) => module.nl),
  sv: () => import("date-fns/locale/sv").then((module) => module.sv),
  cs: () => import("date-fns/locale/cs").then((module) => module.cs),
  nb: () => import("date-fns/locale/nb").then((module) => module.nb),
  ko: () => import("date-fns/locale/ko").then((module) => module.ko),
  vi: () => import("date-fns/locale/vi").then((module) => module.vi),
  fa: () => import("date-fns/locale/fa-IR").then((module) => module.faIR),
  pl: () => import("date-fns/locale/pl").then((module) => module.pl),
  uk: () => import("date-fns/locale/uk").then((module) => module.uk),
  he: () => import("date-fns/locale/he").then((module) => module.he),
  el: () => import("date-fns/locale/el").then((module) => module.el),
  ro: () => import("date-fns/locale/ro").then((module) => module.ro),
  hu: () => import("date-fns/locale/hu").then((module) => module.hu),
  fi: () => import("date-fns/locale/fi").then((module) => module.fi),
  da: () => import("date-fns/locale/da").then((module) => module.da),
  sk: () => import("date-fns/locale/sk").then((module) => module.sk),
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const [locale, setLocale] = useState<Locale>(enUS);

  useEffect(() => {
    const loadLocale = async () => {
      if (i18n.language === "en") {
        setLocale(enUS);
        return;
      }

      const localeLoader = localeMap[i18n.language];
      if (localeLoader) {
        const loadedLocale = await localeLoader();
        setLocale(loadedLocale);
      } else {
        setLocale(enUS);
      }
    };
    loadLocale();
  }, [i18n.language]);

  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex justify-center",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2 justify-center",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-selected text-white hover:bg-selected hover:text-white focus:bg-selected focus:text-white",
        day_today: "bg-muted text-muted-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
