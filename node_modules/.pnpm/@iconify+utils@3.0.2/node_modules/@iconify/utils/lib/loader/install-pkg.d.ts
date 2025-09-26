import { AutoInstall } from "./types.js";
declare function tryInstallPkg(name: string, autoInstall: AutoInstall): Promise<void | undefined>;
export { tryInstallPkg };