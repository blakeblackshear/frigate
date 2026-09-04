import type { TFunction } from "i18next";
import type { StreamCheckResults } from "@/hooks/use-health-checks";
import type { StreamRole } from "@/types/cameraWizard";
import { inferCameraBrand } from "@/types/cameraWizard";
import type { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import type { HealthProblem } from "@/types/health";
import {
  getStreamIssues,
  lastErrorLine,
  resolveRestreamSource,
  type StreamIssue,
} from "@/utils/streamIssues";

// rules the add camera wizard shows that do not belong on the Health tab
const WIZARD_ONLY_RULES = new Set(["restream", "reolink-rtsp", "reolink-http"]);

/**
 * Whether the record output keeps the camera's audio codec. The default
 * preset transcodes to AAC, so a non-AAC source only matters when the args
 * copy audio through.
 */
function recordCopiesAudio(camera: CameraConfig): boolean {
  const args = camera.ffmpeg.output_args?.record;
  const text = Array.isArray(args) ? args.join(" ") : (args ?? "");
  return (
    text === "preset-record-generic-audio-copy" ||
    /(^|\s)-(c:a|acodec)\s+copy(\s|$)/.test(text)
  );
}

export type StreamHealth = {
  problems: HealthProblem[];
  /** enabled cameras the results cover */
  checked: number;
  /** cameras with no stream problem */
  clean: number;
};

/** Turn one stream check run into notice rows plus the counts a summary needs. */
export function streamHealth(
  config: FrigateConfig,
  results: StreamCheckResults | undefined,
  t: TFunction,
): StreamHealth {
  const problems: HealthProblem[] = [];
  let checked = 0;
  let clean = 0;

  if (!results) {
    return { problems, checked, clean };
  }

  Object.entries(results.byCamera).forEach(([name, check]) => {
    const camera = config.cameras[name];
    if (!camera || !camera.enabled) {
      return;
    }
    checked += 1;
    const link = `/settings?page=cameraFfmpeg&camera=${encodeURIComponent(name)}`;
    const copiesAudio = recordCopiesAudio(camera);
    let flagged = false;

    if (check.error) {
      problems.push({
        id: `stream:${name}:error`,
        source: "stream",
        severity: "error",
        scope: name,
        scopeIsCamera: true,
        text: t("health.notices.cameraProbeFailed", {
          ns: "views/system",
          error: check.error,
        }),
        link,
      });
      return;
    }

    camera.ffmpeg.inputs.forEach((input, index) => {
      const result = check.streams[index];
      const streamNumber = index + 1;

      if (!result || !result.success) {
        flagged = true;
        problems.push({
          id: `stream:${name}:${index}:probe`,
          source: "stream",
          severity: "error",
          scope: name,
          scopeIsCamera: true,
          text: t("health.notices.streamProbeFailed", {
            ns: "views/system",
            index: streamNumber,
            error: lastErrorLine(result?.error),
          }),
          link,
        });
        return;
      }

      const restream = resolveRestreamSource(
        input.path,
        config.go2rtc?.streams,
      );
      const url = restream?.url ?? input.path;
      // a restreamed input's probe describes go2rtc's output, and a missing
      // AAC track is fixed on the go2rtc stream, not on the camera
      const streamLink = restream ? "/settings?page=systemGo2rtcStreams" : link;
      const prefixKey = restream
        ? "health.notices.streamPrefixRestream"
        : "health.notices.streamPrefix";

      getStreamIssues(
        {
          url,
          roles: input.roles as StreamRole[],
          brand: inferCameraBrand(url),
          useFfmpeg: restream?.useFfmpeg,
          restream: !!restream,
          testResult: result,
        },
        t,
      )
        .filter(
          (issue): issue is StreamIssue & { type: "warning" | "error" } =>
            issue.type !== "good" &&
            !WIZARD_ONLY_RULES.has(issue.rule) &&
            (issue.rule !== "audio-codec-record" || copiesAudio),
        )
        .forEach((issue) => {
          flagged = true;
          problems.push({
            id: `stream:${name}:${index}:${issue.rule}`,
            source: "stream",
            severity: issue.type,
            scope: name,
            scopeIsCamera: true,
            text: t(prefixKey, {
              ns: "views/system",
              index: streamNumber,
              message: issue.message,
            }),
            link: streamLink,
          });
        });
    });

    if (!flagged) {
      clean += 1;
    }
  });

  return { problems, checked, clean };
}
