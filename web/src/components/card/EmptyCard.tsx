import React from "react";
import { Button } from "../ui/button";
import Heading from "../ui/heading";

type EmptyCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText?: string;
};
export function EmptyCard({
  icon,
  title,
  description,
  buttonText,
}: EmptyCardProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {icon}
      <Heading as="h4">{title}</Heading>
      <div className="text-secondary-foreground">{description}</div>
      {buttonText?.length && (
        <Button size="sm" variant="select">
          {buttonText}
        </Button>
      )}
    </div>
  );
}
