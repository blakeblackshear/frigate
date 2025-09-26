import semver from 'semver';

export default function semverDiff(versionA, versionB) {
	versionA = semver.parse(versionA);
	versionB = semver.parse(versionB);

	if (semver.compareBuild(versionA, versionB) >= 0) {
		return;
	}

	return semver.diff(versionA, versionB) || 'build';
}
