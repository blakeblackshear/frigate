# Feature Release GitHub Action - README

## Introduction

This GitHub Action, named "Feature Release Test", automates the process of releasing new features for the [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) repository. This action is triggered by a manual workflow_dispatch event, allowing you to specify the version of the new release. The action performs various tasks, including merging changes, running tests, publishing to npmjs and GitHub Releases, deploying to GitHub Pages, and creating a related issue on the repository's blog.

## Prerequisites

Before using this GitHub Action, ensure you have the following prerequisites in place:

1. Access to the [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) repository.
2. Necessary access tokens and secrets stored as GitHub repository secrets:
   - `NPM_TOKEN`: Token for npmjs package publishing. Ref: [How to create legacy token in npm](https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-legacy-tokens-on-the-website)
   - `MAIN_GH_TOKEN`: Token for accessing GitHub API to publish GitHub Releases on Cytoscape/Cytoscape.js repo. Ref: [Create fine-grained-personal-access-tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens)
   - `CYTOSCAPE_JS_BLOG_TOKEN`: Token for creating issues on the repository's blog Cytoscape/Cytoscape.js-blog repo.

## Usage

1. Navigate to the [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) repository.
2. Go to the [Actions](https://github.com/cytoscape/cytoscape.js/actions) tab.
3. Click on [Feature-Release](https://github.com/cytoscape/cytoscape.js/actions/workflows/feature-release-test.yml) workflow.
4. Click the "Run workflow" button.
5. DO NOT CHANGE BRANCH FROM `unstable` FOR RELEASE. Provide the desired version for the new release when prompted if you want to do a feature release for a specific version. **Note: This version will used as the version of release.** Otherwise, the github will automatically determine a new version based upon package.json version

## Workflow Steps

Below are the steps performed by the "Feature Release Test" GitHub Action:

1. **Checkout Patch Branch**:
   - Action: Checks out the `unstable` branch.
   - Uses: `actions/checkout@v3`.

2. **Setup Node.js Environment**:
   - Action: Sets up Node.js environment.
   - Uses: `actions/setup-node@v3`.
   - Node Version: 18.
   - Caches npm packages.

3. **Get New Version String**:
   - Action: Determines the new version for the release.
   - Script: Determines the new version based on user input or a script.
   - Uses the `github.event.inputs.version` input for the version if provided.

4. **Checkout Master Branch**:
   - Action: Checks out the `master` branch.
   - Uses: `actions/checkout@v3`.

5. **Merge Unstable to Master Branch**:
   - Action: Merges changes from `unstable` to `master` branch.
   - Custom script: Fetches and merges changes from the `unstable` branch.

6. **Install Dependencies**:
   - Action: Installs project dependencies.
   - Command: `npm install`.

7. **Run Tests**:
   - Action: Runs tests for the project.
   - Command: `npm test`.

8. **Pre Release Tests**:
   - Action: Runs pre-release tests.
   - Custom script: Executes pre-release tests with the `master` branch.

9. **Archive Code Coverage Results**:
   - Action: Archives code coverage results in case of test failure.
   - Uses: `actions/upload-artifact@v3`.

10. **Publish Package to npmjs**:
    - Action: Publishes the package to npmjs.
    - Command: `npm publish`.

11. **Publish Package to GitHub Releases**:
    - Action: Publishes the package to GitHub Releases.
    - Uses GitHub API to create a release with provided information.

12. **Deploy to Github Pages**:
    - Action: Deploys documentation to GitHub Pages.
    - Uses: `JamesIves/github-pages-deploy-action@v4`.

13. **Create Issue**:
    - Action: Creates an issue on the repository's blog.
    - Creates an issue with a title and body based on a template.
