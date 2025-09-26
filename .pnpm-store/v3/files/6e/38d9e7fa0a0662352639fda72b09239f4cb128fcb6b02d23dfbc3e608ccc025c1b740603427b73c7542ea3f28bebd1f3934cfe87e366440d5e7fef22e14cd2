import path from 'node:path';
import { fileURLToPath } from 'node:url';
const isYarnGlobal = () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const isWindows = process.platform === 'win32';
    const yarnPath = isWindows
        ? path.join('Yarn', 'config', 'global')
        : path.join('.config', 'yarn', 'global');
    return __dirname.includes(yarnPath);
};
export default isYarnGlobal;
