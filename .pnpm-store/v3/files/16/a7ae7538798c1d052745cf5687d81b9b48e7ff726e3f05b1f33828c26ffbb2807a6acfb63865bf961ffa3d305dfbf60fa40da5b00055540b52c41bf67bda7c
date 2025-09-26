const fs = require('fs');
const path = require('path');

module.exports = function loadConfig(
	configFile = 'sort-css-mq.config.json',
	pkgFile = 'package.json'
) {
	let config = {};

	try {
		const cwd = process.cwd();
		const configPath = path.join(cwd, configFile);
		const pkgPath = path.join(cwd, pkgFile);
		if (fs.existsSync(configPath)) {
			config = JSON.parse(fs.readFileSync(configPath).toString());
		} else if (fs.existsSync(pkgPath)) {
			config = JSON.parse(fs.readFileSync(pkgPath).toString()).sortCssMQ;
		}
	} catch (e) {
		console.log(e);
	}

	if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
		return config;
	} else {
		return {};
	}
};
