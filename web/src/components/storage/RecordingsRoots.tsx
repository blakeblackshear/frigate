import { StorageGraph } from "@/components/graph/StorageGraph";
import { getUnitSize } from "@/utils/storageUtil";
import { useTranslation } from "react-i18next";

export type RootCameraStorage = {
  [key: string]: {
    bandwidth: number;
    usage: number;
    usage_percent: number;
  };
};

export type RecordingRootStorage = {
  path: string;
  total: number;
  used: number;
  free: number;
  usage_percent: number;
  recordings_size: number;
  cameras: string[];
  camera_usages: RootCameraStorage;
  is_default: boolean;
};

export function RecordingsRoots({ roots }: { roots: RecordingRootStorage[] }) {
  const { t } = useTranslation(["views/system"]);

  return (
    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {roots.map((root) => (
        <div
          key={root.path}
          className={`rounded-lg bg-background_alt p-2.5 md:rounded-2xl ${
            root.is_default ? "" : "border border-primary/30"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="break-all text-sm font-medium">{root.path}</div>
            {!root.is_default && (
              <div className="rounded-md bg-primary/15 px-2 py-1 text-xs text-primary">
                {t("storage.recordings.nonDefault")}
              </div>
            )}
          </div>
          <StorageGraph
            graphId={`recordings-root-${root.path}`}
            used={root.recordings_size}
            total={root.total}
          />
          <div className="mt-2 text-xs text-primary-variant">
            {t("storage.recordings.rootSummary", {
              used: root.used,
              free: root.free,
              usage_percent: root.usage_percent.toFixed(2),
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {t("storage.recordings.rootCameras", {
              cameras:
                root.cameras.join(", ").replaceAll("_", " ") ||
                t("none", { ns: "common" }),
            })}
          </div>
          <div className="mt-2 space-y-1">
            {Object.entries(root.camera_usages).map(([camera, usage]) => (
              <div
                key={`${root.path}-${camera}`}
                className="flex items-center justify-between text-xs"
              >
                <span className="smart-capitalize">
                  {camera.replaceAll("_", " ")}
                </span>
                <span>
                  {getUnitSize(usage.usage)} ({usage.usage_percent.toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
