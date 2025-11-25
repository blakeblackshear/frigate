import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IoMdArrowRoundBack } from "react-icons/io";
import { cn } from "@/lib/utils";
import { isPWA } from "@/utils/isPWA";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useHistoryBack } from "@/hooks/use-history-back";

const MobilePageContext = createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

type MobilePageProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  enableHistoryBack?: boolean;
};

export function MobilePage({
  children,
  open: controlledOpen,
  onOpenChange,
  enableHistoryBack = true,
}: MobilePageProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = useCallback(
    (value: boolean) => {
      if (onOpenChange) {
        onOpenChange(value);
      } else {
        setUncontrolledOpen(value);
      }
    },
    [onOpenChange, setUncontrolledOpen],
  );

  // Handle browser back button to close mobile page
  useHistoryBack({
    enabled: enableHistoryBack,
    open,
    onClose: () => setOpen(false),
  });

  return (
    <MobilePageContext.Provider value={{ open, onOpenChange: setOpen }}>
      {children}
    </MobilePageContext.Provider>
  );
}

type MobilePageTriggerProps = React.HTMLAttributes<HTMLDivElement>;

export function MobilePageTrigger({
  children,
  ...props
}: MobilePageTriggerProps) {
  const context = useContext(MobilePageContext);
  if (!context)
    throw new Error("MobilePageTrigger must be used within MobilePage");

  return (
    <div onClick={() => context.onOpenChange(true)} {...props}>
      {children}
    </div>
  );
}

type MobilePagePortalProps = {
  children: React.ReactNode;
  container?: HTMLElement;
};

export function MobilePagePortal({
  children,
  container,
}: MobilePagePortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(children, container || document.body);
}

type MobilePageContentProps = {
  children: React.ReactNode;
  className?: string;
  scrollerRef?: React.RefObject<HTMLDivElement>;
};

export function MobilePageContent({
  children,
  className,
  scrollerRef,
}: MobilePageContentProps) {
  const context = useContext(MobilePageContext);
  if (!context)
    throw new Error("MobilePageContent must be used within MobilePage");

  const [isVisible, setIsVisible] = useState(context.open);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (context.open) {
      setIsVisible(true);
    }
  }, [context.open]);

  const handleAnimationComplete = () => {
    if (context.open) {
      // After opening animation completes, ensure scroller is at the top
      if (scrollerRef?.current) {
        scrollerRef.current.scrollTop = 0;
      }
    } else {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    if (context.open && scrollerRef?.current) {
      scrollerRef.current.scrollTop = 0;
    }
  }, [context.open, scrollerRef]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={containerRef}
          className={cn(
            "fixed inset-0 z-50 mb-12 bg-background",
            isPWA && "mb-16",
            "landscape:mb-14 landscape:md:mb-16",
            className,
          )}
          initial={{ x: "100%" }}
          animate={{ x: context.open ? 0 : "100%" }}
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

interface MobilePageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
  actions?: React.ReactNode;
}

export function MobilePageHeader({
  children,
  className,
  onClose,
  actions,
  ...props
}: MobilePageHeaderProps) {
  const { t } = useTranslation(["common"]);
  const context = useContext(MobilePageContext);
  if (!context)
    throw new Error("MobilePageHeader must be used within MobilePage");

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      context.onOpenChange(false);
    }
  };

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
        aria-label={t("label.back", { ns: "common" })}
        size="sm"
        onClick={handleClose}
      >
        <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
      </Button>
      <div className="flex flex-row text-center">{children}</div>
      {actions && (
        <div className="absolute right-0 flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

type MobilePageTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function MobilePageTitle({ className, ...props }: MobilePageTitleProps) {
  return <h2 className={cn("text-lg", className)} {...props} />;
}

type MobilePageDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

export function MobilePageDescription({
  className,
  ...props
}: MobilePageDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}
