import Heading from "@/components/ui/heading";
import { useEffect } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

export default function AccessDenied() {
  useEffect(() => {
    document.title = "Access Denied - Frigate";
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <FaExclamationTriangle className="mb-4 size-8" />
      <Heading as="h2" className="mb-2">
        Access Denied
      </Heading>
      <p className="text-primary-variant">
        You don't have permission to view this page.
      </p>
    </div>
  );
}
