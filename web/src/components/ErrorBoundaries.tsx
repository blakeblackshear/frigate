/**
 * Error boundaries for the app shell.
 *
 * A throw during render normally unmounts the whole tree and leaves a blank
 * screen behind. These boundaries stop that at the page container and at the
 * navigation chrome, so one broken view cannot take the rest of the UI with
 * it. Only render, commit, and lifecycle throws land here; event handlers,
 * timers, and rejected fetches are still on their own.
 */

import {
  Component,
  Suspense,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { FaExclamationTriangle } from "react-icons/fa";
import { LuCopy, LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import { Toaster } from "@/components/ui/sonner";
import { useAutoFrigateStats } from "@/hooks/use-stats";

type Failure = {
  error: unknown;
  componentStack?: string;
};

type PanelProps = {
  failure: Failure;
};

// A new build replaces the hashed asset files, so a tab left open across an
// update asks for files that are gone. Browsers word that failure their own
// way, which leaves these fragments as the only common signal.
const STALE_ASSET_HINTS = [
  "chunkloaderror",
  "loading chunk",
  "loading css chunk",
  "dynamically imported module",
  "module script failed",
];

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  return String(error);
}

function isStaleAsset({ error }: Failure): boolean {
  const name = error instanceof Error ? error.name : "";
  const text = `${name} ${messageOf(error)}`.toLowerCase();

  return STALE_ASSET_HINTS.some((hint) => text.includes(hint));
}

/** Version goes first so a pasted report is triageable on its own. */
function crashReport({ error, componentStack }: Failure, version?: string) {
  const stack = error instanceof Error ? error.stack : undefined;

  return [
    "Frigate UI crash report",
    `Version: ${version || "unknown"}`,
    `Page: ${window.location.href}`,
    `Browser: ${navigator.userAgent}`,
    `When: ${new Date().toISOString()}`,
    `Error: ${messageOf(error)}`,
    stack && `\nStack:\n${stack}`,
    componentStack && `\nComponents:${componentStack.trimEnd()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function reloadPage() {
  window.location.reload();
}

function PagePanel({ failure }: PanelProps) {
  const { t } = useTranslation(["common"]);

  // service.version carries the release and the build commit, and the status
  // bar already keeps it warm. config.version is the config schema version.
  const stats = useAutoFrigateStats();

  const stale = isStaleAsset(failure);

  const onCopy = () => {
    // copy() falls back to a prompt and returns false when the clipboard is
    // refused, so a success toast has to wait on the result.
    const copied = copy(crashReport(failure, stats?.service.version));

    if (copied) {
      toast.success(t("button.copiedToClipboard"), { position: "top-center" });
    } else {
      toast.error(t("error.copyFailed"), { position: "top-center" });
    }
  };

  return (
    <div
      role="alert"
      data-testid="error-panel"
      className="flex size-full flex-col items-center justify-center overflow-auto p-4 text-center"
    >
      <FaExclamationTriangle className="mb-4 size-8 text-danger" />
      <Heading as="h2" className="mb-2">
        {stale ? t("error.staleTitle") : t("error.title")}
      </Heading>
      <p className="max-w-md text-primary-variant">
        {stale ? t("error.staleDesc") : t("error.desc")}
      </p>
      <code
        data-testid="error-panel-message"
        className="my-4 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-secondary px-3 py-2 text-left text-xs text-primary"
      >
        {messageOf(failure.error)}
      </code>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          variant="select"
          className="flex items-center gap-2"
          aria-label={t("button.reload")}
          onClick={reloadPage}
        >
          <LuRefreshCw className="size-4" />
          {t("button.reload")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-2"
          aria-label={t("error.copyDetails")}
          onClick={onCopy}
        >
          <LuCopy className="size-4" />
          {t("error.copyDetails")}
        </Button>
      </div>
      <Toaster position="top-center" closeButton={true} />
    </div>
  );
}

/** Corner strip, so failed chrome never sits on top of the page content. */
function ChromeNotice() {
  const { t } = useTranslation(["common"]);

  return (
    <div
      role="alert"
      data-testid="error-strip"
      className="absolute bottom-0 left-0 z-50 flex max-w-full items-center gap-2 rounded-tr-md bg-secondary px-3 py-1.5 text-xs text-primary shadow-md"
    >
      <FaExclamationTriangle className="size-4 shrink-0 text-danger" />
      <div className="truncate">{t("error.partial")}</div>
      <Button
        variant="link"
        className="h-auto p-0 text-xs"
        aria-label={t("button.reload")}
        onClick={reloadPage}
      >
        {t("button.reload")}
      </Button>
    </div>
  );
}

type TrapProps = {
  children?: ReactNode;
  panel: ComponentType<PanelProps>;
  resetToken: string;
};

type TrapState = {
  token: string;
  failure?: Failure;
};

class ErrorTrap extends Component<TrapProps, TrapState> {
  state: TrapState = { token: this.props.resetToken };

  static getDerivedStateFromError(error: unknown): Partial<TrapState> {
    return { failure: { error } };
  }

  // Dropping the failure here beats both alternatives: keying the boundary on
  // the route would remount the whole tree on every navigation, and resetting
  // from componentDidUpdate would paint the dead panel one more time first.
  static getDerivedStateFromProps(props: TrapProps, state: TrapState) {
    if (props.resetToken === state.token) {
      return null;
    }

    return { token: props.resetToken, failure: undefined };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    // React logs the error on its own. The component stack is the part worth
    // holding on to, since it names the subtree that threw.
    this.setState({
      failure: { error, componentStack: info.componentStack ?? undefined },
    });
  }

  render() {
    const { failure } = this.state;

    if (!failure) {
      return this.props.children;
    }

    const Panel = this.props.panel;

    return <Panel failure={failure} />;
  }
}

type ChromeErrorBoundaryProps = {
  children?: ReactNode;
};

/** Guards the sidebar, status bar, and bottom bar as one unit. */
export function ChromeErrorBoundary({ children }: ChromeErrorBoundaryProps) {
  const { pathname } = useLocation();

  return (
    <ErrorTrap panel={ChromeNotice} resetToken={pathname}>
      {children}
    </ErrorTrap>
  );
}

type LazyPageProps = {
  children?: ReactNode;
  fallback?: ReactNode;
};

/**
 * Suspense for a lazily loaded page, plus the recovery panel it needs when
 * the chunk fails to arrive or the page throws on its first render.
 */
export function LazyPage({ children, fallback }: LazyPageProps) {
  const { pathname } = useLocation();

  return (
    <ErrorTrap panel={PagePanel} resetToken={pathname}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorTrap>
  );
}
