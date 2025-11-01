import React from "react";
import { Button } from "../ui/button";
import Heading from "../ui/heading";
import { Link } from "react-router-dom";

type EmptyCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonText?: string;
  link?: string;
};
export function EmptyCard({
  icon,
  title,
  description,
  buttonText,
  link,
}: EmptyCardProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {icon}
      <Heading as="h4">{title}</Heading>
      <div className="mb-3 text-secondary-foreground">{description}</div>
      {buttonText?.length && (
        <Button size="sm" variant="select">
          <Link to={link ?? "#"}>{buttonText}</Link>
        </Button>
      )}
    </div>
  );
}
