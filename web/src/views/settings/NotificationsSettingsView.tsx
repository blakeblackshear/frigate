import { Button } from "@/components/ui/button";
import { useFirebaseApp } from "@/hooks/use-firebase";

export default function NotificationView() {
  const firebaseApp = useFirebaseApp();

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Button
        onClick={() => {
          firebaseApp.automaticDataCollectionEnabled = false;
        }}
      >
        Enable Notifications
      </Button>
    </div>
  );
}
