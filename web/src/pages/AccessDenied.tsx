import Heading from "@/components/ui/heading";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FaExclamationTriangle } from "react-icons/fa";

export default function AccessDenied() {
  const { t } = useTranslation(["common"]);
  useEffect(() => {
    document.title = t("accessDenied.documentTitle");
  }, [t]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <FaExclamationTriangle className="mb-4 size-8" />
      <Heading as="h2" className="mb-2">
        {t("accessDenied.title")}
      </Heading>
      <p className="text-primary-variant">{t("accessDenied.desc")}</p>
    </div>
  );
}
