import { Button } from "@/components/ui/button";
import { useFirebaseApp, useFirebaseMessaging } from "@/hooks/use-firebase";
import { getToken } from "firebase/messaging";

export default function NotificationView() {
  useFirebaseApp();
  const firebaseMessaging = useFirebaseMessaging();

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Button
        onClick={() => {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              getToken(firebaseMessaging, {
                vapidKey:
                  "BDd7XT7ElEhLApcxFvrBEs1H-6kfbmjTXhfxRIOXSWUIXOpffl_rlKHOe-qPjzp8Gyqv6tgrWX9-xwSTt2ImKPM",
              }).then((token) => console.log(`the token is ${token}`));
            }
          });
        }}
      >
        Enable Notifications
      </Button>
    </div>
  );
}
