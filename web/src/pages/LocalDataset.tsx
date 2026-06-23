import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import LocalDatasetView from "@/views/localDataset/LocalDatasetView";

export default function LocalDataset() {
  const { t } = useTranslation("views/localDataset");

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  return <LocalDatasetView />;
}
