import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { useTranslation } from "react-i18next";
import { FaFilm } from "react-icons/fa6";

type ActionsDropdownProps = {
  onDebugReplayClick: () => void;
  onExportClick: () => void;
  onShareTimestampClick: () => void;
};

export default function ActionsDropdown({
  onDebugReplayClick,
  onExportClick,
  onShareTimestampClick,
}: Readonly<ActionsDropdownProps>) {
  const { t } = useTranslation(["components/dialog", "views/replay", "common"]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          className="flex items-center gap-2"
          aria-label={t("menu.actions", { ns: "common" })}
          size="sm"
        >
          <FaFilm className="size-5 text-secondary-foreground" />
          <div className="text-primary">
            {t("menu.actions", { ns: "common" })}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportClick}>
          {t("menu.export", { ns: "common" })}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShareTimestampClick}>
          {t("button.shareTimestamp", { ns: "common" })}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDebugReplayClick}>
          {t("title", { ns: "views/replay" })}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
