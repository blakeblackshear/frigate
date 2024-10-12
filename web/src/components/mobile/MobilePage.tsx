import { cn } from "@/lib/utils";
import { isPWA } from "@/utils/isPWA";
import { ReactNode, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { IoMdArrowRoundBack } from "react-icons/io";
import { motion, AnimatePresence } from "framer-motion";

type MobilePageProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobilePage({ children, open, onOpenChange }: MobilePageProps) {
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    }
  }, [open]);

  const handleAnimationComplete = () => {
    if (!open) {
      setIsVisible(false);
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            "fixed inset-0 z-50 mb-12 bg-background",
            isPWA && "mb-16",
            "landscape:mb-14 landscape:md:mb-16",
          )}
          initial={{ x: "100%" }}
          animate={{ x: open ? 0 : "100%" }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onAnimationComplete={handleAnimationComplete}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type MobileComponentProps = {
  children: ReactNode;
  className?: string;
};

export function MobilePageContent({
  children,
  className,
  ...props
}: MobileComponentProps) {
  return (
    <div className={cn("size-full", className)} {...props}>
      {children}
    </div>
  );
}

export function MobilePageDescription({
  children,
  className,
  ...props
}: MobileComponentProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

interface MobilePageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
}

export function MobilePageHeader({
  children,
  className,
  onClose,
  ...props
}: MobilePageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky -top-2 z-50 mb-2 flex items-center justify-center bg-background p-4",
        className,
      )}
      {...props}
    >
      <Button
        className="absolute left-0 rounded-lg"
        size="sm"
        onClick={onClose}
      >
        <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
      </Button>
      <div className="flex flex-row text-center">{children}</div>
    </div>
  );
}

export function MobilePageTitle({
  children,
  className,
  ...props
}: MobileComponentProps) {
  return (
    <h2 className={cn("text-lg font-semibold", className)} {...props}>
      {children}
    </h2>
  );
}
