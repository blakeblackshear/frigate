"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.genChunkName = genChunkName;
exports.generateRoutesCode = generateRoutesCode;
exports.generateRoutePropFilename = generateRoutePropFilename;
exports.generateRouteFiles = generateRouteFiles;
const tslib_1 = require("tslib");
const querystring_1 = tslib_1.__importDefault(require("querystring"));
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const utils_1 = require("@docusaurus/utils");
/** Indents every line of `str` by one level. */
function indent(str) {
    return `  ${str.replace(/\n/g, `\n  `)}`;
}
const chunkNameCache = new Map();
const chunkNameCount = new Map();
/**
 * Generates a unique chunk name that can be used in the chunk registry.
 *
 * @param modulePath A path to generate chunk name from. The actual value has no
 * semantic significance.
 * @param prefix A prefix to append to the chunk name, to avoid name clash.
 * @param preferredName Chunk names default to `modulePath`, and this can supply
 * a more human-readable name.
 * @param shortId When `true`, the chunk name would only be a hash without any
 * other characters. Useful for bundle size. Defaults to `true` in production.
 */
function genChunkName(modulePath, prefix, preferredName, shortId = process.env.NODE_ENV === 'production') {
    let chunkName = chunkNameCache.get(modulePath);
    if (!chunkName) {
        if (shortId) {
            chunkName = (0, utils_1.simpleHash)(modulePath, 8);
        }
        else {
            let str = modulePath;
            if (preferredName) {
                const shortHash = (0, utils_1.simpleHash)(modulePath, 3);
                str = `${preferredName}${shortHash}`;
            }
            const name = (0, utils_1.docuHash)(str);
            chunkName = prefix ? `${prefix}---${name}` : name;
        }
        const seenCount = (chunkNameCount.get(chunkName) ?? 0) + 1;
        if (seenCount > 1) {
            chunkName += seenCount.toString(36);
        }
        chunkNameCache.set(modulePath, chunkName);
        chunkNameCount.set(chunkName, seenCount);
    }
    return chunkName;
}
/**
 * Takes a piece of route config, and serializes it into raw JS code. The shape
 * is the same as react-router's `RouteConfig`. Formatting is similar to
 * `JSON.stringify` but without all the quotes.
 */
function serializeRouteConfig({ routePath, routeHash, exact, subroutesCodeStrings, attributes, }) {
    const parts = [
        `path: '${routePath}'`,
        `component: ComponentCreator('${routePath}', '${routeHash}')`,
    ];
    if (exact) {
        parts.push(`exact: true`);
    }
    if (subroutesCodeStrings) {
        parts.push(`routes: [
${indent(subroutesCodeStrings.join(',\n'))}
]`);
    }
    Object.entries(attributes).forEach(([attrName, attrValue]) => {
        const isIdentifier = /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(attrName);
        const key = isIdentifier ? attrName : JSON.stringify(attrName);
        parts.push(`${key}: ${JSON.stringify(attrValue)}`);
    });
    return `{
${indent(parts.join(',\n'))}
}`;
}
const isModule = (value) => typeof value === 'string' ||
    (typeof value === 'object' &&
        // eslint-disable-next-line no-underscore-dangle
        !!value?.__import);
/**
 * Takes a {@link Module} (which is nothing more than a path plus some metadata
 * like query) and returns the string path it represents.
 */
function getModulePath(target) {
    if (typeof target === 'string') {
        return target;
    }
    const queryStr = target.query ? `?${querystring_1.default.stringify(target.query)}` : '';
    return `${target.path}${queryStr}`;
}
function genChunkNames(routeModule, prefix, name, res) {
    if (isModule(routeModule)) {
        // This is a leaf node, no need to recurse
        const modulePath = getModulePath(routeModule);
        const chunkName = genChunkName(modulePath, prefix, name);
        res.registry[chunkName] = (0, utils_1.escapePath)(modulePath);
        return chunkName;
    }
    if (Array.isArray(routeModule)) {
        return routeModule.map((val, index) => genChunkNames(val, `${index}`, name, res));
    }
    return lodash_1.default.mapValues(routeModule, (v, key) => genChunkNames(v, key, name, res));
}
/**
 * This is the higher level overview of route code generation. For each route
 * config node, it returns the node's serialized form, and mutates `registry`,
 * `routesPaths`, and `routesChunkNames` accordingly.
 */
