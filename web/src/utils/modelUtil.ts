import { DetectionModelConfig, FrigateConfig } from "@/types/frigateConfig";

/**
 * The model a camera runs on, matched by the camera's detect scene.
 *
 * Falls back to the model for every scene, then to the only configured model,
 * which is what the backend does when a camera does not name a scene.
 */
export function getModelForCamera(
  config?: FrigateConfig,
  camera?: string,
): DetectionModelConfig | undefined {
  const models = config?.models;

  if (!models?.length) {
    return undefined;
  }

  const scene = camera ? config?.cameras?.[camera]?.detect?.scene : undefined;

  if (scene) {
    const match = models.find((model) => model.scene == scene);

    if (match) {
      return match;
    }
  }

  return models.find((model) => model.scene == "all") ?? models[0];
}

/** The model used when the question is not about a specific camera. */
export function getPrimaryModel(
  config?: FrigateConfig,
): DetectionModelConfig | undefined {
  return getModelForCamera(config);
}

/** Every object attribute across all configured models. */
export function getAllAttributes(config?: FrigateConfig): string[] {
  const attributes = new Set<string>();

  config?.models?.forEach((model) =>
    model.all_attributes?.forEach((attribute) => attributes.add(attribute)),
  );

  return [...attributes];
}

/** Whether a label is an attribute of any configured model. */
export function isAttributeLabel(
  config: FrigateConfig | undefined,
  label: string,
): boolean {
  return !!config?.models?.some((model) =>
    model.all_attributes?.includes(label),
  );
}

/** Whether an attribute belongs to a parent label in any configured model. */
export function isAttributeOfLabel(
  config: FrigateConfig | undefined,
  label: string,
  attribute: string,
): boolean {
  return !!config?.models?.some((model) =>
    model.attributes_map?.[label]?.includes(attribute),
  );
}
