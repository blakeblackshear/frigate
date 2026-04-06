import { execSync } from "child_process";
import path from "path";

export default function globalSetup() {
  const webDir = path.resolve(__dirname, "..");
  execSync("npm run e2e:build", { cwd: webDir, stdio: "inherit" });
}
