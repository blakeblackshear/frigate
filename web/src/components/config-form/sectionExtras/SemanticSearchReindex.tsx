import { useState } from "react";
import axios from "axios";
import { Button, buttonVariants } from "@/components/ui/button";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SemanticSearchReindex() {
  const { t } = useTranslation("views/settings");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const onReindex = async () => {
    setIsLoading(true);
    try {
      const res = await axios.put("/reindex");
      if (res.status === 202) {
        toast.success(t("enrichments.semanticSearch.reindexNow.success"), {
          position: "top-center",
        });
      } else {
        toast.error(
          t("enrichments.semanticSearch.reindexNow.error", {
            errorMessage: res.statusText,
          }),
          { position: "top-center" },
        );
      }
    } catch (caught) {
      const error = caught as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const errorMessage =
        error.response?.data?.message || error.response?.data?.detail || "";
      toast.error(
        t("enrichments.semanticSearch.reindexNow.error", {
          errorMessage: errorMessage || undefined,
        }),
        { position: "top-center" },
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col space-y-1">
        <div className="flex">
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            disabled={isLoading}
            aria-label={t("enrichments.semanticSearch.reindexNow.label")}
          >
            {t("enrichments.semanticSearch.reindexNow.label")}
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <Trans ns="views/settings">
            enrichments.semanticSearch.reindexNow.desc
          </Trans>
        </div>

        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("enrichments.semanticSearch.reindexNow.confirmTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                <Trans ns="views/settings">
                  enrichments.semanticSearch.reindexNow.confirmDesc
                </Trans>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "select" })}
                onClick={async () => {
                  await onReindex();
                  setIsDialogOpen(false);
                }}
              >
                {t("enrichments.semanticSearch.reindexNow.confirmButton")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
