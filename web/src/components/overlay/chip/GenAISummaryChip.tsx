import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { ReviewSegment, ThreatLevel } from "@/types/review";
import { useEffect, useMemo, useState } from "react";
import { isDesktop } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { MdAutoAwesome } from "react-icons/md";

type GenAISummaryChipProps = {
  review?: ReviewSegment;
  onClick: () => void;
};
export function GenAISummaryChip({ review, onClick }: GenAISummaryChipProps) {
  if (!review?.data?.metadata) {
    return null;
  }

  return (
    <div
      className="absolute left-1/2 top-8 z-30 flex max-w-[90vw] -translate-x-[50%] cursor-pointer select-none items-center gap-2 rounded-full bg-card p-2 text-sm"
      onClick={onClick}
    >
      <MdAutoAwesome className="shrink-0" />
      <span className="truncate">{review.data.metadata.title}</span>
    </div>
  );
}

type GenAISummaryDialogProps = {
  review?: ReviewSegment;
  onOpen?: (open: boolean) => void;
};
export function GenAISummaryDialog({
  review,
  onOpen,
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
    switch (aiAnalysis.potential_threat_level) {
      case ThreatLevel.SUSPICIOUS:
        concerns = `• ${t("suspiciousActivity", { ns: "views/events" })}\n`;
        break;
      case ThreatLevel.DANGER:
        concerns = `• ${t("threateningActivity", { ns: "views/events" })}\n`;
        break;
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
        <GenAISummaryChip review={review} onClick={() => setOpen(true)} />
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
