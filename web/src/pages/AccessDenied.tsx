import Heading from "@/components/ui/heading";
import { t } from "i18next";
import { useEffect } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

export default function AccessDenied() {
  useEffect(() => {
    document.title = t("accessDenied.documentTitle");
  }, []);

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
