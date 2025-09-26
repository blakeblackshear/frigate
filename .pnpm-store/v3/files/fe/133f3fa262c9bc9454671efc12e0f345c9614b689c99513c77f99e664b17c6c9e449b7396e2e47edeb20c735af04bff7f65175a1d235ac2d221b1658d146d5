 
## Release instructions

 
 1. Add the upcoming release version in [version.json](https://github.com/cytoscape/cytoscape.js/blob/unstable/documentation/versions.json) file.
 2. Ensure that [milestones](https://github.com/cytoscape/cytoscape.js/milestones) exist for the releases that you would like to make.  Each milestone should contain its corresponding issues and pull requests.
 1. For patch releases, do the back-port patch release before the corresponding current  release.  This ensures that npm lists the current version as the latest one.
     1. `git checkout 1.1.x`, e.g. if the previous feature release is 1.1
     1. Follow the remaining ordinary release steps (step 5 and onward).
 1. Current releases are based on the `master` branch: `git checkout master`
     1. If you are making a patch release, you can just release `master` with its new patches.
     1. If you are making a feature release, you need to merge `unstable` onto `master`.  Since there can be conflicts, it's easiest to use the 'ours' strategy which will allow you to use the state of `unstable` as-is (i.e. no conflict resolution necessary):
         1. Make sure your local `master` is up-to-date: `git checkout master && git pull`
         1. Make sure your local `unstable` is up-to-date: `git checkout unstable && git pull`
         1. Create a merge commit that selects the state of `unstable` and push it: `git merge -s ours master && git push`
         1. Fast-forward `master` to the merge commit: `git checkout master && git merge unstable && git push`
         1. Update the version number in `package.json` and `package-lock.json` on `unstable` to some provisional new version number, and push it.
 1. Update the `VERSION` environment variable for the release number you want to make, e.g. `export VERSION=1.2.3`
 1. Confirm all the tests are passing: 
     1. `npm run test`
     1. See also `test/index.html` for browser testing (optional)
 1. Confirm all the tests are passing in IE9 (for feature releases):
     1. `npm run watch:umd`
     1. Open an [IE9 VM](https://developer.microsoft.com/en-us/microsoft-edge/tools/vms/)
     1. Open `http://yourip:8081/test/ie.html` in IE
 1. Prepare a release: `npm run release`
 1. Review the files that were just built in the previous step.
     1. There should be a series of updated files in the `dist` directory and the `documentation` directory, identified with `git status`.  
     1. Try out the newly-built docs and demos in your browser.
 1. Add the the release to git: `git add . && git commit -m "Build $VERSION"`
 1. Update the package version and tag the release: `npm version $VERSION`
 1. Push the release changes: `git push && git push --tags`
 1. Publish the release to npm: `npm publish`
 1. Run `npm run docs:push`
 1. [Create a release](https://github.com/cytoscape/cytoscape.js/releases/new) for Zenodo from the latest tag.  Make sure you wait at least 5 minutes since the last time that you made a release in order for Zenodo to work properly.
 1. For feature releases:  Create a release announcement on the [blog](https://github.com/cytoscape/cytoscape.js-blog).  Share the announcement on mailing lists and social media.
