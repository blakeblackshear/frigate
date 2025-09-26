# Patch/Backport Release GitHub Action - README

## Introduction

The "Patch Release Test" GitHub Action automates the process of creating a patch release for the [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) repository. This action allows you to define the target branch for the patch release and performs various tasks, including version updating, testing, publishing to npmjs and GitHub Releases, deploying to GitHub Pages, and more.

## Prerequisites

Before using the "Patch Release Test" GitHub Action, ensure you have the following prerequisites:

1. Access to the [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) repository.
2. Necessary access tokens and secrets stored as GitHub repository secrets:
   - `NPM_TOKEN`: Token for npmjs package publishing. Ref: [How to create legacy token in npm](https://docs.npmjs.com/creating-and-viewing-access-tokens#creating-legacy-tokens-on-the-website)
   - `MAIN_GH_TOKEN`: Token for accessing GitHub API to publish GitHub Releases on Cytoscape/Cytoscape.js repo. Ref: [Create fine-grained-personal-access-tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens)

## Usage

1. Navigate to the [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) repository.
2. Go to the "Actions" tab.
3. Click on the "Patch Release Test" workflow.
4. Click the "Run workflow" button.
5. Provide the target branch name for the patch release when prompted.
6. For backport release: Make a corresponding patch release.

## Workflow Steps

The "Patch Release Test" GitHub Action comprises the following steps:

1. **Get Branch**:
   - Action: Retrieves the target branch for the patch release.
   - Script: Sets the `BRANCH` environment variable based on user input.
   - Uses the `github.event.inputs.branch` input for branch selection.

2. **Checkout Patch Branch**:
   - Action: Checks out the specified patch branch.
   - Uses: `actions/checkout@v3`.
   - Branch: The branch specified by the `BRANCH` environment variable.

3. **Setup Node.js Environment**:
   - Action: Sets up Node.js environment for the workflow.
   - Uses: `actions/setup-node@v3`.
   - Node Version: 18.
   - Caches npm packages.

4. **Get New Version String**:
   - Action: Determines the new version for the patch release.
   - Script: Retrieves the new version from a script.
   - Uses a custom script to calculate the new version.

5. **See Patch Branch**:
   - Action: Displays the selected branch for the patch release.
   - Command: Outputs the branch stored in the `BRANCH` environment variable.

6. **See New Patch Version**:
   - Action: Displays the calculated version for the patch release.
   - Command: Outputs the calculated version using the `VERSION` environment variable.

7. **Checkout Master Branch**:
   - Action: Checks out the `master` branch.
   - Uses: `actions/checkout@v3`.

8. **Update Version on Master**:
   - Action: Updates the `versions.json` file on the `master` branch.
   - Script: Uses `jq` to add the new version to the `versions.json` file.
   - Commits and pushes the updated `versions.json` file.

9. **Checkout Patch Branch Again**:
   - Action: Checks out the specified patch branch.
   - Uses: `actions/checkout@v3`.
   - Branch: The branch specified by the `BRANCH` environment variable.

10. **Update Version on Unstable**:
    - Action: Updates the `versions.json` file on the `unstable` branch.
    - Script: Uses `jq` to add the new version to the `versions.json` file.
    - Commits and pushes the updated `versions.json` file.
    - Checks out the original patch branch again.

11. **Install Dependencies**:
    - Action: Installs project dependencies.
    - Command: `npm install`.

12. **Run Tests**:
    - Action: Executes tests for the project.
    - Command: `npm test`.

13. **Set Git Config**:
    - Action: Configures Git with user information.
    - Sets the user name and email based on the GitHub actor.

14. **Pre Release Tests**:
    - Action: Executes pre-release tests.
    - Uses a custom script to run pre-release tests on the specified branch.

15. **Archive Code Coverage Results**:
    - Action: Archives code coverage results in case of test failure.
    - Uses: `actions/upload-artifact@v3`.

16. **Publish Package to npmjs**:
    - Action: Publishes the package to npmjs.
    - Command: `npm publish`.

17. **Publish Package to GitHub Releases**:
    - Action: Publishes the package to GitHub Releases.
    - Uses GitHub API to create a release with provided information.

18. **Deploy to Github Pages**:
    - Action: Deploys documentation to GitHub Pages.
    - Uses: `JamesIves/github-pages-deploy-action@v4`.
