import process from 'node:process';
import path from 'node:path';
import fs from 'node:fs';

export default function hasYarn(cwd = process.cwd()) {
	return fs.existsSync(path.resolve(cwd, 'yarn.lock'));
}
