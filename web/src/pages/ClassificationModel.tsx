import { useOverlayState } from "@/hooks/use-overlay-state";
import { CustomClassificationModelConfig } from "@/types/frigateConfig";
import ModelSelectionView from "@/views/classification/ModelSelectionView";
import ModelTrainingView from "@/views/classification/ModelTrainingView";

export default function ClassificationModelPage() {
  // training

  const [model, setModel] = useOverlayState<CustomClassificationModelConfig>(
    "classificationModel",
  );

  if (model == undefined) {
    return <ModelSelectionView onClick={setModel} />;
  }

  return <ModelTrainingView model={model} />;
}
