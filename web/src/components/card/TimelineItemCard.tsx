import PreviewThumbnailPlayer from "../player/PreviewThumbnailPlayer";
import { AspectRatio } from "../ui/aspect-ratio";
import { Card, CardContent } from "../ui/card";

type TimelineItemCardProps = {
  timeline: Timeline;
  relevantPreview: Preview | undefined;
};
export default function TimelineItemCard({
  timeline,
  relevantPreview,
}: TimelineItemCardProps) {
  return (
    <Card className="bg-red-500">
      <div className="flex justify-between h-24">
        <div className="w-1/2">
          <PreviewThumbnailPlayer
            camera={timeline.camera}
            relevantPreview={relevantPreview}
            startTs={timeline.timestamp}
            eventId={timeline.source_id}
            isMobile={false}
          />
        </div>
        <div>
          <div>{timeline.camera}</div>
          <div>{timeline.data.label}</div>
        </div>
      </div>
    </Card>
  );
}
