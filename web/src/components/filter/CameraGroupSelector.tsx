import { FrigateConfig } from "@/types/frigateConfig";
import { isDesktop } from "react-device-detect";
import useSWR from "swr";
import { MdHome } from "react-icons/md";
import { FaCar, FaCat, FaCircle, FaDog, FaLeaf } from "react-icons/fa";
import useOverlayState from "@/hooks/use-overlay-state";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";

export function CameraGroupSelector() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();
  const [group, setGroup] = useOverlayState("cameraGroup");

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.camera_groups).sort(
      (a, b) => a[1].order - b[1].order,
    );
  }, [config]);

  return (
    <div
      className={`flex items-center justify-start gap-2 ${isDesktop ? "flex-col mb-4" : ""}`}
    >
      <Button
        className={
          group == undefined
            ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
            : "text-muted-foreground bg-secondary focus:text-muted-foreground focus:bg-secondary"
        }
        size="xs"
        onClick={() => navigate(-1)}
      >
        <MdHome className="size-4" />
      </Button>
      {groups.map(([name, config]) => {
        return (
          <Button
            key={name}
            className={
              group == name
                ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                : "text-muted-foreground bg-secondary"
            }
            size="xs"
            onClick={() => setGroup(name, group != undefined)}
          >
            {getGroupIcon(config.icon)}
          </Button>
        );
      })}
    </div>
  );
}

function getGroupIcon(icon: string) {
  switch (icon) {
    case "car":
      return <FaCar className="size-4" />;
    case "cat":
      return <FaCat className="size-4" />;
    case "dog":
      return <FaDog className="size-4" />;
    case "leaf":
      return <FaLeaf className="size-4" />;
    default:
      return <FaCircle className="size-4" />;
  }
}

/**
 * {config &&
          }
 */
