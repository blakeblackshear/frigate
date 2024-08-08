import Heading from "@/components/ui/heading";
import { useEffect } from "react";

function NoMatch() {
  useEffect(() => {
    document.title = "Not Found - Frigate";
  }, []);

  return (
    <>
      <Heading as="h2">404</Heading>
      <p>Page not found</p>
    </>
  );
}

export default NoMatch;
