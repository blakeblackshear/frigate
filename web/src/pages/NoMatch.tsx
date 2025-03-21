import Heading from "@/components/ui/heading";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

function NoMatch() {
  const { t } = useTranslation(["common"]);
  useEffect(() => {
    document.title = t("notFound.documentTitle");
  }, [t]);

  return (
    <>
      <Heading as="h2">{t("notFound.title")}</Heading>
      <p>{t("notFound.desc")}</p>
    </>
  );
}

export default NoMatch;