function genRouteCode(routeConfig, res, index, level) {
    const { path: routePath, component, modules = {}, context, routes: subroutes, priority, exact, metadata, props, plugin, ...attributes } = routeConfig;
    if (typeof routePath !== 'string' || !component) {
        throw new Error(`Invalid route config: path must be a string and component is required.
${JSON.stringify(routeConfig)}`);
    }
    // Because 2 routes with the same path could lead to hash collisions
    // See https://github.com/facebook/docusaurus/issues/10718#issuecomment-2498516394
    function generateUniqueRouteKey() {
        const hashes = [
            // // OG algo to keep former snapshots
            () => (0, utils_1.simpleHash)(JSON.stringify(routeConfig), 3),
            // Other attempts, not ideal but good enough
            // Technically we could use Math.random() here but it's annoying for tests
            () => (0, utils_1.simpleHash)(`${level}${index}`, 3),
            () => (0, utils_1.simpleHash)(JSON.stringify(routeConfig), 4),
            () => (0, utils_1.simpleHash)(`${level}${index}`, 4),
        ];
        for (const tryHash of hashes) {
            const routeHash = tryHash();
            const routeKey = `${routePath}-${routeHash}`;
            if (!res.routesChunkNames[routeKey]) {
                return { routeKey, routeHash };
            }
        }
        throw new Error(`Docusaurus couldn't generate a unique hash for route ${routeConfig.path} (level=${level} - index=${index}).
This is a bug, please report it here!
https://github.com/facebook/docusaurus/issues/10718`);
    }
    const { routeKey, routeHash } = generateUniqueRouteKey();
    res.routesChunkNames[routeKey] = {
        // Avoid clash with a prop called "component"
        ...genChunkNames({ __comp: component }, 'component', component, res),
        ...(context &&
            genChunkNames({ __context: context }, 'context', routePath, res)),
        ...genChunkNames(modules, 'module', routePath, res),
    };
    return serializeRouteConfig({
        routePath: routePath.replace(/'/g, "\\'"),
        routeHash,
        subroutesCodeStrings: subroutes?.map((r, i) => genRouteCode(r, res, i, level + 1)),
        exact,
        attributes,
    });
}
/**
 * Routes are prepared into three temp files:
 *
 * - `routesConfig`, the route config passed to react-router. This file is kept
 * minimal, because it can't be code-splitted.
 * - `routesChunkNames`, a mapping from route paths (hashed) to code-splitted
 * chunk names.
 * - `registry`, a mapping from chunk names to options for react-loadable.
 */
function generateRoutesCode(routeConfigs) {
    const res = {
        // To be written by `genRouteCode`
        routesConfig: '',
        routesChunkNames: {},
        registry: {},
    };
    // `genRouteCode` would mutate `res`
    const routeConfigSerialized = routeConfigs
        .map((r, i) => genRouteCode(r, res, i, 0))
        .join(',\n');
    res.routesConfig = `import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
${indent(routeConfigSerialized)},
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
`;
    return res;
}
const genRegistry = ({ generatedFilesDir, registry, }) => (0, utils_1.generate)(generatedFilesDir, 'registry.js', `export default {
${Object.entries(registry)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chunkName, modulePath]) => 
// modulePath is already escaped by escapePath
`  "${chunkName}": [() => import(/* webpackChunkName: "${chunkName}" */ "${modulePath}"), "${modulePath}", require.resolveWeak("${modulePath}")],`)
    .join('\n')}};
`);
const genRoutesChunkNames = ({ generatedFilesDir, routesChunkNames, }) => (0, utils_1.generate)(generatedFilesDir, 'routesChunkNames.json', JSON.stringify(routesChunkNames, null, 2));
const genRoutes = ({ generatedFilesDir, routesConfig, }) => (0, utils_1.generate)(generatedFilesDir, 'routes.js', routesConfig);
// The generated filename per route must be unique to avoid conflicts
// See also https://github.com/facebook/docusaurus/issues/10125
function generateRoutePropFilename(route) {
    // TODO if possible, we could try to shorten the filename by removing
    //  the plugin routeBasePath prefix from the name
    return `${(0, utils_1.docuHash)(route.path, 
    // Note: using hash(route.path + route.component) is not technically
    // as robust as hashing the entire prop content object.
    // But it's faster and should be good enough considering it's very unlikely
    // anyone would have 2 routes on the same path also rendering the exact
    // same component.
    { hashExtra: route.component })}.json`;
}
async function generateRoutePropModule({ generatedFilesDir, route, plugin, }) {
    ensureNoPropsConflict(route);
    const moduleContent = JSON.stringify(route.props);
    // TODO we should aim to reduce this path length
    // This adds bytes to the global module registry
    const relativePath = path_1.default.posix.join(plugin.name, plugin.id, 'p', generateRoutePropFilename(route));
    const modulePath = path_1.default.posix.join(generatedFilesDir, relativePath);
    const aliasedPath = path_1.default.posix.join('@generated', relativePath);
    await (0, utils_1.generate)(generatedFilesDir, modulePath, moduleContent);
    return aliasedPath;
}
function ensureNoPropsConflict(route) {
    if (!route.props && !route.modules) {
        return;
    }
    const conflictingPropNames = lodash_1.default.intersection(Object.keys(route.props ?? {}), Object.keys(route.modules ?? {}));
    if (conflictingPropNames.length > 0) {
        throw new Error(`Route ${route.path} has conflicting props declared using both route.modules and route.props APIs for keys: ${conflictingPropNames.join(', ')}\nThis is not permitted, otherwise one prop would override the over.`);
    }
}
async function preprocessRouteProps({ generatedFilesDir, route, plugin, }) {
    const getPropsModulePathPromise = () => route.props
        ? generateRoutePropModule({
            generatedFilesDir,
            route,
            plugin,
        })
        : undefined;
    const getSubRoutesPromise = () => route.routes
        ? Promise.all(route.routes.map((subRoute) => {
            return preprocessRouteProps({
                generatedFilesDir,
                route: subRoute,
                plugin,
            });
        }))
        : undefined;
    const [propsModulePath, subRoutes] = await Promise.all([
        getPropsModulePathPromise(),
        getSubRoutesPromise(),
    ]);
    const newRoute = {
        ...route,
        modules: {
            ...route.modules,
            ...(propsModulePath && { __props: propsModulePath }),
        },
        routes: subRoutes,
        props: undefined,
    };
    return newRoute;
}
// For convenience, it's possible to pass a "route.props" object
// This method converts the props object to a regular module
// and assigns it to route.modules.__props attribute
async function preprocessAllPluginsRoutesProps({ generatedFilesDir, routes, }) {
    return Promise.all(routes.map((route) => {
        return preprocessRouteProps({
            generatedFilesDir,
            route,
            plugin: route.plugin,
        });
    }));
}
async function generateRouteFiles({ generatedFilesDir, routes: initialRoutes, }) {
    const routes = await preprocessAllPluginsRoutesProps({
        generatedFilesDir,
        routes: initialRoutes,
    });
    const { registry, routesChunkNames, routesConfig } = generateRoutesCode(routes);
    await Promise.all([
        genRegistry({ generatedFilesDir, registry }),
        genRoutesChunkNames({ generatedFilesDir, routesChunkNames }),
        genRoutes({ generatedFilesDir, routesConfig }),
    ]);
}
