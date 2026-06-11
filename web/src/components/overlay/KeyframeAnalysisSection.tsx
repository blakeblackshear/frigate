import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import { LuX } from "react-icons/lu";
import ActivityIndicator from "../indicators/activity-indicator";
import { KeyframeAnalysis } from "@/types/stats";

const PROBE_WINDOW_SECONDS = 20;

type KeyframeAnalysisSectionProps = {
  cameraName: string;
  onResult?: (analysis: KeyframeAnalysis) => void;
};

export default function KeyframeAnalysisSection({
  cameraName,
  onResult,
}: KeyframeAnalysisSectionProps) {
  const { t } = useTranslation(["views/system"]);
  const [analysis, setAnalysis] = useState<KeyframeAnalysis>();
  const [failed, setFailed] = useState(false);
  const [secondsRemaining, setSecondsRemaining] =
    useState(PROBE_WINDOW_SECONDS);

  // fire the probe once on mount
  useEffect(() => {
    let active = true;
    axios
      .get("keyframe_analysis", { params: { camera: cameraName } })
      .then((res) => {
        if (active) {
          setAnalysis(res.data);
          onResult?.(res.data);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
    // re-probing only depends on the camera; onResult is a stable setter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraName]);

  // countdown while waiting for the probe to return
  useEffect(() => {
    if (analysis || failed) {
      return;
    }
    const interval = setInterval(() => {
      setSecondsRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [analysis, failed]);

  const content = useMemo(() => {
    if (failed) {
      return <Row icon="unknown">{t("cameras.info.keyframes.unknown")}</Row>;
    }

    if (!analysis) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <ActivityIndicator className="size-4" />
          <span>
            {secondsRemaining > 0
              ? t("cameras.info.keyframes.analyzing", {
                  seconds: secondsRemaining,
                })
              : t("cameras.info.keyframes.stillAnalyzing")}
          </span>
        </div>
      );
    }

    let summary;
    switch (analysis.severity) {
      case "ok":
        summary = (
          <Row icon="ok">
            {t("cameras.info.keyframes.ok", { seconds: analysis.mean_gap })}
          </Row>
        );
        break;
      case "warning":
        summary = (
          <Row icon="warning">
            {t("cameras.info.keyframes.warning", { seconds: analysis.max_gap })}
          </Row>
        );
        break;
      case "error":
        summary = (
          <Row icon="error">
            {t("cameras.info.keyframes.error", {
              seconds: analysis.max_gap,
              segmentTime: analysis.segment_time,
            })}
          </Row>
        );
        break;
      case "record_disabled":
        summary = (
          <Row icon="unknown">{t("cameras.info.keyframes.recordDisabled")}</Row>
        );
        break;
      default:
        summary = (
          <Row icon="unknown">{t("cameras.info.keyframes.unknown")}</Row>
        );
    }

    // gap statistics are only meaningful once at least two keyframes were seen
    const hasStats = analysis.max_gap != null;
    const hasDetails = hasStats || analysis.stream_index != null;

    return (
      <div className="text-muted-foreground">
        {analysis.stream_index != null && (
          <div>
            {t("cameras.info.keyframes.recordStream")}{" "}
            <span className="text-primary">
              {t("cameras.info.stream", { idx: analysis.stream_index + 1 })}
            </span>
          </div>
        )}
        {hasStats && (
          <div>
            <div>
              {t("cameras.info.keyframes.keyframeCount")}{" "}
              <span className="text-primary">{analysis.keyframe_count}</span>
            </div>
            <div>
              {t("cameras.info.keyframes.observedDuration")}{" "}
              <span className="text-primary">
                {analysis.duration_observed}s
              </span>
            </div>
            <div>
              {t("cameras.info.keyframes.gap")}{" "}
              <span className="text-primary">
                {analysis.min_gap}s / {analysis.mean_gap}s / {analysis.max_gap}s
              </span>
            </div>
            <div>
              {t("cameras.info.keyframes.segmentLength")}{" "}
              <span className="text-primary">{analysis.segment_time}s</span>
            </div>
          </div>
        )}
        <div className={hasDetails ? "mt-3" : undefined}>{summary}</div>
      </div>
    );
  }, [analysis, failed, secondsRemaining, t]);

  return (
    <div className="mb-5">
      <div className="mb-1 rounded-md bg-secondary p-2 text-lg text-primary">
        {t("cameras.info.keyframes.title")}
      </div>
      <div className="ml-2">{content}</div>
    </div>
  );
}

type RowProps = {
  icon: "ok" | "warning" | "error" | "unknown";
  children: React.ReactNode;
};

function Row({ icon, children }: RowProps) {
  return (
    <div className="flex items-start gap-2">
      {icon === "ok" && (
        <FaCircleCheck className="mt-0.5 size-4 flex-shrink-0 text-success" />
      )}
      {icon === "warning" && (
        <FaTriangleExclamation className="mt-0.5 size-4 flex-shrink-0 text-yellow-500" />
      )}
      {icon === "error" && (
        <LuX className="mt-0.5 size-4 flex-shrink-0 text-danger" />
      )}
      {icon === "unknown" && (
        <FaTriangleExclamation className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
      )}
      <span className="text-primary">{children}</span>
    </div>
  );
}
