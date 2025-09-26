import process from 'node:process';

const packageJson = process.env.npm_package_json;
const userAgent = process.env.npm_config_user_agent;

export const isNpm = Boolean(userAgent?.startsWith('npm')) || Boolean(packageJson?.endsWith('package.json'));
export const isYarn = Boolean(userAgent?.startsWith('yarn'));
export const isPnpm = Boolean(userAgent?.startsWith('pnpm'));
export const isBun = Boolean(userAgent?.startsWith('bun'));
export const isNpmOrYarn = isNpm || isYarn;
export const isPackageManager = isNpm || isYarn || isPnpm || isBun;
