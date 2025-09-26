import { A as Agent, a as AgentName } from './shared/package-manager-detector.pUYRhiOu.mjs';

declare const AGENTS: Agent[];
declare const LOCKS: Record<string, AgentName>;
declare const INSTALL_METADATA: Record<string, AgentName>;
declare const INSTALL_PAGE: Record<Agent, string>;

export { AGENTS, INSTALL_METADATA, INSTALL_PAGE, LOCKS };
