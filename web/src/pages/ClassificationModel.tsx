import { FrigateConfig } from "@/types/frigateConfig";
import ModelSelectionView from "@/views/classification/ModelSelectionView";
import ModelTrainingView from "@/views/classification/ModelTrainingView";
import { useState } from "react";
import useSWR from "swr";

export default function ClassificationModelPage() {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  // training

  const [model, setModel] = useState();

  if (model == undefined) {
    return <ModelSelectionView />;
  }

  return <ModelTrainingView />;
}
