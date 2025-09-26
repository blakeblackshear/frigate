import { camelize, pascalize, snakelize } from "../misc/strings.js";
import { promises } from "fs";

/**
* Returns CustomIconLoader for loading icons from a directory
*/
function FileSystemIconLoader(dir, transform) {
	return async (name) => {
		const paths = [
			`${dir}/${name}.svg`,
			`${dir}/${camelize(name)}.svg`,
			`${dir}/${pascalize(name)}.svg`,
			`${dir}/${snakelize(name)}.svg`
		];
		let stat;
		for (const path of paths) {
			try {
				stat = await promises.lstat(path);
			} catch (err) {
				continue;
			}
			if (stat.isFile()) {
				let svg = await promises.readFile(path, "utf-8");
				const cleanupIdx = svg.indexOf("<svg");
				if (cleanupIdx > 0) svg = svg.slice(cleanupIdx);
				return typeof transform === "function" ? await transform(svg) : svg;
			}
		}
	};
}

export { FileSystemIconLoader };