import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LuPaperclip } from "react-icons/lu";
import { useApiHost } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EVENT_ID_RE = /^[A-Za-z0-9._-]+$/;

type ChatPaperclipButtonProps = {
  recentEventIds: string[];
  onAttach: (eventId: string) => void;
  disabled?: boolean;
};

/**
 * Paperclip button with a popover for picking an event to attach.
 * Shows a grid of recent thumbnails (from the latest assistant message) and a
 * "paste event ID" fallback input.
 */
export function ChatPaperclipButton({
  recentEventIds,
  onAttach,
  disabled = false,
}: ChatPaperclipButtonProps) {
  const apiHost = useApiHost();
  const { t } = useTranslation(["views/chat"]);
  const [open, setOpen] = useState(false);
  const [pasteId, setPasteId] = useState("");

  const handlePickThumbnail = (eventId: string) => {
    onAttach(eventId);
    setOpen(false);
    setPasteId("");
  };

  const handlePasteSubmit = () => {
    const trimmed = pasteId.trim();
    if (!trimmed || !EVENT_ID_RE.test(trimmed)) return;
    onAttach(trimmed);
    setOpen(false);
    setPasteId("");
  };

  const handlePasteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handlePasteSubmit();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          disabled={disabled}
          aria-label={t("attachment_picker_placeholder")}
        >
          <LuPaperclip className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="flex flex-col gap-3">
          {recentEventIds.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {recentEventIds.slice(0, 8).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handlePickThumbnail(id)}
                  className="relative aspect-square overflow-hidden rounded-md ring-offset-background hover:ring-2 hover:ring-primary"
                  aria-label={t("attach_event_aria", { eventId: id })}
                >
                  <img
                    className="size-full object-cover"
                    src={`${apiHost}api/events/${id}/thumbnail.webp`}
                    alt=""
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder={t("attachment_picker_paste_label")}
              value={pasteId}
              onChange={(e) => setPasteId(e.target.value)}
              onKeyDown={handlePasteKeyDown}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="select"
              className="h-8"
              disabled={!pasteId.trim() || !EVENT_ID_RE.test(pasteId.trim())}
              onClick={handlePasteSubmit}
            >
              {t("attachment_picker_attach")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
