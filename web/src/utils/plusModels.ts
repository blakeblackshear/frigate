/** Matching Frigate+ models against the hardware that can run them. */

type PlusModel = {
  supportedDetectors: string[];
  // which Hailo device a Hailo model was built for, absent on every other model
  hailoDevice?: string;
};

/**
 * The detectors to show for a model.
 *
 * Every Hailo model supports the one hailo detector, so the device it was
 * built for is what the user needs to see.
 */
export function describeSupportedDetectors(model: PlusModel): string {
  return model.hailoDevice ?? model.supportedDetectors.join(", ");
}
