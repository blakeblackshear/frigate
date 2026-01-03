import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import {
  ReviewSegment,
  ThreatLevel,
  THREAT_LEVEL_LABELS,
} from "@/types/review";
import React, { useEffect, useMemo, useState } from "react";
import { isDesktop } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { MdAutoAwesome } from "react-icons/md";

type GenAISummaryChipProps = {
  review?: ReviewSegment;
};
export function GenAISummaryChip({ review }: GenAISummaryChipProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(review?.data?.metadata != undefined);
  }, [review]);

  return (
    <div
      className={cn(
        "absolute left-1/2 top-8 z-30 flex max-w-[90vw] -translate-x-[50%] cursor-pointer select-none items-center gap-2 rounded-full p-2 text-sm transition-all duration-500",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
        isDesktop
          ? "bg-card text-primary"
          : "bg-secondary-foreground text-white",
      )}
    >
      <MdAutoAwesome className="shrink-0" />
      <span className="truncate">{review?.data.metadata?.title}</span>
    </div>
  );
}

type GenAISummaryDialogProps = {
  review?: ReviewSegment;
  onOpen?: (open: boolean) => void;
  children: React.ReactNode;
};
export function GenAISummaryDialog({
  review,
  onOpen,
  children,
}: GenAISummaryDialogProps) {
  const { t } = useTranslation(["views/explore"]);

  // data

  const aiAnalysis = useMemo(() => review?.data?.metadata, [review]);
  const aiThreatLevel = useMemo(() => {
    if (
      !aiAnalysis ||
      (!aiAnalysis.potential_threat_level && !aiAnalysis.other_concerns)
    ) {
      return "None";
    }

    let concerns = "";
    const threatLevel = aiAnalysis.potential_threat_level ?? 0;

    if (threatLevel > 0) {
      let label = "";

      switch (threatLevel) {
        case ThreatLevel.NEEDS_REVIEW:
          label = t("needsReview", { ns: "views/events" });
          break;
        case ThreatLevel.SECURITY_CONCERN:
          label = t("securityConcern", { ns: "views/events" });
          break;
        default:
          label = THREAT_LEVEL_LABELS[threatLevel as ThreatLevel] || "Unknown";
      }
      concerns = `• ${label}\n`;
    }

    (aiAnalysis.other_concerns ?? []).forEach((c) => {
      concerns += `• ${c}\n`;
    });

    return concerns || "None";
  }, [aiAnalysis, t]);

  // layout

  const [open, setOpen] = useState(false);
  const Overlay = isDesktop ? Dialog : Drawer;
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;
  const Content = isDesktop ? DialogContent : DrawerContent;

  useEffect(() => {
    if (onOpen) {
      onOpen(open);
    }
  }, [open, onOpen]);

  if (!aiAnalysis) {
    return null;
  }

  return (
    <Overlay open={open} onOpenChange={setOpen}>
      <Trigger asChild>
        <div>{children}</div>
      </Trigger>
      <Content
        className={cn(
          "gap-2",
          isDesktop
            ? "sm:rounded-lg md:rounded-2xl"
            : "mx-4 rounded-lg px-4 pb-4 md:rounded-2xl",
        )}
      >
        {t("aiAnalysis.title")}
        <div className="text-sm text-primary/40">
          {t("details.title.label")}
        </div>
        <div className="text-sm">{aiAnalysis.title}</div>
        <div className="text-sm text-primary/40">
          {t("details.description.label")}
        </div>
        <div className="text-sm">{aiAnalysis.scene}</div>
        <div className="text-sm text-primary/40">
          {t("details.score.label")}
        </div>
        <div className="text-sm">{aiAnalysis.confidence * 100}%</div>
        <div className="text-sm text-primary/40">{t("concerns.label")}</div>
        <div className="text-sm">{aiThreatLevel}</div>
      </Content>
    </Overlay>
  );
}
