import { CustomClassificationModelConfig } from "@/types/frigateConfig";
import ModelSelectionView from "@/views/classification/ModelSelectionView";
import ModelTrainingView from "@/views/classification/ModelTrainingView";
import { useState } from "react";

export default function ClassificationModelPage() {
  // training

  const [model, setModel] = useState<CustomClassificationModelConfig>();

  if (model == undefined) {
    return <ModelSelectionView />;
  }

  return <ModelTrainingView />;
}
