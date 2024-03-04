import { FrigateConfig } from "@/types/frigateConfig";
import { isMobile } from "react-device-detect";
import useSWR from "swr";
import { MdHome } from "react-icons/md";
import { FaCar, FaCircle, FaLeaf } from "react-icons/fa";
import useOverlayState from "@/hooks/use-overlay-state";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

export function CameraGroupSelector() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const navigate = useNavigate();
  const [group, setGroup] = useOverlayState("cameraGroup");

  if (isMobile) {
    return (
      <div className="flex items-center justify-start gap-2">
        <Button
          className={
            group == undefined
              ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
              : "text-muted-foreground bg-muted"
          }
          size="xs"
          onClick={() => navigate(-1)}
        >
          <MdHome className="size-4" />
        </Button>
        {Object.entries(config?.camera_groups ?? {}).map(([name, config]) => {
          return (
            <Button
              key={name}
              className={
                group == name
                  ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                  : "text-muted-foreground bg-muted"
              }
              size="xs"
              onClick={() => setGroup(name)}
            >
              {getGroupIcon(config.icon)}
            </Button>
          );
        })}
      </div>
    );
  }

  return <div></div>;
}

function getGroupIcon(icon: string) {
  switch (icon) {
    case "car":
      return <FaCar className="size-4" />;
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
