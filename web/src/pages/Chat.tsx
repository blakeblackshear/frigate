import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FaArrowUpLong } from "react-icons/fa6";

export default function ChatPage() {
  return (
    <div className="flex size-full flex-col items-center p-2">
      <div className="size-full"></div>
      <ChatEntry />
    </div>
  );
}

function ChatEntry() {
  return (
    <div className="flex w-full flex-col items-center justify-center rounded-xl bg-secondary p-2 xl:w-[40%]">
      <Input
        className="w-full border-transparent bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
        placeholder="Ask anything..."
      />
      <div className="flex w-full flex-row items-center justify-between">
        <div></div>
        <Button variant="select" disabled className="size-10 rounded-full">
          <FaArrowUpLong size="16" />
        </Button>
      </div>
    </div>
  );
}
