import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "../indicators/activity-indicator";
import { Card } from "../ui/card";
import { LuPlay, LuTrash } from "react-icons/lu";
import { Button } from "../ui/button";

type ExportProps = {
  file: {
    name: string;
  };
  onSelect: (file: string) => void;
  onDelete: (file: string) => void;
};

export default function ExportCard({ file, onSelect, onDelete }: ExportProps) {
  return (
    <Card className="my-4 p-4 bg-secondary flex justify-start text-center items-center">
      {file.name.startsWith("in_progress") ? (
        <>
          <div className="p-2">
            <ActivityIndicator size={16} />
          </div>
          <div className="px-2">
            {file.name.substring(12, file.name.length - 4)}
          </div>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={() => onSelect(file.name)}>
            <LuPlay className="h-4 w-4 text-green-600" />
          </Button>
          <a
            className="text-blue-500 hover:underline overflow-hidden"
            href={`${baseUrl}exports/${file.name}`}
            download
          >
            {file.name.substring(0, file.name.length - 4)}
          </a>
          <Button
            className="ml-auto"
            variant="secondary"
            onClick={() => onDelete(file.name)}
          >
            <LuTrash className="h-4 w-4" stroke="#f87171" />
          </Button>
        </>
      )}
    </Card>
  );
}
