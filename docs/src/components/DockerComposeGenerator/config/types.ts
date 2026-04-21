/**
 * Type definitions for the Docker Compose Generator configuration.
 * All device, hardware, and port options are declaratively defined
 * so that adding a new device only requires editing config files.
 */

/** A single device mapping entry (e.g. /dev/dri:/dev/dri) */
export interface DeviceMapping {
  /** Host device path */
  host: string;
  /** Container device path (defaults to host if omitted) */
  container?: string;
  /** Inline comment for this device line */
  comment?: string;
}

/** A single volume mapping entry */
export interface VolumeMapping {
  /** Host path */
  host: string;
  /** Container path */
  container: string;
  /** Whether the mount is read-only */
  readOnly?: boolean;
  /** Inline comment */
  comment?: string;
}

/** NVIDIA deploy configuration for docker-compose */
export interface NvidiaDeployConfig {
  /** "all" or a specific number */
  count: string;
  /** Specific GPU device IDs (when count is a number) */
  deviceIds?: string[];
}

/** Full device type definition */
export interface DeviceConfig {
  /** Unique identifier, e.g. "intel" */
  id: string;
  /** Display name, e.g. "Intel GPU" */
  name: string;
  /** Short description */
  description: string;
  /** Icon emoji or identifier */
  icon: string;
  /** Docker image tag, e.g. "stable" */
  imageTag: string;
  /**
   * Image tag suffix appended to the base tag.
   * e.g. "-standard-arm64" produces "stable-standard-arm64"
   */
  imageTagSuffix?: string;
  /** Hardware option IDs to auto-enable when this device is selected */
  autoHardware: string[];
  /** Help text shown as an admonition when this device is selected */
  helpText?: string;
  /** Admonition type for help text */
  helpType?: "info" | "warning" | "danger";
  /** Device mappings always added for this device type */
  devices?: DeviceMapping[];
  /** Volume mappings always added for this device type */
  volumes?: VolumeMapping[];
  /** Extra environment variables for this device type */
  env?: Record<string, string>;
  /** NVIDIA deploy config (only for tensorrt) */
  nvidiaDeploy?: NvidiaDeployConfig;
  /** Runtime setting, e.g. "nvidia" for Jetson */
  runtime?: string;
  /** Extra hosts entries, e.g. "host.docker.internal:host-gateway" */
  extraHosts?: string[];
  /** Security options, e.g. ["apparmor=unconfined"] */
  securityOpt?: string[];
  /** Whether this device type needs the NVIDIA GPU config UI */
  needsNvidiaConfig?: boolean;
}

/** Generic hardware acceleration option definition */
export interface HardwareOption {
  /** Unique identifier, e.g. "usbCoral" */
  id: string;
  /** Display label */
  label: string;
  /**
   * Description shown below the checkbox when this option is enabled.
   * Supports markdown link syntax: [text](url)
   */
  description?: string;
  /** Device IDs that disable this option */
  disabledWhen?: string[];
  /** Device mappings added when this option is enabled */
  devices?: DeviceMapping[];
  /** Volume mappings added when this option is enabled */
  volumes?: VolumeMapping[];
  /** Extra environment variables */
  env?: Record<string, string>;
}

/** Port definition */
export interface PortConfig {
  /** Unique identifier (also the default host port as string) */
  id: string;
  /** Host port number */
  host: number;
  /** Container port number */
  container: number;
  /** Protocol */
  protocol?: "tcp" | "udp";
  /** Description of the port's purpose */
  description: string;
  /** Whether enabled by default */
  defaultEnabled: boolean;
  /** Whether this port is locked (always enabled, cannot be toggled off) */
  locked?: boolean;
  /** Whether this port requires a confirmation step before enabling */
  requiresConfirmation?: boolean;
  /** Admonition type for the warning */
  warningType?: "warning" | "danger";
  /** Warning content (markdown) */
  warningContent?: string;
  /** Confirmation checkbox label */
  confirmationLabel?: string;
  /** Cooldown in seconds before the confirmation checkbox becomes available */
  cooldownSeconds?: number;
}
