import { cn } from "@/lib/utils";

type TextElements =
  | "p"
  | "blockquote"
  | "code"
  | "lead"
  | "large"
  | "small"
  | "muted";

const Text = ({
  children,
  as,
  className,
}: {
  children: React.ReactNode;
  as: TextElements;
  className?: string;
}) => {
  switch (as) {
    case "p":
      return (
        <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}>
          {children}
        </p>
      );
    case "blockquote":
      return (
        <blockquote className={cn("mt-6 border-l-2 pl-6 italic", className)}>
          {children}
        </blockquote>
      );
    case "code":
      return (
        <code
          className={cn(
            "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
            className
          )}
        >
          {children}
        </code>
      );
    case "lead":
      return (
        <p className={cn("text-xl text-muted-foreground", className)}>
          {children}
        </p>
      );
    case "large":
      return (
        <div className={cn("text-lg font-semibold", className)}>{children}</div>
      );
    case "small":
      return (
        <small className={cn("text-sm font-medium leading-none", className)}>
          {children}
        </small>
      );
    case "muted":
      return (
        <p className={cn("text-sm text-muted-foreground", className)}>
          {children}.
        </p>
      );
    default:
      return (
        <p className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}>
          {children}
        </p>
      );
  }
};

export default Text;
