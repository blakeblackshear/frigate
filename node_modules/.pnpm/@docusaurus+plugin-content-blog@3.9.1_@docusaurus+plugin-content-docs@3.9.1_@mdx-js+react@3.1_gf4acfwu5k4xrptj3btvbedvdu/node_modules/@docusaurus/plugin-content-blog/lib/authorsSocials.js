"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSocials = exports.AuthorSocialsSchema = void 0;
const utils_validation_1 = require("@docusaurus/utils-validation");
exports.AuthorSocialsSchema = utils_validation_1.Joi.object({
    twitter: utils_validation_1.Joi.string(),
    github: utils_validation_1.Joi.string(),
    linkedin: utils_validation_1.Joi.string(),
    // StackOverflow userIds like '82609' are parsed as numbers by Yaml
    stackoverflow: utils_validation_1.Joi.alternatives()
        .try(utils_validation_1.Joi.number(), utils_validation_1.Joi.string())
        .custom((val) => String(val)),
    x: utils_validation_1.Joi.string(),
    bluesky: utils_validation_1.Joi.string(),
    instagram: utils_validation_1.Joi.string(),
    threads: utils_validation_1.Joi.string(),
    mastodon: utils_validation_1.Joi.string(),
    twitch: utils_validation_1.Joi.string(),
    youtube: utils_validation_1.Joi.string(),
    email: utils_validation_1.Joi.string(),
}).unknown();
const PredefinedPlatformNormalizers = {
    x: (handle) => `https://x.com/${handle}`,
    twitter: (handle) => `https://twitter.com/${handle}`,
    github: (handle) => `https://github.com/${handle}`,
    linkedin: (handle) => `https://www.linkedin.com/in/${handle}/`,
    stackoverflow: (userId) => `https://stackoverflow.com/users/${userId}`,
    bluesky: (handle) => `https://bsky.app/profile/${handle}`,
    instagram: (handle) => `https://www.instagram.com/${handle}`,
    threads: (handle) => `https://www.threads.net/@${handle}`,
    mastodon: (handle) => `https://mastodon.social/@${handle}`, // can be in format user@other.server and it will redirect if needed
    twitch: (handle) => `https://twitch.tv/${handle}`,
    youtube: (handle) => `https://youtube.com/@${handle}`, // https://support.google.com/youtube/answer/6180214?hl=en
    email: (email) => `mailto:${email}`,
};
function normalizeSocialEntry([platform, value]) {
    if (typeof value !== 'string') {
        throw new Error(`Author socials should be usernames/userIds/handles, or fully qualified HTTP(s) absolute URLs.
Social platform '${platform}' has illegal value '${value}'`);
    }
    const isAbsoluteUrl = value.startsWith('http://') ||
        value.startsWith('https://') ||
        value.startsWith('mailto:');
    if (isAbsoluteUrl) {
        return [platform, value];
    }
    else if (value.includes('/')) {
        throw new Error(`Author socials should be usernames/userIds/handles, or fully qualified HTTP(s) absolute URLs.
Social platform '${platform}' has illegal value '${value}'`);
    }
    const normalizer = PredefinedPlatformNormalizers[platform.toLowerCase()];
    if (normalizer && !isAbsoluteUrl) {
        const normalizedPlatform = platform.toLowerCase();
        const normalizedValue = normalizer(value);
        return [normalizedPlatform, normalizedValue];
    }
    return [platform, value];
}
const normalizeSocials = (socials) => {
    return Object.fromEntries(Object.entries(socials).map(normalizeSocialEntry));
};
exports.normalizeSocials = normalizeSocials;
