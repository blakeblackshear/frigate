import type { TFunction } from "i18next";
import { sectionConfigs } from "@/components/config-form/sectionConfigs";
import type {
  ConditionalMessage,
  MessageConditionContext,
} from "@/components/config-form/section-configs/types";
import { settingsLink } from "@/components/config-form/sectionPages";
import type { ConfigSectionData } from "@/types/configForm";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { HealthProblem } from "@/types/health";
import { getSectionConfig } from "@/utils/configUtil";
import { activeCameras } from "@/utils/health";

function healthMessages(
  section: string,
  level: "global" | "camera",
): ConditionalMessage[] {
  const config = getSectionConfig(section, level);
  return [...(config.messages ?? []), ...(config.fieldMessages ?? [])].filter(
    (message) => message.health,
  );
}

function isActive(
  message: ConditionalMessage,
  ctx: MessageConditionContext,
): boolean {
  if (!message.condition(ctx)) {
    return false;
  }

  return typeof message.health === "function" ? message.health(ctx) : true;
}

function toProblem(
  message: ConditionalMessage,
  section: string,
  ctx: MessageConditionContext,
  scope: string | undefined,
  scopeIsCamera: boolean,
  idSuffix: string,
  t: TFunction,
): HealthProblem {
  return {
    id: `config:${section}:${message.key}:${idSuffix}`,
    source: "config",
    severity: message.severity,
    scope,
    scopeIsCamera,
    text: t(message.messageKey, {
      ns: "views/settings",
      ...(message.values ?? {}),
    }),
    docLink: message.docLink,
    link: settingsLink(section, ctx.level, ctx.cameraName),
  };
}

/**
 * Evaluate every config message flagged for the Health tab against the saved,
 * resolved config. The rules stay in the section configs, so the settings
 * form and the Health tab can never disagree.
 */
export function evaluateConfigHealth(
  config: FrigateConfig,
  t: TFunction,
): HealthProblem[] {
  const problems: HealthProblem[] = [];
  const firedGlobally = new Set<string>();
  const cameras = activeCameras(config);
  const record = config as unknown as Record<string, unknown>;

  Object.keys(sectionConfigs).forEach((section) => {
    const globalMessages = healthMessages(section, "global");

    if (globalMessages.length > 0) {
      const sectionData = record[section];
      // models is a list; every other section is one object
      const items: {
        formData: ConfigSectionData;
        scope?: string;
        idSuffix: string;
      }[] =
        section === "models" && Array.isArray(sectionData)
          ? sectionData.map((model, index) => ({
              formData: model as ConfigSectionData,
              scope: t(
                `detectionModels.scenes.${(model as { scene?: string }).scene || "all"}`,
                { ns: "views/settings" },
              ),
              idSuffix: `model${index}`,
            }))
          : [
              {
                formData: (sectionData ?? {}) as ConfigSectionData,
                idSuffix: "global",
              },
            ];

      items.forEach(({ formData, scope, idSuffix }) => {
        const ctx: MessageConditionContext = {
          fullConfig: config,
          level: "global",
          formData,
        };
        globalMessages
          .filter((message) => isActive(message, ctx))
          .forEach((message) => {
            const problem = toProblem(
              message,
              section,
              ctx,
              scope,
              false,
              idSuffix,
              t,
            );
            firedGlobally.add(`${section}:${message.key}:${problem.text}`);
            problems.push(problem);
          });
      });
    }

    const cameraMessages = healthMessages(section, "camera");

    if (cameraMessages.length > 0) {
      cameras.forEach((camera) => {
        const cameraRecord = camera as unknown as Record<string, unknown>;
        const sectionData = cameraRecord[section] ?? {};
        const ctx: MessageConditionContext = {
          fullConfig: config,
          fullCameraConfig: camera,
          level: "camera",
          cameraName: camera.name,
          formData: sectionData as ConfigSectionData,
        };
        cameraMessages
          .filter((message) => isActive(message, ctx))
          .forEach((message) => {
            const problem = toProblem(
              message,
              section,
              ctx,
              camera.name,
              true,
              camera.name,
              t,
            );

            // cameras inherit global values, so a problem the global row
            // already states word for word would repeat once per camera
            if (
              !firedGlobally.has(`${section}:${message.key}:${problem.text}`)
            ) {
              problems.push(problem);
            }
          });
      });
    }
  });

  return problems;
}
