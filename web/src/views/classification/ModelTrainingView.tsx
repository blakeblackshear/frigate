import Heading from "@/components/ui/heading";
import { CustomClassificationModelConfig } from "@/types/frigateConfig";

type ModelTrainingViewProps = {
  model: CustomClassificationModelConfig;
};
export default function ModelTrainingView({ model }: ModelTrainingViewProps) {
  return (
    <div className="flex size-full flex-col p-2">
      <Heading className="smart-capitalize" as="h3">
        {model.name} ({model.state_config != null ? "State" : "Object"}{" "}
        Classification)
      </Heading>
    </div>
  );
}
