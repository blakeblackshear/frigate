"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = deploy;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const logger_1 = tslib_1.__importDefault(require("@docusaurus/logger"));
const execa_1 = tslib_1.__importDefault(require("execa"));
const utils_1 = require("@docusaurus/utils");
const site_1 = require("../server/site");
const build_1 = require("./build/build");
// GIT_PASS env variable should not appear in logs
function obfuscateGitPass(str) {
    const gitPass = process.env.GIT_PASS;
    return gitPass ? str.replace(gitPass, 'GIT_PASS') : str;
}
const debugMode = !!process.env.DOCUSAURUS_DEPLOY_DEBUG;
// Log executed commands so that user can figure out mistakes on his own
// for example: https://github.com/facebook/docusaurus/issues/3875
function exec(cmd, options) {
    const log = options?.log ?? true;
    const failfast = options?.failfast ?? false;
    try {
        // TODO migrate to execa(file,[...args]) instead
        //  Use async/await everything
        //  Avoid execa.command: the args need to be escaped manually
        const result = execa_1.default.commandSync(cmd);
        if (log || debugMode) {
            logger_1.default.info `code=${obfuscateGitPass(cmd)} subdue=${`code: ${result.exitCode}`}`;
        }
        if (debugMode) {
            console.log(result);
        }
        if (failfast && result.exitCode !== 0) {
            throw new Error(`Command returned unexpected exitCode ${result.exitCode}`);
        }
        return result;
    }
    catch (err) {
        throw new Error(logger_1.default.interpolate `Error while executing command code=${obfuscateGitPass(cmd)}
In CWD code=${process.cwd()}`, { cause: err });
    }
}
// Execa escape args and add necessary quotes automatically
// When using Execa.command, the args containing spaces must be escaped manually
function escapeArg(arg) {
    return arg.replaceAll(' ', '\\ ');
}
function hasGit() {
    return exec('git --version').exitCode === 0;
}
async function deploy(siteDirParam = '.', cliOptions = {}) {
    const siteDir = await fs_extra_1.default.realpath(siteDirParam);
    const { outDir, siteConfig, siteConfigPath } = await (0, site_1.loadContext)({
        siteDir,
        config: cliOptions.config,
        outDir: cliOptions.outDir,
    });
    if (typeof siteConfig.trailingSlash === 'undefined') {
        logger_1.default.warn(`When deploying to GitHub Pages, it is better to use an explicit "trailingSlash" site config.
Otherwise, GitHub Pages will add an extra trailing slash to your site urls only on direct-access (not when navigation) with a server redirect.
This behavior can have SEO impacts and create relative link issues.
`);
    }
    logger_1.default.info('Deploy command invoked...');
    if (!hasGit()) {
        throw new Error('Git not installed or not added to PATH!');
    }
    // Source repo is the repo from where the command is invoked
    const { stdout } = exec('git remote get-url origin', {
        log: false,
        failfast: true,
    });
    const sourceRepoUrl = stdout.trim();
    // The source branch; defaults to the currently checked out branch
    const sourceBranch = process.env.CURRENT_BRANCH ??
        exec('git rev-parse --abbrev-ref HEAD', {
            log: false,
            failfast: true,
        })
            ?.stdout?.toString()
            .trim();
    const gitUser = process.env.GIT_USER;
    let useSSH = process.env.USE_SSH !== undefined &&
        process.env.USE_SSH.toLowerCase() === 'true';
    if (!gitUser && !useSSH) {
        // If USE_SSH is unspecified: try inferring from repo URL
        if (process.env.USE_SSH === undefined && (0, utils_1.hasSSHProtocol)(sourceRepoUrl)) {
            useSSH = true;
        }
        else {
            throw new Error('Please set the GIT_USER environment variable, or explicitly specify USE_SSH instead!');
        }
    }
    const organizationName = process.env.ORGANIZATION_NAME ??
        process.env.CIRCLE_PROJECT_USERNAME ??
        siteConfig.organizationName;
    if (!organizationName) {
        throw new Error(`Missing project organization name. Did you forget to define "organizationName" in ${siteConfigPath}? You may also export it via the ORGANIZATION_NAME environment variable.`);
    }
    logger_1.default.info `organizationName: name=${organizationName}`;
    const projectName = process.env.PROJECT_NAME ??
        process.env.CIRCLE_PROJECT_REPONAME ??
        siteConfig.projectName;
    if (!projectName) {
        throw new Error(`Missing project name. Did you forget to define "projectName" in ${siteConfigPath}? You may also export it via the PROJECT_NAME environment variable.`);
    }
    logger_1.default.info `projectName: name=${projectName}`;
    // We never deploy on pull request.
    const isPullRequest = process.env.CI_PULL_REQUEST ?? process.env.CIRCLE_PULL_REQUEST;
    if (isPullRequest) {
        exec('echo "Skipping deploy on a pull request."', {
            log: false,
            failfast: true,
        });
        process.exit(0);
    }
    // github.io indicates organization repos that deploy via default branch. All
    // others use gh-pages (either case can be configured actually, but we can
    // make educated guesses). Organization deploys look like:
    // - Git repo: https://github.com/<organization>/<organization>.github.io
    // - Site url: https://<organization>.github.io
    const isGitHubPagesOrganizationDeploy = projectName.includes('.github.io');
    if (isGitHubPagesOrganizationDeploy &&
        !process.env.DEPLOYMENT_BRANCH &&
        !siteConfig.deploymentBranch) {
        throw new Error(`For GitHub pages organization deployments, 'docusaurus deploy' does not assume anymore that 'master' is your default Git branch.
Please provide the branch name to deploy to as an environment variable, for example DEPLOYMENT_BRANCH=main or DEPLOYMENT_BRANCH=master .
You can also set the deploymentBranch property in docusaurus.config.js .`);
    }
    const deploymentBranch = process.env.DEPLOYMENT_BRANCH ?? siteConfig.deploymentBranch ?? 'gh-pages';
    logger_1.default.info `deploymentBranch: name=${deploymentBranch}`;
    const githubHost = process.env.GITHUB_HOST ?? siteConfig.githubHost ?? 'github.com';
    const githubPort = process.env.GITHUB_PORT ?? siteConfig.githubPort;
    let deploymentRepoURL;
    if (useSSH) {
        deploymentRepoURL = (0, utils_1.buildSshUrl)(githubHost, organizationName, projectName, githubPort);
    }
    else {
        const gitPass = process.env.GIT_PASS;
        const gitCredentials = gitPass ? `${gitUser}:${gitPass}` : gitUser;
        deploymentRepoURL = (0, utils_1.buildHttpsUrl)(gitCredentials, githubHost, organizationName, projectName, githubPort);
    }
    logger_1.default.info `Remote repo URL: name=${obfuscateGitPass(deploymentRepoURL)}`;
    // Check if this is a cross-repo publish.
    const crossRepoPublish = !sourceRepoUrl.endsWith(`${organizationName}/${projectName}.git`);
    // We don't allow deploying to the same branch unless it's a cross publish.
    if (sourceBranch === deploymentBranch && !crossRepoPublish) {
        throw new Error(`You cannot deploy from this branch (${sourceBranch}).` +
            '\nYou will need to checkout to a different branch!');
    }
    // Save the commit hash that triggers publish-gh-pages before checking
    // out to deployment branch.
    const currentCommit = exec('git rev-parse HEAD')?.stdout?.toString().trim();
    const runDeploy = async (outputDirectory) => {
        const targetDirectory = cliOptions.targetDir ?? '.';
        const fromPath = outputDirectory;
        const toPath = await fs_extra_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), `${projectName}-${deploymentBranch}`));
        process.chdir(toPath);
        // Clones the repo into the temp folder and checks out the target branch.
        // If the branch doesn't exist, it creates a new one based on the
        // repository default branch.
        if (exec(`git clone --depth 1 --branch ${deploymentBranch} ${deploymentRepoURL} ${escapeArg(toPath)}`).exitCode !== 0) {
            exec(`git clone --depth 1 ${deploymentRepoURL} ${escapeArg(toPath)}`);
            exec(`git checkout -b ${deploymentBranch}`);
        }
        // Clear out any existing contents in the target directory
        exec(`git rm -rf ${escapeArg(targetDirectory)}`, {
            log: false,
            failfast: true,
        });
        const targetPath = path_1.default.join(toPath, targetDirectory);
        try {
            await fs_extra_1.default.copy(fromPath, targetPath);
        }
        catch (err) {
            logger_1.default.error `Copying build assets from path=${fromPath} to path=${targetPath} failed.`;
            throw err;
        }
        exec('git add --all', { failfast: true });
        const gitUserName = process.env.GIT_USER_NAME;
        if (gitUserName) {
            exec(`git config user.name ${escapeArg(gitUserName)}`, { failfast: true });
        }
        const gitUserEmail = process.env.GIT_USER_EMAIL;
        if (gitUserEmail) {
            exec(`git config user.email ${escapeArg(gitUserEmail)}`, {
                failfast: true,
            });
        }
        const commitMessage = process.env.CUSTOM_COMMIT_MESSAGE ??
            `Deploy website - based on ${currentCommit}`;
        const commitResults = exec(`git commit -m ${escapeArg(commitMessage)} --allow-empty`);
        if (exec(`git push --force origin ${deploymentBranch}`).exitCode !== 0) {
            throw new Error('Running "git push" command failed. Does the GitHub user account you are using have push access to the repository?');
        }
        else if (commitResults.exitCode === 0) {
            // The commit might return a non-zero value when site is up to date.
            let websiteURL = '';
            if (githubHost === 'github.com') {
                websiteURL = projectName.includes('.github.io')
                    ? `https://${organizationName}.github.io/`
                    : `https://${organizationName}.github.io/${projectName}/`;
            }
            else {
                // GitHub enterprise hosting.
                websiteURL = `https://${githubHost}/pages/${organizationName}/${projectName}/`;
            }
            try {
                exec(`echo "Website is live at ${websiteURL}."`, { failfast: true });
                process.exit(0);
            }
            catch (err) {
                throw new Error(`Failed to execute command: ${err}`);
            }
        }
    };
    if (!cliOptions.skipBuild) {
        // Build site, then push to deploymentBranch branch of specified repo.
        try {
            await (0, build_1.build)(siteDir, cliOptions);
            await runDeploy(outDir);
        }
        catch (err) {
            logger_1.default.error('Deployment of the build output failed.');
            throw err;
        }
    }
    else {
        // Push current build to deploymentBranch branch of specified repo.
        await runDeploy(outDir);
    }
}
