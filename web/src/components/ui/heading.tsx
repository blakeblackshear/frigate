import { cn } from "@/lib/utils";

type HeadingElements = "h1" | "h2" | "h3" | "h4";

const Heading = ({
  children,
  as,
  className,
}: {
  children: React.ReactNode;
  as: HeadingElements;
  className?: string;
}) => {
  switch (as) {
    case "h1":
      return (
        <h1 className={cn("scroll-m-20 text-3xl font-extrabold", className)}>
          {children}
        </h1>
      );
    case "h2":
      return (
        <h2
          className={cn(
            "mb-3 scroll-m-20 text-3xl font-semibold transition-colors first:mt-0",
            className,
          )}
        >
          {children}
        </h2>
      );
    case "h3":
      return (
        <h3 className={cn("mb-3 scroll-m-20 text-2xl font-medium", className)}>
          {children}
        </h3>
      );
    case "h4":
      return (
        <h4 className={cn("scroll-m-20 text-xl font-medium", className)}>
          {children}
        </h4>
      );
    default:
      return (
        <h1 className={cn("scroll-m-20 text-3xl font-extrabold", className)}>
          {children}
        </h1>
      );
  }
};

export default Heading;
