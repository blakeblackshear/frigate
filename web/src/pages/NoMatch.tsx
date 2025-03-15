import Heading from "@/components/ui/heading";
import { t } from "i18next";
import { useEffect } from "react";

function NoMatch() {
  useEffect(() => {
    document.title = t("notFound.documentTitle");
  }, []);

  return (
    <>
      <Heading as="h2">{t("notFound.title")}</Heading>
      <p>{t("notFound.desc")}</p>
    </>
  );
}

export default NoMatch;
