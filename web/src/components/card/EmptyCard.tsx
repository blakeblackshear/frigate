import React from "react";
import { Button } from "../ui/button";
import Heading from "../ui/heading";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type EmptyCardProps = {
  className?: string;
  icon: React.ReactNode;
  title: string;
  description?: string;
  buttonText?: string;
  link?: string;
};
export function EmptyCard({
  className,
  icon,
  title,
  description,
  buttonText,
  link,
}: EmptyCardProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {icon}
      <Heading as="h4">{title}</Heading>
      {description && (
        <div className="mb-3 text-secondary-foreground">{description}</div>
      )}
      {buttonText?.length && (
        <Button size="sm" variant="select">
          <Link to={link ?? "#"}>{buttonText}</Link>
        </Button>
      )}
    </div>
  );
}
