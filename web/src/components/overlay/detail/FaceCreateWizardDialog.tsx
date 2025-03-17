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
import axios from "axios";
import { useCallback, useState } from "react";
import { isDesktop } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { LuExternalLink } from "react-icons/lu";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const STEPS = ["Enter Face Name", "Upload Face Image", "Next Steps"];

type CreateFaceWizardDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  onFinish: () => void;
};
export default function CreateFaceWizardDialog({
  open,
  setOpen,
}: CreateFaceWizardDialogProps) {
  const { t } = useTranslation("views/faceLibrary");

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
      <Content>
        <Header>
          <Title>Add New Face</Title>
          <Description>
            Walk through adding a new face to the Face Library.
          </Description>
        </Header>
        <StepIndicator steps={STEPS} currentStep={step} />
        {step == 0 && (
          <TextEntry
            placeholder="Enter Face Name"
            onSave={(name) => {
              setName(name);
              setStep(1);
            }}
          >
            <div className="flex justify-end py-2">
              <Button variant="select" type="submit">
                {t("button.save", { ns: "common" })}
              </Button>
            </div>
          </TextEntry>
        )}
        {step == 1 && (
          <ImageEntry onSave={onUploadImage}>
            <div className="flex justify-end py-2">
              <Button variant="select" type="submit">
                {t("button.save", { ns: "common" })}
              </Button>
            </div>
          </ImageEntry>
        )}
        {step == 2 && (
          <div>
            {name} has successfully been added to the Face Library!
            <div className="text-s my-4 flex items-center text-secondary-foreground">
              <Link
                to="https://docs.frigate.video/configuration/face_recognition"
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                {t("classification.faceRecognition.readTheDocumentation", {
                  ns: "views/settings",
                })}{" "}
                to view more details on refining images for the Face Library
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
            <div className="flex justify-end">
              <Button variant="select" onClick={() => handleReset()}>
                Done
              </Button>
            </div>
          </div>
        )}
      </Content>
    </Overlay>
  );
}
