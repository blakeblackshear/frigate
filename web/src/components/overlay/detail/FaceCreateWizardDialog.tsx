import StepIndicator from "@/components/indicators/StepIndicator";
import ImageEntry from "@/components/input/ImageEntry";
import TextEntry from "@/components/input/TextEntry";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
} from "@/components/mobile/MobilePage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useCallback, useState } from "react";
import { isDesktop } from "react-device-detect";
import { Trans, useTranslation } from "react-i18next";
import { LuExternalLink } from "react-icons/lu";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useDocDomain } from "@/hooks/use-doc-domain";

const STEPS = ["steps.faceName", "steps.uploadFace", "steps.nextSteps"];

type CreateFaceWizardDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onFinish: () => void;
};
export default function CreateFaceWizardDialog({
  open,
  setOpen,
  onFinish,
}: CreateFaceWizardDialogProps) {
  const { t } = useTranslation("views/faceLibrary");
  const { getLocaleDocUrl } = useDocDomain();
  // wizard

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  const handleReset = useCallback(() => {
    setStep(0);
    setName("");
    setOpen(false);
  }, [setOpen]);

  // data handling

  const onUploadImage = useCallback(
    (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      axios
        .post(`faces/${name}/register`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((resp) => {
          if (resp.status == 200) {
            setStep(2);
            toast.success(t("toast.success.uploadedImage"), {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.uploadingImageFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [name, t],
  );

  // layout

  const Overlay = isDesktop ? Dialog : MobilePage;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Title = isDesktop ? DialogTitle : MobilePageTitle;
  const Description = isDesktop ? DialogDescription : MobilePageDescription;

  return (
    <Overlay
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleReset();
        }
      }}
    >
      <Content
        className={cn(
          "flex flex-col gap-4",
          isDesktop ? (step == 0 ? "max-w-xl" : "max-w-3xl") : "p-4",
        )}
      >
        <StepIndicator
          steps={STEPS}
          currentStep={step}
          translationNameSpace="views/faceLibrary"
          className="mb-4 justify-start"
          variant="dots"
        />
        <Header>
          <Title>{t("button.addFace")}</Title>
          {isDesktop && <Description>{t("description.addFace")}</Description>}
        </Header>

        {step == 0 && (
          <TextEntry
            placeholder={t("description.placeholder")}
            onSave={(name) => {
              setName(name);
              setStep(1);
            }}
            regexPattern={/^[\p{L}\p{N}\s'_-]{1,50}$/u}
            regexErrorMessage={t("description.invalidName")}
            forbiddenPattern={/#/}
            forbiddenErrorMessage={t("description.nameCannotContainHash")}
          >
            <div className="flex justify-end py-2">
              <Button variant="select" type="submit">
                {t("button.next", { ns: "common" })}
              </Button>
            </div>
          </TextEntry>
        )}
        {step == 1 && (
          <>
            <div className="px-8 py-2 text-center text-sm text-secondary-foreground">
              {t("steps.description.uploadFace", { name })}
            </div>
            <ImageEntry onSave={onUploadImage}>
              <div className="flex justify-end py-2">
                <Button variant="select" type="submit">
                  {t("button.next", { ns: "common" })}
                </Button>
              </div>
            </ImageEntry>
          </>
        )}
        {step == 2 && (
          <div className="mt-2">
            {t("toast.success.addFaceLibrary", { name })}
            <p className="py-4 text-sm text-primary-variant">
              <ul className="list-inside list-disc">
                <Trans ns="views/faceLibrary">
                  createFaceLibrary.nextSteps
                </Trans>
              </ul>
            </p>
            <div className="my-2 flex items-center text-sm text-primary">
              <Link
                to={getLocaleDocUrl("configuration/face_recognition")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                {t("readTheDocumentation", { ns: "common" })}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
            <div className="flex justify-end">
              <Button
                variant="select"
                onClick={() => {
                  onFinish();
                  handleReset();
                }}
              >
                {t("button.done", { ns: "common" })}
              </Button>
            </div>
          </div>
        )}
      </Content>
    </Overlay>
  );
}
